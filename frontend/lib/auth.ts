import { buildApiUrl } from "@/lib/api";

const LOGOUT_ENDPOINT = buildApiUrl("/api/auth/logout");
const SOCKET_TOKEN_KEY = "collaboratif_token";

type RouterLike = {
    replace(path: string): void;
};

let isLoggingOut = false;

const clearClientAuthArtifacts = () => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.removeItem(SOCKET_TOKEN_KEY);
    } catch (error) {
        console.error("Impossible de nettoyer le token local:", error);
    }
};

const redirectToLogin = (router?: RouterLike) => {
    if (router) {
        router.replace("/login");
    } else if (typeof window !== "undefined") {
        window.location.replace("/login");
    }
};

export const performLogout = async (router?: RouterLike) => {
    clearClientAuthArtifacts();

    if (isLoggingOut) {
        redirectToLogin(router);
        return;
    }

    isLoggingOut = true;

    try {
        await fetch(LOGOUT_ENDPOINT, {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.error("Erreur lors de la déconnexion automatique:", error);
    } finally {
        isLoggingOut = false;
        redirectToLogin(router);
    }
};

export const handleUnauthorized = async (
    response: Response | null | undefined,
    router?: RouterLike
) => {
    if (response?.status !== 401) {
        return false;
    }

    await performLogout(router);
    return true;
};
