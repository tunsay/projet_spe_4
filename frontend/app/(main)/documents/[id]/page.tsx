"use client";

import { useRouter, useParams } from "next/navigation";
import {
    Fragment,
    FormEvent,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { buildApiUrl } from "@/lib/api";
import { DocumentToolbar } from "../_components/DocumentToolbar";
import { DocumentTextSection } from "../_components/DocumentTextSection";
import { DocumentSummarySection } from "../_components/DocumentSummarySection";
import { CollaborationSidebar } from "../_components/CollaborationSidebar";
import { InviteCollaboratorModal } from "../_components/InviteCollaboratorModal";
import {
    ChatMessageEntry,
    DocumentDetail,
    FeedbackMessage,
    Profile,
    SaveState,
    SessionParticipantEntry,
} from "../types";

const normalizeErrorMessage = (value: unknown, fallback: string) => {
    if (
        value &&
        typeof value === "object" &&
        "error" in value &&
        typeof (value as { error?: unknown }).error === "string"
    ) {
        return (value as { error: string }).error;
    }

    if (
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof (value as { message?: unknown }).message === "string"
    ) {
        return (value as { message: string }).message;
    }

    return fallback;
};

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
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    const [participants, setParticipants] = useState<SessionParticipantEntry[]>(
        []
    );
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [participantsError, setParticipantsError] = useState<string | null>(
        null
    );
    const [messagesList, setMessagesList] = useState<ChatMessageEntry[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [invitePermission, setInvitePermission] =
        useState<"read" | "edit" | "owner">("edit");
    const [inviteFeedback, setInviteFeedback] =
        useState<FeedbackMessage | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    const isTextDocument = doc?.type === "text";
    const isOwner = doc && profile ? doc.owner_id === profile.id : false;

    const ownerDisplayName = useMemo(() => {
        if (!doc) return "";
        if (profile && doc.owner_id === profile.id) {
            return profile.name || "Vous";
        }
        const owner =
            participants.find((item) => item.userId === doc.owner_id) ??
            participants.find((item) => item.email === doc.owner_id);
        return owner?.displayName ?? "Propriétaire";
    }, [doc, participants, profile]);

    const downloadUrl = useMemo(() => {
        if (!doc) return null;
        if (doc.type === "file") {
            return buildApiUrl(`/api/documents/file/${doc.id}/download`);
        }
        if (doc.type === "text") {
            return buildApiUrl(`/api/documents/${doc.id}/download`);
        }
        return null;
    }, [doc]);

    const inlinePreviewUrl = useMemo(() => {
        if (!downloadUrl) return null;
        return `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}inline=1`;
    }, [downloadUrl]);

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
            const response = await fetch(buildApiUrl("/api/profile"), {
                credentials: "include",
            });

            if (response.status === 401) {
                router.replace("/login");
                return null;
            }

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(
                    normalizeErrorMessage(
                        payload,
                        "Impossible de récupérer le profil."
                    )
                );
            }

            const data = payload as Profile;
            setProfile(data);
            return data;
        } catch (error) {
            console.error("Erreur profil:", error);
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Une erreur est survenue lors du chargement du profil.",
            });
            return null;
        }
    }, [router]);

    const fetchDocument = useCallback(async () => {
        if (!documentId) {
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                buildApiUrl(`/api/documents/${documentId}`),
                {
                    credentials: "include",
                }
            );

            if (response.status === 401) {
                router.replace("/login");
                return;
            }

            if (response.status === 404) {
                setDoc(null);
                setMessage({
                    type: "error",
                    text: "Document introuvable ou accès refusé.",
                });
                return;
            }

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(
                    normalizeErrorMessage(
                        payload,
                        "Impossible de charger le document."
                    )
                );
            }

            const data = payload as DocumentDetail;
            setDoc(data);

            const initial = data.content ?? "";
            setContent(initial);
            setPersistedContent(initial);
            setLastSavedAt(
                data.last_modified_at ? new Date(data.last_modified_at) : null
            );
        } catch (error) {
            console.error("Erreur document:", error);
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
    }, [documentId, router]);

    const handleSave = useCallback(
        async (nextContent?: string) => {
            if (!doc || doc.type !== "text") return;

            const payload = typeof nextContent === "string" ? nextContent : content;
            if (payload === persistedContent) return;

            setSaveState("saving");
            try {
                const response = await fetch(
                    buildApiUrl(`/api/documents/${doc.id}`),
                    {
                        method: "PUT",
                        credentials: "include",
                        headers: withUserHeaders({
                            "Content-Type": "application/json",
                        }),
                        body: JSON.stringify({ content: payload }),
                    }
                );

                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }

                let body: unknown = null;
                try {
                    body = await response.json();
                } catch {
                    body = null;
                }

                if (!response.ok) {
                    throw new Error(
                        normalizeErrorMessage(
                            body,
                            "Impossible d'enregistrer le document."
                        )
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
        [doc, content, persistedContent, withUserHeaders, router]
    );

    const fetchParticipants = useCallback(async () => {
        if (!documentId) return;
        setParticipantsLoading(true);
        setParticipantsError(null);

        try {
            const response = await fetch(
                buildApiUrl(`/api/sessions/${documentId}`),
                {
                    credentials: "include",
                }
            );

            if (response.status === 401) {
                router.replace("/login");
                return;
            }

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(
                    normalizeErrorMessage(
                        payload,
                        "Impossible de récupérer les participants."
                    )
                );
            }

            const rawList = Array.isArray(
                (payload as { participants?: unknown }).participants
            )
                ? ((payload as { participants: unknown[] }).participants as unknown[])
                : [];

            const normalized: SessionParticipantEntry[] = rawList.map(
                (item, index) => {
                    if (!item || typeof item !== "object") {
                        return {
                            userId: `participant-${index}`,
                            displayName: "Collaborateur",
                            email: "",
                        };
                    }

                    const participant = item as Record<string, unknown>;
                    const rawUser =
                        (participant.user as Record<string, unknown> | undefined) ??
                        (participant.User as Record<string, unknown> | undefined);

                    const email =
                        (typeof participant.email === "string" && participant.email) ||
                        (rawUser && typeof rawUser.email === "string"
                            ? rawUser.email
                            : "");

                    const displayName =
                        (rawUser &&
                            typeof rawUser.display_name === "string" &&
                            rawUser.display_name) ||
                        (rawUser &&
                            typeof rawUser.displayName === "string" &&
                            rawUser.displayName) ||
                        (typeof participant.display_name === "string" &&
                            participant.display_name) ||
                        (typeof participant.displayName === "string" &&
                            participant.displayName) ||
                        email ||
                        "Collaborateur";

                    const userId =
                        (typeof participant.user_id === "string" && participant.user_id) ||
                        (typeof participant.userId === "string" && participant.userId) ||
                        (rawUser && typeof rawUser.id === "string" && rawUser.id) ||
                        (rawUser &&
                            typeof rawUser.user_id === "string" &&
                            rawUser.user_id) ||
                        email ||
                        `participant-${index}`;

                    return {
                        userId,
                        displayName,
                        email,
                    };
                }
            );

            setParticipants(normalized);
        } catch (error) {
            console.error("Erreur participants:", error);
            setParticipantsError(
                error instanceof Error
                    ? error.message
                    : "Impossible de charger les participants."
            );
        } finally {
            setParticipantsLoading(false);
        }
    }, [documentId, router]);

    const fetchMessages = useCallback(async () => {
        if (!documentId) return;

        setMessagesLoading(true);
        setMessagesError(null);

        try {
            const response = await fetch(
                buildApiUrl(`/api/messages/${documentId}`),
                {
                    credentials: "include",
                }
            );

            if (response.status === 401) {
                router.replace("/login");
                return;
            }

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(
                    normalizeErrorMessage(
                        payload,
                        "Impossible de récupérer les messages."
                    )
                );
            }

            const rawList = Array.isArray(
                (payload as { messages?: unknown }).messages
            )
                ? ((payload as { messages: unknown[] }).messages as unknown[])
                : [];

            const normalized = rawList
                .map((item, index): ChatMessageEntry => {
                    if (!item || typeof item !== "object") {
                        return {
                            id: `message-${index}`,
                            content: "",
                            user_id: "",
                            created_at: new Date().toISOString(),
                        };
                    }

                    const record = item as Record<string, unknown>;
                    const createdAtRaw =
                        (typeof record.created_at === "string" && record.created_at) ||
                        (typeof record.createdAt === "string" && record.createdAt) ||
                        new Date().toISOString();

                    return {
                        id:
                            (typeof record.id === "number" || typeof record.id === "string") &&
                            record.id !== ""
                                ? (record.id as number | string)
                                : `message-${index}`,
                        content:
                            (typeof record.content === "string" && record.content) || "",
                        user_id:
                            (typeof record.user_id === "string" && record.user_id) || "",
                        created_at: createdAtRaw,
                    };
                })
                .sort((a, b) => {
                    const aTime = new Date(a.created_at).getTime();
                    const bTime = new Date(b.created_at).getTime();
                    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
                        return 0;
                    }
                    return aTime - bTime;
                });

            setMessagesList(normalized);
        } catch (error) {
            console.error("Erreur messages:", error);
            setMessagesError(
                error instanceof Error
                    ? error.message
                    : "Impossible de charger les messages."
            );
        } finally {
            setMessagesLoading(false);
        }
    }, [documentId, router]);

    useEffect(() => {
        if (!documentId) {
            setMessage({
                type: "error",
                text: "Identifiant de document introuvable dans l'URL.",
            });
            setLoading(false);
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            const prof = await fetchProfile();
            if (!cancelled && prof) {
                await fetchDocument();
            }
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [documentId, fetchProfile, fetchDocument]);

    useEffect(() => {
        if (!doc || !documentId) return;
        fetchParticipants();
        fetchMessages();
    }, [doc, documentId, fetchParticipants, fetchMessages]);

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
    }, [content, persistedContent, isTextDocument, handleSave]);

    const handleSendMessage = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!documentId) return;

            const trimmed = newMessage.trim();
            if (!trimmed) return;

            setMessagesError(null);
            setSendingMessage(true);

            try {
                const response = await fetch(
                    buildApiUrl(`/api/messages/${documentId}`),
                    {
                        method: "POST",
                        credentials: "include",
                        headers: withUserHeaders({
                            "Content-Type": "application/json",
                        }),
                        body: JSON.stringify({ content: trimmed }),
                    }
                );

                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }

                let payload: unknown = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }

                if (!response.ok) {
                    throw new Error(
                        normalizeErrorMessage(
                            payload,
                            "Impossible d'envoyer le message."
                        )
                    );
                }

                const created =
                    payload &&
                    typeof payload === "object" &&
                    payload !== null &&
                    "message" in payload
                        ? (payload as { message?: Record<string, unknown> }).message
                        : null;

                setNewMessage("");

                if (created) {
                    setMessagesList((current) => {
                        const next: ChatMessageEntry[] = [
                            ...current,
                            {
                                id:
                                    (typeof created?.id === "number" ||
                                        typeof created?.id === "string") &&
                                    created?.id !== ""
                                        ? (created?.id as number | string)
                                        : Date.now(),
                                content:
                                    (typeof created?.content === "string" &&
                                        created?.content) ||
                                    trimmed,
                                user_id:
                                    (typeof created?.user_id === "string" &&
                                        created?.user_id) ||
                                    profile?.id ||
                                    "",
                                created_at:
                                    (typeof created?.created_at === "string" &&
                                        created?.created_at) ||
                                    new Date().toISOString(),
                            },
                        ];

                        return next.sort((a, b) => {
                            const aTime = new Date(a.created_at).getTime();
                            const bTime = new Date(b.created_at).getTime();
                            if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
                                return 0;
                            }
                            return aTime - bTime;
                        });
                    });
                } else {
                    await fetchMessages();
                }
            } catch (error) {
                console.error("Erreur message:", error);
                setMessagesError(
                    error instanceof Error
                        ? error.message
                        : "Impossible d'envoyer le message."
                );
            } finally {
                setSendingMessage(false);
            }
        },
        [
            documentId,
            newMessage,
            withUserHeaders,
            router,
            profile?.id,
            fetchMessages,
        ]
    );

    const openInviteModal = useCallback(() => {
        setInviteFeedback(null);
        setInviteModalOpen(true);
    }, []);

    const closeInviteModal = useCallback(() => {
        setInviteModalOpen(false);
    }, []);

    const handleInviteSubmit = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!doc) return;

            const email = inviteEmail.trim();
            if (!email) {
                setInviteFeedback({
                    type: "error",
                    text: "Veuillez saisir une adresse e-mail valide.",
                });
                return;
            }

            setInviteLoading(true);
            setInviteFeedback(null);

            try {
                const response = await fetch(
                    buildApiUrl(`/api/documents/${doc.id}/invite`),
                    {
                        method: "POST",
                        credentials: "include",
                        headers: withUserHeaders({
                            "Content-Type": "application/json",
                        }),
                        body: JSON.stringify({
                            email,
                            permission: invitePermission,
                        }),
                    }
                );

                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }

                let payload: unknown = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }

                if (!response.ok) {
                    throw new Error(
                        normalizeErrorMessage(
                            payload,
                            "Impossible d'envoyer l'invitation."
                        )
                    );
                }

                setInviteFeedback({
                    type: "success",
                    text:
                        (payload &&
                            typeof payload === "object" &&
                            payload !== null &&
                            "message" in payload &&
                            typeof (payload as { message?: unknown }).message === "string"
                            ? (payload as { message: string }).message
                            : "Invitation envoyée avec succès."),
                });
                setInviteEmail("");
                setInvitePermission("edit");
                await fetchParticipants();
            } catch (error) {
                console.error("Erreur invitation:", error);
                setInviteFeedback({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Impossible d'envoyer l'invitation.",
                });
            } finally {
                setInviteLoading(false);
            }
        },
        [
            doc,
            inviteEmail,
            invitePermission,
            withUserHeaders,
            router,
            fetchParticipants,
        ]
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

    const sortedMessages = useMemo(() => {
        return [...messagesList].sort((a, b) => {
            const aTime = new Date(a.created_at).getTime();
            const bTime = new Date(b.created_at).getTime();
            if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
                return 0;
            }
            return aTime - bTime;
        });
    }, [messagesList]);

    const messageAuthorLookup = useMemo(() => {
        const map = new Map<string, string>();

        participants.forEach((participant) => {
            const key = participant.userId;
            if (key) {
                map.set(key, participant.displayName || participant.email || "");
            }
        });

        if (doc?.owner_id) {
            map.set(doc.owner_id, ownerDisplayName || doc.owner_id);
        }

        if (profile?.id) {
            map.set(
                profile.id,
                profile.name || profile.email || "Vous"
            );
        }

        return map;
    }, [participants, doc?.owner_id, ownerDisplayName, profile?.id, profile?.name, profile?.email]);

    const resolveAuthorName = useCallback(
        (userId: string) => {
            if (!userId) {
                return "Collaborateur";
            }

            const fromLookup = messageAuthorLookup.get(userId);
            if (fromLookup) {
                return fromLookup;
            }

            if (userId === profile?.id) {
                return profile?.name || profile?.email || "Vous";
            }

            if (userId === doc?.owner_id) {
                return ownerDisplayName || "Propriétaire";
            }

            return "Collaborateur";
        },
        [messageAuthorLookup, profile?.id, profile?.name, profile?.email, doc?.owner_id, ownerDisplayName]
    );

    let mainContent: ReactNode = null;

    if (loading) {
        mainContent = (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
                <div className="space-y-4">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-gray-700" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-gray-700" />
                    <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-700" />
                </div>
                <aside className="space-y-4">
                    <div className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-700" />
                    <div className="h-48 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-700" />
                </aside>
            </div>
        );
    } else if (!doc) {
        mainContent = (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-6 text-sm text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <p className="font-semibold">Document introuvable ou inaccessible.</p>
                <p className="mt-1">
                    {message?.text ??
                        "Veuillez vérifier l'identifiant et vos droits d'accès."}
                </p>
            </div>
        );
    } else {
        mainContent = (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
                <div className="space-y-6">
                    {doc.type === "text" ? (
                        <DocumentTextSection
                            document={doc}
                            content={content}
                            onContentChange={setContent}
                            ownerDisplayName={ownerDisplayName}
                        />
                    ) : (
                        <DocumentSummarySection
                            document={doc}
                            inlinePreviewUrl={inlinePreviewUrl}
                            ownerDisplayName={ownerDisplayName}
                        />
                    )}
                </div>
                <CollaborationSidebar
                    participants={participants}
                    participantsLoading={participantsLoading}
                    participantsError={participantsError}
                    profile={profile}
                    messages={sortedMessages}
                    messagesLoading={messagesLoading}
                    messagesError={messagesError}
                    newMessage={newMessage}
                    onNewMessageChange={setNewMessage}
                    onSendMessage={handleSendMessage}
                    sendingMessage={sendingMessage}
                    isOwner={isOwner}
                    onOpenInviteModal={openInviteModal}
                    resolveAuthorName={resolveAuthorName}
                />
            </div>
        );
    }

    return (
        <Fragment>
            <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 lg:px-8">
                    <DocumentToolbar
                        document={doc}
                        saveIndicator={saveIndicator}
                        saveState={saveState}
                        lastSavedAt={lastSavedAt}
                        isTextDocument={isTextDocument}
                        content={content}
                        persistedContent={persistedContent}
                        onSave={() => handleSave()}
                        downloadUrl={downloadUrl}
                        inlinePreviewUrl={inlinePreviewUrl}
                        onDownload={handleDownload}
                        onOpenPreview={handleOpenInBrowser}
                    />

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

                    {mainContent}
                </div>
            </div>

            <InviteCollaboratorModal
                isOpen={isInviteModalOpen}
                inviteEmail={inviteEmail}
                invitePermission={invitePermission}
                inviteFeedback={inviteFeedback}
                inviteLoading={inviteLoading}
                onClose={closeInviteModal}
                onEmailChange={setInviteEmail}
                onPermissionChange={(value) => setInvitePermission(value)}
                onSubmit={handleInviteSubmit}
            />
        </Fragment>
    );
}
