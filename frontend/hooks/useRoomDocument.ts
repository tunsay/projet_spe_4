import { useEffect, useState, useCallback } from "react";
import useSocket from "./useSocket";
import { normalizeMessageRecord, upsertMessage } from "@/utils/message";
import { Socket } from "socket.io-client";
import { ChatMessageEntry } from "@/types/documents";

type InitialState = any;

type PresenceEvent = {
    type: "joined" | "left";
    userId?: string;
    socketId?: string;
    membersCount?: number;
};

type DocChangeEvent = {
    docId: string;
    delta: any;
    author?: string;
};

export default function useRoomDocument(documentId: string) {
    // Use the shared socket for the document
    const { socket, connect, on, off } = useSocket(documentId);

    const [joined, setJoined] = useState(false);
    const [initialState, setInitialState] = useState<InitialState | null>(null);
    const [membersCount, setMembersCount] = useState<number>(0);
    const [lastPresence, setLastPresence] = useState<PresenceEvent | null>(
        null
    );
    const [lastDocChange, setLastDocChange] = useState<DocChangeEvent | null>(
        null
    );
    const [joinError, setJoinError] = useState<string | null>(null);
    const [messagesList, setMessagesList] = useState<ChatMessageEntry[]>([]);

    useEffect(() => {
        if (!socket) return;

        let mounted = true;

        // Handler for the (odd) server behavior where it emits a raw object
        // (server code currently uses `socket.emit({...})` instead of naming an event).
        const handlePossibleJoinPayload = (payload: any) => {
            if (!mounted) return;
            if (!payload || typeof payload !== "object") return;
            // If docId matches or no docId provided, treat as possible join ack
            if (payload.docId && payload.docId !== documentId) return;

            if (payload.ok === true) {
                setJoined(true);
                setInitialState(payload.initialState ?? null);
                setMembersCount(
                    typeof payload.membersCount === "number"
                        ? payload.membersCount
                        : membersCount
                );
                setJoinError(null);
            } else if (payload.ok === false) {
                setJoinError(payload.reason || "unknown_reason");
            }
        };

        const handlePresence = (payload: PresenceEvent) => {
            if (!mounted) return;
            setLastPresence(payload);
            if (typeof payload.membersCount === "number")
                setMembersCount(payload.membersCount);
        };

        const handleDocChange = (payload: DocChangeEvent) => {
            if (!mounted) return;
            setLastDocChange(payload);
        };

        // Prepare a join emitter that will run immediately if connected,
        // or once on the next "connect" event. Also ensure the socket is
        // connected when this hook is used on a page.
        const tryJoin = () => {
            try {
                socket.emit(
                    "join-document",
                    { docId: documentId },
                    (response: any) => handlePossibleJoinPayload(response)
                );
            } catch (e) {
                console.error("Error emitting join-document", e);
            }
        };

        // Rejoin on every successful connect (initial or reconnection)
        const handleConnect = () => {
            tryJoin();
        };

        const handleDisconnect = (reason: any) => {
            if (!mounted) return;
            // mark as not joined; we'll try to rejoin on next connect
            setJoined(false);
            setJoinError(typeof reason === "string" ? reason : "disconnected");
        };

        if (socket && socket.connected) {
            tryJoin();
        } else {
            // ensure the socket attempts to connect
            try {
                connect?.();
            } catch (e) {
                // some socket implementations may throw; ignore here
            }
        }

        // Listen for events using the useSocket-provided helpers so listeners are
        // attached to the current shared socket reference.
        on("message", handlePossibleJoinPayload);
        on("presence", handlePresence);
        on("doc-change", handleDocChange);
        on("chat:new-message", handleIncomingMessage);

        on("connect", handleConnect);
        on("disconnect", handleDisconnect);

        return () => {
            mounted = false;
            try {
                off("message", handlePossibleJoinPayload);
                off("presence", handlePresence);
                off("doc-change", handleDocChange);
                off("chat:new-message", handleIncomingMessage);
                off("connect", handleConnect);
                off("disconnect", handleDisconnect);
            } catch (e) {
                // ignore
            }
        };
    }, [socket, documentId]);

    const sendChange = useCallback(
        (delta: any) => {
            if (!socket) return Promise.reject(new Error("no-socket"));
            return new Promise<void>((resolve, reject) => {
                try {
                    socket.emit(
                        "doc-change",
                        { docId: documentId, delta },
                        (ack: any) => {
                            // server may ack
                            if (ack && ack.ok === true) return resolve();
                            if (ack && ack.ok === false)
                                return reject(
                                    new Error(ack.reason || "server_rejected")
                                );
                            // If no ack, resolve optimistically
                            return resolve();
                        }
                    );
                } catch (e) {
                    reject(e);
                }
            });
        },
        [socket, documentId]
    );

    const handleIncomingMessage = (payload: unknown) => {
        if (!payload || typeof payload !== "object" || !("docId" in payload)) {
            return;
        }

        const { docId, message: rawMessage } = payload as {
            docId?: string;
            message?: unknown;
        };

        if (docId !== documentId || !rawMessage) {
            return;
        }

        const normalized = normalizeMessageRecord(rawMessage);
        setMessagesList((current) => upsertMessage(current, normalized));
    };

    const sendMessage = useCallback(
        (
            outboundMessage: any,
            fallbackId: string
        ): Promise<ChatMessageEntry> => {
            if (!socket) return Promise.reject(new Error("no-socket"));

            return new Promise<ChatMessageEntry>((resolve, reject) => {
                try {
                    // Optimistically add the message to the list
                    const optimistic = normalizeMessageRecord(
                        outboundMessage,
                        fallbackId
                    );
                    setMessagesList((cur) => upsertMessage(cur, optimistic));

                    socket.emit(
                        "chat:new-message",
                        { docId: documentId, message: outboundMessage },
                        (ack: any) => {
                            if (ack && ack.ok === true) {
                                const normalized = normalizeMessageRecord(
                                    ack.message ?? outboundMessage
                                );
                                setMessagesList((cur) =>
                                    upsertMessage(cur, normalized)
                                );
                                return resolve(normalized);
                            }

                            if (ack && ack.ok === false) {
                                return reject(
                                    new Error(ack.reason || "server_rejected")
                                );
                            }

                            // No ack provided by server — resolve with optimistic message
                            return resolve(optimistic);
                        }
                    );
                } catch (e) {
                    reject(e as Error);
                }
            });
        },
        [socket, documentId]
    );

    return {
        socket: socket as Socket | null,
        joined,
        initialState,
        setInitialState,
        membersCount,
        lastPresence,
        lastDocChange,
        joinError,
        sendChange,
        handleIncomingMessage,
        sendMessage,
        messagesList,
        setMessagesList,
    };
}
