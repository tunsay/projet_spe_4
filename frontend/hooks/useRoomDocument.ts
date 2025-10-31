import { useEffect, useState, useCallback, useRef } from "react";
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
    const [messagesListState, setMessagesListState] =
        useState<ChatMessageEntry[]>([]);
    const reactionsStoreRef = useRef<Record<string, Record<string, string[]>>>(
        {}
    );
    const audioContextRef = useRef<AudioContext | null>(null);

    const applyReactionsToMessages = useCallback(
        (list: ChatMessageEntry[]): ChatMessageEntry[] => {
            if (!Array.isArray(list)) return list;
            const store = reactionsStoreRef.current;
            if (!store) return list;
            let changed = false;
            const next = list.map((message) => {
                const messageId = String(message.id);
                const stored = store[messageId] || {};
                const current = message.reactions || {};
                const currentKeys = Object.keys(current);
                const storedKeys = Object.keys(stored);
                let same = currentKeys.length === storedKeys.length;
                if (same) {
                    for (const key of storedKeys) {
                        const currentIds = current[key] || [];
                        const storedIds = stored[key] || [];
                        if (currentIds.length !== storedIds.length) {
                            same = false;
                            break;
                        }
                        for (const id of storedIds) {
                            if (!currentIds.includes(id)) {
                                same = false;
                                break;
                            }
                        }
                        if (!same) break;
                    }
                }
                if (same) return message;
                changed = true;
                return { ...message, reactions: { ...stored } };
            });
            return changed ? next : list;
        },
        []
    );

    const refreshMessagesFromReactions = useCallback(() => {
        setMessagesListState((prev) => applyReactionsToMessages(prev));
    }, [applyReactionsToMessages]);

    type MessageListUpdate =
        | ChatMessageEntry[]
        | ((prev: ChatMessageEntry[]) => ChatMessageEntry[]);

    const setMessagesList = useCallback(
        (update: MessageListUpdate) => {
            setMessagesListState((prev) => {
                const next =
                    typeof update === "function"
                        ? (update as (prev: ChatMessageEntry[]) => ChatMessageEntry[])(prev)
                        : update;
                if (!Array.isArray(next)) return prev;
                return applyReactionsToMessages(next);
            });
        },
        [applyReactionsToMessages]
    );

    const messagesList = messagesListState;

    const normalizeUnknownReactionRecord = (
        input: unknown
    ): Record<string, string[]> => {
        if (!input || typeof input !== "object") return {};
        const result: Record<string, string[]> = {};
        for (const [emoji, value] of Object.entries(
            input as Record<string, unknown>
        )) {
            if (typeof emoji !== "string") continue;
            if (Array.isArray(value)) {
                const filtered = value.filter(
                    (entry): entry is string =>
                        typeof entry === "string" && entry.length > 0
                );
                if (filtered.length > 0) {
                    result[emoji] = [...filtered];
                }
            }
        }
        return result;
    };

    const normalizeReactionSnapshot = (
        raw: unknown
    ): Record<string, Record<string, string[]>> => {
        if (!raw || typeof raw !== "object") return {};
        const snapshot: Record<string, Record<string, string[]>> = {};
        for (const [messageId, value] of Object.entries(
            raw as Record<string, unknown>
        )) {
            if (typeof messageId !== "string") continue;
            const normalizedMap = normalizeUnknownReactionRecord(value);
            if (Object.keys(normalizedMap).length > 0) {
                snapshot[messageId] = normalizedMap;
            }
        }
        return snapshot;
    };

    const replaceReactionStore = useCallback(
        (snapshot: Record<string, Record<string, string[]>>) => {
            reactionsStoreRef.current = snapshot;
            refreshMessagesFromReactions();
        },
        [refreshMessagesFromReactions]
    );

    const setMessageReactions = useCallback(
        (messageId: string, reactions?: Record<string, string[]>) => {
            const store = reactionsStoreRef.current;
            const normalized = normalizeUnknownReactionRecord(reactions ?? {});
            if (Object.keys(normalized).length === 0) {
                if (store[messageId]) {
                    delete store[messageId];
                    refreshMessagesFromReactions();
                }
                return;
            }
            store[messageId] = normalized;
            refreshMessagesFromReactions();
        },
        [refreshMessagesFromReactions]
    );

    const applyReactionDiff = useCallback(
        (messageId: string, emoji: string, userIds: string[]) => {
            const store = reactionsStoreRef.current;
            const normalizedIds = userIds.filter(
                (id): id is string => typeof id === "string" && id.length > 0
            );
            if (normalizedIds.length === 0) {
                if (store[messageId]) {
                    delete store[messageId][emoji];
                    if (Object.keys(store[messageId]).length === 0) {
                        delete store[messageId];
                    }
                    refreshMessagesFromReactions();
                }
                return;
            }
            if (!store[messageId]) {
                store[messageId] = {};
            }
            store[messageId][emoji] = Array.from(new Set(normalizedIds));
            refreshMessagesFromReactions();
        },
        [refreshMessagesFromReactions]
    );

    const playIncomingMessageTone = useCallback(() => {
        if (typeof window === "undefined") return;
        const AudioContextCtor =
            window.AudioContext ||
            (window as unknown as {
                webkitAudioContext?: typeof AudioContext;
            }).webkitAudioContext;
        if (!AudioContextCtor) return;

        if (
            !audioContextRef.current ||
            audioContextRef.current.state === "closed"
        ) {
            try {
                audioContextRef.current = new AudioContextCtor();
            } catch (error) {
                audioContextRef.current = null;
            }
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
        }

        try {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start(now);
            oscillator.stop(now + 0.35);
        } catch (error) {
            // ignore audio errors (autoplay restrictions, etc.)
        }
    }, []);

    useEffect(() => {
        return () => {
            const ctx = audioContextRef.current;
            if (ctx) {
                try {
                    if (ctx.state !== "closed") {
                        ctx.close().catch(() => {});
                    }
                } catch (error) {
                    // ignore cleanup errors
                }
            }
            audioContextRef.current = null;
        };
    }, []);

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
                if ("reactions" in payload) {
                    replaceReactionStore(
                        normalizeReactionSnapshot(payload.reactions)
                    );
                } else {
                    replaceReactionStore({});
                }
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
        on("chat:reaction", handleIncomingReaction);

        on("connect", handleConnect);
        on("disconnect", handleDisconnect);

        return () => {
            mounted = false;
            try {
                off("message", handlePossibleJoinPayload);
                off("presence", handlePresence);
                off("doc-change", handleDocChange);
                off("chat:new-message", handleIncomingMessage);
                off("chat:reaction", handleIncomingReaction);
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
        setMessageReactions(
            String(normalized.id),
            normalized.reactions ?? {}
        );
        playIncomingMessageTone();
        setMessagesList((current) => upsertMessage(current, normalized));
    };

    const handleIncomingReaction = (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const { docId, messageId, emoji, userIds } = payload as {
            docId?: string;
            messageId?: string | number;
            emoji?: string;
            userIds?: unknown;
        };
        if (docId !== documentId) return;
        if (messageId === undefined || messageId === null) return;
        if (!emoji || typeof emoji !== "string") return;
        const normalizedUsers = Array.isArray(userIds)
            ? userIds.filter(
                  (entry): entry is string =>
                      typeof entry === "string" && entry.length > 0
              )
            : [];
        applyReactionDiff(String(messageId), emoji, normalizedUsers);
    };

    const sendMessage = useCallback(
        (
            outboundMessage: any,
            fallbackId: string
        ): Promise<ChatMessageEntry> => {
            if (!socket) return Promise.reject(new Error("no-socket"));

            return new Promise<ChatMessageEntry>((resolve, reject) => {
                let optimisticKey: string | null = null;
                try {
                    // Optimistically add the message to the list
                    const optimistic = normalizeMessageRecord(
                        outboundMessage,
                        fallbackId
                    );
                    setMessagesList((cur) => upsertMessage(cur, optimistic));
                    optimisticKey = String(optimistic.id);

                    socket.emit(
                        "chat:new-message",
                        { docId: documentId, message: outboundMessage },
                        (ack: any) => {
                            if (ack && ack.ok === true) {
                                const normalized = normalizeMessageRecord(
                                    ack.message ?? outboundMessage
                                );
                                setMessageReactions(
                                    String(normalized.id),
                                    normalized.reactions ?? {}
                                );
                                setMessagesList((cur) => {
                                    const withoutOptimistic = cur.filter(
                                        (item) =>
                                            String(item.id) !==
                                            (optimisticKey ??
                                                String(fallbackId))
                                    );
                                    return upsertMessage(
                                        withoutOptimistic,
                                        normalized
                                    );
                                });
                                return resolve(normalized);
                            }

                            if (ack && ack.ok === false) {
                                const keyToClear =
                                    optimisticKey ?? fallbackId ?? null;
                                if (keyToClear !== null) {
                                    setMessageReactions(String(keyToClear), {});
                                }
                                setMessagesList((cur) =>
                                    cur.filter(
                                        (item) =>
                                            String(item.id) !==
                                            (optimisticKey ??
                                                String(fallbackId))
                                    )
                                );
                                return reject(
                                    new Error(ack.reason || "server_rejected")
                                );
                            }

                            // No ack provided by server — resolve with optimistic message
                            return resolve(optimistic);
                        }
                    );
                } catch (e) {
                    const keyToClear =
                        optimisticKey ?? fallbackId ?? null;
                    if (keyToClear !== null) {
                        setMessageReactions(String(keyToClear), {});
                    }
                    setMessagesList((cur) =>
                        cur.filter(
                            (item) =>
                                String(item.id) !==
                                (optimisticKey ?? String(fallbackId))
                        )
                    );
                    reject(e as Error);
                }
            });
        },
        [socket, documentId]
    );

    const toggleReaction = useCallback(
        (messageId: string | number, emoji: string) => {
            if (!socket) return Promise.reject(new Error("no-socket"));
            const messageKey = String(messageId);
            const emojiKey = String(emoji);
            return new Promise<{
                messageId: string;
                emoji: string;
                userIds: string[];
            }>((resolve, reject) => {
                try {
                    socket.emit(
                        "chat:react",
                        { docId: documentId, messageId: messageKey, emoji: emojiKey },
                        (ack: any) => {
                            if (ack && ack.ok === true) {
                                const reactionPayload =
                                    ack.reaction && typeof ack.reaction === "object"
                                        ? ack.reaction
                                        : null;
                                const userIds = Array.isArray(
                                    reactionPayload?.userIds
                                )
                                    ? (reactionPayload.userIds as unknown[]).filter(
                                          (entry): entry is string =>
                                              typeof entry === "string" &&
                                              entry.length > 0
                                      )
                                    : [];
                                applyReactionDiff(messageKey, emojiKey, userIds);
                                return resolve({
                                    messageId: messageKey,
                                    emoji: emojiKey,
                                    userIds,
                                });
                            }
                            if (ack && ack.ok === false) {
                                return reject(
                                    new Error(ack.reason || "server_rejected")
                                );
                            }
                            // No ack provided; resolve with current snapshot
                            const store = reactionsStoreRef.current;
                            const current =
                                store[messageKey]?.[emojiKey] ?? [];
                            resolve({
                                messageId: messageKey,
                                emoji: emojiKey,
                                userIds: current,
                            });
                        }
                    );
                } catch (error) {
                    reject(error as Error);
                }
            });
        },
        [socket, documentId, applyReactionDiff]
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
        toggleReaction,
        messagesList,
        setMessagesList,
    };
}
