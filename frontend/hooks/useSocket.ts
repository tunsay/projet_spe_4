"use client"
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import type { Socket as SocketIO } from "socket.io-client";

export type Socket = SocketIO;
type SocketEntry = {
    socket: Socket;
    refs: number; // number of hook consumers holding the global socket
    pendingClose?: ReturnType<typeof setTimeout> | null;
};

// Single shared socket entry for the client. We keep a per-document subscription
// map to allow `addDocument` / `removeDocument` semantics.
let globalSocketEntry: SocketEntry | null = null;

const createSocket = (): Socket => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
        transports: ["websocket"],
        auth: {
            token: typeof window !== "undefined" ? window.localStorage.getItem("collaboratif_token") : null,
        },
        path: "/",
    });

    socket.on("connect_error", (err) => {
        console.error("Erreur de connexion Socket.IO:", err);
    });
    socket.on("connect", () => {
        console.log("Socket connecté", "connected: ", socket.connected);
    });
    socket.on("disconnect", (reason, details) => {
        console.log("Socket déconnecté", "reason: ", reason, "connected: ", socket.connected, "details:", details);
    });

    return socket;
};

const acquireGlobalSocket = (): SocketIO => {
    if (globalSocketEntry) {
        globalSocketEntry.refs += 1;
        if (globalSocketEntry.pendingClose) {
            clearTimeout(globalSocketEntry.pendingClose);
            globalSocketEntry.pendingClose = null;
        }
        return globalSocketEntry.socket;
    }

    const socket = createSocket();
    globalSocketEntry = { socket, refs: 1 };
    return socket;
};

const releaseGlobalSocket = () => {
    if (!globalSocketEntry) return;
    globalSocketEntry.refs -= 1;
    if (globalSocketEntry.refs <= 0) {
        try {
            if (globalSocketEntry.pendingClose) {
                clearTimeout(globalSocketEntry.pendingClose);
            }
        } catch (e) {
            // ignore
        }

        globalSocketEntry.pendingClose = setTimeout(() => {
            try {
                globalSocketEntry?.socket.removeAllListeners();
                globalSocketEntry?.socket.disconnect();
            } catch (e) {
                console.error("Erreur lors de la déconnexion du socket:", e);
            }
            globalSocketEntry = null;
        }, 300);
    }
};

type UseSocketReturn = {
    socket: Socket | null;
    connect: () => void;
    disconnect: () => void;
    on: (event: string, cb: (...args: any[]) => void) => void;
    off: (event: string, cb?: (...args: any[]) => void) => void;
    once: (event: string, cb: (...args: any[]) => void) => void;
};

export default function useSocket(): UseSocketReturn {
    // SSR guard: if we're on the server, return a no-op implementation
    if (typeof window === "undefined")
        return {
            socket: null,
            connect: () => {},
            disconnect: () => {},
            on: () => {},
            off: () => {},
            once: () => {},
        };

    const socketRef = useRef<Socket | null>(null);
    const [socketState, setSocketState] = useState<Socket | null>(null);

    useEffect(() => {
        // Acquire or create the global socket for this client
        const socket = acquireGlobalSocket();
        socketRef.current = socket;
        setSocketState(socket);

        return () => {
            // Release the global socket when this hook consumer unmounts
            socketRef.current = null;
            setSocketState(null);
            releaseGlobalSocket();
        };
    }, []); // important: do not depend on documentId here

    const connect = useCallback(() => {
        try {
            socketRef.current?.connect?.();
        } catch (e) {
            // ignore
        }
    }, []);

    const disconnect = useCallback(() => {
        try {
            socketRef.current?.disconnect?.();
        } catch (e) {
            // ignore
        }
    }, []);

    const on = useCallback((event: string, cb: (...args: any[]) => void) => {
        try {
            socketRef.current?.on?.(event, cb);
        } catch (e) {
            // ignore
        }
    }, []);

    const off = useCallback((event: string, cb?: (...args: any[]) => void) => {
        try {
            if (cb) socketRef.current?.off?.(event, cb);
            else socketRef.current?.off?.(event as any);
        } catch (e) {
            // ignore
        }
    }, []);

    const once = useCallback((event: string, cb: (...args: any[]) => void) => {
        try {
            socketRef.current?.once?.(event, cb);
        } catch (e) {
            // ignore
        }
    }, []);

    return {
        socket: socketState,
        connect,
        disconnect,
        on,
        off,
        once,
    };
}
