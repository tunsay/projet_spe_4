"use client"
import { useAuth } from "@/hooks/useAuth";

export default function Root({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    useAuth();
    return (children);
}
