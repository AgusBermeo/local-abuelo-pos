// app/components/inventario/ui.tsx
//
// Primitivas de UI reutilizadas dentro del módulo inventario:
// clase de input, Field, StepperInput, Backdrop, CloseBtn.

export const inputClass =
  "bg-amber-950/60 border-2 border-amber-800 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500 transition-colors";

// ── Field ─────────────────────────────────────────────────────────────────────

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</label>
      {children}
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}

// ── StepperInput ──────────────────────────────────────────────────────────────

import { stockColor, stockBorderFocus } from "./helpers";

export function StepperInput({
  value,
  onChange,
  colorize = true,
  small = false,
}: {
  value: string;
  onChange: (v: string) => void;
  colorize?: boolean;
  small?: boolean;
}) {
  const num    = Number(value);
  const hasVal = value !== "" && !isNaN(num);
  const btnCls = small ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm";
  const inpCls = small ? "w-10 text-xs py-1" : "w-14 text-sm py-1.5";

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(String(Math.max(0, (hasVal ? num : 0) - 1)))}
        className={`${btnCls} flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors`}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`${inpCls} text-center bg-amber-950/60 border-2 rounded-lg px-1 focus:outline-none transition-colors ${
          colorize && hasVal ? stockBorderFocus(num) : "border-amber-800 focus:border-amber-500"
        } ${colorize && hasVal ? stockColor(num) : "text-amber-100"}`}
      />
      <button
        onClick={() => onChange(String((hasVal ? num : 0) + 1))}
        className={`${btnCls} flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors`}
      >
        +
      </button>
    </div>
  );
}

// ── Backdrop ──────────────────────────────────────────────────────────────────

export function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      onClick={onClick}
    />
  );
}

// ── CloseBtn ──────────────────────────────────────────────────────────────────

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        className="w-5 h-5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
