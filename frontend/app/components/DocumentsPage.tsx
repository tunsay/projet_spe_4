"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
    useCallback,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

type DocumentType = "folder" | "text" | "file";

interface DocumentNode {
    id: string;
    name: string;
    type: DocumentType;
    owner_id: string;
    parent_id: string | null;
    created_at: string;
    mime_type?: string;
    children: DocumentNode[];
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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const TYPE_LABEL: Record<DocumentType, string> = {
    folder: "Dossier",
    text: "Document texte",
    file: "Fichier",
};

const TYPE_ICON: Record<DocumentType, string> = {
    folder: "📁",
    text: "📝",
    file: "📄",
};

const normaliseTree = (nodes: DocumentNode[]): DocumentNode[] =>
    nodes.map((node) => ({
        ...node,
        children: node.children ? normaliseTree(node.children) : [],
    }));

const indexTree = (
    nodes: DocumentNode[],
    map: Map<string, DocumentNode> = new Map()
) => {
    for (const node of nodes) {
        map.set(node.id, node);
        if (node.children?.length) {
            indexTree(node.children, map);
        }
    }
    return map;
};

const buildPath = (map: Map<string, DocumentNode>, targetId: string | null) => {
    if (!targetId) return [];
    const path: DocumentNode[] = [];
    let cursor: DocumentNode | undefined = map.get(targetId);
    while (cursor) {
        path.unshift(cursor);
        if (!cursor.parent_id) break;
        cursor = map.get(cursor.parent_id);
    }
    return path;
};

type CreationMode = "folder" | "text" | "file" | null;

export default function DocumentsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [documents, setDocuments] = useState<DocumentNode[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<Message | null>(null);
    const [creationMode, setCreationMode] = useState<CreationMode>(null);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContent, setNewContent] = useState("");
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const documentIndex = useMemo(() => indexTree(documents), [documents]);

    const currentFolder = currentFolderId && documentIndex.get(currentFolderId);

    const currentChildren = currentFolder
        ? currentFolder.children ?? []
        : documents;

    const breadcrumbs = useMemo(
        () => buildPath(documentIndex, currentFolderId),
        [documentIndex, currentFolderId]
    );

    const sortedChildren = useMemo(() => {
        const folders = currentChildren.filter(
            (item) => item.type === "folder"
        );
        const others = currentChildren.filter((item) => item.type !== "folder");
        return [
            ...folders.sort((a, b) => a.name.localeCompare(b.name)),
            ...others.sort((a, b) => a.name.localeCompare(b.name)),
        ];
    }, [currentChildren]);

    const handleNotification = (text: string, isError: boolean) => {
        setMessage({ text, type: isError ? "error" : "success" });
        setTimeout(() => setMessage(null), 5000);
    };

    const buildEndpoint = useCallback(
        (path: string) => (API_BASE ? `${API_BASE}${path}` : path),
        []
    );

    const getDownloadUrl = useCallback(
        (doc: DocumentNode) => {
            if (doc.type === "file") {
                return buildEndpoint(`/api/documents/file/${doc.id}/download`);
            }
            if (doc.type === "text") {
                return buildEndpoint(`/api/documents/${doc.id}/download`);
            }
            return null;
        },
        [buildEndpoint]
    );

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
                let errorMessage = `Erreur HTTP ${response.status} lors du chargement du profil.`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "message" in body &&
                        typeof (body as { message: unknown }).message === "string"
                    ) {
                        errorMessage = (body as { message: string }).message;
                    }
                } catch {
                    // ignore JSON parsing errors
                }
                throw new Error(errorMessage);
            }

            const data = (await response.json()) as Profile & { id: string };
            setProfile(data);
            return data;
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Impossible de récupérer le profil utilisateur.",
                true
            );
            return null;
        }
    }, [router, buildEndpoint]);

    const fetchDocuments = useCallback(async () => {
        setRefreshing(true);
        try {
            const response = await fetch(buildEndpoint("/api/documents"), {
                credentials: "include",
            });

            if (response.status === 401) {
                router.replace("/login");
                return;
            }
            if (!response.ok) {
                let errorMessage =
                    `Erreur HTTP ${response.status} lors du chargement des documents.`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "error" in body &&
                        typeof (body as { error: unknown }).error === "string"
                    ) {
                        errorMessage = (body as { error: string }).error;
                    }
                } catch {
                    // ignore JSON parsing errors
                }
                throw new Error(errorMessage);
            }

            const data = (await response.json()) as DocumentNode[];
            setDocuments(normaliseTree(data));
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Impossible de charger les documents.",
                true
            );
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [router, buildEndpoint]);

    useEffect(() => {
        const bootstrap = async () => {
            const prof = await fetchProfile();
            if (prof) {
                await fetchDocuments();
            }
        };
        bootstrap();
    }, [fetchProfile, fetchDocuments]);

    const handleOpen = (doc: DocumentNode) => {
        if (doc.type === "folder") {
            setCurrentFolderId(doc.id);
        } else {
            router.push(`/documents/${doc.id}`);
        }
    };

    const resetCreationForm = () => {
        setCreationMode(null);
        setNewName("");
        setNewContent("");
        setFileToUpload(null);
    };

    const handleCreateDocument = async () => {
        if (!creationMode || creationMode === "file") return;

        const trimmedName = newName.trim();
        if (!trimmedName) {
            handleNotification("Le nom est requis.", true);
            return;
        }

        setCreating(true);
        setMessage(null);
        try {
            const response = await fetch(
                buildEndpoint("/api/documents"),
                {
                    method: "POST",
                    credentials: "include",
                    headers: withUserHeaders({
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({
                        name: trimmedName,
                        type: creationMode,
                        parent_id: currentFolderId,
                        content:
                            creationMode === "text" ? newContent : undefined,
                    }),
                }
            );

            if (!response.ok) {
                let errorMessage = `Échec de la création: ${response.status}`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "message" in body &&
                        typeof (body as { message: unknown }).message === "string"
                    ) {
                        errorMessage = (body as { message: string }).message;
                    }
                } catch {
                    // ignore JSON errors
                }
                throw new Error(errorMessage);
            }

            handleNotification(
                creationMode === "folder"
                    ? "Dossier créé avec succès."
                    : "Document texte créé avec succès.",
                false
            );
            resetCreationForm();
            await fetchDocuments();
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Erreur inattendue lors de la création.",
                true
            );
        } finally {
            setCreating(false);
        }
    };

    const handleFileUpload = async () => {
        if (!fileToUpload) return;

        setCreating(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("parent_id", currentFolderId || "");

            const response = await fetch(
                buildEndpoint("/api/documents/file"),
                {
                    method: "POST",
                    credentials: "include",
                    headers: withUserHeaders(),
                    body: formData,
                }
            );

            if (!response.ok) {
                let errorMessage = `Échec de l'importation: ${response.status}`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "message" in body &&
                        typeof (body as { message: unknown }).message === "string"
                    ) {
                        errorMessage = (body as { message: string }).message;
                    }
                } catch {
                    // ignore
                }
                throw new Error(errorMessage);
            }

            handleNotification(
                `Fichier « ${fileToUpload.name} » importé avec succès.`,
                false
            );
            resetCreationForm();
            await fetchDocuments();
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Erreur inattendue lors de l'importation.",
                true
            );
        } finally {
            setCreating(false);
        }
    };

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (creationMode === "file") {
            await handleFileUpload();
        } else {
            await handleCreateDocument();
        }
    };

    const handleNavigateBreadcrumb = (folderId: string | null) => {
        setCurrentFolderId(folderId);
    };

    const withUserHeaders = (extra: HeadersInit = {}) => {
        if (!profile?.id) return extra;
        return {
            ...extra,
            "user-id": profile.id,
            "X-User-ID-Test": profile.id,
        };
    };

    const handleRename = async (doc: DocumentNode) => {
        const nextName = prompt(
            `Renommer "${doc.name}" en :`,
            doc.name
        )?.trim();
        if (!nextName || nextName === doc.name) return;

        try {
            const response = await fetch(
                buildEndpoint(`/api/documents/${doc.id}/metadata`),
                {
                    method: "PUT",
                    credentials: "include",
                    headers: withUserHeaders({
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ name: nextName }),
                }
            );

            if (!response.ok) {
                let errorMessage = `Échec du renommage: ${response.status}`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "message" in body &&
                        typeof (body as { message: unknown }).message === "string"
                    ) {
                        errorMessage = (body as { message: string }).message;
                    }
                } catch {
                    // ignore
                }
                throw new Error(errorMessage);
            }

            handleNotification(`« ${doc.name} » a été renommé.`, false);
            await fetchDocuments();
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Erreur lors du renommage.",
                true
            );
        }
    };

    const handleDelete = async (doc: DocumentNode) => {
        const confirmed = confirm(
            `Confirmer la suppression de « ${doc.name} » ?`
        );
        if (!confirmed) return;

        try {
            const response = await fetch(
                buildEndpoint(`/api/documents/${doc.id}`),
                {
                    method: "DELETE",
                    credentials: "include",
                    headers: withUserHeaders(),
                }
            );

            if (!response.ok) {
                let errorMessage = `Échec de la suppression: ${response.status}`;
                try {
                    const body = await response.json();
                    if (
                        body &&
                        typeof body === "object" &&
                        "message" in body &&
                        typeof (body as { message: unknown }).message === "string"
                    ) {
                        errorMessage = (body as { message: string }).message;
                    }
                } catch {
                    // ignore
                }
                throw new Error(errorMessage);
            }

            handleNotification(`« ${doc.name} » a été supprimé.`, false);
            await fetchDocuments();
        } catch (error) {
            console.error(error);
            handleNotification(
                error instanceof Error
                    ? error.message
                    : "Erreur lors de la suppression.",
                true
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="mx-auto max-w-6xl px-4 space-y-8">
                <header className="flex flex-col gap-3">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                                Mes Documents
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Gérez vos dossiers, vos documents textuels et collaborez avec votre équipe.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition duration-150"
                                onClick={() => setCreationMode("folder")}
                            >
                                <span className="flex items-center gap-2">
                                    📁 Nouveau dossier
                                </span>
                            </button>
                            <button
                                className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition duration-150"
                                onClick={() => setCreationMode("file")}
                            >
                                <span className="flex items-center gap-2">
                                    ⬆️ Importer un fichier
                                </span>
                            </button>
                            <button
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition duration-150"
                                onClick={() => setCreationMode("text")}
                            >
                                <span className="flex items-center gap-2">
                                    📝 Nouveau document
                                </span>
                            </button>
                        </div>
                    </div>
                    {message && (
                        <div
                            className={`rounded-lg border px-3 py-2 text-sm ${
                                message.type === "success"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                                    : "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
                            }`}
                        >
                            {message.text}
                        </div>
                    )}
                </header>

                <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
                    <aside className="space-y-4">
                        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-sm">
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Navigation
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Accédez rapidement à vos dossiers.
                            </p>
                            <div className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/30 p-3">
                                {isLoading ? (
                                    <p className="text-xs text-slate-400">
                                        Chargement de la navigation...
                                    </p>
                                ) : (
                                    <FolderTree
                                        nodes={documents}
                                        currentId={currentFolderId}
                                        onSelect={setCurrentFolderId}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-sm space-y-2">
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Profil
                            </h2>
                            {profile ? (
                                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                    <li>
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                                            Nom :
                                        </span>{" "}
                                        {profile.name || "Non renseigné"}
                                    </li>
                                    <li>
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                                            Email :
                                        </span>{" "}
                                        {profile.email}
                                    </li>
                                    <li>
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                                            Rôle :
                                        </span>{" "}
                                        {profile.role === "admin"
                                            ? "Administrateur"
                                            : "Utilisateur"}
                                    </li>
                                </ul>
                            ) : isLoading ? (
                                <p className="text-xs text-slate-400">
                                    Chargement du profil...
                                </p>
                            ) : (
                                <p className="text-xs text-red-500">
                                    Profil indisponible.
                                </p>
                            )}
                        </div>
                    </aside>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <Breadcrumbs
                                path={breadcrumbs}
                                onNavigate={handleNavigateBreadcrumb}
                            />
                            <button
                                onClick={fetchDocuments}
                                disabled={refreshing}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {refreshing ? "Actualisation..." : "Actualiser"}
                            </button>
                        </div>

                        {creationMode && (
                            <form
                                onSubmit={handleCreate}
                                className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                        {creationMode === "folder"
                                            ? "Nouveau dossier"
                                            : creationMode === "text"
                                            ? "Nouveau document texte"
                                            : "Importer un fichier"}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={resetCreationForm}
                                        className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition duration-150"
                                    >
                                        Annuler
                                    </button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block">
                                            Dossier parent
                                        </label>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 p-2 border border-slate-200 dark:border-gray-700 rounded-md bg-slate-50 dark:bg-gray-900/50">
                                            {currentFolder
                                                ? currentFolder.name
                                                : "Racine"}
                                        </div>
                                    </div>

                                    {(creationMode === "folder" ||
                                        creationMode === "text") && (
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block space-y-1">
                                            Nom du document/dossier
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) =>
                                                    setNewName(e.target.value)
                                                }
                                                className="w-full rounded-md border border-slate-300 dark:border-gray-600 dark:bg-gray-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150"
                                                placeholder={
                                                    creationMode === "folder"
                                                        ? "Nom du dossier"
                                                        : "Nom du fichier texte"
                                                }
                                                required
                                            />
                                        </label>
                                    )}

                                    {creationMode === "file" && (
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 col-span-2 block space-y-1">
                                            Sélectionner un fichier
                                            <input
                                                type="file"
                                                onChange={(e) =>
                                                    setFileToUpload(
                                                        e.target.files
                                                            ? e.target.files[0]
                                                            : null
                                                    )
                                                }
                                                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 dark:file:bg-indigo-800 dark:file:text-indigo-200 dark:hover:file:bg-indigo-700 transition duration-150"
                                                required={!fileToUpload}
                                            />
                                            {fileToUpload && (
                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                    Fichier prêt : **{fileToUpload.name}** (
                                                    {Math.round(
                                                        fileToUpload.size / 1024
                                                    )}{" "}
                                                    KB)
                                                </p>
                                            )}
                                        </label>
                                    )}
                                </div>

                                {creationMode === "text" && (
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 space-y-1">
                                        Contenu initial (optionnel)
                                        <textarea
                                            value={newContent}
                                            onChange={(e) =>
                                                setNewContent(e.target.value)
                                            }
                                            rows={6}
                                            className="w-full rounded-md border border-slate-300 dark:border-gray-600 dark:bg-gray-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150"
                                            placeholder="Ajoutez un contenu initial si nécessaire..."
                                        />
                                    </label>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={resetCreationForm}
                                        className="rounded-md border border-slate-300 dark:border-gray-600 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition duration-150"
                                        disabled={creating}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition duration-150 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={creating}
                                    >
                                        {creating
                                            ? "Création..."
                                            : creationMode === "file"
                                            ? "Importer"
                                            : "Créer"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                    Contenu du dossier
                                </h2>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {isLoading
                                        ? "Chargement..."
                                        : `${sortedChildren.length} élément(s)`}
                                </span>
                            </div>

                            {isLoading ? (
                                <div className="mt-6 space-y-3">
                                    {[...Array(4)].map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-gray-800"
                                        />
                                    ))}
                                </div>
                            ) : !sortedChildren.length ? (
                                <div className="mt-6 rounded-lg border border-dashed border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/40 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                    Ce dossier est vide. Créez un document ou importez un fichier pour commencer.
                                </div>
                            ) : (
                                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-gray-800">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                                        <thead className="bg-slate-100 dark:bg-gray-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            <tr>
                                                <th className="px-4 py-3">Nom</th>
                                                <th className="px-4 py-3 hidden md:table-cell">Type</th>
                                                <th className="px-4 py-3 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {sortedChildren.map((doc) => {
                                                const downloadHref = getDownloadUrl(doc);
                                                return (
                                                    <tr
                                                        key={doc.id}
                                                        className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition duration-100"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => handleOpen(doc)}
                                                                className="flex items-center gap-3 text-left text-slate-700 dark:text-slate-200"
                                                            >
                                                                <span className="text-xl">
                                                                    {TYPE_ICON[doc.type]}
                                                                </span>
                                                                <span className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                                                    {doc.name}
                                                                </span>
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                                                            {TYPE_LABEL[doc.type]}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2 text-xs">
                                                                {downloadHref && (
                                                                    <Link
                                                                        href={downloadHref}
                                                                        className="rounded-md border border-blue-300 px-2 py-1 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition duration-150"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        Télécharger
                                                                    </Link>
                                                                )}
                                                                <button
                                                                    className="rounded-md border border-slate-300 px-2 py-1 text-slate-600 dark:border-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition duration-150"
                                                                    onClick={() => handleRename(doc)}
                                                                >
                                                                    Renommer
                                                                </button>
                                                                <button
                                                                    className="rounded-md border border-red-300 px-2 py-1 text-red-600 bg-red-50 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition duration-150"
                                                                    onClick={() => handleDelete(doc)}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </section>
            </div>
        </div>
    );
}

function Breadcrumbs({
    path,
    onNavigate,
}: {
    path: DocumentNode[];
    onNavigate: (id: string | null) => void;
}) {
    return (
        <nav className="text-xs text-slate-500">
            <span
                className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-800"
                onClick={() => onNavigate(null)}
            >
                Racine
            </span>
            {path.map((item) => (
                <span key={item.id} className="ml-1">
                    <span className="mx-1">/</span>
                    <span
                        className="cursor-pointer text-indigo-600 hover:text-indigo-800"
                        onClick={() => onNavigate(item.id)}
                    >
                        {item.name}
                    </span>
                </span>
            ))}
        </nav>
    );
}

function FolderTree({
    nodes,
    currentId,
    onSelect,
    depth = 0,
}: {
    nodes: DocumentNode[];
    currentId: string | null;
    onSelect: (id: string) => void;
    depth?: number;
}) {
    if (!nodes.length) {
        return (
            depth === 0 && (
                <p className="text-xs text-slate-400">Aucun dossier pour l'instant.</p>
            )
        );
    }

    return (
        <ul className={depth === 0 ? "space-y-1" : "space-y-1 pl-3"}>
            {nodes
                .filter((node) => node.type === "folder")
                .map((node) => (
                    <li key={node.id}>
                        <button
                            onClick={() => onSelect(node.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition ${
                                currentId === node.id
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                                    : "hover:bg-slate-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            <span>📁</span>
                            <span className="truncate">{node.name}</span>
                        </button>
                        {node.children?.length ? (
                            <FolderTree
                                nodes={node.children}
                                currentId={currentId}
                                onSelect={onSelect}
                                depth={depth + 1}
                            />
                        ) : null}
                    </li>
                ))}
        </ul>
    );
}
