"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { buildApiUrl } from "@/lib/api";
import { handleUnauthorized } from "@/lib/auth";

// --- Endpoints ---
const ENDPOINTS = {
    SETUP: buildApiUrl("/api/profile/2fa-setup"),
    ACTIVATE: buildApiUrl("/api/profile/2fa-activate"),
    VERIFY: buildApiUrl("/api/auth/2fa-verify"),
};

// --- Types utilitaires ---
type Json = unknown;

interface FetchError extends Error {
    response?: Response;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

const pickStr = (v: Json, key: string): string | null =>
    isRecord(v) && typeof v[key] === "string" ? (v[key] as string) : null;

type Step = "loading" | "enroll" | "verify";

const extractErrorMessage = async (
    response: Response | null,
    error: unknown
): Promise<string | null> => {
    try {
        if (response && !response.ok) {
            const body = await response.json().catch(() => ({}));
            const msg = (body as any)?.message || (body as any)?.error;

            if (response.status === 401)
                return "Non autorisé. Veuillez vous reconnecter.";
            if (response.status === 400) {
                if (
                    typeof msg === "string" &&
                    (msg.includes("non activé") ||
                        msg.includes("already active"))
                ) {
                    return msg;
                }
                return null;
            }
            if (response.status === 440) return "Code TOTP invalide.";

            return msg ?? `Erreur HTTP: ${response.status}`;
        }
    } catch (e) {
        console.error("Failed to extract error message body:", e);
    }

    if (error instanceof Error) return error.message;
    return "Une erreur inconnue est survenue.";
};

// --- Composant Principal ---
export default function TwoFAPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("loading");
    const [qr, setQr] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [token, setToken] = useState<string>("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);

    const fetchData = useCallback(
        async (
            url: string,
            method: string = "POST",
            body?: object
        ): Promise<Json> => {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                await handleUnauthorized(response, router);

                const error: FetchError = new Error(
                    `HTTP Error ${response.status}`
                );
                error.response = response;
                throw error;
            }

            try {
                return await response.json();
            } catch {
                // 204 / no content
            }
        },
        [router]
    );

    useEffect(() => {
        const loadSetup = async () => {
            setBusy(true);
            setMsg(null);

            try {
                const data = await fetchData(ENDPOINTS.SETUP, "POST");
                setQr(pickStr(data, "qrCodeImage") ?? pickStr(data, "qr"));
                setSecret(pickStr(data, "secret"));
                setStep("enroll");
            } catch (err) {
                const fetchError = err as FetchError;
                const response = fetchError.response ?? null;

                if (response?.status === 401) {
                    return;
                }

                const errorMessage = await extractErrorMessage(response, err);
                if (response?.status === 400) {
                    setStep("verify");
                    return;
                }

                if (errorMessage) setMsg({ t: "err", m: errorMessage });
                setStep("verify");
            } finally {
                setBusy(false);
            }
        };
        loadSetup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]);

    const handleActivate = useCallback(async () => {
        if (token.length < 6) return;
        setBusy(true);
        setMsg(null);

        try {
            await fetchData(ENDPOINTS.ACTIVATE, "POST", { token });
            setMsg({
                t: "ok",
                m: "2FA activé. Veuillez vérifier un code pour continuer.",
            });
            setStep("verify");
        } catch (err) {
            const fetchError = err as FetchError;
            const response = fetchError.response ?? null;
            const errorMessage = await extractErrorMessage(response, err);

            if (!(response?.status === 400 && !errorMessage) && errorMessage) {
                setMsg({ t: "err", m: errorMessage });
            }
        } finally {
            setBusy(false);
        }
    }, [token, fetchData]);

    const handleVerify = useCallback(async () => {
        if (token.length < 6) return;
        setBusy(true);
        setMsg(null);

        try {
            await fetchData(ENDPOINTS.VERIFY, "POST", { token });
            router.replace("/");
            window.dispatchEvent(new Event("user:login"));
        } catch (err) {
            const fetchError = err as FetchError;
            const response = fetchError.response ?? null;
            const errorMessage = await extractErrorMessage(response, err);

            if (!(response?.status === 400 && !errorMessage) && errorMessage) {
                setMsg({ t: "err", m: errorMessage });
            }
        } finally {
            setBusy(false);
        }
    }, [token, router, fetchData]);

    // --- Rendu (palette alignée au composant profil) ---
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="mx-auto w-full max-w-xl px-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Authentification 2FA
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {step === "loading"
                        ? "Chargement…"
                        : step === "enroll"
                        ? "Configure le 2FA"
                        : "Saisis un code 2FA"}
                </p>

                {msg && (
                    <div
                        className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                            msg.t === "ok"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                    >
                        {msg.m}
                    </div>
                )}

                {step === "enroll" && (
                    <section className="mt-6 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-2xl">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Scanne ce QR avec ton application
                            d’authentification, puis saisis un code pour activer
                            le 2FA.
                        </p>
                        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                            <div className="grid h-[220px] w-[220px] place-items-center overflow-hidden rounded-md border border-dashed border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-900/20">
                                {qr ? (
                                    <Image
                                        src={qr}
                                        alt="qr"
                                        width={220}
                                        height={220}
                                        unoptimized
                                    />
                                ) : (
                                    <span className="text-gray-400 text-sm">
                                        (QR indisponible)
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Secret
                                </div>
                                <div className="mt-1 select-all rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-2 py-1 font-mono text-sm text-gray-800 dark:text-gray-100">
                                    {secret ?? "(absent)"}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        className="w-44 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none ring-2 ring-transparent focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
                                        value={token}
                                        onChange={(e) =>
                                            setToken(e.target.value)
                                        }
                                        placeholder="Code (6 chiffres)"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                    />
                                    <button
                                        onClick={handleActivate}
                                        disabled={busy || token.length < 6}
                                        className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                                    >
                                        {busy ? "Activation…" : "Activer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {step === "verify" && (
                    <section className="mt-6 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-2xl">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            2FA actif. Entre un code pour continuer.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <input
                                className="w-44 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none ring-2 ring-transparent focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Code (6 chiffres)"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                            <button
                                onClick={handleVerify}
                                disabled={busy || token.length < 6}
                                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                            >
                                {busy ? "Vérification…" : "Vérifier"}
                            </button>
                        </div>
                    </section>
                )}

                {step === "loading" && (
                    <section className="mt-6 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-2xl">
                        <div className="animate-pulse">
                            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-4 h-48 w-full rounded-xl bg-gray-100 dark:bg-gray-700/60" />
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
