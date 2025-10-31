import Link from "next/link";
import { SaveState, DocumentDetail } from "@/types/documents";

interface DocumentToolbarProps {
    document: DocumentDetail | null;
    saveIndicator: string;
    saveState: SaveState;
    lastSavedAt: Date | null;
    isTextDocument: boolean;
    content: string;
    persistedContent: string;
    onSave: () => void;
    downloadUrl: string | null;
    inlinePreviewUrl: string | null;
    onDownload: () => void;
    onOpenPreview: () => void;
}

export function DocumentToolbar({
    document,
    saveIndicator,
    saveState,
    lastSavedAt,
    isTextDocument,
    content,
    persistedContent,
    onSave,
    downloadUrl,
    inlinePreviewUrl,
    onDownload,
    onOpenPreview,
}: DocumentToolbarProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <Link
                    href="/documents"
                    className="text-sm text-indigo-600 transition duration-150 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
                >
                    ← Retour à la liste
                </Link>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {document ? document.name : "Chargement…"}
                </h1>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
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
                        Dernière sauvegarde : {lastSavedAt.toLocaleTimeString()}
                    </div>
                )}
                {isTextDocument ? (
                    <div className="mt-3 flex flex-col gap-2">
                        <button
                            onClick={onSave}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md transition duration-150 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                onClick={onDownload}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition duration-150 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-700"
                            >
                                Télécharger le document
                            </button>
                        )}
                    </div>
                ) : document?.type === "file" ? (
                    <div className="mt-3 flex flex-col gap-2">
                        {inlinePreviewUrl && (
                            <button
                                type="button"
                                onClick={onOpenPreview}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition duration-150 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-700"
                            >
                                Ouvrir dans le navigateur
                            </button>
                        )}
                        {downloadUrl && (
                            <button
                                type="button"
                                onClick={onDownload}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md transition duration-150 hover:bg-indigo-700"
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
                                onClick={onDownload}
                                className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md transition duration-150 hover:bg-indigo-700"
                            >
                                Télécharger
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
