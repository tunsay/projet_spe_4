/**
 * Normalize many incoming types to a base64 string (no data: prefix).
 * Returns null when the input cannot be converted.
 */
export default async (data: unknown): Promise<string | null> => {
    if (data == null) return null;

    const uint8ToBase64 = (u8: Uint8Array): string => {
        // convert in chunks to avoid call stack / memory issues for large buffers
        const CHUNK = 0x8000;
        let binary = "";
        for (let i = 0; i < u8.length; i += CHUNK) {
            const slice = u8.subarray(i, i + CHUNK);
            binary += String.fromCharCode.apply(null, Array.from(slice));
        }
        // btoa is available in browser environments
        try {
            return btoa(binary);
        } catch {
            // fallback: use atob/Buffer if running in Node-like env (unlikely for frontend file)
            // @ts-ignore
            if (typeof Buffer !== "undefined") return Buffer.from(u8).toString("base64");
            throw new Error("No base64 encoder available");
        }
    };

    // If it's already a string: handle data URL / base64 / plain text
    if (typeof data === "string") {
        const str = data.trim();
        // data:<mime>;base64,AAAA...
        if (str.includes(",") && /;base64,/.test(str)) {
            return str.split(",").pop() || null;
        }
        // Heuristic: looks like base64 (allow whitespace)
        const maybe = str.replace(/\s+/g, "");
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(maybe)) {
            return maybe;
        }
        // treat as UTF-8 text
        try {
            const u8 = new TextEncoder().encode(str);
            return uint8ToBase64(u8);
        } catch {
            return null;
        }
    }

    // Uint8Array -> copy then encode
    if (data instanceof Uint8Array) {
        return uint8ToBase64(new Uint8Array(data));
    }

    // TypedArray / DataView -> create a Uint8Array over the requested region then copy
    if (ArrayBuffer.isView(data)) {
        const view = data as ArrayBufferView;
        try {
            const tmp = new Uint8Array(view.buffer as ArrayBufferLike, view.byteOffset, view.byteLength);
            return uint8ToBase64(new Uint8Array(tmp));
        } catch {
            // fallback: copy manually
            try {
                const tmp2 = new Uint8Array(view.byteLength);
                tmp2.set(new Uint8Array((view as any).buffer, view.byteOffset, view.byteLength));
                return uint8ToBase64(tmp2);
            } catch {
                return null;
            }
        }
    }

    // ArrayBuffer -> copy then encode
    if (data instanceof ArrayBuffer) {
        return uint8ToBase64(new Uint8Array(data.slice(0)));
    }

    // Blob / File -> read as ArrayBuffer then encode
    if (typeof Blob !== "undefined" && data instanceof Blob) {
        try {
            const ab = await data.arrayBuffer();
            return uint8ToBase64(new Uint8Array(ab));
        } catch {
            return null;
        }
    }

    // Node-like Buffer serialized by socket.io: { type: 'Buffer', data: number[] }
    if (typeof data === "object" && (data as any)?.type === "Buffer" && Array.isArray((data as any).data)) {
        try {
            return uint8ToBase64(Uint8Array.from((data as any).data));
        } catch {
            return null;
        }
    }

    // Plain number array
    if (Array.isArray(data) && data.every((v) => typeof v === "number")) {
        try {
            return uint8ToBase64(Uint8Array.from(data as number[]));
        } catch {
            return null;
        }
    }

    // ReadableStream of chunks (browser stream)
    if (typeof data === "object" && data != null && typeof (data as any).getReader === "function") {
        try {
            const reader = (data as any).getReader();
            const chunks: Uint8Array[] = [];
            let total = 0;
            while (true) {
                const res = await reader.read();
                if (res.done) break;
                const chunk = res.value;
                const u8 = chunk instanceof Uint8Array
                    ? chunk
                    : chunk instanceof ArrayBuffer
                        ? new Uint8Array(chunk)
                        : new Uint8Array(chunk.buffer ?? chunk);
                chunks.push(u8);
                total += u8.byteLength;
            }
            const out = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) {
                out.set(c, offset);
                offset += c.byteLength;
            }
            return uint8ToBase64(out);
        } catch {
            return null;
        }
    }

    return null;
};