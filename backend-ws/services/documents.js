import documentRouter from "../api/documents.js";
// we keep autosave logic local to this file: store pending changes in RAM and
// trigger a save only after INACTIVITY_MS of no updates for that document.
import eventBus from "./eventBus.js";

// Map to keep the user associated with a document for autosave persistence
const documentUsers = new Map(); // documentId -> user
// Per-document inactivity timers. When the timer fires we persist the pending content
const inactivityTimers = new Map(); // documentId -> Timeout
// Pending content stored in RAM until the inactivity timer fires
const pendingDocuments = new Map(); // documentId -> content
// How long (ms) with no calls to saveDocumentContent before persisting to DB
const INACTIVITY_MS = 5_000; // user requested 5 seconds

// The save function passed to startAutoSave. It will be called periodically with (documentId, content)
async function _autoSaveSaveFn(documentId, content) {
    const user = documentUsers.get(documentId);
    if (!user) {
        // nothing we can do if we don't have a user for that doc
        // eslint-disable-next-line no-console
        console.error("Auto-save: no user available for document", documentId);
        return;
    }
    try {
        console.log("documentRouter.updateDocumentContent for documentId:", documentId, "by user:", user.id);
        const result = await documentRouter.updateDocumentContent(user, documentId, content);
        // Notify listeners that an autosave persisted
        try {
            eventBus.emit("document:saved", result);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to emit document:saved event', e);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Auto-save failed for', documentId, err);
    }
}

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

export function saveDocumentContent(user, documentId, content) {
    try {
        // store latest content in RAM
        pendingDocuments.set(documentId, content);
        documentUsers.set(documentId, user);

        // reset inactivity timer for this document
        if (inactivityTimers.has(documentId)) {
            clearTimeout(inactivityTimers.get(documentId));
        }

        const timer = setTimeout(async () => {
            try {
                // get the latest pending content (may have changed since timer was set)
                const pending = pendingDocuments.get(documentId);
                if (pending === undefined) {
                    // nothing to do
                    inactivityTimers.delete(documentId);
                    return;
                }

                // call the centralized save function (handles routing + events)
                await _autoSaveSaveFn(documentId, pending);

                // cleanup for this document after successful attempt
                pendingDocuments.delete(documentId);
                documentUsers.delete(documentId);
                inactivityTimers.delete(documentId);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error persisting autosave for', documentId, err);
                // keep pending content so a subsequent call will retry; also remove timer
                inactivityTimers.delete(documentId);
            }
        }, INACTIVITY_MS);

        inactivityTimers.set(documentId, timer);
    } catch (error) {
        console.error("Error saving document content:", error);
        return null;
    }
}