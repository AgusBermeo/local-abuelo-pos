"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  logoutAction,
  type PublicUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "../../../lib/auth/actions";
import { getCurrentSession } from "../../../lib/auth/actions";
import type { SessionPayload } from "../../../lib/auth/session";
import type { UserRole } from "../../../lib/data/users";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; badge: string; desc: string }> = {
  superadmin: { label: "Superadmin", badge: "bg-purple-900/40 border-purple-700 text-purple-300", desc: "Acceso total, gestiona usuarios" },
  admin:      { label: "Admin",      badge: "bg-blue-900/40 border-blue-700 text-blue-300",       desc: "Gestiona usuarios y ventas" },
  cajero:     { label: "Cajero",     badge: "bg-amber-900/40 border-amber-700 text-amber-300",    desc: "Cobrar, ver ventas" },
};

const inputCls = "bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-100 text-sm placeholder:text-amber-800 focus:outline-none transition-colors w-full";

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({
  title, emoji, border = "border-amber-600", onClose, children,
}: {
  title: string; emoji: string; border?: string;
  onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-amber-950 border-2 ${border} rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-widest text-yellow-700 font-semibold">{label}</label>
      {children}
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}

// ── Create user form ──────────────────────────────────────────────────────────

function CreateUserModal({
  session, onClose, onCreated,
}: {
  session: SessionPayload;
  onClose: () => void;
  onCreated: (u: PublicUser) => void;
}) {
  const [form, setForm] = useState<CreateUserPayload>({
    username: "", password: "", displayName: "", role: "cajero",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  const availableRoles: UserRole[] = session.role === "superadmin"
    ? ["admin", "cajero"]
    : ["cajero"];

  const submit = () => {
    setError(null);
    start(async () => {
      const result = await createUserAction(form);
      if (result.ok) {
        onCreated(result.data);
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Modal title="Nuevo usuario" emoji="👤" onClose={onClose}>
      <Field label="Nombre completo">
        <input
          type="text" value={form.displayName}
          onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
          placeholder="ej: María López"
          className={inputCls} autoFocus
        />
      </Field>

      <Field label="Nombre de usuario">
        <input
          type="text" value={form.username}
          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, "") }))}
          placeholder="ej: maria"
          className={inputCls}
        />
      </Field>

      <Field label="Contraseña">
        <div className="relative">
          <input
            type={showPass ? "text" : "password"} value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="mín. 6 caracteres"
            className={inputCls + " pr-11"}
          />
          <button
            type="button" onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-400 cursor-pointer"
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>
      </Field>

      <Field label="Rol">
        <div className="flex flex-col gap-2">
          {availableRoles.map((role) => (
            <button
              key={role}
              onClick={() => setForm((p) => ({ ...p, role }))}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                form.role === role ? "border-amber-500 bg-amber-900/60" : "border-amber-800 hover:border-amber-600 bg-amber-900/20"
              }`}
            >
              <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${form.role === role ? "border-amber-500 bg-amber-500" : "border-amber-700"}`}>
                {form.role === role && <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${form.role === role ? "text-amber-400" : "text-amber-300"}`}>
                  {ROLE_CONFIG[role].label}
                </p>
                <p className="text-[10px] text-amber-700">{ROLE_CONFIG[role].desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Field>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2.5">
          <span className="text-red-400">⚠</span>
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-colors">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={isPending || !form.username.trim() || !form.password || !form.displayName.trim()}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors ${
            !isPending && form.username.trim() && form.password && form.displayName.trim()
              ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer"
              : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
          }`}
        >
          {isPending ? "Creando…" : "Crear"}
        </button>
      </div>
    </Modal>
  );
}

// ── Edit user modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user, session, onClose, onUpdated,
}: {
  user: PublicUser;
  session: SessionPayload;
  onClose: () => void;
  onUpdated: (u: PublicUser) => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole]               = useState<UserRole>(user.role);
  const [active, setActive]           = useState(user.active);
  const [newPass, setNewPass]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isPending, start]            = useTransition();

  const canChangeRole = session.role === "superadmin" && user.role !== "superadmin";
  const availableRoles: UserRole[] = session.role === "superadmin" ? ["admin", "cajero"] : ["cajero"];

  const submit = () => {
    setError(null);
    start(async () => {
      const payload: UpdateUserPayload = {
        id: user.id,
        displayName,
        active,
        ...(canChangeRole ? { role } : {}),
        ...(newPass ? { password: newPass } : {}),
      };
      const result = await updateUserAction(payload);
      if (result.ok) {
        onUpdated(result.data);
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Modal title="Editar usuario" emoji="✏️" onClose={onClose}>
      <Field label="Nombre completo">
        <input
          type="text" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputCls} autoFocus
        />
      </Field>

      {canChangeRole && (
        <Field label="Rol">
          <div className="flex gap-2">
            {availableRoles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all ${
                  role === r ? "border-amber-500 bg-amber-900/60 text-amber-400" : "border-amber-800 text-amber-700 hover:border-amber-600"
                }`}
              >
                {ROLE_CONFIG[r].label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {user.id !== session.userId && (
        <Field label="Estado">
          <button
            onClick={() => setActive((v) => !v)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
              active ? "border-green-700 bg-green-900/20 text-green-300" : "border-red-800 bg-red-900/20 text-red-400"
            }`}
          >
            <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? "bg-green-500" : "bg-red-700"}`}>
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              {active ? "Activo" : "Desactivado"}
            </span>
          </button>
        </Field>
      )}

      <Field label="Nueva contraseña (dejar vacío para no cambiar)">
        <div className="relative">
          <input
            type={showPass ? "text" : "password"} value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="mín. 6 caracteres"
            className={inputCls + " pr-11"}
          />
          <button
            type="button" onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-400 cursor-pointer"
          >
            {showPass ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      </Field>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2.5">
          <span className="text-red-400">⚠</span>
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-colors">
          Cancelar
        </button>
        <button
          onClick={submit} disabled={isPending}
          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteUserModal({
  user, onClose, onDeleted,
}: {
  user: PublicUser;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  const submit = () => {
    start(async () => {
      const result = await deleteUserAction(user.id);
      if (result.ok) {
        onDeleted(user.id);
        onClose();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Modal title="Eliminar usuario" emoji="⚠️" border="border-red-800" onClose={onClose}>
      <p className="text-amber-200 text-sm">
        Estás a punto de eliminar a{" "}
        <span className="font-bold text-amber-400">{user.displayName}</span>{" "}
        (<span className="text-amber-600">@{user.username}</span>).
        Esta acción no se puede deshacer.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest text-red-600 font-semibold">
          Escribe <span className="text-red-400 font-bold">eliminar</span> para confirmar
        </label>
        <input
          type="text" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="eliminar"
          className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-xl px-4 py-2.5 text-amber-100 text-sm focus:outline-none transition-colors"
          autoFocus
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2.5">
          <span className="text-red-400">⚠</span>
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-colors">
          Cancelar
        </button>
        <button
          disabled={confirm.trim().toLowerCase() !== "eliminar" || isPending}
          onClick={submit}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            confirm.trim().toLowerCase() === "eliminar" && !isPending
              ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
              : "bg-red-950/40 text-red-900 cursor-not-allowed"
          }`}
        >
          {isPending ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [session, setSession]     = useState<SessionPayload | null>(null);
  const [users, setUsers]         = useState<PublicUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<PublicUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicUser | null>(null);
  const [loggingOut, startLogout] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const [sess, usersResult] = await Promise.all([
      getCurrentSession(),
      listUsersAction(),
    ]);
    setSession(sess);
    if (usersResult.ok) {
      setUsers(usersResult.data);
      setError(null);
    } else {
      setError(usersResult.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    startLogout(async () => { await logoutAction(); });
  };

  const rolePriority: Record<UserRole, number> = { superadmin: 0, admin: 1, cajero: 2 };
  const sortedUsers = [...users].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

  return (
    <div className="min-h-dvh bg-amber-950/60 flex flex-col">

      {/* Top bar */}
      <header className="bg-yellow-950 border-b-2 border-amber-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Gestión de usuarios</h2>
            <p className="text-[10px] text-amber-800 uppercase tracking-widest">El Local del Abuelo</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
          </svg>
          {loggingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </header>

      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-5 py-6">

        {/* Session info */}
        {session && (
          <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/60 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-amber-600/30 border border-amber-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-amber-400">
                {session.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-amber-200 truncate">{session.displayName}</span>
              <span className={`text-[10px] uppercase font-bold ${ROLE_CONFIG[session.role].badge.split(" ").find((c) => c.startsWith("text-")) ?? "text-amber-600"}`}>
                {ROLE_CONFIG[session.role].label}
              </span>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="ml-auto bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer uppercase tracking-widest transition-colors shrink-0"
            >
              + Nuevo usuario
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-xl px-4 py-3">
            <span className="text-red-400">⚠</span>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* User list */}
        <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-amber-900/20 border-2 border-amber-900/60 rounded-xl p-4 animate-pulse h-20" />
            ))
          ) : sortedUsers.length === 0 ? (
            <div className="bg-amber-900/20 border-2 border-amber-900 rounded-xl p-8 text-center">
              <p className="text-amber-700 text-sm">No hay usuarios registrados.</p>
            </div>
          ) : (
            sortedUsers.map((user) => {
              const isSelf     = user.id === session?.userId;
              const isSuperA   = user.role === "superadmin";
              const cfg        = ROLE_CONFIG[user.role];
              const canEdit    = !isSuperA || isSelf;
              const canDelete  = !isSuperA && !isSelf;

              return (
                <div
                  key={user.id}
                  className={`bg-amber-900/30 border-2 rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                    !user.active ? "border-red-900/60 opacity-60" : "border-amber-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                      user.active ? "bg-amber-700/30 border-amber-700" : "bg-red-900/20 border-red-900"
                    }`}>
                      <span className="text-sm font-bold text-amber-300">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-amber-100 truncate">{user.displayName}</span>
                        {isSelf && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-700/30 border border-amber-700 text-amber-400 rounded-full px-2 py-0.5">
                            Tú
                          </span>
                        )}
                        {!user.active && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-red-900/40 border border-red-800 text-red-400 rounded-full px-2 py-0.5">
                            Desactivado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-700">@{user.username}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => setEditTarget(user)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-700 hover:bg-amber-600 text-white cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-800 hover:bg-red-700 text-white cursor-pointer transition-colors"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role + meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-amber-800">
                      Creado {new Date(user.createdAt).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Role legend */}
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">Permisos por rol</p>
          <div className="flex flex-col gap-2">
            {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
              <div key={role} className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 shrink-0 ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-amber-700">{cfg.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && session && (
        <CreateUserModal
          session={session}
          onClose={() => setShowCreate(false)}
          onCreated={(u) => setUsers((prev) => [...prev, u])}
        />
      )}
      {editTarget && session && (
        <EditUserModal
          user={editTarget}
          session={session}
          onClose={() => setEditTarget(null)}
          onUpdated={(u) => setUsers((prev) => prev.map((x) => x.id === u.id ? u : x))}
        />
      )}
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
        />
      )}
    </div>
  );
}
