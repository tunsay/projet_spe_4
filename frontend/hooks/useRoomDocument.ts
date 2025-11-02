import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Socket } from "./useSocket";
import { normalizeMessageRecord, upsertMessage } from "@/utils/message";
import {
    ChatMessageEntry,
    DocumentDetail,
    SaveState,
    SessionParticipantEntry
} from "@/types/documents";
import toBase64 from "@/utils/toBase64";
import { fetchParticipants } from "@/api/participant";

type InitialState = DocumentDetail;

type PresenceEvent = {
    type: "joined" | "left";
    userId?: string;
    socketId?: string;
    membersCount?: number;
};

type DocChangeEvent = {
    ok: boolean;
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

    const [author, setAuthor] = useState<string>("");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [persistedContent, setPersistedContent] = useState<string>("");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [currentSelection, setCurrentSelection] = useState<{ start: number; end: number } | null>(null);
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

    const saveIndicator = useMemo(() => {
        switch (saveState) {
            case "saving":
                return "Enregistrement…";
            case "saved":
                return "Enregistré";
            case "error":
                return "Erreur de sauvegarde";
            default:
                return content === persistedContent
                    ? "À jour"
                    : "Modifications en attente";
        }
    }, [saveState, content, persistedContent]);

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
                //setAuthor(payload.author || "Unknown");
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

        const docChangeFromOtherClientEnd = (payload: DocChangeEvent) => {
            if (!mounted) return;
            if (payload.docId === documentId) {
                if (payload.ok === false) {
                    setSaveState("error");
                } else {
                    applyDeltaToContent(payload.delta);
                }
            }
        };

        const docChangeFromOtherClientLaunch = (payload: Omit<DocChangeEvent, "ok">) => {
            if (!mounted) return;
            if (payload.docId === documentId) {
                setSaveState("saving");
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

        const handleDocumentSaved = (payload: DocumentDetail) => {
            if (!mounted) return;
            if (payload.id === documentId) {
                setPersistedContent(payload.content ?? "");
                setLastSavedAt(payload.last_modified_at ? new Date(payload.last_modified_at) : null);
                if (initialState && payload.last_modified_at) {
                    setInitialState({
                        ...initialState,
                        last_modified_at: payload.last_modified_at,
                    })
                }
            }
            setSaveState("saved");
        };

        // Listen for events using the useSocket-provided helpers so listeners are
        // attached to the current shared socket reference.
        socket.on("message", handlePossibleJoinPayload);
        socket.on("presence", handlePresence);
        socket.on("doc-change-from-other-client:launch", docChangeFromOtherClientLaunch);
        socket.on("doc-change-from-other-client:end", docChangeFromOtherClientEnd);
        socket.on("document:saved", handleDocumentSaved);
        socket.on("chat:new-audio", handleIncomingAudio);
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
                socket.off("doc-change-from-other-client:launch", docChangeFromOtherClientLaunch);
                socket.off("doc-change-from-other-client:end", docChangeFromOtherClientEnd);
                socket.off("document:saved", handleDocumentSaved);
                socket.off("chat:new-audio", handleIncomingAudio);
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
        setPersistedContent(initialState.content ?? "");
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
            if (newContent === content) return;
            setSaveState("saving");
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
                        setSaveState("error");
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
    
    async function playBlobAudio(ctx: AudioContext, arrayBuffer: ArrayBuffer) {
        // try modern promise form first, with slice(0) to avoid view/offset problems
        try {
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            } catch (e) {
                // older Safari / weird implementations: use callback form
                audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
                    try {
                        ctx.decodeAudioData(
                            arrayBuffer.slice(0),
                            (buf) => resolve(buf),
                            (err) => reject(err)
                        );
                    } catch (err) {
                        reject(err);
                    }
                });
            }
            const src = ctx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(ctx.destination);
            src.start();
        } catch (err) {
            // rethrow so caller can fallback to blob playback
            throw err;
        }
    }


function normalizeIncomingToArrayBuffer(data: unknown): ArrayBuffer | null {
    if (!data) return null;
    // native ArrayBuffer
    if (data instanceof ArrayBuffer) return data;
    // TypedArray / DataView
    if (ArrayBuffer.isView(data)) {
        const view = data as ArrayBufferView;
         const buf = view.buffer;
        // If it's a plain ArrayBuffer we can slice the needed region directly
        if (buf instanceof ArrayBuffer) {
            return buf.slice(view.byteOffset, view.byteOffset + view.byteLength);
        }
        // If it's a SharedArrayBuffer (or other) make a copy into a new ArrayBuffer
        try {
            const copy = new Uint8Array(view.byteLength);
            copy.set(new Uint8Array(buf as any, view.byteOffset, view.byteLength));
            return copy.buffer;
        } catch (e) {
            return null;
        }
    }
    // socket.io may serialize Node Buffer as { type: 'Buffer', data: [...] }
    if (typeof data === "object" && (data as any).data && Array.isArray((data as any).data)) {
        try {
            const u8 = new Uint8Array((data as any).data);
            return u8.buffer;
        } catch (e) {
            return null;
        }
    }
    // base64 string
    if (typeof data === "string") {
        try {
            const b64 = data.includes(",") ? data.split(",").pop()! : data;
            const binary = atob(b64);
            const len = binary.length;
            const u8 = new Uint8Array(len);
            for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
            return u8.buffer;
        } catch (e) {
            return null;
        }
    }
    return null;
}

    const handleIncomingAudio = async ({ docId, data }: { docId: string, data: string }) => {
        if (docId !== documentId) {
            return;
        }
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
            console.log("lecture data", typeof data, data, "data");
            const arrayBuffer = normalizeIncomingToArrayBuffer(data);
            console.log("arrayBuffer", arrayBuffer);

            if (arrayBuffer) {
                try {
                    await playBlobAudio(ctx, arrayBuffer);
                    return;
                } catch (err) {
                    // decoding failed — fallthrough to Blob fallback
                    console.warn("decodeAudioData failed, falling back to blob playback:", err);
                }
            }
        } catch (error) {
            console.log("Erreur de lecture audio entrante :", error);
            // ignore audio errors (autoplay restrictions, etc.)
        }
    };

    const sendAudio = useCallback(
        async (
            docId : string,
            data : Blob
        ): Promise<boolean> => {
            if (!socket) return await Promise.reject(new Error("no-socket"));
            if (!docId) return await Promise.reject(new Error("no-doc"));
            const base64 = await toBase64(data);
            console.log(`Le blob audio est : ${data} : type ${typeof data}, data.type: ${data.type}, size ${data.size}`, "base64", base64, "base64 type", typeof base64);
            return new Promise<boolean>((resolve, reject) => {
                try {
                    socket.emit(
                        "chat:new-audio",
                        { docId: docId, data: base64 },
                        (ack: any) => {
                            if (ack && ack.ok === true) {
                                return resolve(true);
                            }
                            return reject(false)
                        }
                    );
                } catch (e) {
                    return reject(e as Error);
                }
            })
        }, [socket]
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

    const initialize = useCallback((doc: DocumentDetail | null) => {
        if (!doc) return;
        setInitialState(doc);
        setContent(doc.content ?? "");
        setPersistedContent(doc.content ?? "");
        setLastSavedAt(
            doc.last_modified_at ? new Date(doc.last_modified_at) : null
        );
    }, []);

    return {
        joined,
        initialState,
        content,
        setContent: updateContent,
        setInitialState: initialize,
        membersCount,
        lastPresence,
        joinError,
        handlePositionUpdate,
        sendNewPosition,
        handleIncomingMessage,
        sendMessage,
        handleIncomingAudio,
        sendAudio,
        toggleReaction,
        messagesList,
        participants,
        setParticipants,
        setMessagesList,
        currentSelection,
        setCurrentSelection,
        saveState,
        saveIndicator,
        lastSavedAt,
        setLastSavedAt,
        author,
        setAuthor,
    };
}
