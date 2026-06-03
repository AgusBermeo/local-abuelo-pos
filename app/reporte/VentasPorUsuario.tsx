// app/reporte/VentasPorUsuario.tsx
//
// Resumen de actividad por cajero: ventas, recaudado, ticket promedio
// y desglose de métodos de pago.

import type { Sale, PaymentMethod } from "./types";
import { PAYMENT_LABELS } from "./types";

type Props = { sales: Sale[] };

const AVATAR_COLORS = [
  "bg-amber-700 border-amber-600",
  "bg-blue-800 border-blue-700",
  "bg-purple-800 border-purple-700",
  "bg-teal-800 border-teal-700",
  "bg-rose-800 border-rose-700",
];

export default function VentasPorUsuario({ sales }: Props) {
  const userMap: Record<
    string,
    { displayName: string; count: number; total: number; methods: Record<string, number> }
  > = {};

  for (const sale of sales) {
    const key  = sale.soldBy?.userId ?? "__unknown__";
    const name = sale.soldBy?.displayName ?? "Usuario desconocido";
    if (!userMap[key])
      userMap[key] = { displayName: name, count: 0, total: 0, methods: {} };
    userMap[key].count++;
    userMap[key].total += sale.total;
    const m = sale.paymentMethod;
    userMap[key].methods[m] = (userMap[key].methods[m] ?? 0) + 1;
  }

  const rows = Object.entries(userMap).sort((a, b) => b[1].total - a[1].total);

  if (rows.length === 0)
    return <p className="text-amber-700 text-sm">Sin datos para este período.</p>;

  const maxTotal = rows[0][1].total || 1;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] text-amber-700">
        Resumen de actividad por cajero en el período seleccionado.
      </p>
      {rows.map(([, data], idx) => {
        const pct       = (data.total / maxTotal) * 100;
        const avgTicket = data.count > 0 ? data.total / data.count : 0;

        return (
          <div
            key={idx}
            className="bg-amber-900/20 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  AVATAR_COLORS[idx % AVATAR_COLORS.length]
                }`}
              >
                <span className="text-sm font-bold text-white">
                  {data.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-100 truncate">
                  {data.displayName}
                </p>
                <p className="text-[10px] text-amber-700">
                  {data.count} venta{data.count !== 1 ? "s" : ""} · ticket prom. $
                  {avgTicket.toFixed(2)}
                </p>
              </div>
              <p className="text-lg font-bold text-amber-400 tabular-nums shrink-0">
                ${data.total.toFixed(2)}
              </p>
            </div>

            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              {Object.entries(data.methods).map(([method, count]) => {
                const info = PAYMENT_LABELS[method as PaymentMethod];
                if (!info) return null;
                return (
                  <span
                    key={method}
                    className="text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 text-amber-300 border-amber-700 bg-amber-900/40"
                  >
                    {info.emoji} {info.label} ×{count}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
