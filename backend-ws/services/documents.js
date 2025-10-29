import documentRouter from "../api/documents.js";

export async function canAccessDocument(user, documentId) {
    return await documentRouter.getIdPermission(user, documentId);
}

export async function loadDocumentSnapshot(user, documentId) {
    return await documentRouter.getId(user, documentId);
}