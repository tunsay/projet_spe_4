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
import useRoomDocument from "@/hooks/useRoomDocument";
import { handleUnauthorized } from "@/lib/auth";
import { DocumentToolbar } from "../_components/DocumentToolbar";
import { DocumentTextSection } from "../_components/DocumentTextSection";
import { DocumentSummarySection } from "../_components/DocumentSummarySection";
import { CollaborationSidebar } from "../_components/CollaborationSidebar";
import { InviteCollaboratorModal } from "../_components/InviteCollaboratorModal";
import { useSocketContext } from "@/provider/socket";
import { fetchParticipants as fetchParticipantsService } from "@/api/participant";
import {
    DocumentDetail,
    FeedbackMessage,
    Profile,
    SaveState,
    SessionParticipantEntry,
} from "@/types/documents";
import {
    normalizeMessageRecord,
    sortMessagesByDate,
    normalizeErrorMessage,
} from "@/utils/message";

const MESSAGE_EMOJI_CHOICES = [
    "😀",
    "😂",
    "😍",
    "👍",
    "🎉",
    "😢",
    "🔥",
    "🙏",
    "🤔",
    "👏",
    "🙌",
    "🚀",
];

export default function DocumentDetailPage() {
    const { socket } = useSocketContext();
    const router = useRouter();
    const routeParams = useParams();
    const rawId = routeParams?.id;
    const documentId =
        typeof rawId === "string"
            ? rawId
            : Array.isArray(rawId)
            ? rawId[0] ?? ""
            : "";

    const {
        participants,
        setParticipants,
        content,
        setContent,
        joined: isRealtimeReady,
        initialState: doc,
        setInitialState: setDoc,
        messagesList,
        setMessagesList,
        sendMessage,
        toggleReaction,
        currentSelection,
        setCurrentSelection
    } = useRoomDocument(socket, documentId);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [persistedContent, setPersistedContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<FeedbackMessage | null>(null);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [participantsError, setParticipantsError] = useState<string | null>(
        null
    );
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [invitePermission, setInvitePermission] = useState<
        "read" | "edit" | "owner"
    >("edit");
    const [inviteFeedback, setInviteFeedback] =
        useState<FeedbackMessage | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    const isTextDocument = doc?.type === "text";
    const isOwner = doc && profile ? doc.owner_id === profile.id : false;

    const ownerDisplayName = useMemo(() => {
        if (!doc) return "";
        if (profile && doc.owner_id === profile.id) {
            return (
                (profile.name && profile.name.trim()) ||
                (profile.email && profile.email.trim()) ||
                profile.id ||
                ""
            );
        }
        const owner =
            participants.find((item) => item.userId === doc.owner_id) ??
            participants.find((item) => item.email === doc.owner_id);
        if (owner) {
            return (
                (owner.displayName && owner.displayName.trim()) ||
                (owner.email && owner.email.trim()) ||
                owner.userId
            );
        }
        return "";
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

            if (await handleUnauthorized(response, router)) {
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

            if (await handleUnauthorized(response, router)) {
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
            setContent(initial, initial.length, initial.length, "forward");
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
    }, [documentId, router, setDoc]);

    const handleSave = useCallback(
        async (nextContent?: string) => {
            if (!doc || doc.type !== "text") return;

            const payload =
                typeof nextContent === "string" ? nextContent : content;
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

                if (await handleUnauthorized(response, router)) {
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
            const newParticipantList = await fetchParticipantsService(documentId);

            setParticipants(newParticipantList);
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

            if (await handleUnauthorized(response, router)) {
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

            const normalized = rawList.map((item, index) =>
                normalizeMessageRecord(item, `message-${index}`)
            );

            setMessagesList(sortMessagesByDate(normalized));
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
    }, [documentId, router, setMessagesList]);

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
                const fallbackAuthor = profile
                    ? {
                          id: profile.id,
                          email: profile.email ?? null,
                          display_name:
                              profile.name && profile.name.trim()
                                  ? profile.name.trim()
                                  : null,
                      }
                    : {
                          id: null,
                          email: null,
                          display_name: null,
                      };

                const optimisticMessage = normalizeMessageRecord(
                    {
                        id: Date.now(),
                        content: trimmed,
                        user_id: profile?.id ?? "",
                        created_at: new Date().toISOString(),
                        author: fallbackAuthor,
                        email: fallbackAuthor.email,
                        display_name: fallbackAuthor.display_name,
                    },
                    `local-${Date.now()}`
                );

                setNewMessage("");
                await sendMessage(
                    optimisticMessage,
                    optimisticMessage.id.toString()
                );
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
            profile?.id,
            profile?.name,
            profile?.email,
            sendMessage,
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

                if (await handleUnauthorized(response, router)) {
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
                        payload &&
                        typeof payload === "object" &&
                        payload !== null &&
                        "message" in payload &&
                        typeof (payload as { message?: unknown }).message ===
                            "string"
                            ? (payload as { message: string }).message
                            : "Invitation envoyée avec succès.",
                });
                setInviteEmail("");
                setInvitePermission("edit");
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
            return bTime - aTime;
        });
    }, [messagesList]);

    const messageAuthorLookup = useMemo(() => {
        const map = new Map<string, string>();

        participants.forEach((participant) => {
            const key = participant.userId;
            if (!key) return;
            const display =
                (participant.displayName && participant.displayName.trim()) ||
                (participant.email && participant.email.trim());
            if (display) {
                map.set(key, display);
            }
        });

        if (doc?.owner_id) {
            const ownerName =
                (ownerDisplayName && ownerDisplayName.trim()) ||
                (participants.find((item) => item.userId === doc.owner_id)
                    ?.email ??
                    doc.owner_id);
            map.set(doc.owner_id, ownerName);
        }

        if (profile?.id) {
            const currentUserName =
                (profile.name && profile.name.trim()) ||
                (profile.email && profile.email.trim()) ||
                profile.id;
            map.set(profile.id, currentUserName);
        }

        return map;
    }, [
        participants,
        doc?.owner_id,
        ownerDisplayName,
        profile?.id,
        profile?.name,
        profile?.email,
    ]);

    const resolveAuthorName = useCallback(
        (userId: string, fallbackName?: string | null) => {
            const fallback = (fallbackName && fallbackName.trim()) || undefined;

            if (!userId) {
                return (
                    fallback || (profile?.email && profile.email.trim()) || ""
                );
            }

            const fromLookupRaw = messageAuthorLookup.get(userId);
            const fromLookup =
                (typeof fromLookupRaw === "string" &&
                    fromLookupRaw.trim().length > 0 &&
                    fromLookupRaw.trim()) ||
                null;
            if (fromLookup && fromLookup !== userId) {
                return fromLookup;
            }

            if (userId === profile?.id) {
                return (
                    (profile?.name && profile.name.trim()) ||
                    (profile?.email && profile.email.trim()) ||
                    userId
                );
            }

            if (userId === doc?.owner_id) {
                return (
                    (ownerDisplayName && ownerDisplayName.trim()) ||
                    fallback ||
                    doc.owner_id
                );
            }

            return fallback || userId;
        },
        [
            messageAuthorLookup,
            profile?.id,
            profile?.name,
            profile?.email,
            doc?.owner_id,
            ownerDisplayName,
        ]
    );

    if (!profile || !isRealtimeReady) {
        return (
            <Fragment>
                <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
                    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
                            …
                        </span>
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Connexion sécurisée en cours
                        </h1>
                        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                            Nous finalisons votre authentification avant
                            d’afficher le document et votre profil. Veuillez
                            patienter quelques instants.
                        </p>
                    </div>
                </div>
            </Fragment>
        );
    }

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
                <p className="font-semibold">
                    Document introuvable ou inaccessible.
                </p>
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
                            selection={{
                                start: currentSelection?.start ?? 0,
                                end: currentSelection?.end ?? 0,
                            }}
                            setCurrentSelection={setCurrentSelection}
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
                    isRealtimeReady={isRealtimeReady}
                    onToggleReaction={toggleReaction}
                    emojiOptions={MESSAGE_EMOJI_CHOICES}
                    currentUserId={profile?.id ?? null}
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
