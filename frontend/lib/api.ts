const normalizeBaseUrl = (value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";

    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const withProtocol = hasProtocol ? trimmed : `http://${trimmed}`;
    return withProtocol.replace(/\/+$/, "");
};

export const API_BASE_URL = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ?? ""
);

export const buildApiUrl = (path: string) => {
    if (!path) return API_BASE_URL || "";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
};
