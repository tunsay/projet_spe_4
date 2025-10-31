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
    UPDATE: buildApiUrl("/api/profile/"),
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

    // États pour la mise à jour du profil
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState("");

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

    const handleUpdateProfile = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setIsUpdateLoading(true);
            setPageError("");
            setUpdateSuccess("");

            // Validation côté client
            if (!newName && !newPassword) {
                setPageError("Veuillez renseigner au moins un champ à modifier.");
                setIsUpdateLoading(false);
                return;
            }

            if (newName && newName.trim().length === 0) {
                setPageError("Le nom ne peut pas être vide.");
                setIsUpdateLoading(false);
                return;
            }

            if (newPassword && newPassword.length < 8) {
                setPageError("Le mot de passe doit contenir au minimum 8 caractères.");
                setIsUpdateLoading(false);
                return;
            }

            if (newPassword && newPassword !== confirmPassword) {
                setPageError("Les mots de passe ne correspondent pas.");
                setIsUpdateLoading(false);
                return;
            }

            let response: Response | null = null;

            try {
                const body: { name?: string; password?: string } = {};
                if (newName?.trim()) body.name = newName.trim();
                if (newPassword) body.password = newPassword;

                response = await fetch(ENDPOINTS.UPDATE, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
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

                const data = await response.json();
                
                // Mettre à jour le profil avec les nouvelles données
                if (profile) {
                    const updatedProfile: UserProfile = {
                        ...profile,
                        name: data.name || profile.name,
                    };
                    setProfile(updatedProfile);
                }

                setUpdateSuccess("Profil mis à jour avec succès !");
                setNewName("");
                setNewPassword("");
                setConfirmPassword("");
                setIsEditingProfile(false);
            } catch (err) {
                console.error("Erreur de mise à jour du profil:", err);
                const errorMessage = await extractErrorMessage(response, err);
                setPageError(errorMessage);
            } finally {
                setIsUpdateLoading(false);
            }
        },
        [newName, newPassword, confirmPassword, profile, router]
    );

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
        <main className="bg-gray-50 dark:bg-gray-900 py-10 min-h-screen">
            <div className="mx-auto px-4 w-full max-w-xl">
                <div className="bg-white dark:bg-gray-800 shadow-2xl p-8 border border-gray-100 dark:border-gray-700 rounded-xl">
                    <h1 className="mb-2 font-bold text-gray-900 dark:text-gray-100 text-2xl">
                        👋 Mon Profil Utilisateur
                    </h1>
                    <hr className="my-4 border-gray-200 dark:border-gray-700" />

                    {/* Affichage des erreurs de la page */}
                    {pageError && (
                        <div className="bg-red-50 dark:bg-red-900/50 mb-4 p-3 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-300 text-sm">
                            Erreur: {pageError}
                        </div>
                    )}

                    {/* Affichage des succès */}
                    {updateSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/50 mb-4 p-3 border border-green-300 dark:border-green-700 rounded text-green-800 dark:text-green-300 text-sm">
                            {updateSuccess}
                        </div>
                    )}

                    <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-xl">
                        Détails du Compte
                    </h2>
                    <ul className="space-y-1 mb-6 text-gray-700 dark:text-gray-300">
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

                    {/* Section de modification du profil */}
                    <div className="bg-gray-50 dark:bg-gray-700 mb-6 p-5 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-xl">
                                Modifier mon profil
                            </h2>
                            <button
                                onClick={() => {
                                    setIsEditingProfile(!isEditingProfile);
                                    setPageError("");
                                    setUpdateSuccess("");
                                    setNewName("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                }}
                                className="font-medium text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-300 dark:text-indigo-400 text-sm"
                            >
                                {isEditingProfile ? "Annuler" : "Modifier"}
                            </button>
                        </div>

                        {isEditingProfile && (
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="newName"
                                        className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm"
                                    >
                                        Nouveau nom (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        id="newName"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={profile.name}
                                        className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 focus:border-indigo-500 dark:border-gray-600 rounded-lg focus:ring-indigo-500 w-full text-gray-900 dark:text-gray-100 transition duration-150"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="newPassword"
                                        className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm"
                                    >
                                        Nouveau mot de passe (optionnel)
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 8 caractères"
                                        className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 focus:border-indigo-500 dark:border-gray-600 rounded-lg focus:ring-indigo-500 w-full text-gray-900 dark:text-gray-100 transition duration-150"
                                    />
                                </div>

                                {newPassword && (
                                    <div>
                                        <label
                                            htmlFor="confirmPassword"
                                            className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm"
                                        >
                                            Confirmer le mot de passe
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(e.target.value)
                                            }
                                            placeholder="Confirmer le mot de passe"
                                            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 focus:border-indigo-500 dark:border-gray-600 rounded-lg focus:ring-indigo-500 w-full text-gray-900 dark:text-gray-100 transition duration-150"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isUpdateLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-md px-4 py-2.5 rounded-lg w-full font-semibold text-white transition duration-150 disabled:cursor-not-allowed"
                                >
                                    {isUpdateLoading
                                        ? "Mise à jour..."
                                        : "Enregistrer les modifications"}
                                </button>
                            </form>
                        )}
                    </div>

                    <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-xl">
                        Statut de Sécurité (2FA)
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        L&apos;authentification à deux facteurs est :{" "}
                        <strong className={`ml-2 ${is2faColor}`}>
                            {is2faEnabled}
                        </strong>
                    </p>

                    {!profile.isTwoFactorEnabled && (
                        <div className="bg-gray-50 dark:bg-gray-700 mt-4 p-5 border border-gray-300 dark:border-gray-600 rounded-lg">
                            {twoFaSetup ? (
                                <>
                                    <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                        Étape 1 : Scannez le QR Code
                                    </h3>
                                    <div className="mb-4 text-center">
                                        <p className="mb-2 text-gray-700 dark:text-gray-300 text-sm">
                                            Scannez ce code avec votre
                                            application d&apos;authentification
                                            :
                                        </p>
                                        <div className="inline-block p-1 border border-gray-400 dark:border-gray-500 rounded-md">
                                            <Image
                                                src={twoFaSetup.qrCodeImage}
                                                alt={`QR Code 2FA pour ${profile.email}`}
                                                width={200}
                                                height={200}
                                                unoptimized
                                            />
                                        </div>
                                    </div>

                                    <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100 text-lg">
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
                                            className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-300 focus:border-indigo-500 dark:border-gray-600 rounded-lg focus:ring-indigo-500 w-32 text-gray-900 dark:text-gray-100 text-lg transition duration-150"
                                            placeholder="Code 6 chiffres"
                                        />
                                        <button
                                            type="submit"
                                            disabled={
                                                isActivationLoading ||
                                                activationToken.length !== 6
                                            }
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-md px-4 py-2.5 rounded-lg font-semibold text-white transition duration-150 disabled:cursor-not-allowed"
                                        >
                                            {isActivationLoading
                                                ? "Vérification..."
                                                : "Confirmer & Activer"}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                                        Cliquez pour sécuriser votre compte.
                                    </p>
                                    <button
                                        onClick={handleSetup2FA}
                                        disabled={isSetupLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-md px-4 py-2.5 rounded-lg font-semibold text-white transition duration-150 disabled:cursor-not-allowed"
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
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 shadow-md mt-4 px-4 py-2.5 rounded-lg font-semibold text-white transition duration-150 disabled:cursor-not-allowed"
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
