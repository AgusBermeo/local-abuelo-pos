// app/reporte/MetodosPagoSection.tsx
//
// Breakdown de ventas por método de pago con barras proporcionales.

import type { Sale, PaymentMethod } from "./types";
import { PAYMENT_LABELS } from "./types";

type Props = {
  sales: Sale[];
  total: number;
};

export default function MetodosPagoSection({ sales, total }: Props) {
  const byPayment = (
    ["efectivo", "transferencia", "deuna"] as PaymentMethod[]
  ).map((m) => {
    const filtered = sales.filter((s) => s.paymentMethod === m);
    return {
      method: m,
      count: filtered.length,
      total: filtered.reduce((s, x) => s + x.total, 0),
    };
  });

  return (
    <div className="flex flex-col gap-3">
      {byPayment.map(({ method, count, total: t }) => {
        const pct = total > 0 ? (t / total) * 100 : 0;
        const { label, emoji, bar } = PAYMENT_LABELS[method];
        return (
          <div key={method} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-200 font-semibold">
                {emoji} {label}
              </span>
              <span className="text-amber-500 font-bold tabular-nums">
                ${t.toFixed(2)}{" "}
                <span className="text-amber-700">
                  · {count} pedido{count !== 1 ? "s" : ""} · {pct.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div
                className={`h-full ${bar} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
