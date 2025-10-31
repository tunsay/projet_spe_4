import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import {
    canAccessDocument,
    loadDocumentSnapshot,
} from "./services/documents.js";
import {
    openSession,
    closeSession
} from "./services/sessions.js";
import { persistChatMessage } from "./services/messages.js";
dotenv.config();

const io = new Server({
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ["websocket", "polling"],
    },
    allowEIO3: true,
    path: "/",
});

const reactionStore = new Map();

const getDocumentReactionStore = (docId) => {
    let docStore = reactionStore.get(docId);
    if (!docStore) {
        docStore = new Map();
        reactionStore.set(docId, docStore);
    }
    return docStore;
};

const serializeMessageReactions = (docId, messageId) => {
    const docStore = reactionStore.get(docId);
    if (!docStore) return {};
    const messageStore = docStore.get(messageId);
    if (!messageStore) return {};
    const result = {};
    for (const [emoji, users] of messageStore.entries()) {
        if (users.size > 0) {
            result[emoji] = Array.from(users);
        }
    }
    return result;
};

const serializeDocumentReactions = (docId) => {
    const docStore = reactionStore.get(docId);
    if (!docStore) return {};
    const result = {};
    for (const [messageId, emojiMap] of docStore.entries()) {
        const serialized = {};
        for (const [emoji, users] of emojiMap.entries()) {
            if (users.size > 0) {
                serialized[emoji] = Array.from(users);
            }
        }
        if (Object.keys(serialized).length > 0) {
            result[messageId] = serialized;
        }
    }
    return result;
};

// Middleware d'auth au handshake
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("unauthorized"));

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: payload.userId, email: payload.userEmail, token };
        return next();
    } catch (err) {
        return next(new Error("unauthorized"));
    }
});

io.on("connection", (socket) => {
    console.log("user connected", socket.id, "user:", socket.user?.id);

    // Helper to respond either via ack callback or via the legacy 'message' event
    const respond = (payload, cb) => {
        try {
            if (typeof cb === "function") return cb(payload);
        } catch (err) {
            // ignore ack errors
        }
        // Fallback for older clients expecting an unnamed message
        try {
            socket.emit("message", payload);
        } catch (e) {
            console.error("Failed to send fallback message response:", e);
        }
    };

    // Demande de rejoindre un document
    socket.on("join-document", async ({ docId }, cb) => {
        try {
            if (!docId) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "joining doc: missing docId"
                );
                return respond({ ok: false, reason: "missing_docId" }, cb);
            }

            // Vérifier droit d'accès (implémenter canAccessDocument)
            const permission = await canAccessDocument(socket.user, docId);
            if (!permission) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "joining doc:",
                    docId,
                    " - forbidden"
                );
                return respond({ ok: false, reason: "forbidden" }, cb);
            }

            // Récupérer état initial (optionnel) : load from DB/cache
            const initialState = await loadDocumentSnapshot(socket.user, docId);
            if (!initialState) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "joining doc:",
                    docId,
                    " - forbidden"
                );
                return socket.emit({ ok: false, reason: "forbidden" });
            }
            if (initialState.type === "text") {
                const room = `document:${docId}`;
                // join crée la room si elle n'existe pas
                socket.join(room);
                // Nombre de membres dans la room
                const clients = io.sockets.adapter.rooms.get(room);
                const membersCount = clients ? clients.size : 0;

                // Notifier le client qu'il a rejoint
                respond(
                    {
                        ok: true,
                        docId,
                        membersCount,
                        initialState,
                        reactions: serializeDocumentReactions(docId),
                    },
                    cb
                );

                await openSession(socket.user, docId);
                // Notifier les autres membres
                socket.to(room).emit("presence", {
                    type: "joined",
                    userId: socket.user.id,
                    socketId: socket.id,
                    membersCount,
                });
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "joining doc:",
                    docId,
                    " - success"
                );
            } else {
                return respond(
                    { ok: false, reason: "unsupported_document_type" },
                    cb
                );
            }
        } catch (error) {
            console.error("Error in join-document:", error);
            return respond({ ok: false, reason: "internal_error" }, cb);
        }
    });

    socket.on("leave-document", async ({ docId }, cb) => {
        try {
            if (!docId) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "leaving doc: missing docId"
                );
                return respond({ ok: false, reason: "missing_docId" }, cb);
            }

            const room = `document:${docId}`;
            if (!socket.rooms.has(room)) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "leave-document - not joined",
                    room
                );
                return respond({ ok: false, reason: "not_joined" }, cb);
            }

            await socket.leave(room);

            const clients = io.sockets.adapter.rooms.get(room);
            const membersCount = clients ? clients.size : 0;

            await closeSession(socket.user, docId);

            // Notify other members that this socket left
            socket.to(room).emit("presence", {
                type: "left",
                userId: socket.user?.id,
                socketId: socket.id,
                membersCount,
            });
            console.log(
                "user",
                socket.id,
                "user:",
                socket.user?.id,
                "left doc:",
                docId,
                "membersCount:",
                membersCount
            );

            return respond(
                {
                    ok: true,
                    docId,
                    membersCount,
                    reactions: serializeDocumentReactions(docId),
                },
                cb
            );
        } catch (error) {
            console.error("Error in leave-document:", error);
            return respond({ ok: false, reason: "internal_error" }, cb);
        }
    });

    // Exemple d'édition (diff/delta)
    socket.on("doc-change-client", async ({ docId, delta }, cb) => {
        try {
            const room = `document:${docId}`;
            // Validation & autorisation rapide
            console.log("doc-change-client received for docId:", docId, "delta:", delta);
            if (!socket.rooms.has(room)) {
                console.log(
                    "user",
                    socket.id,
                    "user:",
                    socket.user?.id,
                    "doc change - ",
                    "room",
                    room,
                    "docId",
                    docId,
                    " - not_exist"
                );
                return respond({ ok: false, reason: "not_exist" }, cb);
            }

            // Appliquer/persister le delta (optimiste ou via CRDT)
            //await persistDelta(docId, delta, socket.user.id);
            console.log("doc-change-client broadcasted to room:", room);

            // Broadcast à la room (sauf l'émetteur)
            socket
                .to(room)
                .emit("doc-change-server", { docId, delta, userId: socket.user?.id });
            console.log("doc-change-client broadcasted to room:", room);
            console.log(
                "user",
                socket.id,
                "user:",
                socket.user?.id,
                "doc change - ",
                "room",
                room,
                "docId",
                docId,
                " - success"
            );
            return respond({ ok: true, delta, userId: socket.user?.id }, cb);
        } catch (error) {
            console.error("Error in join-document:", error);
            return respond({ ok: false, reason: "internal_error" }, cb);
        }
    });

    socket.on("position-update", async ({ docId, userId, start, end, direction }, cb) => {
      try{
        if(!docId || !userId || !start || !end || ! direction){
          return respond({ ok: false, reason: "invalid_informations" }, cb)
        }

        const room = `document:${docId}`;
        if (!socket.rooms.has(room)) {
          console.log("user", socket.id, "position-update rejected (not in room)", room);
          return respond({ ok: false, reason: "not_joined" }, cb);
        }
        socket.to(room).emit("position-update", { docId, userId, start, end, direction})
        return respond({ ok: true }, cb);
      } catch (error) {
        console.error("Error in position-update:", error);
        return respond({ ok: false, reason: "internal_error" }, cb);
      }
      
    })

    socket.on("chat:new-message", async ({ docId, message }, cb) => {
        try {
            if (!docId || !message) {
                return respond({ ok: false, reason: "invalid_payload" }, cb);
            }

            const room = `document:${docId}`;
            if (!socket.rooms.has(room)) {
                console.log(
                    "user",
                    socket.id,
                    "chat:new-message rejected (not in room)",
                    room
                );
                return respond({ ok: false, reason: "not_joined" }, cb);
            }
            console.log("message before broadcast");
            const persistedMessage = await persistChatMessage(
                socket.user,
                docId,
                message
            );
            const existingAuthor =
                persistedMessage &&
                typeof persistedMessage === "object" &&
                persistedMessage.author &&
                typeof persistedMessage.author === "object"
                    ? persistedMessage.author
                    : {};
            const enrichedAuthor = {
                id:
                    existingAuthor.id ??
                    persistedMessage?.user_id ??
                    socket.user.id,
                email:
                    existingAuthor.email ??
                    socket.user.email ??
                    null,
                display_name:
                    (existingAuthor.display_name &&
                        existingAuthor.display_name.trim &&
                        existingAuthor.display_name.trim()) ||
                    (existingAuthor.name &&
                        existingAuthor.name.trim &&
                        existingAuthor.name.trim()) ||
                    (socket.user.displayName &&
                        socket.user.displayName.trim &&
                        socket.user.displayName.trim()) ||
                    (socket.user.email &&
                        typeof socket.user.email === "string" &&
                        socket.user.email.trim()) ||
                    socket.user.id,
            };
            const rawMessageId =
                (persistedMessage && (persistedMessage.id || persistedMessage.message_id)) ??
                (message && message.id);
            const messageId =
                rawMessageId !== undefined && rawMessageId !== null
                    ? String(rawMessageId)
                    : undefined;
            const enrichedMessage = {
                ...persistedMessage,
                id: messageId ?? persistedMessage?.id ?? message?.id,
                user_id: persistedMessage?.user_id ?? socket.user.id,
                author: enrichedAuthor,
                reactions:
                    messageId !== undefined
                        ? serializeMessageReactions(docId, messageId)
                        : {},
            };
            socket
                .to(room)
                .emit("chat:new-message", { docId, message: enrichedMessage });
            console.log("message after broadcast");
            return respond({ ok: true, message: enrichedMessage }, cb);
        } catch (error) {
            console.error("Error in chat:new-message:", error);
            const reason =
                (error && typeof error === "object" && "message" in error
                    ? error.message
                    : null) || "internal_error";
            return respond({ ok: false, reason }, cb);
        }
    });

    socket.on("chat:react", ({ docId, messageId, emoji }, cb) => {
        try {
            if (
                !docId ||
                messageId === undefined ||
                messageId === null ||
                !emoji
            ) {
                return respond({ ok: false, reason: "invalid_payload" }, cb);
            }

            const room = `document:${docId}`;
            if (!socket.rooms.has(room)) {
                return respond({ ok: false, reason: "not_joined" }, cb);
            }

            const normalizedMessageId = String(messageId);
            const normalizedEmoji = String(emoji).trim();
            if (!normalizedEmoji) {
                return respond({ ok: false, reason: "invalid_emoji" }, cb);
            }
            const docStore = getDocumentReactionStore(docId);
            let messageMap = docStore.get(normalizedMessageId);
            if (!messageMap) {
                messageMap = new Map();
                docStore.set(normalizedMessageId, messageMap);
            }
            let userSet = messageMap.get(normalizedEmoji);
            if (!userSet) {
                userSet = new Set();
                messageMap.set(normalizedEmoji, userSet);
            }

            if (userSet.has(socket.user.id)) {
                userSet.delete(socket.user.id);
                if (userSet.size === 0) {
                    messageMap.delete(normalizedEmoji);
                }
            } else {
                userSet.add(socket.user.id);
            }

            if (messageMap.size === 0) {
                docStore.delete(normalizedMessageId);
            }

            if (docStore.size === 0) {
                reactionStore.delete(docId);
            }

            const updatedUsers =
                messageMap.get(normalizedEmoji) && messageMap.get(normalizedEmoji).size > 0
                    ? Array.from(messageMap.get(normalizedEmoji))
                    : [];

            const reactionPayload = {
                docId,
                messageId: normalizedMessageId,
                emoji: normalizedEmoji,
                userIds: updatedUsers,
            };

            socket.to(room).emit("chat:reaction", reactionPayload);
            return respond({ ok: true, reaction: reactionPayload }, cb);
        } catch (error) {
            console.error("Error in chat:react:", error);
            return respond({ ok: false, reason: "internal_error" }, cb);
        }
    });

    socket.on("ping", () => {
        console.log("ping from", socket.id);
        socket.emit("pong");
    });

    socket.on("message", (payload) => {
        console.log("raw message from", socket.id, payload);
        // Par défaut, socket.send envoie l'événement "message"
    });

    socket.on("disconnect", async (reason) => {
        console.log("disconnect", socket.id, "reason:", reason);
        // Optionnel : notifier rooms de la départ (presence leave)
        for (const room of socket.adapter.rooms) {
            const roomName = Array.from(room)[0];
            if (roomName?.startsWith("document:")) {
                const docId = roomName?.split(":")[1];
                const clients = io.sockets.adapter.rooms.get(room);
                const membersCount = clients ? clients.size : 0;
                await closeSession(socket.user, docId);
                socket.to(room).emit("presence", {
                    type: "left",
                    userId: socket.user?.id,
                    socketId: socket.id,
                    membersCount,
                });
            }
        }
    });
});

io.listen(process.env.WS_PORT || 3001);

console.log(
    `WebSocket server listening on port ${process.env.WS_PORT || 3001}`
);

export default io;
