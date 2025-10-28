import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("message", (msg) => {
        console.log("message received: " + msg);
        socket.send("Echo: " + msg);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});

app.get("/", (req, res) => {
    console.log("GET /");
    res.send("WebSocket server is running.");
});

httpServer.listen(process.env.PORT || 3005, () => {
    console.log("process.env.PORT", process.env.PORT);
});


export default app;