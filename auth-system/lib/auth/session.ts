/**
 * lib/auth/session.ts
 *
 * Manejo de sesiones con JWT firmado.
 * HOY: cookie httpOnly con jose (librería pura JS, no requiere Node crypto nativo).
 * MAÑANA: puedes mantener el mismo contrato o cambiar a next-auth/lucia sin
 *         modificar los Server Actions ni el middleware.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "../data/users";

const COOKIE_NAME = "abuelo_session";
const JWT_SECRET  = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-cambia-esto-en-produccion-32chars"
);
const EXPIRY_HOURS = 12;

export type SessionPayload = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};

// ── Sign ─────────────────────────────────────────────────────────────────────

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(JWT_SECRET);
}

// ── Verify ───────────────────────────────────────────────────────────────────

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

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

export async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  return verifySession(token);
}
