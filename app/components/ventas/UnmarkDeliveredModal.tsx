// app/components/ventas/UnmarkDeliveredModal.tsx
//
// Modal de 2 pasos para revertir un pedido de "entregado" a "pendiente".
// Paso 1: confirmación inicial. Paso 2: escribir "pendiente".

import { useState } from "react";
import type { Sale } from "./types";

type Props = {
  sale: Sale;
  onClose: () => void;
  onConfirm: (id: number) => void;
};

export default function UnmarkDeliveredModal({ sale, onClose, onConfirm }: Props) {
  const [step, setStep]               = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const ready = confirmText.trim().toLowerCase() === "pendiente";

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-amber-950 border-2 border-yellow-700 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">↩</span>
          <div className="flex flex-col">
            <h2 className="text-yellow-400 font-bold text-base uppercase tracking-widest leading-tight">
              Deshacer entrega
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              Paso {step} de 2
            </p>
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="text-amber-200 text-sm">
              ¿Estás seguro de que quieres revertir el pedido del{" "}
              <span className="font-bold text-amber-400">
                {new Date(sale.date).toLocaleDateString("es-EC", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>{" "}
              por{" "}
              <span className="font-bold text-amber-400">${sale.total.toFixed(2)}</span>{" "}
              a estado{" "}
              <span className="font-bold text-yellow-400">Pendiente</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Sí, continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-amber-200 text-sm">
              Esta acción marcará el pedido como{" "}
              <span className="font-bold text-yellow-400">Pendiente</span> nuevamente.
              Escribe la palabra de confirmación para proceder.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-yellow-600">
                Escribe{" "}
                <span className="font-bold text-yellow-400">pendiente</span>{" "}
                para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="pendiente"
                autoFocus
                className="bg-amber-950/60 border-2 border-yellow-900 focus:border-yellow-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                ← Volver
              </button>
              <button
                disabled={!ready}
                onClick={() => { onConfirm(sale.id); handleClose(); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  ready
                    ? "bg-yellow-700 hover:bg-yellow-600 text-white cursor-pointer"
                    : "bg-yellow-950/40 text-yellow-900 cursor-not-allowed"
                }`}
              >
                Confirmar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
