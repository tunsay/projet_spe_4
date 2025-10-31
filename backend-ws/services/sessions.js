import sessionRouter from '../api/sessions.js';

export async function openSession(user, documentId) {
    try {
        return await sessionRouter.open(user, documentId);
    } catch (error) {
        console.error("Error opening session:", error);
        return false;
    }
}

export async function closeSession(user, documentId) {
    try {
        return await sessionRouter.close(user, documentId);
    } catch (error) {
        console.error("Error closing session:", error);
        return null;
    }
}