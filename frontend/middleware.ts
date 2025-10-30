import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = new Set(['/login', '/register']);

// Routes API à ignorer
const apiRoutes = ['/api', '/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignorer les routes API et ressources statiques
    if (apiRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Vérifier la présence du cookie d'authentification
    const token = request.cookies.get('token');

    // Si l'utilisateur est connecté et tente d'accéder à login/register
    if (token && publicRoutes.has(pathname)) {
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
    }

    // Si l'utilisateur n'est pas connecté et tente d'accéder à une route protégée
    if (!token && !publicRoutes.has(pathname)) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Cas normal : continuer
    return NextResponse.next();
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
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};