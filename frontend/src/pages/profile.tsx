"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface UserProfile {
    id: string;
    name: string;
    email: string;
    isTwoFactorEnabled: boolean;
}

interface TwoFaSetupResponse {
    secret: string;
    qrCodeImage: string;
    message: string;
}

type ErrorType = Error | { message: string };

const API_URL = "http://localhost:3000/api/profile";
const TEST_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetupResponse | null>(
        null
    );
    const [isSetupLoading, setIsSetupLoading] = useState(false);
    const [activationToken, setActivationToken] = useState("");
    const [isActivationLoading, setIsActivationLoading] = useState(false);

    const [isDisableLoading, setIsDisableLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(API_URL, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-ID-Test": TEST_USER_ID,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.error || `Erreur HTTP: ${response.status}`
                    );
                }

                const data: UserProfile = await response.json();
                setProfile(data);
            } catch (err) {
                let errorMessage =
                    "Une erreur inconnue est survenue lors du chargement du profil.";
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (
                    typeof err === "object" &&
                    err !== null &&
                    "message" in err &&
                    typeof (err as ErrorType).message === "string"
                ) {
                    errorMessage = (err as ErrorType).message;
                }

                console.error("Erreur de récupération:", err);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSetup2FA = async () => {
        setIsSetupLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/2fa-setup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID-Test": TEST_USER_ID,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || `Erreur HTTP: ${response.status}`
                );
            }

            const data: TwoFaSetupResponse = await response.json();
            setTwoFaSetup(data);
        } catch (err) {
            let errorMessage = "Impossible de démarrer la configuration 2FA.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsSetupLoading(false);
        }
    };

    const handleActivate2FA = async (e: React.FormEvent<HTMLFormElement>) => {
        // ESSENTIEL : Empêche le rechargement de la page par le formulaire
        e.preventDefault();

        // La validation côté bouton n'est pas suffisante, nous la refaisons ici pour plus de clarté.
        if (activationToken.length !== 6) {
            setError("Le code TOTP doit contenir 6 chiffres.");
            return;
        }

        setIsActivationLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/2fa-activate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID-Test": TEST_USER_ID,
                },
                body: JSON.stringify({ token: activationToken }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || `Erreur HTTP: ${response.status}`
                );
            }

            setTwoFaSetup(null);
            setActivationToken("");
            setProfile((prev) =>
                prev ? { ...prev, isTwoFactorEnabled: true } : null
            );
        } catch (err) {
            let errorMessage =
                "Échec de l'activation 2FA. Code invalide ou expiré.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsActivationLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        setIsDisableLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/2fa-disable`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-ID-Test": TEST_USER_ID,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || `Erreur HTTP: ${response.status}`
                );
            }

            setProfile((prev) =>
                prev ? { ...prev, isTwoFactorEnabled: false } : null
            );
        } catch (err) {
            let errorMessage = "Échec de la désactivation 2FA.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsDisableLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: "20px" }}>Chargement du profil...</div>;
    }

    if (error) {
        // Affiche l'erreur en haut de page (y compris l'erreur de validation TOTP)
        return (
            <div style={{ color: "red", padding: "20px" }}>
                Erreur : {error}
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{ color: "red", padding: "20px" }}>
                Erreur critique : Profil non chargé.
            </div>
        );
    }

    const is2faEnabled = profile.isTwoFactorEnabled ? "Activé" : "Désactivé";
    const is2faColor = profile.isTwoFactorEnabled ? "green" : "red";

    return (
        <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>
            <h1>👋 Mon Profil Utilisateur</h1>
            <hr />

            <h2>Détails du Compte</h2>
            <ul>
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

            <h2>Statut de Sécurité (2FA)</h2>
            <p>
                L&apos;authentification à deux facteurs est :
                <strong style={{ color: is2faColor, marginLeft: "10px" }}>
                    {is2faEnabled}
                </strong>
            </p>

            {!profile.isTwoFactorEnabled && (
                <div
                    style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        marginTop: "20px",
                    }}
                >
                    {twoFaSetup ? (
                        <>
                            <h3>Étape 1 : Scannez le QR Code</h3>
                            <div
                                style={{
                                    marginBottom: "20px",
                                    textAlign: "center",
                                }}
                            >
                                <p>
                                    Scannez ce code avec votre application
                                    d&apos;authentification :
                                </p>

                                <Image
                                    src={twoFaSetup.qrCodeImage}
                                    alt="QR Code 2FA"
                                    width={200}
                                    height={200}
                                    unoptimized
                                    style={{ border: "1px solid #000" }}
                                />
                            </div>

                            <h3>Étape 2 : Vérification</h3>
                            <form onSubmit={handleActivate2FA}>
                                <p>
                                    Entrez le code à 6 chiffres généré par votre
                                    application :
                                </p>
                                <input
                                    type="text"
                                    value={activationToken}
                                    onChange={(e) =>
                                        setActivationToken(e.target.value)
                                    }
                                    maxLength={6}
                                    required
                                    style={{
                                        padding: "10px",
                                        fontSize: "18px",
                                        width: "150px",
                                        marginRight: "10px",
                                    }}
                                />
                                <button
                                    type="submit"
                                    // Désactivé si le chargement est en cours OU si la longueur n'est pas 6
                                    disabled={
                                        isActivationLoading ||
                                        activationToken.length !== 6
                                    }
                                    style={{
                                        backgroundColor:
                                            isActivationLoading ||
                                            activationToken.length !== 6
                                                ? "#ccc"
                                                : "#007bff",
                                        color: "white",
                                        padding: "10px 15px",
                                        cursor:
                                            isActivationLoading ||
                                            activationToken.length !== 6
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    {isActivationLoading
                                        ? "Vérification..."
                                        : "Confirmer & Activer"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <p>Cliquez pour sécuriser votre compte.</p>
                            <button
                                onClick={handleSetup2FA}
                                disabled={isSetupLoading}
                                style={{
                                    backgroundColor: isSetupLoading
                                        ? "#ccc"
                                        : "#4CAF50",
                                    color: "white",
                                    padding: "10px",
                                    cursor: isSetupLoading
                                        ? "not-allowed"
                                        : "pointer",
                                }}
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
                    style={{
                        backgroundColor: isDisableLoading ? "#ccc" : "#f44336",
                        color: "white",
                        padding: "10px",
                        marginTop: "20px",
                        cursor: isDisableLoading ? "not-allowed" : "pointer",
                    }}
                >
                    {isDisableLoading
                        ? "Désactivation..."
                        : "Désactiver le 2FA"}
                </button>
            )}
        </div>
    );
}
