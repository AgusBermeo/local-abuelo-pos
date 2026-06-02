// app/components/ventas/DeleteSaleModal.tsx
//
// Modal de confirmación para eliminar una venta.
// Requiere escribir "eliminar venta" para habilitar el botón.

import { useState } from "react";
import type { Sale } from "./types";

type Props = {
  sale: Sale;
  onClose: () => void;
  onConfirm: (id: number) => void;
};

export default function DeleteSaleModal({ sale, onClose, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const ready = confirmText.trim().toLowerCase() === "eliminar venta";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-red-400 font-bold text-base uppercase tracking-widest">
            Eliminar venta
          </h2>
        </div>
        <p className="text-amber-200 text-sm">
          Estás a punto de eliminar la venta del{" "}
          <span className="font-bold text-amber-400">
            {new Date(sale.date).toLocaleDateString("es-EC", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>{" "}
          por <span className="font-bold text-amber-400">${sale.total.toFixed(2)}</span>.
          Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-red-600">
            Escribe{" "}
            <span className="font-bold text-red-400">eliminar venta</span>{" "}
            para confirmar
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="eliminar venta"
            autoFocus
            className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!ready}
            onClick={() => { onConfirm(sale.id); onClose(); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              ready
                ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
                : "bg-red-950/40 text-red-900 cursor-not-allowed"
            }`}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
