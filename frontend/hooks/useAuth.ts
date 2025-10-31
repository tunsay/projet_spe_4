"use client"
import { useEffect } from "react";
import { useSocketContext } from "../provider/socket";

export const useAuth = () => {
    const { connect, disconnect } = useSocketContext();
    useEffect(() => {
        const handleLogin = (event: Event) => {
            const e = event as CustomEvent;
            console.log('user:login', e.detail);
            connect();
        };

        const handleLogout = (event: Event) => {
            const e = event as CustomEvent;
            console.log('user:logout', e.detail);
            disconnect();
        };

        window.addEventListener('user:login', handleLogin);
        window.addEventListener('user:logout', handleLogout);

        return () => {
            window.removeEventListener('user:login', handleLogin);
            window.removeEventListener('user:logout', handleLogout);
        };
    }, [connect, disconnect]);
};