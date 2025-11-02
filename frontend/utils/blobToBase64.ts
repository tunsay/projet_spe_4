/**
 * Convert a Blob (or File) to a base64 string.
 * @param blob - input Blob or File
 * @param includeDataUrl - when true, returns a full data URL (e.g. "data:image/png;base64,...").
 *                         when false (default), returns only the base64 payload (no "data:...;base64,").
 * @returns Promise that resolves to the base64 string.
 */
export default function blobToBase64(blob: Blob, includeDataUrl = false): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => {
            reader.abort();
            reject(new Error('Failed to read blob'));
        };

        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Unexpected FileReader result type'));
                return;
            }

            if (includeDataUrl) {
                resolve(result);
                return;
            }

            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };

        reader.readAsDataURL(blob);
    });
}