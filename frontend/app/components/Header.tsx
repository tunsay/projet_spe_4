"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// --- Types et Endpoints ---
interface Profile {
    name: string;
    email: string;
}

const ENDPOINTS = {
    PROFILE_ME: "/api/profile",
    LOGOUT: "/auth/logout",
};

// --- Composant Principal Header ---
export default function Header() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = useCallback(async () => {
        setError(null);
        try {
            await fetch(ENDPOINTS.LOGOUT, { method: "POST" });

            setProfile(null);
            router.push("/login");
        } catch (err) {
            console.error("Erreur de déconnexion:", err);
            setError("Échec de la déconnexion.");
        }
    }, [router]);

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(ENDPOINTS.PROFILE_ME);

                if (response.status === 401 || response.status === 403) {
                    setProfile(null);
                    return;
                }

                if (!response.ok) {
                    console.error(
                        "Erreur lors de la vérification du profil:",
                        response
                    );
                    setError("Erreur serveur.");
                    setProfile(null);
                    return;
                }

                const data: Profile = await response.json();
                setProfile(data);
            } catch (err) {
                console.error(
                    "Erreur réseau lors de la vérification du profil:",
                    err
                );
                setError("Échec de la connexion réseau.");
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const displayName = profile?.name || profile?.email || "Utilisateur";

    // --- Rendu ---
    return (
        <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-backdrop-filter:bg-white/60">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
                <nav className="flex items-center gap-4">
                    <Link href="/" className="font-semibold">
                        Collaboratif
                    </Link>
                    <Link
                        href="/"
                        className="text-sm text-slate-600 hover:text-slate-900"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/documents"
                        className="text-sm text-slate-600 hover:text-slate-900"
                    >
                        Documents
                    </Link>
                </nav>

                {loading ? (
                    <span className="text-sm text-slate-500">
                        Chargement...
                    </span>
                ) : (
                    <div className="flex items-center gap-3">
                        {error ? (
                            <span
                                className="text-sm text-red-600"
                                title={error}
                            >
                                Erreur ❌
                            </span>
                        ) : profile ? (
                            <>
                                <span className="text-sm text-slate-700">
                                    {displayName}{" "}
                                    {profile.name && (
                                        <span className="text-slate-400">
                                            ({profile.email})
                                        </span>
                                    )}
                                </span>
                                <Link
                                    href="/profile"
                                    className="text-sm px-3 py-1.5 rounded-md border hover:bg-slate-50"
                                >
                                    Profil
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:opacity-90"
                                >
                                    Déconnexion
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                                Connexion
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
