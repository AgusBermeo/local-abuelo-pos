/**
 * app/components/header.tsx  (versión con sesión + notificación de pendientes)
 */

"use client";

import Image from "next/image";
import { useTransition } from "react";
import { logoutAction } from "../../lib/auth/actions";
import type { SessionPayload } from "../../lib/auth/session";
import type { UserRole } from "../../lib/data/users";

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin:      "Admin",
  cajero:     "Cajero",
};

export default function Header({
  session,
  pendingCount = 0,
  onBellClick,
}: {
  session: SessionPayload | null;
  pendingCount?: number;
  onBellClick?: () => void;
}) {
  const [loggingOut, startLogout] = useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await logoutAction();
    });
  };

  return (
    <header className="flex sm:flex-row flex-col sm:items-center justify-between bg-yellow-950 text-amber-50 py-4 px-5 border-b-2 border-amber-600">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="Logo" width={100} height={100} loading="eager" />
        <div className="flex flex-col items-start">
          <h1 className="text-3xl text-amber-500 leading-none">El Local del Abuelo</h1>
          <p className="text-xs text-yellow-600">Sistema de Cobros</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 mt-3 sm:mt-0">
        {session ? (
          <>
            <div className="flex items-center gap-3">
              {/* Campana de pedidos pendientes */}
              {onBellClick && (
                <button
                  onClick={onBellClick}
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-amber-800 hover:border-amber-600 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
                  title={pendingCount > 0 ? `${pendingCount} pedido${pendingCount !== 1 ? "s" : ""} pendiente${pendingCount !== 1 ? "s" : ""}` : "Sin pedidos pendientes"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black px-1 leading-none shadow-lg shadow-red-900/50 animate-pulse">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </button>
              )}

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-amber-300">{session.displayName}</span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-700">
                    {ROLE_LABELS[session.role]}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-700/40 border border-amber-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-300">
                    {session.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(session.role === "superadmin" || session.role === "admin") && (
                <a
                  href="/admin/usuarios"
                  className="text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-2.5 py-1 transition-colors"
                >
                  👥 Usuarios
                </a>
              )}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-2.5 py-1 cursor-pointer transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
                {loggingOut ? "Saliendo…" : "Salir"}
              </button>
            </div>

            <p className="text-yellow-700 text-xs uppercase text-right">
              {new Date().toLocaleDateString("es-EC", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Guayaquil",
              })}
            </p>
          </>
        ) : (
          <p className="text-yellow-700 text-xs uppercase text-right">
            {new Date().toLocaleDateString("es-EC", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "America/Guayaquil",
            })}
          </p>
        )}
      </div>
    </header>
  );
}