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

        // Écouter les mises à jour du profil
        const handleProfileUpdate = () => {
            checkAuth();
        };

        globalThis.addEventListener('profile-updated', handleProfileUpdate);

        return () => {
            globalThis.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [hideHeader, router]);

    const displayName = profile?.name || profile?.email || "Utilisateur";
    const isAdmin = profile?.role === "admin"; // Nouvelle vérification du rôle

    if (hideHeader) {
        return null;
    }

    // --- Rendu ---
    return (
        <header className="top-0 z-20 sticky bg-white/70 supports-backdrop-filter:bg-white/60 backdrop-blur border-b">
            <div className="flex justify-between items-center mx-auto px-4 max-w-6xl h-14">
                <nav className="flex items-center gap-4">
                    <Link href="/" className="font-semibold">
                        WikiDrive
                    </Link>
                    <Link
                        href="/documents"
                        className="text-slate-600 hover:text-slate-900 text-sm"
                    >
                        Documents
                    </Link>

                    {/* 🔑 Lien Admin conditionnel */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="font-medium text-indigo-600 hover:text-indigo-900 text-sm transition-colors duration-150"
                        >
                            Administration
                        </Link>
                    )}
                </nav>

                {loading ? (
                    <span className="text-slate-500 text-sm">
                        Chargement...
                    </span>
                ) : (
                    <div className="flex items-center gap-3">
                        {error ? (
                            <span
                                className="text-red-600 text-sm"
                                title={error}
                            >
                                Erreur ❌
                            </span>
                        ) : profile ? (
                            <>
                                <span className="text-slate-700 text-sm">
                                    {displayName}{" "}
                                    {profile.name && (
                                        <span className="text-slate-400">
                                            ({profile.email})
                                        </span>
                                    )}
                                </span>
                                <Link
                                    href="/profile"
                                    className="hover:bg-slate-50 px-3 py-1.5 border rounded-md text-sm"
                                >
                                    Profil
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="bg-slate-900 hover:opacity-90 px-3 py-1.5 rounded-md text-white text-sm"
                                >
                                    Déconnexion
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-white text-sm"
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
