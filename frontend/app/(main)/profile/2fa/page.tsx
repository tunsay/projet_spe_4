"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- Endpoints ---
const ENDPOINTS = {
    SETUP: "/api/profile/2fa-setup",
    ACTIVATE: "/api/profile/2fa-activate",
    VERIFY: "/api/auth/2fa-verify",
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
): Promise<string> => {
    try {
        if (response && !response.ok) {
            const body = await response.json();
            const msg = body?.message || body?.error;

            if (response.status === 401)
                return "Non autorisé. Veuillez vous reconnecter.";
            if (response.status === 440) return "Code TOTP invalide.";

            return msg ?? `Erreur HTTP: ${response.status}`;
        }
    } catch (e) {
        console.log(e);
    }

    if (error instanceof Error) {
        return error.message;
    }
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
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                console.error(
                    `Erreur HTTP ${response.status} sur ${url}:`,
                    response
                );

                const error: FetchError = new Error(
                    `HTTP Error ${response.status}`
                );
                error.response = response;
                throw error;
            }

            try {
                return await response.json();
            } catch (e) {
                console.log(e);
            }
        },
        []
    );

    useEffect(() => {
        const loadSetup = async () => {
            setBusy(true);
            setMsg(null);

            let response: Response | null = null;
            try {
                const data = await fetchData(ENDPOINTS.SETUP, "POST");

                setQr(pickStr(data, "qrCodeImage") ?? pickStr(data, "qr"));
                setSecret(pickStr(data, "secret"));
                setStep("enroll");
            } catch (err) {
                const fetchError = err as FetchError;
                console.error("Erreur de chargement 2FA:", fetchError);

                response = fetchError.response ?? null;

                if (response?.status === 401) {
                    router.replace("/login");
                    return;
                }

                if (response?.status === 400) {
                    const errorMsg = await extractErrorMessage(response, err);
                    if (
                        errorMsg.includes("non activé") ||
                        errorMsg.includes("already active")
                    ) {
                        setStep("verify");
                        return;
                    }
                }

                const errorMessage = await extractErrorMessage(response, err);
                setMsg({ t: "err", m: errorMessage });
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
        let response: Response | null = null;
        try {
            await fetchData(ENDPOINTS.ACTIVATE, "POST", { token });

            setMsg({
                t: "ok",
                m: "2FA activé. Veuillez vérifier un code pour continuer.",
            });
            setStep("verify");
        } catch (err) {
            const fetchError = err as FetchError;
            console.error("Erreur d'activation 2FA:", fetchError);

            response = fetchError.response ?? null;
            const errorMessage = await extractErrorMessage(response, err);
            setMsg({ t: "err", m: errorMessage });
        } finally {
            setBusy(false);
        }
    }, [token, fetchData]);

    const handleVerify = useCallback(async () => {
        if (token.length < 6) return;
        setBusy(true);
        setMsg(null);
        let response: Response | null = null;
        try {
            await fetchData(ENDPOINTS.VERIFY, "POST", { token });

            router.replace("/");
        } catch (err) {
            const fetchError = err as FetchError;
            console.error("Erreur de vérification 2FA:", fetchError);

            response = fetchError.response ?? null;
            const errorMessage = await extractErrorMessage(response, err);
            setMsg({ t: "err", m: errorMessage });
        } finally {
            setBusy(false);
        }
    }, [token, router, fetchData]);

    // --- Rendu ---
    return (
        <main className="min-h-screen bg-slate-50 py-10">
            <div className="mx-auto w-full max-w-xl px-4">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Authentification 2FA
                </h1>
                <p className="mt-1 text-sm text-slate-500">
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
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-rose-300 bg-rose-50 text-rose-800"
                        }`}
                    >
                        {msg.m}
                    </div>
                )}

                {step === "enroll" && (
                    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-600">
                            Scanne ce QR avec ton application
                            d’authentification, puis saisis un code pour activer
                            le 2FA.
                        </p>
                        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                            <div className="grid h-[220px] w-[220px] place-items-center overflow-hidden rounded-xl border border-dashed">
                                {qr ? (
                                    <Image
                                        src={qr}
                                        alt="qr"
                                        width={220}
                                        height={220}
                                        unoptimized
                                    />
                                ) : (
                                    <span className="text-slate-400 text-sm">
                                        (QR indisponible)
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                    Secret
                                </div>
                                <div className="mt-1 select-all rounded-md border bg-slate-50 px-2 py-1 font-mono text-sm text-slate-700">
                                    {secret ?? "(absent)"}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        className="w-44 rounded-md border px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-indigo-400 focus:ring-indigo-100"
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
                                        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {busy ? "Activation…" : "Activer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {step === "verify" && (
                    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-600">
                            2FA actif. Entre un code pour continuer.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <input
                                className="w-44 rounded-md border px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-indigo-400 focus:ring-indigo-100"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Code (6 chiffres)"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                            <button
                                onClick={handleVerify}
                                disabled={busy || token.length < 6}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {busy ? "Vérification…" : "Vérifier"}
                            </button>
                        </div>
                    </section>
                )}

                {step === "loading" && (
                    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="animate-pulse">
                            <div className="h-5 w-40 rounded bg-slate-200" />
                            <div className="mt-4 h-48 w-full rounded-xl bg-slate-100" />
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
