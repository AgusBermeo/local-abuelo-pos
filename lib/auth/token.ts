import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../data/users";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-cambia-esto-en-produccion-32chars"
);

export type SessionPayload = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  return verifySession(token);
}
