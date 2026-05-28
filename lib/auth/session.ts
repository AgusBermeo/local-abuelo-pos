/**
 * lib/auth/session.ts
 *
 * Manejo de sesiones con JWT firmado.
 * HOY: cookie httpOnly con jose (librería pura JS, no requiere Node crypto nativo).
 * MAÑANA: puedes mantener el mismo contrato o cambiar a next-auth/lucia sin
 *         modificar los Server Actions ni el middleware.
 */

import { cookies } from "next/headers";
import type { SessionPayload } from "./token";
import {
  signSession,
  verifySession,
  getSessionFromToken,
} from "./token";

const COOKIE_NAME = "abuelo_session";
const EXPIRY_HOURS = 12;

// ── Cookie helpers (Next.js Server Actions / Route Handlers) ─────────────────

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EXPIRY_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// ── Token from raw string (usado en middleware sin next/headers) ─────────────

export { getSessionFromToken, signSession, verifySession };
export type { SessionPayload };
