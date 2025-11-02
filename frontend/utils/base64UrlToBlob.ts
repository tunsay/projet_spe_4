/**
 * Convert a Base64url string or data URL to a Blob.
 *
 * If the input is a data URL (starts with "data:"), the MIME type will be extracted
 * from the data URL and will override the optional contentType parameter.
 *
 * @param base64Url - Base64url encoded string or data URL (RFC 4648 §5 / data:[<mediatype>][;base64],<data>)
 * @param contentType - Optional fallback MIME type for the resulting Blob (default: 'application/octet-stream')
 */
export default function base64UrlToBlob(base64Url: string, contentType = 'application/octet-stream'): Blob {
    let base64 = base64Url;
    let detectedContentType = contentType;

    // If input is a data URL, extract the MIME type and the data portion
    if (base64Url.startsWith('data:')) {
        const commaIndex = base64Url.indexOf(',');
        if (commaIndex !== -1) {
            const meta = base64Url.slice(5, commaIndex); // between "data:" and ","
            const data = base64Url.slice(commaIndex + 1);
            // meta might be like "image/png;base64" or ";base64" or "application/pdf"
            if (meta && !meta.startsWith(';')) {
                const mime = meta.split(';')[0];
                if (mime) detectedContentType = mime;
            }
            base64 = data;
        }
    }

    // Convert from base64url to base64
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    // Decode base64 to binary string
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: detectedContentType });
}