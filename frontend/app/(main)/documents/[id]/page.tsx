"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DocumentDetail {
    id: string;
    name: string;
    type: "text" | "folder" | "file";
    owner_id: string;
    parent_id: string | null;
    created_at: string;
    last_modified_at?: string | null;
    content?: string | null;
    mime_type?: string | null;
}

interface Profile {
    id: string;
    name?: string | null;
    email: string;
    role: "admin" | "user";
}

interface Message {
    type: "success" | "error";
    text: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export default function DocumentDetailPage() {
    const router = useRouter();
    const routeParams = useParams();
    const rawId = routeParams?.id;
    const documentId =
        typeof rawId === "string"
            ? rawId
            : Array.isArray(rawId)
            ? rawId[0] ?? ""
            : "";

    const [profile, setProfile] = useState<Profile | null>(null);
    const [doc, setDoc] = useState<DocumentDetail | null>(null);
    const [content, setContent] = useState<string>("");
    const [persistedContent, setPersistedContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<Message | null>(null);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    const isTextDocument = doc?.type === "text";

    const buildEndpoint = useCallback(
        (path: string) => (API_BASE ? `${API_BASE}${path}` : path),
        []
    );

    const downloadUrl = useMemo(() => {
        if (!doc) return null;
        if (doc.type === "file") {
            return buildEndpoint(`/api/documents/file/${doc.id}/download`);
        }
        if (doc.type === "text") {
            return buildEndpoint(`/api/documents/${doc.id}/download`);
        }
        return null;
    }, [doc, buildEndpoint]);

    const inlinePreviewUrl = useMemo(() => {
        if (!downloadUrl) return null;
        return `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}inline=1`;
    }, [downloadUrl]);

    const handleOpenInBrowser = useCallback(() => {
        if (!inlinePreviewUrl) return;
        if (typeof window !== "undefined") {
            window.open(inlinePreviewUrl, "_blank", "noopener,noreferrer");
        }
    }, [inlinePreviewUrl]);

    const handleDownload = useCallback(() => {
        if (!downloadUrl || typeof window === "undefined") return;
        const anchor = window.document.createElement("a");
        anchor.href = downloadUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        window.document.body.appendChild(anchor);
        anchor.click();
        window.document.body.removeChild(anchor);
    }, [downloadUrl]);

    const fetchProfile = useCallback(async () => {
        try {
            const response = await fetch(buildEndpoint("/api/profile"), {
                credentials: "include",
            });

            if (response.status === 401) {
                router.replace("/login");
                return null;
            }

            if (!response.ok) {
                throw new Error("Impossible de récupérer le profil.");
            }

            const data = (await response.json()) as Profile;
            setProfile(data);
            return data;
        } catch (error) {
            console.error("Erreur profil:", error);
            setMessage({
                type: "error",
                text: "Une erreur est survenue lors du chargement du profil.",
            });
            return null;
        }
    }, [router, buildEndpoint]);

    const fetchDocument = useCallback(async () => {
        if (!documentId) {
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                buildEndpoint(`/api/documents/${documentId}`),
                {
                    credentials: "include",
                }
            );

            if (response.status === 401) {
                router.replace("/login");
                return;
            }

            if (response.status === 404) {
                console.warn(
                    "Document introuvable ou accès refusé pour l'id :",
                    documentId
                );
                setDoc(null);
                setMessage({
                    type: "error",
                    text: "Document introuvable ou accès refusé.",
                });
                return;
            }

            if (!response.ok) {
                throw new Error("Impossible de charger le document.");
            }

            const data = (await response.json()) as DocumentDetail;
            setDoc(data);

            const initial = data.content ?? "";
            setContent(initial);
            setPersistedContent(initial);
            setLastSavedAt(
                data.last_modified_at ? new Date(data.last_modified_at) : null
            );
        } catch (error) {
            console.error(
                "Erreur lors du chargement du document",
                documentId,
                error
            );
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Erreur inattendue lors du chargement du document.",
            });
        } finally {
            setLoading(false);
        }
    }, [documentId, router, buildEndpoint]);

    useEffect(() => {
        if (!documentId) {
            setMessage({
                type: "error",
                text: "Identifiant de document introuvable dans l'URL.",
            });
            setLoading(false);
            return;
        }

        const bootstrap = async () => {
            const prof = await fetchProfile();
            if (prof) {
                await fetchDocument();
            }
        };

        bootstrap();
    }, [documentId, fetchProfile, fetchDocument]);

    useEffect(() => {
        if (!isTextDocument) return;
        if (content === persistedContent) return;

        setSaveState("idle");

        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }

        saveTimeout.current = setTimeout(() => {
            handleSave(content);
        }, 1500);

        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, persistedContent, isTextDocument]);

    const withUserHeaders = useCallback(
        (extra: HeadersInit = {}) => {
            if (!profile?.id) return extra;
            return {
                ...extra,
                "user-id": profile.id,
                "X-User-ID-Test": profile.id,
            };
        },
        [profile?.id]
    );

    const handleSave = useCallback(
        async (nextContent?: string) => {
            if (!doc || doc.type !== "text") return;

            const payload = nextContent ?? content;
            if (payload === persistedContent) return;

            setSaveState("saving");
            try {
                const response = await fetch(
                    buildEndpoint(`/api/documents/${doc.id}`),
                    {
                        method: "PUT",
                        credentials: "include",
                        headers: withUserHeaders({
                            "Content-Type": "application/json",
                        }),
                        body: JSON.stringify({ content: payload }),
                    }
                );

                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(
                        (body as { error?: string }).error ??
                            "Impossible d'enregistrer le document."
                    );
                }

                setPersistedContent(payload);
                setSaveState("saved");
                setLastSavedAt(new Date());
            } catch (error) {
                console.error(
                    "Erreur lors de la sauvegarde du document",
                    doc.id,
                    error
                );
                setSaveState("error");
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Erreur lors de la sauvegarde du document.",
                });
            }
        },
        [doc, content, persistedContent, withUserHeaders, buildEndpoint]
    );

    const saveIndicator = useMemo(() => {
        switch (saveState) {
            case "saving":
                return "Enregistrement…";
            case "saved":
                return "Enregistré";
            case "error":
                return "Erreur de sauvegarde";
            default:
                return content === persistedContent
                    ? "À jour"
                    : "Modifications en attente";
        }
    }, [saveState, content, persistedContent]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
                {/* --- En-tête et Indicateur de Sauvegarde --- */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Link
                            href="/documents"
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition duration-150"
                        >
                            ← Retour à la liste
                        </Link>
                        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                            {doc ? doc.name : "Chargement…"}
                        </h1>
                        {doc && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Identifiant : {doc.id}
                            </p>
                        )}
                    </div>
                    {/* Indicateur de Sauvegarde Harmonisé */}
                    <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                        <div className="flex items-center gap-1">
                            Statut :{" "}
                            <span
                                className={
                                    saveState === "error"
                                        ? "font-medium text-red-600 dark:text-red-400"
                                        : saveState === "saving"
                                        ? "font-medium text-slate-600 dark:text-slate-300 animate-pulse"
                                        : "font-medium text-emerald-600 dark:text-emerald-400"
                                }
                            >
                                {saveIndicator}
                            </span>
                        </div>
                        {lastSavedAt && (
                            <div className="mt-1">
                                Dernière sauvegarde :{" "}
                                {lastSavedAt.toLocaleTimeString()}
                            </div>
                        )}
                        {isTextDocument ? (
                            <div className="mt-3 flex flex-col gap-2">
                                <button
                                    onClick={() => handleSave()}
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={
                                        saveState === "saving" ||
                                        content === persistedContent
                                    }
                                >
                                    Sauvegarder maintenant
                                </button>
                                {downloadUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-700 transition duration-150"
                                    >
                                        Télécharger le document
                                    </button>
                                )}
                            </div>
                        ) : doc?.type === "file" ? (
                            <div className="mt-3 flex flex-col gap-2">
                                {inlinePreviewUrl && (
                                    <button
                                        type="button"
                                        onClick={handleOpenInBrowser}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-700 transition duration-150"
                                    >
                                        Ouvrir dans le navigateur
                                    </button>
                                )}
                                {downloadUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:bg-indigo-700 transition duration-150"
                                    >
                                        Télécharger le fichier
                                    </button>
                                )}
                            </div>
                        ) : (
                            downloadUrl && (
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:bg-indigo-700 transition duration-150"
                                    >
                                        Télécharger
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* --- Notification Message Harmonisée --- */}
                {message && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            message.type === "success"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* --- Rendu du Contenu Principal --- */}
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-gray-700" />
                        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-gray-700" />
                        <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-700" />
                    </div>
                ) : !doc ? (
                    // Message d'erreur/absence de document
                    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 px-4 py-6 text-sm text-amber-800 dark:text-amber-300">
                        <p className="font-semibold">
                            Document introuvable ou inaccessible.
                        </p>
                        <p className="mt-1">
                            {message?.text ??
                                "Veuillez vérifier l'identifiant et vos droits d'accès."}
                        </p>
                    </div>
                ) : doc.type === "text" ? (
                    // Affichage et édition du contenu texte
                    <div className="space-y-6">
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                                Contenu du document
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={18}
                                    className="mt-2 w-full rounded-lg border border-slate-300 dark:border-gray-600 dark:bg-gray-900 px-3 py-2 text-sm leading-relaxed shadow-inner text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150"
                                    placeholder="Commencez à saisir votre contenu…"
                                />
                            </label>
                        </div>
                        {/* Détails du document texte */}
                        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                Détails
                            </h2>
                            <dl className="mt-2 space-y-1">
                                <div>
                                    <span className="font-medium">
                                        Créé le :
                                    </span>{" "}
                                    {new Date(doc.created_at).toLocaleString()}
                                </div>
                                {doc.last_modified_at && (
                                    <div>
                                        <span className="font-medium">
                                            Modifié le :
                                        </span>{" "}
                                        {new Date(
                                            doc.last_modified_at
                                        ).toLocaleString()}
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium">
                                        Propriétaire :
                                    </span>{" "}
                                    {doc.owner_id}
                                </div>
                            </dl>
                        </div>
                    </div>
                ) : (
                    // Affichage des autres types (dossier, fichier)
                    <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                            Résumé du document
                        </h2>
                        <dl className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <div>
                                <span className="font-medium">Type :</span>{" "}
                                {doc.type === "folder"
                                    ? "Dossier"
                                    : "Fichier importé"}
                            </div>
                            <div>
                                <span className="font-medium">
                                    Propriétaire :
                                </span>{" "}
                                {doc.owner_id}
                            </div>
                            <div>
                                <span className="font-medium">Créé le :</span>{" "}
                                {new Date(doc.created_at).toLocaleString()}
                            </div>
                            {doc.last_modified_at && (
                                <div>
                                    <span className="font-medium">
                                        Modifié le :
                                    </span>{" "}
                                    {new Date(
                                        doc.last_modified_at
                                    ).toLocaleString()}
                                </div>
                            )}
                            {doc.mime_type && (
                                <div>
                                    <span className="font-medium">
                                        Type MIME :
                                    </span>{" "}
                                    {doc.mime_type}
                                </div>
                            )}
                        </dl>
                        {doc.type === "file" && inlinePreviewUrl && (
                            <div className="mt-6 space-y-2">
                                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">
                                    <iframe
                                        src={inlinePreviewUrl}
                                        title={`Aperçu de ${doc.name}`}
                                        className="h-[600px] w-full bg-white"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Si l&apos;aperçu ne se charge pas, utilisez le bouton &laquo; Ouvrir dans le navigateur &raquo;.
                                </p>
                            </div>
                        )}
                        <p className="mt-6 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-700">
                            Ce type de document ({doc.type}) ne peut pas être
                            édité directement.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
