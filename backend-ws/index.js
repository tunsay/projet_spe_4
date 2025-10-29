import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
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
  console.log("token:", token);
  if (!token) return next(new Error("unauthorized"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.sub, email: payload.email }; // attache user au socket
    return next();
  } catch (err) {
    return next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("user connected", socket.id, "user:", socket.user?.id);

  // Demande de rejoindre un document
  socket.on("join-document", async ({ docId }, ack) => {
    if (!docId) return ack?.({ ok: false, reason: "missing_docId" });

    // Vérifier droit d'accès (implémenter canAccessDocument)
    const ok = true //await canAccessDocument(socket.user.id, docId);
    if (!ok) return ack?.({ ok: false, reason: "forbidden" });

    const room = `document:${docId}`;
    // join crée la room si elle n'existe pas
    socket.join(room);

    // Récupérer état initial (optionnel) : load from DB/cache
    const initialState = {}//await loadDocumentSnapshot(docId);

    // Nombre de membres dans la room
    const clients = io.sockets.adapter.rooms.get(room);
    const membersCount = clients ? clients.size : 0;

    // Notifier le client qu'il a rejoint
    ack?.({ ok: true, docId, membersCount, initialState });

    // Notifier les autres membres
    socket.to(room).emit("presence", {
      type: "joined",
      userId: socket.user.id,
      socketId: socket.id,
      membersCount,
    });
  });

  // Exemple d'édition (diff/delta)
  socket.on("doc-change", async ({ docId, delta }, ack) => {
    const room = `document:${docId}`;
    // Validation & autorisation rapide
    if (!socket.rooms.has(room)) return ack?.({ ok: false, reason: "not_in_room" });

    // Appliquer/persister le delta (optimiste ou via CRDT)
    //await persistDelta(docId, delta, socket.user.id);

    // Broadcast à la room (sauf l'émetteur)
    socket.to(room).emit("doc-change", { docId, delta, author: socket.user.id });

    ack?.({ ok: true });
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnect", socket.id, reason);
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

io.listen(process.env.PORT_WS || 3006);

export default io;