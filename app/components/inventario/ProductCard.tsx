// app/components/inventario/ProductCard.tsx
//
// Tarjeta de un producto en la lista de inventario.
// Muestra badges de stock, resumen de precios/variantes y botones de acción.

import type { Product } from "./types";
import { getFoodVariantKeys, stockColor } from "./helpers";

type Props = {
  product: Product;
  readOnly: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: number) => void;
};

export default function ProductCard({ product, readOnly, onEdit, onDelete }: Props) {
  const isBebida    = product.category === "Bebida";
  const variantKeys = isBebida ? [] : getFoodVariantKeys(product);

  // ── Badges de stock para comida ───────────────────────────────────────────

  const trackedVariants = variantKeys.filter(({ variantKey }) => {
    const s = product.variantStock?.[variantKey];
    return s !== undefined && s > 0;
  });
  const hasTrackedStock  = trackedVariants.length > 0;
  const hasLowStock      = trackedVariants.some(({ variantKey }) => {
    const s = product.variantStock![variantKey];
    return s > 0 && s <= 5;
  });
  const hasOutOfStock    = variantKeys.some(({ variantKey }) => {
    const s = product.variantStock?.[variantKey];
    return s === 0 && hasTrackedStock;
  });

  // ── Badges de stock para bebida ───────────────────────────────────────────

  const drinkSizesWithStock = (product.drinkSizes ?? []).filter((ds) => ds.stock > 0);
  const drinkHasLow   = (product.drinkSizes ?? []).some((ds) => ds.stock > 0 && ds.stock <= 5);
  const drinkHasOut   = (product.drinkSizes ?? []).some(
    (ds) => ds.stock === 0 && drinkSizesWithStock.length > 0,
  );
  const drinkAllUntk  = (product.drinkSizes ?? []).every((ds) => ds.stock === 0);

  // ── Helpers de badge ──────────────────────────────────────────────────────

  function StockBadge({ low, out }: { low: boolean; out: boolean }) {
    if (out)
      return (
        <span className="text-[9px] font-bold uppercase text-red-400 bg-red-900/40 border border-red-800 rounded-full px-2 py-0.5">
          ⚠ Sin stock
        </span>
      );
    if (low)
      return (
        <span className="text-[9px] font-bold uppercase text-orange-400 bg-orange-900/30 border border-orange-800 rounded-full px-2 py-0.5">
          ↓ Stock bajo
        </span>
      );
    return (
      <span className="text-[9px] font-bold uppercase text-green-500 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">
        ✓ Con stock
      </span>
    );
  }

  return (
    <div className="flex flex-col bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
      {/* Cabecera */}
      <div className="relative flex gap-2 justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap max-w-[70%]">
          <h2 className="font-bold text-sm">{product.name}</h2>
          <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-900/60 border border-amber-800 rounded-full px-2 py-0.5">
            {product.category}
          </span>

          {/* Badge de stock */}
          {isBebida ? (
            drinkAllUntk ? null : (
              <StockBadge low={drinkHasLow} out={drinkHasOut} />
            )
          ) : (
            hasTrackedStock && (
              <StockBadge low={hasLowStock} out={hasOutOfStock} />
            )
          )}
        </div>

        {/* Botones de acción */}
        {!readOnly && (
          <div className="absolute top-0 right-0 flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white p-1.5 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(product.id)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo: resumen de precios / stock */}
      {isBebida ? (
        <div className="flex flex-col gap-1.5">
          {(product.drinkSizes ?? []).map((ds) => (
            <div key={ds.key} className="flex items-center gap-3">
              <span className="text-xs text-amber-300 font-semibold min-w-16">{ds.label}</span>
              <span className="text-xs font-bold text-amber-500">${ds.price.toFixed(2)}</span>
              <span className={`text-xs font-bold tabular-nums ml-auto ${stockColor(ds.stock)}`}>
                {ds.stock === 0 ? "" : `stock: ${ds.stock}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Resumen de escalones */}
          {Object.entries(product.sizeLabels).map(([sk, sl]) => {
            const tiers = product.tieredPrices[sk] ?? [];
            if (tiers.length === 0) return null;
            return (
              <div key={sk} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-yellow-700">{sl}</span>
                <div className="flex flex-wrap gap-1.5">
                  {tiers.map((t) => (
                    <span
                      key={t.minQty}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-700 text-amber-400"
                    >
                      ×{t.minQty} → ${t.pricePerUnit.toFixed(2)}/u.
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.keys(product.fillingLabels).length > 0 && (
            <p className="text-xs text-amber-700 uppercase">
              {Object.values(product.fillingLabels).join(" · ")}
            </p>
          )}

          {/* Stock por variante */}
          {variantKeys.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-800/60 flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">
                📦 Stock por variante
              </p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                {variantKeys.map(({ variantKey, label }) => {
                  const s       = product.variantStock?.[variantKey] ?? 0;
                  const tracked = s > 0;
                  return (
                    <div
                      key={variantKey}
                      className="flex items-center justify-between gap-2 min-w-0 max-w-30"
                    >
                      <span className="text-[10px] text-amber-300 truncate">{label}</span>
                      {tracked ? (
                        <span
                          className={`text-[10px] font-bold tabular-nums shrink-0 ${stockColor(s)}`}
                        >
                          {s}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 italic shrink-0">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
