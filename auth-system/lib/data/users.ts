/**
 * lib/data/users.ts
 *
 * Capa de abstracción de datos para usuarios.
 * HOY: opera sobre un JSON en disco (o en memoria en el browser).
 * MAÑANA: reemplaza las funciones por llamadas a Prisma/Drizzle/Supabase
 * sin tocar ninguna otra parte del código.
 *
 * Contrato público:
 *   findUserByUsername(username) → User | null
 *   findUserById(id)            → User | null
 *   getAllUsers()               → User[]
 *   createUser(data)            → User
 *   updateUser(id, data)        → User | null
 *   deleteUser(id)              → boolean
 */

export type UserRole = "superadmin" | "admin" | "cajero";

export type User = {
  id: string;
  username: string;
  /** bcrypt hash — NUNCA el password en texto plano */
  passwordHash: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string; // ISO string — fácil de serializar a JSON / DB
  createdBy: string | null; // id del usuario que lo creó
};

export type CreateUserInput = Omit<User, "id" | "createdAt">;
export type UpdateUserInput = Partial<
  Pick<User, "displayName" | "passwordHash" | "role" | "active">
>;

// ---------------------------------------------------------------------------
// Implementación con el filesystem de Next.js (Server-side only)
// Cuando migres a DB, reemplaza el bloque "Storage helpers" y las funciones
// exportadas, manteniendo el mismo contrato de tipos.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "users.json");

// ── Storage helpers (reemplazar con ORM al migrar) ──────────────────────────

function readStore(): User[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function writeStore(users: User[]): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
}

function ensureSuperAdmin(): void {
  const users = readStore();
  const hasSuperAdmin = users.some((u) => u.role === "superadmin");
  if (!hasSuperAdmin) {
    // Importación dinámica síncrona — bcryptjs es CommonJS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
    const hash = bcrypt.hashSync(
      process.env.SUPERADMIN_PASSWORD ?? "admin1234",
      10
    );
    const superAdmin: User = {
      id: "superadmin-seed",
      username: process.env.SUPERADMIN_USERNAME ?? "admin",
      passwordHash: hash,
      displayName: "Super Administrador",
      role: "superadmin",
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: null,
    };
    writeStore([superAdmin]);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function findUserByUsername(username: string): User | null {
  ensureSuperAdmin();
  const users = readStore();
  return users.find((u) => u.username === username) ?? null;
}

export function findUserById(id: string): User | null {
  ensureSuperAdmin();
  const users = readStore();
  return users.find((u) => u.id === id) ?? null;
}

export function getAllUsers(): User[] {
  ensureSuperAdmin();
  return readStore();
}

export function createUser(data: CreateUserInput): User {
  const users = readStore();
  const existing = users.find((u) => u.username === data.username);
  if (existing) throw new Error(`El usuario "${data.username}" ya existe.`);

  const newUser: User = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writeStore([...users, newUser]);
  return newUser;
}

export function updateUser(id: string, data: UpdateUserInput): User | null {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  const updated: User = { ...users[idx], ...data };
  users[idx] = updated;
  writeStore(users);
  return updated;
}

export function deleteUser(id: string): boolean {
  const users = readStore();
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) return false;
  writeStore(next);
  return true;
}
