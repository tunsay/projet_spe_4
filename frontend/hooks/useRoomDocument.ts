import { useEffect, useState, useCallback, useRef } from "react";
import { Socket } from "./useSocket";
import { normalizeMessageRecord, upsertMessage } from "@/utils/message";
import { ChatMessageEntry, DocumentDetail } from "@/types/documents";
import { SessionParticipantEntry } from "@/types/documents";
import { fetchParticipants } from "@/api/participant";
type InitialState = DocumentDetail;

type PresenceEvent = {
    type: "joined" | "left";
    userId?: string;
    socketId?: string;
    membersCount?: number;
};

type DocChangeEvent = {
    docId: string;
    delta: Delta;
    userId: string;
};

type Delta = {
    oldText: { start: number; end: number; text: string };
    newText: { start: number; end: number; text: string };
};

export default function useRoomDocument(socket: Socket | null, documentId: string | null) {
    const [joined, setJoined] = useState(false);
    const [initialState, setInitialState] = useState<InitialState | null>(null);
    const [content, setContent] = useState<string>("");
    const [membersCount, setMembersCount] = useState<number>(0);
    const [participants, setParticipants] = useState<SessionParticipantEntry[]>([]);
    const [lastPresence, setLastPresence] = useState<PresenceEvent | null>(
        null
    );
    const [currentSelection, setCurrentSelection] = useState<{start: number; end: number} | null>(null);
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
            ctx.resume().catch(() => { });
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
                        ctx.close().catch(() => { });
                    }
                } catch (error) {
                    // ignore cleanup errors
                }
            }
            audioContextRef.current = null;
        };
    }, []);

    const applyDeltaToContent = (delta: Delta) => {
        const { newText } = delta;
        setContent(newText.text);
    }

    const updateParticipantSelection = (userId: string, start: number, end: number) => {
        setParticipants((prevParticipants) => prevParticipants.map((participant) => {
            if (participant.userId === userId) {
                return {
                    ...participant,
                    start_position: start,
                    end_position: end,
                    direction: "forward",
                };
            }
            return participant;
        }));
    };

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

        const handlePresence = async (payload: PresenceEvent) => {
            if (!mounted) return;
            setLastPresence(payload);
            if (typeof payload.membersCount === "number")
                setMembersCount(payload.membersCount);
            await fetchParticipants(documentId as string).then(data => {
                if (data) {
                    setParticipants(data);
                }
            })
        };

        const handleDocChange = (payload: DocChangeEvent) => {
            if (!mounted) return;
            if (payload.docId === documentId) {
                applyDeltaToContent(payload.delta);
            }
        };

        // Prepare a join emitter that will run immediately if connected,
        // or once on the next "connect" event. If there is no documentId
        // then we MUST NOT try to join — the hook can be initialized before
        // an id is available.
        const tryJoin = () => {
            if (!documentId) return; // do not join when no id
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

        const tryUnjoin = (reason: any) => {
            if (!documentId) return; // do not unjoin when no id
            try {
                socket.emit("leave-document", { docId: documentId }, (response: any) => {
                    setJoined(false);
                    setJoinError(typeof reason === "string" ? reason : "disconnected");
                });
            } catch (e) {
                console.error("Error emitting leave-document", e);
            }
        }

        // Rejoin on every successful connect (initial or reconnection)
        const handleConnect = () => {
            tryJoin();
        };

        const handleDisconnect = (reason: any) => {
            if (!mounted) return;
            // mark as not joined; we'll try to rejoin on next connect
            tryUnjoin(reason);
        };

        if (socket && socket.connected) {
            if (documentId) tryJoin();
        } else {
            // only attempt to connect if we have a document to join
            try {
                if (documentId) socket.connect();
            } catch (e) {
                // some socket implementations may throw; ignore here
            }
        }

        // Listen for events using the useSocket-provided helpers so listeners are
        // attached to the current shared socket reference.
        socket.on("message", handlePossibleJoinPayload);
        socket.on("presence", handlePresence);
        socket.on("doc-change-server", handleDocChange);
        socket.on("position-update", handlePositionUpdate);
        socket.on("chat:new-message", handleIncomingMessage);
        socket.on("chat:reaction", handleIncomingReaction);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            handleDisconnect("disconnect");
            mounted = false;
            try {
                socket.off("message", handlePossibleJoinPayload);
                socket.off("presence", handlePresence);
                socket.off("doc-change-server", handleDocChange);
                socket.off("position-update", handlePositionUpdate);
                socket.off("chat:new-message", handleIncomingMessage);
                socket.off("chat:reaction", handleIncomingReaction);
                socket.off("connect", handleConnect);
                socket.off("disconnect", handleDisconnect);
            } catch (e) {
                // ignore
            }
        };
    }, [socket, documentId]);

    useEffect(() => {
        if (!initialState) return;

        setContent(initialState.content ?? "");
    }, [initialState]);

   const diffString = (oldText: string, newText: string, selectionStart: number, selectionEnd: number, selectionDirection: "forward" | "backward" | "none") => {
        const startNewText = selectionDirection === "forward" ? selectionStart : selectionEnd;
        const endNewText = selectionDirection === "forward" ? selectionEnd : selectionStart;
        return {
            oldText: { start: currentSelection?.start, end: currentSelection?.end, text: oldText },
            newText: { start: startNewText, end: endNewText, text: newText }
        };
    };
    const updateContent = useCallback(
        (newContent: string, selectionStart: number, selectionEnd: number, selectionDirection: "forward" | "backward" | "none") => {
            if (!socket) return;
            const delta = diffString(content, newContent, selectionStart, selectionEnd, selectionDirection);
            socket.emit(
                "doc-change-client",
                { docId: documentId, delta },
                ({ ok, delta, userId }: { ok: boolean, delta: Delta, userId: string }) => {
                    if (ok === true) {
                        applyDeltaToContent(delta);
                        updateParticipantSelection(userId, delta.newText.start, delta.newText.end);
                        setCurrentSelection({ start: delta.newText.start, end: delta.newText.end });
                    } else {
                        console.log("Content update rejected by server");
                    }
                }
            );
        },
        [content, applyDeltaToContent]
    );

    const handlePositionUpdate = (docId: string, userId: string, start: number, end: number, direction: "backward" | "forward") => {
        if (docId !== documentId) {
            return;
        }
        const participantsUpdated = participants.map(participant => {
            if (participant.userId === userId) {
                participant.start_position = start;
                participant.end_position = end;
                participant.direction = direction;
                return participant;
            } else {
                return participant;
            }
        })
        setParticipants(participantsUpdated);
    }

    const sendNewPosition = useCallback(
        (docId: string, userId: string, start: number, end: number, direction: "backward" | "forward"): Promise<SessionParticipantEntry[]> => {
            if (!socket) return Promise.reject(new Error("no-socket"));

            return new Promise<SessionParticipantEntry[]>((resolve, reject) => {
                try {
                    const participantsUpdated = participants.map(participant => {
                        if (participant.userId === userId) {
                            participant.start_position = start;
                            participant.end_position = end;
                            participant.direction = direction;
                            return participant;
                        } else {
                            return participant;
                        }
                    })
                    socket.emit(
                        "position-update",
                        { docId, userId, start, end, direction },
                        (ack: any) => {
                            if (ack && ack.ok === true) {
                                setParticipants(participantsUpdated);
                                return resolve(participantsUpdated);
                            }

                            if (ack && ack.ok === false) {
                                return reject(new Error(ack.reason || "server_rejected"));
                            }

                            // No ack provided by server — resolve with optimistic message
                            setParticipants(participantsUpdated);
                            return resolve(participantsUpdated);
                        }
                    );
                } catch (e) {
                    reject(e as Error);
                }
            });
        },
        [socket, documentId]
    )

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
            if (!documentId) return Promise.reject(new Error("no-doc"));

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
            if (!documentId) return Promise.reject(new Error("no-doc"));
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
        joined,
        initialState,
        content,
        setContent: updateContent,
        setInitialState,
        membersCount,
        lastPresence,
        joinError,
        handlePositionUpdate,
        sendNewPosition,
        handleIncomingMessage,
        sendMessage,
        toggleReaction,
        messagesList,
        participants,
        setParticipants,
        setMessagesList,
        currentSelection,
        setCurrentSelection,
    };
}
