// app/reporte/ConsumoVariantesSection.tsx
//
// Stock actual vs unidades vendidas en el período para cada variante de comida.
// Solo se muestra si hay al menos un producto con stock configurado.

import type { Sale, Product } from "./types";

type Props = { sales: Sale[]; products: Product[] };

export default function ConsumoVariantesSection({ sales, products }: Props) {
  const foodWithStock = products.filter(
    (p) =>
      p.category === "Comida" &&
      p.variantStock &&
      Object.values(p.variantStock).some((v) => v > 0),
  );

  if (foodWithStock.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">
          Sin stock configurado para productos de comida.
        </p>
        <p className="text-[10px] text-amber-800">
          Ve a Inventario → edita un producto de comida → configura el stock por variante.
        </p>
      </div>
    );
  }

  const soldByName: Record<string, number> = {};
  for (const sale of sales)
    for (const item of sale.items)
      soldByName[item.name] = (soldByName[item.name] ?? 0) + item.quantity;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[10px] text-amber-700">
        Stock actual vs unidades vendidas en el período para cada variante.
      </p>

      {foodWithStock.map((product) => {
        const sizes    = Object.entries(product.sizeLabels ?? {});
        const fillings = Object.entries(product.fillingLabels ?? {});

        const combinations: Array<{ variantKey: string; label: string }> = [];
        if (fillings.length === 0) {
          sizes.forEach(([sk, sl]) =>
            combinations.push({ variantKey: `${sk}-none`, label: sl }),
          );
        } else {
          sizes.forEach(([sk, sl]) =>
            fillings.forEach(([fk, fl]) =>
              combinations.push({ variantKey: `${sk}-${fk}`, label: `${sl} · ${fl}` }),
            ),
          );
        }

        const rows = combinations.map(({ variantKey, label }) => {
          const sizeKey    = variantKey.split("-")[0];
          const fillingKey = variantKey.split("-").slice(1).join("-");
          let sold = 0;

          for (const [itemName, qty] of Object.entries(soldByName)) {
            if (!itemName.startsWith(product.name)) continue;
            const suffix    = itemName.slice(product.name.length).toLowerCase();
            const sizeMatch = suffix.includes(sizeKey.toLowerCase()) || sizeKey === "single";
            const fillMatch = fillingKey === "none" || suffix.includes(fillingKey.toLowerCase());
            if (sizeMatch && fillMatch) sold += qty;
          }

          const stockRemaining = product.variantStock?.[variantKey] ?? null;
          return { label, variantKey, sold, stockRemaining };
        });

        const visibleRows = rows.filter((r) => r.stockRemaining !== null || r.sold > 0);
        if (visibleRows.length === 0) return null;

        return (
          <div key={product.id} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-amber-300 uppercase tracking-widest border-b border-amber-800/60 pb-1">
              {product.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleRows.map(({ label, variantKey, sold, stockRemaining }) => {
                const tracked  = stockRemaining !== null;
                const stockVal = stockRemaining ?? 0;
                const maxVal   = Math.max(stockVal + sold, 1);
                const stockPct = (stockVal / maxVal) * 100;
                const soldPct  = (sold / maxVal) * 100;

                return (
                  <div
                    key={variantKey}
                    className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${
                      tracked && stockVal === 0
                        ? "border-red-900/60 bg-red-950/10"
                        : tracked && stockVal <= 5
                        ? "border-orange-900/60 bg-orange-950/10"
                        : "border-amber-800/60 bg-amber-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-200">{label}</span>
                      {tracked ? (
                        <span
                          className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${
                            stockVal === 0
                              ? "text-red-400 bg-red-900/40 border-red-800"
                              : stockVal <= 5
                              ? "text-orange-400 bg-orange-900/20 border-orange-800"
                              : "text-green-400 bg-green-900/20 border-green-900"
                          }`}
                        >
                          {stockVal === 0 ? "Agotado" : `${stockVal} en stock`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 italic">
                          Sin seguimiento
                        </span>
                      )}
                    </div>

                    {tracked && (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-amber-950/60">
                          <div
                            className="h-full bg-amber-500/70 rounded-l-full transition-all duration-500 shrink-0"
                            style={{ width: `${soldPct}%` }}
                          />
                          <div
                            className={`h-full rounded-r-full transition-all duration-500 shrink-0 ${
                              stockVal === 0
                                ? "bg-red-700/50"
                                : stockVal <= 5
                                ? "bg-orange-500/70"
                                : "bg-green-500/70"
                            }`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-amber-700">
                          <span>
                            Vendidas:{" "}
                            <span className="font-bold text-amber-400">{sold}</span>
                          </span>
                          <span>
                            Restante:{" "}
                            <span
                              className={`font-bold ${
                                stockVal === 0
                                  ? "text-red-400"
                                  : stockVal <= 5
                                  ? "text-orange-400"
                                  : "text-green-400"
                              }`}
                            >
                              {stockVal}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    {!tracked && sold > 0 && (
                      <p className="text-[10px] text-amber-600">
                        Vendidas en período:{" "}
                        <span className="font-bold text-amber-400">{sold}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
