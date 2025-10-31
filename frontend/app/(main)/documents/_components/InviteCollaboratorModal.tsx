import { Dialog } from "@headlessui/react";
import { FormEvent } from "react";
import { FeedbackMessage } from "@/types/documents";

interface InviteCollaboratorModalProps {
    isOpen: boolean;
    inviteEmail: string;
    invitePermission: "read" | "edit" | "owner";
    inviteFeedback: FeedbackMessage | null;
    inviteLoading: boolean;
    onClose: () => void;
    onEmailChange: (value: string) => void;
    onPermissionChange: (value: "read" | "edit" | "owner") => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function InviteCollaboratorModal({
    isOpen,
    inviteEmail,
    invitePermission,
    inviteFeedback,
    inviteLoading,
    onClose,
    onEmailChange,
    onPermissionChange,
    onSubmit,
}: InviteCollaboratorModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <Dialog
            as="div"
            className="fixed inset-0 z-40 overflow-y-auto"
            open={isOpen}
            onClose={onClose}
        >
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-gray-900">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-gray-800">
                        <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Inviter un collaborateur
                        </Dialog.Title>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md bg-slate-100 p-1 text-slate-500 transition duration-150 hover:bg-slate-200 hover:text-slate-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
                        >
                            <span className="sr-only">Fermer</span>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form className="space-y-4 px-5 py-4" onSubmit={onSubmit}>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Partagez ce document avec un membre de votre équipe
                            et définissez son niveau d&apos;accès.
                        </p>
                        {inviteFeedback && (
                            <div
                                className={`rounded-md border px-3 py-2 text-xs ${
                                    inviteFeedback.type === "success"
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                                        : "border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                                }`}
                            >
                                {inviteFeedback.text}
                            </div>
                        )}
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                            Adresse e-mail
                            <input
                                type="email"
                                required
                                value={inviteEmail}
                                onChange={(event) =>
                                    onEmailChange(event.target.value)
                                }
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                placeholder="collaborateur@exemple.com"
                            />
                        </label>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                            Niveau d&apos;accès
                            <select
                                value={invitePermission}
                                onChange={(event) =>
                                    onPermissionChange(
                                        event.target.value as
                                            | "read"
                                            | "edit"
                                            | "owner"
                                    )
                                }
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="read">Lecture seule</option>
                                <option value="edit">Lecture & écriture</option>
                                <option value="owner">Propriétaire</option>
                            </select>
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition duration-150 hover:bg-slate-100 dark:border-gray-600 dark:text-slate-300 dark:hover:bg-gray-800"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={inviteLoading}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {inviteLoading
                                    ? "Envoi…"
                                    : "Envoyer l'invitation"}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
