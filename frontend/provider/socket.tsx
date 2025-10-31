"use client"
import React, { createContext, useContext } from "react";
import useSocket from "../hooks/useSocket";

// Derive the context type from the hook return type so we don't need to
// re-declare the shape. ReturnType is usable because useSocket is a function.
type SocketContextType = ReturnType<typeof useSocket>;

// A no-op/default implementation used for SSR or when no document id is provided.
const EMPTY: SocketContextType = {
    socket: null,
    connect: () => {},
    disconnect: () => {},
    on: () => {},
    off: () => {},
    once: () => {},
};

const SocketContext = createContext<SocketContextType>(EMPTY);

export function SocketProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Call the hook unconditionally (it's SSR-safe). The hook now only manages
    // the socket lifecycle; document join/leave is handled elsewhere.
    const socketApi = useSocket();

    return <SocketContext.Provider value={socketApi}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
    const ctx = useContext(SocketContext);
    // Always return the context (never null) because we created it with a default.
    // But in case someone wraps components incorrectly, throw a helpful error.
    if (!ctx) throw new Error("useSocketContext must be used within a SocketProvider");
    return ctx;
}

export default SocketProvider;
