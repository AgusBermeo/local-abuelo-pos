// app/components/cobrar/DrinkProductCard.tsx
//
// Tarjeta de un producto de bebida: una fila por presentación
// con stock, precio y controles de cantidad.

import type { Product } from "../../home-client";
import type { CartEntry } from "./types";
import { makeCartKey } from "./types";

// ── Helpers locales ───────────────────────────────────────────────────────────

/**
 * Capacidad efectiva de una presentación de bebida.
 * Devuelve null cuando el stock no está siendo rastreado.
 */
function getDrinkEffectiveCapacity(
  stock: number,
  cartQty: number,
): number | null {
  if (stock === 0 && cartQty === 0) return null;
  return stock;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  product: Product;
  cart: CartEntry[];
  onIncrement: (product: Product, sizeKey: string, fillingKey: string) => void;
  onDecrement: (cartKey: string) => void;
  onSetQty: (product: Product, sizeKey: string, fillingKey: string, qty: number) => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function DrinkProductCard({
  product,
  cart,
  onIncrement,
  onDecrement,
  onSetQty,
}: Props) {
  const drinkSizes = product.drinkSizes ?? [];

  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4 flex flex-col gap-3 col-span-1">
      <h2 className="font-bold text-sm">{product.name}</h2>

      <div className="flex flex-col gap-2">
        {drinkSizes.map((ds) => {
          const ck  = makeCartKey(product.id, ds.key, "none");
          const qty = cart.find((e) => e.key === ck)?.quantity ?? 0;

          const cap          = getDrinkEffectiveCapacity(ds.stock, qty);
          const outOfStock   = cap !== null && cap === 0 && qty === 0;
          const atMax        = cap !== null && qty >= cap;
          const stockTracked = cap !== null;

          return (
            <div
              key={ds.key}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                outOfStock
                  ? "border-red-900/60 bg-red-950/10 opacity-60"
                  : qty > 0
                  ? "border-amber-600 bg-amber-900/40"
                  : "border-amber-800/60 bg-amber-900/20"
              }`}
            >
              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-200">{ds.label}</span>
                  {stockTracked && (
                    <span
                      className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${
                        outOfStock
                          ? "text-red-400 bg-red-900/40 border-red-800"
                          : ds.stock - qty <= 3
                          ? "text-orange-400 bg-orange-900/30 border-orange-800"
                          : "text-green-500 bg-green-900/20 border-green-900"
                      }`}
                    >
                      {outOfStock ? "Agotado" : `${ds.stock - qty} disp.`}
                    </span>
                  )}
                </div>
                <span className={`text-base font-bold tabular-nums ${qty > 0 ? "text-amber-400" : "text-amber-600"}`}>
                  ${ds.price.toFixed(2)}
                  <span className="text-[10px] text-amber-700 font-normal ml-1">/ u.</span>
                </span>
                {qty > 0 && (
                  <span className="text-[10px] text-amber-600 tabular-nums">
                    Subtotal: ${(ds.price * qty).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Controles de cantidad */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onDecrement(ck)}
                  disabled={qty === 0}
                  className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                    qty === 0
                      ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                      : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                  }`}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={qty === 0 ? "" : qty}
                  placeholder="0"
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    onSetQty(product, ds.key, "none", isNaN(v) ? 0 : v);
                  }}
                  disabled={outOfStock && qty === 0}
                  className={`w-12 text-center bg-amber-950/60 border-2 rounded-lg py-1 text-sm font-bold focus:outline-none transition-colors tabular-nums ${
                    qty > 0
                      ? "border-amber-600 text-amber-300 focus:border-amber-400"
                      : "border-amber-800 text-amber-700 focus:border-amber-600"
                  }`}
                />
                <button
                  onClick={() => onIncrement(product, ds.key, "none")}
                  disabled={outOfStock || atMax}
                  className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                    outOfStock || atMax
                      ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                      : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                  }`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
