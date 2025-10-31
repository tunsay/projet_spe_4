import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

type SocketEntry = {
    socket: Socket;
    refs: number;
    pendingClose?: ReturnType<typeof setTimeout> | null;
};

// Map documentId -> socket entry. Ensures a single socket per document per client.
const sockets = new Map<string, SocketEntry>();

const createSocketForDocument = (documentId: string): Socket => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
        transports: ["websocket"],
        auth: {
            token: typeof window !== "undefined" ? window.localStorage.getItem("collaboratif_token") : null,
        },
        // include the document id so server-side can associate the connection if needed
        // match server path (server uses `path: '/'`)
        path: "/",
    });

    socket.on("connect_error", (err) => {
        console.error("Erreur de connexion Socket.IO:", err, "for document:", documentId);
    });
    socket.on("connect", () => {
        console.log(`Socket connecté pour document ${documentId}`, "connected: ", socket.connected);
    });
    socket.on("disconnect", (reason, details) => {
        console.log(`Socket déconnecté pour document ${documentId}`, "reason: ", reason, "connected: ", socket.connected, "details:", details);
    });

    return socket;
};

const acquireSocket = (documentId: string): Socket => {
    const existing = sockets.get(documentId);
    if (existing) {
        existing.refs += 1;
        // if a pending close was scheduled, cancel it because a new consumer appeared
        if (existing.pendingClose) {
            clearTimeout(existing.pendingClose as ReturnType<typeof setTimeout>);
            existing.pendingClose = null;
        }
        return existing.socket;
    }

    const socket = createSocketForDocument(documentId);
    sockets.set(documentId, { socket, refs: 1 });
    return socket;
};

const releaseSocket = (documentId: string) => {
    const entry = sockets.get(documentId);
    if (!entry) return;

    entry.refs -= 1;
    if (entry.refs <= 0) {
        // Delay final disconnect to avoid rapid connect/disconnect cycles
        // (React StrictMode mounts/unmounts in development, hot reload, etc.)
        try {
            if (entry.pendingClose) {
                clearTimeout(entry.pendingClose);
            }
        } catch (e) {
            // ignore
        }

        entry.pendingClose = setTimeout(() => {
            try {
                entry.socket.removeAllListeners();
                entry.socket.disconnect();
            } catch (e) {
                console.error("Erreur lors de la déconnexion du socket:", e);
            }
            sockets.delete(documentId);
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

export default function useSocket(documentId: string): UseSocketReturn {
    // SSR guard and invalid id guard
    if (typeof window === "undefined" || !documentId)
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
        // Acquire or create the socket for this document
        const socket = acquireSocket(documentId);
        socketRef.current = socket;
        setSocketState(socket);

        return () => {
            // Release the socket for this document when the component unmounts
            socketRef.current = null;
            setSocketState(null);
            releaseSocket(documentId);
        };
    }, [documentId]);

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
