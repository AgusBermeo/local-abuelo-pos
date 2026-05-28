/**
 * lib/auth/actions.ts
 *
 * Server Actions de autenticación y gestión de usuarios.
 * Todo el acceso a datos pasa por lib/data/users.ts → fácil migración a DB.
 */

"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type UserRole,
} from "../data/users";
import {
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "./session";

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string };

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(
  username: string,
  password: string
): Promise<ActionResult> {
  const user = findUserByUsername(username.trim().toLowerCase());

  if (!user || !user.active) {
    // Mismo mensaje para no revelar si el usuario existe
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  await setSessionCookie({
    userId:      user.id,
    username:    user.username,
    displayName: user.displayName,
    role:        user.role,
  });

  return { ok: true, data: undefined };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

// ── Obtener sesión actual (para Server Components) ────────────────────────────

export async function getCurrentSession() {
  return getSession();
}

// ── Helpers de autorización ───────────────────────────────────────────────────

async function requireRole(...roles: UserRole[]) {
  const session = await getSession();
  if (!session) throw new Error("No autorizado.");
  if (!roles.includes(session.role)) throw new Error("Sin permisos suficientes.");
  return session;
}

// ── CRUD de usuarios (solo superadmin / admin) ─────────────────────────────────

export type PublicUser = Omit<User, "passwordHash">;

function toPublic(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...rest } = u;
  return rest;
}

export async function listUsersAction(): Promise<ActionResult<PublicUser[]>> {
  try {
    await requireRole("superadmin", "admin");
    return { ok: true, data: getAllUsers().map(toPublic) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type CreateUserPayload = {
  username:    string;
  password:    string;
  displayName: string;
  role:        UserRole;
};

export async function createUserAction(
  payload: CreateUserPayload
): Promise<ActionResult<PublicUser>> {
  try {
    const session = await requireRole("superadmin", "admin");

    // Solo superadmin puede crear admins
    if (payload.role === "superadmin") {
      throw new Error("No puedes crear otro superadmin.");
    }
    if (payload.role === "admin" && session.role !== "superadmin") {
      throw new Error("Solo el superadmin puede crear administradores.");
    }
    if (!payload.username.trim()) throw new Error("El nombre de usuario es obligatorio.");
    if (payload.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

    const hash = await bcrypt.hash(payload.password, 10);
    const user = createUser({
      username:     payload.username.trim().toLowerCase(),
      passwordHash: hash,
      displayName:  payload.displayName.trim() || payload.username.trim(),
      role:         payload.role,
      active:       true,
      createdBy:    session.userId,
    });
    return { ok: true, data: toPublic(user) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type UpdateUserPayload = {
  id:           string;
  displayName?: string;
  password?:    string;
  role?:        UserRole;
  active?:      boolean;
};

export async function updateUserAction(
  payload: UpdateUserPayload
): Promise<ActionResult<PublicUser>> {
  try {
    const session = await requireRole("superadmin", "admin");

    const target = findUserById(payload.id);
    if (!target) throw new Error("Usuario no encontrado.");

    // Restricciones
    if (target.role === "superadmin" && session.role !== "superadmin") {
      throw new Error("No puedes modificar al superadmin.");
    }
    if (payload.role === "superadmin") {
      throw new Error("No puedes asignar el rol de superadmin.");
    }
    if (payload.role === "admin" && session.role !== "superadmin") {
      throw new Error("Solo el superadmin puede asignar el rol de admin.");
    }

    const updates: Parameters<typeof updateUser>[1] = {};
    if (payload.displayName !== undefined) updates.displayName = payload.displayName.trim();
    if (payload.role        !== undefined) updates.role        = payload.role;
    if (payload.active      !== undefined) updates.active      = payload.active;
    if (payload.password) {
      if (payload.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
      updates.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const updated = updateUser(payload.id, updates);
    if (!updated) throw new Error("No se pudo actualizar el usuario.");
    return { ok: true, data: toPublic(updated) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole("superadmin", "admin");
    const target  = findUserById(id);
    if (!target) throw new Error("Usuario no encontrado.");
    if (target.role === "superadmin") throw new Error("No puedes eliminar al superadmin.");
    if (target.id === session.userId) throw new Error("No puedes eliminarte a ti mismo.");

    const ok = deleteUser(id);
    if (!ok) throw new Error("No se pudo eliminar el usuario.");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** El propio usuario puede cambiar su contraseña */
export async function changeOwnPasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) throw new Error("No autorizado.");

    const user = findUserById(session.userId);
    if (!user) throw new Error("Usuario no encontrado.");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error("La contraseña actual es incorrecta.");

    if (newPassword.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");

    const hash = await bcrypt.hash(newPassword, 10);
    updateUser(user.id, { passwordHash: hash });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
