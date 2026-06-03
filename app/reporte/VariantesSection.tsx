// app/reporte/VariantesSection.tsx
//
// Variantes de comida vendidas en el período con stock actual.
// Lista global agrupada por producto.

import type { Sale, Product } from "./types";

type Props = { sales: Sale[]; products: Product[] };

const BAR_COLORS = [
  "bg-amber-500", "bg-orange-500", "bg-red-500",    "bg-yellow-500",
  "bg-lime-500",  "bg-teal-500",  "bg-blue-500",    "bg-violet-500",
  "bg-pink-500",
];

function stockBadge(remaining: number | null) {
  if (remaining === null)
    return <span className="text-[10px] text-amber-800 italic">Sin seguimiento</span>;
  if (remaining === 0)
    return (
      <span className="text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-800 rounded-full px-2 py-0.5">
        Agotado
      </span>
    );
  if (remaining <= 5)
    return (
      <span className="text-[10px] font-bold text-orange-400 bg-orange-900/20 border border-orange-800 rounded-full px-2 py-0.5">
        {remaining} restantes
      </span>
    );
  return (
    <span className="text-[10px] font-bold text-green-400 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">
      {remaining} restantes
    </span>
  );
}

export default function VariantesSection({ sales, products }: Props) {
  // Unidades vendidas por nombre de ítem
  const soldByName: Record<string, number> = {};
  for (const sale of sales)
    for (const item of sale.items)
      soldByName[item.name] = (soldByName[item.name] ?? 0) + item.quantity;

  type VariantRow = {
    productName: string;
    variantLabel: string;
    variantKey: string;
    sold: number;
    stockRemaining: number | null;
  };

  const rows: VariantRow[] = [];

  for (const product of products) {
    if (product.category !== "Comida") continue;

    const sizes = Object.entries(product.sizeLabels ?? {}).filter(([sk]) => {
      const tiers = product.tieredPrices?.[sk];
      return Array.isArray(tiers) && tiers.length > 0;
    });
    const fillings = Object.entries(product.fillingLabels ?? {});

    const combinations: Array<{
      variantKey: string;
      sizeLabel: string;
      fillingLabel: string | null;
    }> = [];

    if (fillings.length === 0) {
      sizes.forEach(([sk, sl]) =>
        combinations.push({ variantKey: `${sk}-none`, sizeLabel: sl, fillingLabel: null }),
      );
    } else {
      sizes.forEach(([sk, sl]) =>
        fillings.forEach(([fk, fl]) =>
          combinations.push({ variantKey: `${sk}-${fk}`, sizeLabel: sl, fillingLabel: fl }),
        ),
      );
    }

    for (const { variantKey, sizeLabel, fillingLabel } of combinations) {
      const label      = fillingLabel ? `${sizeLabel} · ${fillingLabel}` : sizeLabel;
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

      const stockRaw      = product.variantStock?.[variantKey];
      const stockRemaining = stockRaw !== undefined ? stockRaw : null;

      if (sold > 0 || stockRemaining !== null) {
        rows.push({ productName: product.name, variantLabel: label, variantKey, sold, stockRemaining });
      }
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin datos de variantes para este período.</p>
        <p className="text-[10px] text-amber-800">
          Configura el stock por variante en Inventario para ver esta sección.
        </p>
      </div>
    );
  }

  const maxSold = Math.max(...rows.map((r) => r.sold), 1);

  const byProduct: Record<string, VariantRow[]> = {};
  for (const row of rows) {
    if (!byProduct[row.productName]) byProduct[row.productName] = [];
    byProduct[row.productName].push(row);
  }

  let colorIdx = 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[10px] text-amber-700">
        Unidades vendidas por variante en el período, con stock actual.
      </p>
      {Object.entries(byProduct).map(([productName, productRows]) => (
        <div key={productName} className="flex flex-col gap-3">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            {productName}
          </p>
          {productRows.map((row) => {
            const bar = BAR_COLORS[colorIdx % BAR_COLORS.length];
            colorIdx++;
            return (
              <div key={row.variantKey} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-amber-200 font-semibold">
                    {row.variantLabel}
                  </span>
                  <div className="flex items-center gap-3">
                    {stockBadge(row.stockRemaining)}
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        row.sold > 0 ? "text-amber-400" : "text-amber-800"
                      }`}
                    >
                      ×{row.sold} vendidas
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-amber-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar}`}
                    style={{ width: `${(row.sold / maxSold) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <p className="text-[10px] text-amber-800 text-right pt-1 border-t border-amber-800/40">
        Total vendidas: {rows.reduce((s, r) => s + r.sold, 0)} unidades
      </p>
    </div>
  );
}
