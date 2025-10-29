// app/(main)/layout.tsx
import type { ReactNode } from "react";
import Header from "@/app/components/Header";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Header />
            {/* si ton Header est sticky/fixed, ajuste le padding-top */}
            <main className="min-h-screen bg-gray-50">{children}</main>
        </>
    );
}
