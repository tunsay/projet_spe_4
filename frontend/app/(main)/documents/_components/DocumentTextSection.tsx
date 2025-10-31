import { DocumentDetail } from "@/types/documents";

interface DocumentTextSectionProps {
    document: DocumentDetail;
    content: string;
    onContentChange: (value: string) => void;
    ownerDisplayName: string;
}

export function DocumentTextSection({
    document,
    content,
    onContentChange,
    ownerDisplayName,
}: DocumentTextSectionProps) {
    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                    Contenu du document
                    <textarea
                        value={content}
                        onChange={(event) => onContentChange(event.target.value)}
                        rows={18}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        placeholder="Commencez à saisir votre contenu…"
                    />
                </label>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    Détails
                </h2>
                <dl className="mt-2 space-y-1">
                    <div>
                        <span className="font-medium">Créé le :</span>{" "}
                        {new Date(document.created_at).toLocaleString()}
                    </div>
                    {document.last_modified_at && (
                        <div>
                            <span className="font-medium">Modifié le :</span>{" "}
                            {new Date(document.last_modified_at).toLocaleString()}
                        </div>
                    )}
                    <div>
                        <span className="font-medium">Propriétaire :</span>{" "}
                        {ownerDisplayName}
                    </div>
                </dl>
            </div>
        </div>
    );
}
