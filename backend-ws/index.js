import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { canAccessDocument, loadDocumentSnapshot } from "./services/documents.js";
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
        console.log("user", socket.id, "user:", socket.user?.id, "joining doc: missing docId");
        return respond({ ok: false, reason: "missing_docId" }, cb);
      }
  
      // Vérifier droit d'accès (implémenter canAccessDocument)
      const permission = await canAccessDocument(socket.user, docId);
      if (!permission) {
        console.log("user", socket.id, "user:", socket.user?.id, "joining doc:", docId, " - forbidden");
        return respond({ ok: false, reason: "forbidden" }, cb);
      }

  
      // Récupérer état initial (optionnel) : load from DB/cache
      const initialState = await loadDocumentSnapshot(socket.user, docId);
      if (!initialState) {
        console.log("user", socket.id, "user:", socket.user?.id, "joining doc:", docId, " - forbidden");
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
        respond({ ok: true, docId, membersCount, initialState }, cb);
    
        // Notifier les autres membres
        socket.to(room).emit("presence", {
          type: "joined",
          userId: socket.user.id,
          socketId: socket.id,
          membersCount,
        });
        console.log("user", socket.id, "user:", socket.user?.id, "joining doc:", docId, " - success");
      } else {
        return respond({ ok: false, reason: "unsupported_document_type" }, cb);
      }
    } catch (error) {
      console.error("Error in join-document:", error);
      return respond({ ok: false, reason: "internal_error" }, cb);
    }
  });

  // Exemple d'édition (diff/delta)
  socket.on("doc-change", async ({ docId, delta }, cb) => {
    try {
      const room = `document:${docId}`;
      // Validation & autorisation rapide
      if (!socket.rooms.has(room)) return respond({ ok: false, reason: "not_in_room" }, cb);
  
      // Appliquer/persister le delta (optimiste ou via CRDT)
      //await persistDelta(docId, delta, socket.user.id);
  
      // Broadcast à la room (sauf l'émetteur)
      socket.to(room).emit("doc-change", { docId, delta, author: socket.user.id });
  
      respond({ ok: true }, cb);
    } catch (error) {
      console.error("Error in join-document:", error);
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

  socket.on("disconnect", (reason) => {
    console.log("disconnect", socket.id, "reason:", reason);
    // Optionnel : notifier rooms de la départ (presence leave)
    for (const room of socket.rooms) {
      if (room.startsWith("document:")) {
        const clients = io.sockets.adapter.rooms.get(room);
        const membersCount = clients ? clients.size : 0;
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

console.log(`WebSocket server listening on port ${process.env.WS_PORT || 3001}`);

export default io;