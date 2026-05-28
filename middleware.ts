/**
 * middleware.ts  (raíz del proyecto)
 *
 * Protege todas las rutas excepto /login.
 * Lee la cookie httpOnly y verifica el JWT con jose (edge-compatible).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromToken } from "./lib/auth/token";

const PUBLIC_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Permitir archivos estáticos y API de Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Verificar sesión
  const token = request.cookies.get("abuelo_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await getSessionFromToken(token);
  if (!session) {
    // Token inválido o expirado
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("abuelo_session");
    return response;
  }

  // Proteger /admin solo para superadmin y admin
  if (pathname.startsWith("/admin")) {
    if (session.role !== "superadmin" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - _next/static  (archivos estáticos)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
