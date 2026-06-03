// app/reporte/HistorialSection.tsx
//
// Historial detallado de las últimas 20 ventas del período,
// expandibles para ver el desglose de ítems y envío.

import { useState } from "react";
import type { Sale } from "./types";
import { PAYMENT_LABELS } from "./types";

type Props = { sales: Sale[] };

const ORDER_TYPE_LABELS = {
  servir:   { emoji: "🍽️", label: "Servir"   },
  llevar:   { emoji: "🛍️", label: "Llevar"   },
  delivery: { emoji: "🛵", label: "Delivery" },
};

export default function HistorialSection({ sales }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const sorted = [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  if (sorted.length === 0)
    return <p className="text-amber-700 text-sm">Sin ventas en este período.</p>;

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((sale) => {
        const isOpen        = expanded === sale.id;
        const pay           = PAYMENT_LABELS[sale.paymentMethod] ?? { emoji: "?", label: "—" };
        const isDelivered   = sale.status === "delivered";
        const orderTypeInfo = sale.orderType
          ? ORDER_TYPE_LABELS[sale.orderType]
          : null;

        return (
          <div
            key={sale.id}
            className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${
              isOpen
                ? "border-amber-600 bg-amber-900/40"
                : "border-amber-800 bg-amber-900/20 hover:border-amber-700"
            }`}
            onClick={() => setExpanded(isOpen ? null : sale.id)}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0">{pay.emoji}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-amber-200 font-semibold truncate">
                    {new Date(sale.date).toLocaleDateString("es-EC", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {" · "}
                    {new Date(sale.date).toLocaleTimeString("es-EC", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-amber-700 uppercase">
                      {pay.label}
                    </span>
                    {orderTypeInfo && (
                      <span className="text-[10px] text-amber-600 uppercase">
                        · {orderTypeInfo.emoji} {orderTypeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    isDelivered
                      ? "text-green-400 border-green-800 bg-green-900/20"
                      : "text-yellow-400 border-yellow-800 bg-yellow-900/20"
                  }`}
                >
                  {isDelivered ? "✅" : "🕐"}
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  ${sale.total.toFixed(2)}
                </span>
                <span
                  className={`text-amber-700 text-xs transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </div>
            </div>

            {/* Detalle expandido */}
            {isOpen && (
              <div className="border-t border-amber-800 px-4 py-3 flex flex-col gap-1.5">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-amber-200">
                      {item.name}{" "}
                      <span className="text-amber-700">×{item.quantity}</span>
                    </span>
                    <span className="text-amber-500 tabular-nums font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                {typeof sale.deliveryCost === "number" && sale.deliveryCost > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-amber-800/40">
                    <span className="text-teal-400">🛵 Envío</span>
                    <span className="text-teal-400 font-semibold tabular-nums">
                      +${sale.deliveryCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {sales.length > 20 && (
        <p className="text-[10px] text-amber-700 text-center pt-1">
          Mostrando las últimas 20 ventas del período.
        </p>
      )}
    </div>
  );
}
