import documentRouter from "../api/documents.js";

export async function canAccessDocument(user, documentId) {
    try {
        return await documentRouter.getByIdPermission(user, documentId);
    } catch (error) {
        console.error("Error checking document access:", error);
        return false;
    }
}

export async function loadDocumentSnapshot(user, documentId) {
    try {
        return await documentRouter.getById(user, documentId);
    } catch (error) {
        console.error("Error loading document snapshot:", error);
        return null;
    }
}