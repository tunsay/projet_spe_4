import { FormEvent, useEffect, useRef } from "react";
import {
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    UserPlusIcon,
} from "@heroicons/react/20/solid";
import {
    ChatMessageEntry,
    Profile,
    SessionParticipantEntry,
    formatTimestamp,
} from "../types";

interface CollaborationSidebarProps {
    participants: SessionParticipantEntry[];
    participantsLoading: boolean;
    participantsError: string | null;
    profile: Profile | null;
    messages: ChatMessageEntry[];
    messagesLoading: boolean;
    messagesError: string | null;
    newMessage: string;
    onNewMessageChange: (value: string) => void;
    onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
    sendingMessage: boolean;
    isOwner: boolean;
    onOpenInviteModal: () => void;
    resolveAuthorName: (userId: string, fallbackName?: string | null) => string;
    isRealtimeReady: boolean;
}

export function CollaborationSidebar({
    participants,
    participantsLoading,
    participantsError,
    profile,
    messages,
    messagesLoading,
    messagesError,
    newMessage,
    onNewMessageChange,
    onSendMessage,
    sendingMessage,
    isOwner,
    onOpenInviteModal,
    resolveAuthorName,
    isRealtimeReady,
}: CollaborationSidebarProps) {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isRealtimeReady) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }, [messages, isRealtimeReady]);

    if (!isRealtimeReady) {
        return (
            <aside className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
                    <p>Connexion en cours…</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <UserGroupIcon aria-hidden="true" className="h-4 w-4" />
                            Collaborateurs
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {participants.length}
                        </span>
                    </div>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={onOpenInviteModal}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition duration-150 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                        >
                            <UserPlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
                            Inviter
                        </button>
                    )}
                </div>
                {participantsError && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                        {participantsError}
                    </p>
                )}
                <div className="mt-3 space-y-2">
                    {participantsLoading && !participants.length ? (
                        <div className="space-y-2">
                            <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-gray-700" />
                            <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-gray-700" />
                        </div>
                    ) : participants.length ? (
                        <ul className="space-y-2">
                            {participants.map((participant) => (
                                <li
                                    key={participant.userId || participant.email}
                                    className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {participant.displayName}
                                        </span>
                                        {participant.userId === profile?.id && (
                                            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                                                Vous
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Aucun participant actif pour le moment.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <ChatBubbleLeftRightIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                        />
                        Messages
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {messages.length}
                    </span>
                </div>
                <div
                    ref={scrollContainerRef}
                    className="mt-3 min-h-[220px] flex-1 overflow-y-auto pr-1"
                >
                    {messagesLoading && !messages.length ? (
                        <div className="space-y-2">
                            <div className="h-16 animate-pulse rounded-md bg-slate-100 dark:bg-gray-700" />
                            <div className="h-16 animate-pulse rounded-md bg-slate-100 dark:bg-gray-700" />
                        </div>
                    ) : messages.length ? (
                        <div className="flex flex-col gap-3">
                            {messages.map((chat) => {
                                const displayName = resolveAuthorName(
                                    chat.user_id,
                                    chat.authorName ?? chat.authorEmail ?? null
                                );
                                return (
                                    <div
                                        key={chat.id}
                                        className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                                    >
                                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                {displayName}
                                            </span>
                                            <span>{formatTimestamp(chat.created_at)}</span>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                                            {chat.content}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Aucun message pour le moment.
                        </p>
                    )}
                </div>
                {messagesError && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                        {messagesError}
                    </p>
                )}
                <form className="mt-3 space-y-2" onSubmit={onSendMessage}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Nouveau message
                        <textarea
                            value={newMessage}
                            onChange={(event) => onNewMessageChange(event.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            placeholder="Écrire un message à partager…"
                        />
                    </label>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={sendingMessage || !newMessage.trim()}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {sendingMessage ? "Envoi…" : "Envoyer"}
                        </button>
                    </div>
                </form>
            </div>
        </aside>
    );
}
