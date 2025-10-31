import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = new Set(["/login", "/register"]);

// Routes API à ignorer
const apiRoutes = ["/api", "/_next", "/favicon.ico"];

const TWO_FACTOR_ROUTE = "/profile/2fa";

const decodeJwtPayload = (token: string) => {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLength);

    try {
        const jsonString =
            typeof atob === "function"
                ? atob(padded)
                : Buffer.from(padded, "base64").toString("utf-8");
        return JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
        return null;
    }
};

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const normalizedPath =
        pathname.length > 1 && pathname.endsWith("/")
            ? pathname.slice(0, -1)
            : pathname;
    const isTwoFactorRoute = normalizedPath.startsWith(TWO_FACTOR_ROUTE);

    // Ignorer les routes API et ressources statiques
    if (apiRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const tokenCookie = request.cookies.get("token");
    const tokenValue = tokenCookie?.value ?? null;
    const payload = tokenValue ? decodeJwtPayload(tokenValue) : null;
    const isMfaVerified =
        !!(
            payload &&
            typeof payload === "object" &&
            "mfa" in payload &&
            (payload as { mfa?: unknown }).mfa === true
        );

    if (tokenValue) {
        // Empêche les utilisateurs connectés d'accéder à /login ou /register
        if (publicRoutes.has(normalizedPath)) {
            const homeUrl = new URL("/", request.url);
            return NextResponse.redirect(homeUrl);
        }

        if (!isMfaVerified && !isTwoFactorRoute) {
            const twoFaUrl = new URL(TWO_FACTOR_ROUTE, request.url);
            return NextResponse.redirect(twoFaUrl);
        }

        if (isTwoFactorRoute && isMfaVerified) {
            const homeUrl = new URL("/", request.url);
            return NextResponse.redirect(homeUrl);
        }

        return NextResponse.next();
    }

    // Aucun token : seules les routes publiques sont accessibles
    if (publicRoutes.has(normalizedPath)) {
        return NextResponse.next();
    }

    // Sans token, la route 2FA n'est pas accessible non plus
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
}

// Configuration des routes à protéger
export const config = {
    matcher: [
        /*
         * Protège toutes les routes sauf :
         * - API routes (api/*)
         * - Fichiers statiques (_next/static/*)
         * - Images (_next/image/*)
         * - Favicon
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
