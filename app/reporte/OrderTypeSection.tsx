// app/reporte/OrderTypeSection.tsx
//
// Breakdown de ventas por tipo de pedido: servir, llevar, delivery.

import type { Sale } from "./types";
import SectionCard from "./SectionCard";

type Props = { sales: Sale[] };

export default function OrderTypeSection({ sales }: Props) {
  const total = sales.length;
  if (total === 0) return null;

  const servir   = sales.filter((s) => s.orderType === "servir" || !s.orderType).length;
  const llevar   = sales.filter((s) => s.orderType === "llevar").length;
  const delivery = sales.filter((s) => s.orderType === "delivery").length;

  const revenueServir   = sales.filter((s) => s.orderType === "servir"   || !s.orderType).reduce((acc, s) => acc + s.total, 0);
  const revenueLlevar   = sales.filter((s) => s.orderType === "llevar").reduce((acc, s) => acc + s.total, 0);
  const revenueDelivery = sales.filter((s) => s.orderType === "delivery").reduce((acc, s) => acc + s.total, 0);

  const rows = [
    { label: "Para servir", emoji: "🍽️", count: servir,   pct: (servir   / total) * 100, revenue: revenueServir,   bar: "bg-amber-500" },
    { label: "Para llevar", emoji: "🛍️", count: llevar,   pct: (llevar   / total) * 100, revenue: revenueLlevar,   bar: "bg-teal-500"  },
    { label: "Delivery",    emoji: "🛵", count: delivery, pct: (delivery / total) * 100, revenue: revenueDelivery, bar: "bg-blue-500"  },
  ];

  return (
    <SectionCard title="🍽️ Tipo de pedido">
      <div className="flex flex-col gap-4">
        {rows.map(({ label, emoji, count, pct, revenue, bar }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-200 font-semibold">{emoji} {label}</span>
              <span className="text-amber-500 font-bold tabular-nums">
                ${revenue.toFixed(2)}{" "}
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
        ))}
      </div>
    </SectionCard>
  );
}
