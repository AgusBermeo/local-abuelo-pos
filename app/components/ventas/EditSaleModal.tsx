// app/components/ventas/EditSaleModal.tsx
//
// Modal de 2 pasos para editar fecha, hora y método de pago de una venta.
// Paso 1: selección de datos. Paso 2: revisión de cambios antes de confirmar.

import { useState } from "react";
import type { Sale, PaymentMethod } from "./types";
import { PAYMENT_LABELS, toLocalDateString } from "./types";

type Props = {
  sale: Sale;
  onClose: () => void;
  onConfirm: (id: number, date: Date, paymentMethod: PaymentMethod) => void;
};

export default function EditSaleModal({ sale, onClose, onConfirm }: Props) {
  const initial = new Date(sale.date);

  const [step, setStep]         = useState<1 | 2>(1);
  const [editDate, setEditDate] = useState(toLocalDateString(initial));
  const [editTime, setEditTime] = useState(
    `${String(initial.getHours()).padStart(2, "0")}:${String(initial.getMinutes()).padStart(2, "0")}`
  );
  const [editPayment, setEditPayment] = useState<PaymentMethod>(
    sale.paymentMethod ?? "efectivo"
  );

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  const handleConfirm = () => {
    const [year, month, day]   = editDate.split("-").map(Number);
    const [hours, minutes]     = editTime.split(":").map(Number);
    const newDate = new Date(year, month - 1, day, hours, minutes, initial.getSeconds());
    onConfirm(sale.id, newDate, editPayment);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✏️</span>
          <div className="flex flex-col">
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">
              Editar pedido
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              Paso {step} de 2
            </p>
          </div>
        </div>

        {/* ── Paso 1: formulario ── */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700">Fecha</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700">Hora</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700">
                Forma de pago
              </label>
              <div className="flex flex-col gap-2">
                {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, typeof PAYMENT_LABELS[PaymentMethod]][]).map(
                  ([key, { label, emoji }]) => (
                    <button
                      key={key}
                      onClick={() => setEditPayment(key)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        editPayment === key
                          ? "border-amber-500 bg-amber-900/60"
                          : "border-amber-800 hover:border-amber-600 bg-amber-900/20"
                      }`}
                    >
                      <span className="text-xl leading-none">{emoji}</span>
                      <span className={`font-bold text-sm ${editPayment === key ? "text-amber-400" : "text-amber-200"}`}>
                        {label}
                      </span>
                      <div
                        className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          editPayment === key ? "border-amber-500 bg-amber-500" : "border-amber-700"
                        }`}
                      >
                        {editPayment === key && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!editDate || !editTime}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
                  editDate && editTime
                    ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer"
                    : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                }`}
              >
                Revisar →
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2: revisión ── */}
        {step === 2 && (
          <>
            <p className="text-amber-200 text-sm">
              Revisa los cambios antes de guardar. Esta acción sobreescribirá los datos actuales
              del pedido.
            </p>
            <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-yellow-700">Fecha</span>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-amber-600 line-through">
                    {new Date(sale.date).toLocaleDateString("es-EC", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  <span className="text-amber-700">→</span>
                  <span className="text-amber-300 font-semibold">
                    {new Date(editDate + "T00:00:00").toLocaleDateString("es-EC", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-yellow-700">Hora</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-600 line-through">
                    {new Date(sale.date).toLocaleTimeString("es-EC", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="text-amber-700">→</span>
                  <span className="text-amber-300 font-semibold">{editTime}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-yellow-700">
                  Forma de pago
                </span>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-amber-600 line-through">
                    {sale.paymentMethod ? PAYMENT_LABELS[sale.paymentMethod].label : "—"}
                  </span>
                  <span className="text-amber-700">→</span>
                  <span className="text-amber-300 font-semibold">
                    {PAYMENT_LABELS[editPayment].emoji} {PAYMENT_LABELS[editPayment].label}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                ← Volver
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold uppercase tracking-widest cursor-pointer transition-colors"
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
