
const documents = [];

export function getAutoSaveDocument(documentId) {
    return documents.find(doc => doc.documentId === documentId);
}

export function addOrUpdateAutoSaveDocument(documentId, content) {
    const existingDoc = getAutoSaveDocument(documentId);
    if (existingDoc) {
        existingDoc.content = content;
    } else {
        documents.push({ documentId, content });
    }
}

export function removeAutoSaveDocument(documentId) {
    const index = documents.findIndex(doc => doc.documentId === documentId);
    if (index !== -1) {
        documents.splice(index, 1);
    }
}

export function hasAutoSaveDocuments() {
    return documents.length > 0;
}

let _autosaveRunning = false;
let _autosaveCancel = false;

/**
 * Start an autosave loop that iterates all documents and calls saveFn(documentId, content).
 * saveFn may be async; each document is awaited in sequence. The loop repeats every intervalMs.
 *
 * @param {(documentId: any, content: any) => Promise|void} saveFn
 * @param {number} intervalMs
 */
export function startAutoSave(saveFn, intervalMs = 5000) {
    if (_autosaveRunning) return;
    _autosaveRunning = true;
    _autosaveCancel = false;

    (async () => {
        while (!_autosaveCancel) {
            // take a shallow copy so modifications during saving won't break the iteration
            const snapshot = documents.slice();
            for (const doc of snapshot) {
                if (_autosaveCancel) break;
                try {
                    console.log("Auto-saving document:", doc.documentId, "content length:", doc.content.length);
                    await saveFn(doc.documentId, doc.content);
                } catch (err) {
                    // avoid throwing from the loop; log and continue
                    // replace with your logger if desired
                    // eslint-disable-next-line no-console
                    console.error('Auto-save error for', doc.documentId, err);
                }
            }
            if (_autosaveCancel) break;
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        _autosaveRunning = false;
    })();
}

/**
 * Stop the running autosave loop (if any).
 */
export function stopAutoSave() {
    _autosaveCancel = true;
}
