// app/reporte/TopProductsSection.tsx
//
// Top 5 productos más vendidos con toggle entre recaudado y cantidad.

import { useState } from "react";
import SectionCard from "./SectionCard";

type SortMode = "revenue" | "quantity";

type Props = {
  productTotals: Record<string, { quantity: number; revenue: number }>;
};

export default function TopProductsSection({ productTotals }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("revenue");

  const topProducts = Object.entries(productTotals)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) =>
      sortMode === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity,
    )
    .slice(0, 5);

  const maxVal =
    topProducts.length > 0
      ? sortMode === "revenue"
        ? topProducts[0].revenue
        : topProducts[0].quantity
      : 1;

  return (
    <SectionCard title="🏆 Productos más vendidos">
      {/* Toggle */}
      <div className="flex bg-amber-900/40 border border-amber-800 rounded-lg p-0.5 gap-0.5 self-start">
        {(
          [
            ["revenue",  "💰 Recaudado"],
            ["quantity", "🔢 Cantidad"],
          ] as [SortMode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortMode(key)}
            className={`py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
              sortMode === key
                ? "bg-amber-500 text-amber-950"
                : "text-amber-700 hover:text-amber-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {topProducts.length === 0 ? (
        <p className="text-amber-700 text-sm">Sin datos para este período.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {topProducts.map(({ name, quantity, revenue }, idx) => {
            const barVal = sortMode === "revenue" ? revenue : quantity;
            return (
              <div
                key={name}
                className="flex flex-col gap-1 py-2 border-b border-amber-800/60 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-amber-700 w-4 shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-amber-100 truncate">{name}</span>
                  <span
                    className={`text-xs shrink-0 tabular-nums font-semibold ${
                      sortMode === "quantity" ? "text-amber-400" : "text-amber-700"
                    }`}
                  >
                    ×{quantity}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 w-16 text-right ${
                      sortMode === "revenue" ? "text-amber-400" : "text-amber-500"
                    }`}
                  >
                    ${revenue.toFixed(2)}
                  </span>
                </div>
                <div className="ml-7 h-1.5 bg-amber-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sortMode === "revenue" ? "bg-amber-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${(barVal / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
