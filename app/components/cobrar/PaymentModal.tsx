// app/components/cobrar/PaymentModal.tsx

import { useState, useEffect } from "react";
import type { PaymentMethod } from "../../home-client";
import type { OrderType, BoxEntry } from "./types";
import {
  PAYMENT_OPTIONS,
  ORDER_TYPE_OPTIONS,
  distributeEmpanadasInBoxes,
  totalBoxesCost,
  suggestedBoxPrice,
} from "./types";

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

  scheduledFor: string;
  onChangeScheduledFor: (v: string) => void;

  selectedPayment: PaymentMethod | null;
  onSelectPayment: (method: PaymentMethod) => void;

  /** Total de empanadas en el carrito (todas las variantes) */
  empanadasCount: number;

  /** Cajas actuales */
  boxes: BoxEntry[];
  onChangeBoxes: (boxes: BoxEntry[]) => void;

  onCancel: () => void;
  onConfirm: () => void;
};

// ── Sub-componente: editor de una caja ───────────────────────────────────────

function BoxRow({
  box,
  index,
  total,
  onChange,
  onRemove,
}: {
  box: BoxEntry;
  index: number;
  total: number;
  onChange: (b: BoxEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-800 rounded-lg px-3 py-2">
      <span className="text-[10px] text-amber-700 uppercase tracking-widest shrink-0 w-12">
        Caja {index + 1}
      </span>

      {/* Empanadas en esta caja */}
      <div className="flex items-center gap-1 flex-1">
        <button
          onClick={() => {
            const v = Math.max(1, box.empanadasCount - 1);
            onChange({ empanadasCount: v, pricePerBox: suggestedBoxPrice(v) });
          }}
          className="w-6 h-6 flex items-center justify-center rounded bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
        >−</button>
        <input
          type="number"
          min={1}
          value={box.empanadasCount}
          onChange={(e) => {
            const v = Math.max(1, parseInt(e.target.value) || 1);
            onChange({ empanadasCount: v, pricePerBox: suggestedBoxPrice(v) });
          }}
          className="w-10 text-center bg-amber-950/60 border border-amber-700 rounded text-xs text-amber-100 py-1 focus:outline-none"
        />
        <button
          onClick={() => {
            const v = box.empanadasCount + 1;
            onChange({ empanadasCount: v, pricePerBox: suggestedBoxPrice(v) });
          }}
          className="w-6 h-6 flex items-center justify-center rounded bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
        >+</button>
        <span className="text-[10px] text-amber-700 ml-1">emp.</span>
      </div>

      {/* Precio de esta caja */}
      <div className="relative flex items-center shrink-0">
        <span className="absolute left-2 text-amber-500 text-xs font-bold pointer-events-none">$</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={box.pricePerBox}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ ...box, pricePerBox: isNaN(v) || v < 0 ? 0 : v });
          }}
          className="w-16 pl-5 text-center bg-amber-950/60 border border-amber-700 rounded text-xs text-amber-100 py-1 focus:outline-none"
        />
      </div>

      <button
        onClick={onRemove}
        disabled={total <= 1}
        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold shrink-0 transition-colors ${
          total <= 1
            ? "text-amber-900 cursor-not-allowed"
            : "text-red-500 hover:text-red-300 hover:bg-red-900/30 cursor-pointer"
        }`}
      >×</button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

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
  scheduledFor,
  onChangeScheduledFor,
  selectedPayment,
  onSelectPayment,
  empanadasCount,
  boxes,
  onChangeBoxes,
  onCancel,
  onConfirm,
}: Props) {
  const [boxEnabled, setBoxEnabled] = useState(boxes.length > 0);

  const showBoxSection = orderType === "llevar" || orderType === "delivery";

  // Cuando se activa la caja, sugerir distribución automática
  const handleToggleBox = (enabled: boolean) => {
    setBoxEnabled(enabled);
    if (enabled && empanadasCount > 0) {
      onChangeBoxes(distributeEmpanadasInBoxes(empanadasCount));
    } else if (!enabled) {
      onChangeBoxes([]);
    }
  };

  // Re-calcular distribución si cambia el tipo de pedido a uno sin caja
  useEffect(() => {
    if (!showBoxSection) {
      setBoxEnabled(false);
      onChangeBoxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  const boxTotal = totalBoxesCost(boxes);

  const updateBox = (index: number, updated: BoxEntry) => {
    onChangeBoxes(boxes.map((b, i) => (i === index ? updated : b)));
  };

  const removeBox = (index: number) => {
    const next = boxes.filter((_, i) => i !== index);
    onChangeBoxes(next);
    if (next.length === 0) setBoxEnabled(false);
  };

  const addBox = () => {
    onChangeBoxes([...boxes, { empanadasCount: 1, pricePerBox: 0.60 }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">$</span>
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

          {/* Fecha y hora de entrega */}
          {(orderType === "llevar" || orderType === "delivery") && (
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] uppercase tracking-widest text-yellow-700">
                Fecha y hora de entrega{" "}
                <span className="text-amber-800 normal-case">(opcional)</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => onChangeScheduledFor(e.target.value)}
                className="w-full bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-100 text-sm focus:outline-none transition-colors [color-scheme:dark]"
              />
              {scheduledFor && (
                <p className="text-[10px] text-amber-600">
                  Entrega programada:{" "}
                  <span className="font-bold text-amber-400">
                    {new Date(scheduledFor).toLocaleString("es-EC", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ── Sección de cajas ── */}
          {showBoxSection && (
            <div className="flex flex-col gap-3 mt-1 bg-orange-950/30 border border-orange-900/60 rounded-xl p-3">

              {/* Toggle ¿Tiene caja? */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => handleToggleBox(!boxEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer ${
                    boxEnabled ? "bg-orange-500" : "bg-amber-800"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      boxEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-widest ${boxEnabled ? "text-orange-300" : "text-amber-700"}`}>
                    📦 ¿Tiene caja?
                  </span>
                  {empanadasCount > 0 && (
                    <span className="text-[10px] text-amber-800">
                      {empanadasCount} empanada{empanadasCount !== 1 ? "s" : ""} en el pedido
                    </span>
                  )}
                </div>
              </label>

              {/* Editor de cajas */}
              {boxEnabled && (
                <div className="flex flex-col gap-2">
                  {/* Leyenda de columnas */}
                  <div className="grid grid-cols-[3rem_1fr_4rem_1.5rem] gap-2 px-1">
                    <span className="text-[9px] uppercase tracking-widest text-amber-800"></span>
                    <span className="text-[9px] uppercase tracking-widest text-amber-800 text-center">Empanadas</span>
                    <span className="text-[9px] uppercase tracking-widest text-amber-800 text-center">Precio</span>
                    <span />
                  </div>

                  {boxes.map((box, i) => (
                    <BoxRow
                      key={i}
                      box={box}
                      index={i}
                      total={boxes.length}
                      onChange={(updated) => updateBox(i, updated)}
                      onRemove={() => removeBox(i)}
                    />
                  ))}

                  <button
                    onClick={addBox}
                    className="self-start text-[10px] uppercase tracking-widest font-bold text-orange-500 hover:text-orange-300 border border-orange-900 hover:border-orange-700 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    + Agregar caja
                  </button>

                  {boxTotal > 0 && (
                    <div className="flex justify-between items-center border-t border-orange-900/40 pt-2 mt-1">
                      <span className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">
                        Total cajas ({boxes.length})
                      </span>
                      <span className="text-sm font-bold text-orange-300 tabular-nums">
                        +${boxTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
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
                  <span className={`font-bold text-sm ${selectedPayment === opt.value ? "text-amber-400" : "text-amber-200"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-amber-700">{opt.desc}</span>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedPayment === opt.value ? "border-amber-500 bg-amber-500" : "border-amber-700"
                }`}>
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