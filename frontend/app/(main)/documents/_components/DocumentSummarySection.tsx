import { DocumentDetail } from "../types";

interface DocumentSummarySectionProps {
    document: DocumentDetail;
    inlinePreviewUrl: string | null;
    ownerDisplayName: string;
}

export function DocumentSummarySection({
    document,
    inlinePreviewUrl,
    ownerDisplayName,
}: DocumentSummarySectionProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                Résumé du document
            </h2>
            <dl className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>
                    <span className="font-medium">Type :</span>{" "}
                    {document.type === "folder" ? "Dossier" : "Fichier importé"}
                </div>
                <div>
                    <span className="font-medium">Propriétaire :</span>{" "}
                    {ownerDisplayName}
                </div>
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
                {document.mime_type && (
                    <div>
                        <span className="font-medium">Type MIME :</span>{" "}
                        {document.mime_type}
                    </div>
                )}
            </dl>
            {document.type === "file" && inlinePreviewUrl && (
                <div className="mt-6 space-y-2">
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">
                        <iframe
                            src={inlinePreviewUrl}
                            title={`Aperçu de ${document.name}`}
                            className="h-[600px] w-full bg-white"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Si l&apos;aperçu ne se charge pas, utilisez le bouton «
                        Ouvrir dans le navigateur ».
                    </p>
                </div>
            )}
            <p className="mt-6 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-700">
                Ce type de document ({document.type}) ne peut pas être édité
                directement.
            </p>
        </div>
    );
}
