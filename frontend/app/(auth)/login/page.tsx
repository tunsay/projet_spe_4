"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "@/lib/api";

const LOGIN_ENDPOINT = buildApiUrl("/api/auth/login");

// Log les erreurs brutes en catch pour le débogage (remplace l'ancien console.log(e))
const extractErrorMessage = async (
    response: Response | null,
    err: unknown
): Promise<string> => {
    try {
        if (response && !response.ok) {
            const body = await response.json();
            const msg = body?.message || body?.error;

            if (response.status === 401)
                return "Email ou mot de passe invalide.";
            if (response.status === 403)
                return "Authentification à deux facteurs requise.";

            return msg ?? `Erreur HTTP: ${response.status}`;
        }
    } catch (e) {
        // Log de l'erreur de parsing/réseau interne pour le débogage.
        console.error("Erreur de traitement de la réponse:", e);
    }

    if (err instanceof Error) {
        return err.message;
    }
    return "Une erreur inconnue est survenue.";
};

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) {
            setError("Veuillez entrer l'email et le mot de passe.");
            return;
        }
        setError(null);
        setIsLoading(true);

        let response: Response | null = null;

        try {
            response = await fetch(LOGIN_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                if (response.status === 403) {
                    router.replace("/profile/2fa");
                    return;
                }

                const errorMessage = await extractErrorMessage(response, null);
                setError(errorMessage);
            } else {
                // Succès de la connexion : stocker le token non httpOnly pour les connexions WebSocket
                try {
                    const data = await response.json();
                    if (data && typeof data.token === "string") {
                        window.localStorage.setItem(
                            "collaboratif_token",
                            data.token
                        );
                    }
                } catch {
                    // Certaines implémentations 2FA peuvent renvoyer un 204 - ignorer silencieusement
                }

                // Redirection page 2FA (flux existant)
                router.replace("/profile/2fa");
            }
        } catch (err) {
            console.error("Erreur de soumission du formulaire:", err);
            const errorMessage = await extractErrorMessage(response, err);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md mx-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                    <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                        Connexion à votre compte
                    </h1>
                    {error && (
                        // Contraste d'erreur amélioré pour les deux modes
                        <div className="mb-4 text-sm text-red-800 bg-red-50 dark:bg-red-900/50 dark:text-red-300 p-3 rounded border border-red-300 dark:border-red-700">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                // Styles d'input uniformes et lisibles
                                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                autoComplete="email"
                                required
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mot de passe
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                // Styles d'input uniformes et lisibles
                                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                autoComplete="current-password"
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={isLoading}
                            // Bouton principal en Indigo, clair et contrasté
                            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? "Connexion en cours..."
                                : "Se connecter"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
