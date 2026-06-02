// app/components/cobrar/PaymentModal.tsx
//
// Modal de finalización de pedido: tipo de pedido (servir / llevar / delivery),
// costo de envío (solo delivery) y método de pago.

import type { PaymentMethod } from "../../home-client";
import type { OrderType } from "./types";
import { PAYMENT_OPTIONS, ORDER_TYPE_OPTIONS } from "./types";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  total: number;
  afterDiscount: number;
  taxAmount: number;

  orderType: OrderType | null;
  onSelectOrderType: (type: OrderType) => void;

  deliveryCost: number;
  deliveryCostInput: string;
  onChangeDeliveryCostInput: (raw: string) => void;
  onChangeDeliveryCost: (v: number) => void;

  selectedPayment: PaymentMethod | null;
  onSelectPayment: (method: PaymentMethod) => void;

  onCancel: () => void;
  onConfirm: () => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function PaymentModal({
  total,
  afterDiscount,
  taxAmount,
  orderType,
  onSelectOrderType,
  deliveryCost,
  deliveryCostInput,
  onChangeDeliveryCostInput,
  onChangeDeliveryCost,
  selectedPayment,
  onSelectPayment,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">
              Finalizar pedido
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              Total:{" "}
              <span className="text-amber-400 font-bold">${total.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Tipo de pedido */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">
            ¿Cómo se sirve?
          </p>
          <div className="flex gap-2">
            {ORDER_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelectOrderType(opt.value)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer transition-all ${
                  orderType === opt.value
                    ? "border-amber-500 bg-amber-900/60 text-amber-400"
                    : "border-amber-800 hover:border-amber-600 bg-amber-900/20 text-amber-700"
                }`}
              >
                <span className="text-lg leading-none">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Costo de envío (solo delivery) */}
          {orderType === "delivery" && (
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700">
                Costo de envío
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={deliveryCostInput}
                  onChange={(e) => {
                    onChangeDeliveryCostInput(e.target.value);
                    const v = parseFloat(e.target.value);
                    onChangeDeliveryCost(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  placeholder="0.00"
                  autoFocus
                  className="w-full pl-8 bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl py-2.5 pr-4 text-amber-100 text-sm placeholder:text-amber-800 focus:outline-none transition-colors"
                />
              </div>
              {deliveryCost > 0 && (
                <p className="text-[10px] text-amber-600">
                  Total con envío:{" "}
                  <span className="font-bold text-amber-400">
                    ${(afterDiscount + taxAmount + deliveryCost).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">
            Forma de pago
          </p>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelectPayment(opt.value)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                  selectedPayment === opt.value
                    ? "border-amber-500 bg-amber-900/60"
                    : "border-amber-800 hover:border-amber-600 bg-amber-900/20"
                }`}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <div className="flex flex-col">
                  <span
                    className={`font-bold text-sm ${
                      selectedPayment === opt.value ? "text-amber-400" : "text-amber-200"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-amber-700">{opt.desc}</span>
                </div>
                <div
                  className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedPayment === opt.value
                      ? "border-amber-500 bg-amber-500"
                      : "border-amber-700"
                  }`}
                >
                  {selectedPayment === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!selectedPayment || !orderType}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
              selectedPayment && orderType
                ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer"
                : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
