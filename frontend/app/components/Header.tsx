"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildApiUrl } from "@/lib/api";
import { performLogout } from "@/lib/auth";

// --- Types et Endpoints ---
// ⚠️ Mise à jour de l'interface pour inclure le rôle
interface Profile {
    name: string;
    email: string;
    role: "admin" | "user"; // Ajout du rôle
}

const PROFILE_ENDPOINT = buildApiUrl("/api/profile");

// --- Composant Principal Header ---
export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const hideHeader = pathname?.startsWith("/profile/2fa");
    // Utilisation du type Profile mis à jour
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = useCallback(async () => {
        setError(null);
        try {
            await performLogout(router);
            setProfile(null);
        } catch (err) {
            console.error("Erreur de déconnexion:", err);
            setError("Échec de la déconnexion.");
        }
    }, [router]);

    useEffect(() => {
        const checkAuth = async () => {
            if (hideHeader) {
                setLoading(false);
                setProfile(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Note: Le point de terminaison de profil est /api/profile
                const response = await fetch(PROFILE_ENDPOINT, {
                    credentials: "include",
                });

                if (response.status === 401) {
                    await performLogout(router);
                    return;
                }

                if (response.status === 403) {
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

                // Assurez-vous que l'API renvoie bien le champ 'role'
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
    }, [hideHeader, router]);

    const displayName = profile?.name || profile?.email || "Utilisateur";
    const isAdmin = profile?.role === "admin"; // Nouvelle vérification du rôle

    if (hideHeader) {
        return null;
    }

    // --- Rendu ---
    return (
        <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-backdrop-filter:bg-white/60">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
                <nav className="flex items-center gap-4">
                    <Link href="/" className="font-semibold">
                        WikiDrive
                    </Link>
                    <Link
                        href="/documents"
                        className="text-sm text-slate-600 hover:text-slate-900"
                    >
                        Documents
                    </Link>

                    {/* 🔑 Lien Admin conditionnel */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="text-sm text-indigo-600 font-medium hover:text-indigo-900 transition-colors duration-150"
                        >
                            Administration
                        </Link>
                    )}
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
