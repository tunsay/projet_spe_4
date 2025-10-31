"use client";
import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "@/lib/api";
import { handleUnauthorized } from "@/lib/auth";

// --- Endpoints ---
const ENDPOINTS = {
    SETUP: buildApiUrl("/api/profile/2fa-setup"),
    ACTIVATE: buildApiUrl("/api/profile/2fa-activate"),
    DISABLE: buildApiUrl("/api/profile/2fa-disable"),
    PROFILE: buildApiUrl("/api/profile/"),
};

// --- Types spécifiques à la 2FA ---
interface UserProfile {
    id: number | string;
    name: string;
    email: string;
    isTwoFactorEnabled: boolean;
}

interface TwoFaSetupResponse {
    secret: string;
    qrCodeImage: string;
    message: string;
}

// Fonction utilitaire pour gérer les erreurs de fetch
const extractErrorMessage = async (
    response: Response | null,
    err: unknown
): Promise<string> => {
    try {
        if (response && !response.ok) {
            const body = await response.json();
            const msg = body?.message || body?.error;

            if (response.status === 440) return "Code TOTP invalide ou expiré.";
            if (response.status === 401)
                return "Non autorisé. Veuillez vous reconnecter.";

            return msg ?? `Erreur HTTP: ${response.status}`;
        }
    } catch (e) {
        console.error("Erreur de traitement de la réponse:", e);
    }

    if (err instanceof Error) {
        return err.message;
    }
    return "Une erreur inconnue est survenue.";
};

// --- Composant Principal ---
export default function ProfilePage() {
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetupResponse | null>(
        null
    );
    const [isSetupLoading, setIsSetupLoading] = useState(false);
    const [activationToken, setActivationToken] = useState("");
    const [isActivationLoading, setIsActivationLoading] = useState(false);
    const [isDisableLoading, setIsDisableLoading] = useState(false);
    const [pageError, setPageError] = useState("");

    // --- LOGIQUE DE CHARGEMENT INITIAL ---
    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setAuthError(null);

            try {
                const response = await fetch(ENDPOINTS.PROFILE, {
                    credentials: "include",
                });

                if (await handleUnauthorized(response, router)) {
                    return;
                }

                if (!response.ok) {
                    const errorMessage = await extractErrorMessage(
                        response,
                        null
                    );
                    setAuthError(errorMessage);
                    return;
                }

                const data: UserProfile = await response.json();
                setProfile(data);
            } catch (err) {
                console.error("Erreur de chargement du profil:", err);
                setAuthError("Erreur réseau ou inconnue lors du chargement.");
                // router.replace("/login"); // Commenté pour éviter double redirection en cas d'échec
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Gestionnaires d'API (fetch) ---

    const handleSetup2FA = useCallback(async () => {
        setIsSetupLoading(true);
        setPageError("");
        let response: Response | null = null;
        try {
            response = await fetch(ENDPOINTS.SETUP, {
                method: "POST",
                credentials: "include",
            });

            if (await handleUnauthorized(response, router)) {
                return;
            }

            if (!response.ok) {
                const errorMessage = await extractErrorMessage(response, null);
                setPageError(errorMessage);
                return;
            }

            const data: TwoFaSetupResponse = await response.json();
            setTwoFaSetup(data);
        } catch (err) {
            console.error("Erreur de setup 2FA:", err);
            const errorMessage = await extractErrorMessage(response, err);
            setPageError(errorMessage);
        } finally {
            setIsSetupLoading(false);
        }
    }, [router]);

    const handleActivate2FA = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            if (activationToken.length !== 6) {
                setPageError("Le code TOTP doit contenir 6 chiffres.");
                return;
            }

            setIsActivationLoading(true);
            setPageError("");
            let response: Response | null = null;

            try {
                response = await fetch(ENDPOINTS.ACTIVATE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ token: activationToken }),
                });

                if (await handleUnauthorized(response, router)) {
                    return;
                }

                if (!response.ok) {
                    const errorMessage = await extractErrorMessage(
                        response,
                        null
                    );
                    setPageError(errorMessage);
                    return;
                }

                setTwoFaSetup(null);
                setActivationToken("");

                if (profile) {
                    const updatedProfile: UserProfile = {
                        ...profile,
                        isTwoFactorEnabled: true,
                    };
                    setProfile(updatedProfile);
                }
            } catch (err) {
                console.error("Erreur d'activation 2FA:", err);
                const errorMessage = await extractErrorMessage(response, err);
                setPageError(errorMessage);
            } finally {
                setIsActivationLoading(false);
            }
        },
        [activationToken, profile, router]
    );

    const handleDisable2FA = useCallback(async () => {
        setIsDisableLoading(true);
        setPageError("");
        let response: Response | null = null;
        try {
            response = await fetch(ENDPOINTS.DISABLE, {
                method: "POST",
                credentials: "include",
            });

            if (await handleUnauthorized(response, router)) {
                return;
            }

            if (!response.ok) {
                const errorMessage = await extractErrorMessage(response, null);
                setPageError(errorMessage);
                return;
            }

            if (profile) {
                const updatedProfile: UserProfile = {
                    ...profile,
                    isTwoFactorEnabled: false,
                };
                setProfile(updatedProfile);
            }

            setTwoFaSetup(null);
        } catch (err) {
            console.error("Erreur de désactivation 2FA:", err);
            const errorMessage = await extractErrorMessage(response, err);
            setPageError(errorMessage);
        } finally {
            setIsDisableLoading(false);
        }
    }, [profile, router]);

    // --- Retours Anticipés ---
    if (authError) {
        return (
            <div className="p-5 text-red-600 dark:text-red-400">
                Erreur de connexion. Veuillez réessayer.
            </div>
        );
    }

    if (loading || !profile) {
        return (
            <div className="p-5 text-gray-700 dark:text-gray-300">
                Chargement du profil...
            </div>
        );
    }

    // --- Rendu ---
    const is2faEnabled = profile.isTwoFactorEnabled ? "Activé" : "Désactivé";
    const is2faColor = profile.isTwoFactorEnabled
        ? "text-emerald-500"
        : "text-red-500";

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="mx-auto w-full max-w-xl px-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                    <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                        👋 Mon Profil Utilisateur
                    </h1>
                    <hr className="my-4 border-gray-200 dark:border-gray-700" />

                    {/* Affichage des erreurs de la page */}
                    {pageError && (
                        <div className="mb-4 text-sm text-red-800 bg-red-50 dark:bg-red-900/50 dark:text-red-300 p-3 rounded border border-red-300 dark:border-red-700">
                            Erreur: {pageError}
                        </div>
                    )}

                    <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                        Détails du Compte
                    </h2>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300 mb-6">
                        <li>
                            <strong>ID Utilisateur :</strong> {profile.id}
                        </li>
                        <li>
                            <strong>Nom :</strong> {profile.name}
                        </li>
                        <li>
                            <strong>Email :</strong> {profile.email}
                        </li>
                    </ul>

                    <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                        Statut de Sécurité (2FA)
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        L&apos;authentification à deux facteurs est :
                        <strong className={`ml-2 ${is2faColor}`}>
                            {is2faEnabled}
                        </strong>
                    </p>

                    {!profile.isTwoFactorEnabled && (
                        <div className="p-5 mt-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                            {twoFaSetup ? (
                                <>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                        Étape 1 : Scannez le QR Code
                                    </h3>
                                    <div className="mb-4 text-center">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            Scannez ce code avec votre
                                            application d&apos;authentification
                                            :
                                        </p>
                                        <div className="inline-block border border-gray-400 dark:border-gray-500 p-1 rounded-md">
                                            <Image
                                                src={twoFaSetup.qrCodeImage}
                                                alt={`QR Code 2FA pour ${profile.email}`}
                                                width={200}
                                                height={200}
                                                unoptimized
                                            />
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                        Étape 2 : Vérification
                                    </h3>
                                    <form
                                        onSubmit={handleActivate2FA}
                                        className="flex items-center gap-3"
                                    >
                                        <input
                                            type="text"
                                            value={activationToken}
                                            onChange={(e) =>
                                                setActivationToken(
                                                    e.target.value
                                                )
                                            }
                                            maxLength={6}
                                            required
                                            inputMode="numeric"
                                            autoComplete="off"
                                            className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 text-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                            placeholder="Code 6 chiffres"
                                        />
                                        <button
                                            type="submit"
                                            disabled={
                                                isActivationLoading ||
                                                activationToken.length !== 6
                                            }
                                            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isActivationLoading
                                                ? "Vérification..."
                                                : "Confirmer & Activer"}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                                        Cliquez pour sécuriser votre compte.
                                    </p>
                                    <button
                                        onClick={handleSetup2FA}
                                        disabled={isSetupLoading}
                                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSetupLoading
                                            ? "Génération..."
                                            : "Activer le 2FA 🔑"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {profile.isTwoFactorEnabled && (
                        <button
                            onClick={handleDisable2FA}
                            disabled={isDisableLoading}
                            className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                        >
                            {isDisableLoading
                                ? "Désactivation..."
                                : "Désactiver le 2FA"}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
