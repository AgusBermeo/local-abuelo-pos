"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { loginAction } from "../../lib/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [shaking, setShaking]     = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await loginAction(username.trim(), password);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-amber-950 px-4 relative overflow-hidden">

      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Warm glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm transition-transform ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
        style={shaking ? {} : undefined}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-8px); }
            40%       { transform: translateX(8px); }
            60%       { transform: translateX(-6px); }
            80%       { transform: translateX(6px); }
          }
        `}</style>

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-20 h-20 relative">
            <Image
              src="/logo.svg"
              alt="El Local del Abuelo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl text-amber-500" style={{ fontFamily: "var(--font-manufacturing-consent, serif)" }}>
              El Local del Abuelo
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-800 mt-1 font-medium">
              Sistema de Cobros
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-yellow-950/80 border-2 border-amber-800/60 rounded-2xl p-7 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-bold mb-6 text-center">
            Acceso al sistema
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700 font-semibold">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="nombre de usuario"
                  className="w-full bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-amber-100 text-sm placeholder:text-amber-800 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700 font-semibold">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl pl-10 pr-11 py-3 text-amber-100 text-sm placeholder:text-amber-800 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2.5">
                <span className="text-red-400 shrink-0">⚠</span>
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !username.trim() || !password}
              className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-[0.15em] transition-all duration-200 mt-1 ${
                isPending || !username.trim() || !password
                  ? "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer shadow-lg shadow-amber-900/30 hover:shadow-amber-700/30"
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                  Verificando…
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-amber-900 mt-5 uppercase tracking-widest">
          Solo personal autorizado
        </p>
      </div>
    </div>
  );
}
