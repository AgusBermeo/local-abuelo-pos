// app/components/cobrar/FoodProductCard.tsx
//
// Tarjeta de un producto de comida: selector de relleno + fila por tamaño
// con controles de cantidad, precios escalonados y stock.

import type { Product } from "../../home-client";
import {
  getTierPrice,
  getAvailableSizeKeys,
  getAvailableFillingKeys,
} from "../../home-client";
import type { CartEntry } from "./types";
import { makeCartKey } from "./types";
import TierBadges from "./TierBadges";
import FoodStockBadge from "./FoodStockBadge";

// ── Helpers locales ───────────────────────────────────────────────────────────

function getFoodVariantCap(
  product: Product,
  sizeKey: string,
  fillingKey: string,
): number | null {
  const vk = `${sizeKey}-${fillingKey}`;
  const stock = product.variantStock?.[vk];
  if (stock === undefined) return null;
  return stock;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  product: Product;
  cart: CartEntry[];
  /** Totales de cantidad agrupados por "productId::sizeKey" para el precio escalonado. */
  sizeTotals: Record<string, number>;
  /** Relleno actualmente seleccionado para este producto (null = sin selección). */
  selectedFilling: string | null;
  onSelectFilling: (fillingKey: string) => void;
  onIncrement: (product: Product, sizeKey: string, fillingKey: string) => void;
  onDecrement: (cartKey: string) => void;
  onSetQty: (product: Product, sizeKey: string, fillingKey: string, qty: number) => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function FoodProductCard({
  product,
  cart,
  sizeTotals,
  selectedFilling,
  onSelectFilling,
  onIncrement,
  onDecrement,
  onSetQty,
}: Props) {
  const sizes    = getAvailableSizeKeys(product);
  const fillings = getAvailableFillingKeys(product);
  const hasRelleno = fillings.length > 0;
  const currentFilling = hasRelleno ? selectedFilling : "none";

  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4 flex flex-col col-span-2 gap-3">
      <h2 className="font-bold text-sm">{product.name}</h2>

      {/* Selector de relleno */}
      {hasRelleno && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-yellow-700">Relleno</span>
          <div className="flex gap-2 flex-wrap">
            {fillings.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSelectFilling(key)}
                className={`py-1 px-3 text-xs border-2 rounded-lg font-bold cursor-pointer transition-colors ${
                  currentFilling === key
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "border-amber-800 text-amber-400 hover:border-amber-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Una fila por tamaño */}
      <div className="flex flex-wrap gap-3">
        {sizes.map(({ key: sizeKey, label: sizeLabel }) => {
          const fk  = currentFilling ?? "none";
          const ck  = makeCartKey(product.id, sizeKey, fk);
          const qty = cart.find((e) => e.key === ck)?.quantity ?? 0;

          const totalQtyForSize = sizeTotals[`${product.id}::${sizeKey}`] ?? qty;
          const unitPrice       = getTierPrice(product, sizeKey, totalQtyForSize);
          const tiers           = product.tieredPrices[sizeKey] ?? [];

          const variantCap   = currentFilling !== null ? getFoodVariantCap(product, sizeKey, fk) : null;
          const stockTracked = variantCap !== null;
          const outOfStock   = stockTracked && variantCap === 0 && qty === 0;
          const atMax        = stockTracked && qty >= (variantCap ?? Infinity);

          const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
          const nextTier    = sortedTiers.find((t) => t.minQty > totalQtyForSize);

          return (
            <div
              key={sizeKey}
              className={`flex flex-col gap-1.5 rounded-lg border flex-1 p-3 transition-colors ${
                outOfStock
                  ? "border-red-900/60 bg-red-950/10 opacity-60"
                  : qty > 0
                  ? "border-amber-600 bg-amber-900/40"
                  : "border-amber-800/60 bg-amber-900/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-200">{sizeLabel}</span>
                    {currentFilling !== null && (
                      <FoodStockBadge stock={variantCap} cartQty={qty} />
                    )}
                  </div>
                  <span className={`text-base font-bold tabular-nums ${qty > 0 ? "text-amber-400" : "text-amber-600"}`}>
                    ${unitPrice.toFixed(2)}
                    <span className="text-[10px] text-amber-700 font-normal ml-1">/ u.</span>
                  </span>
                  {qty > 0 && (
                    <span className="text-[10px] text-amber-600 tabular-nums">
                      Subtotal: ${(unitPrice * qty).toFixed(2)}
                    </span>
                  )}
                  {nextTier && !outOfStock && (
                    <span className="text-[9px] text-amber-700 mt-0.5">
                      ×{nextTier.minQty - totalQtyForSize} más → ${nextTier.pricePerUnit.toFixed(2)}/u.
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
                      if (!hasRelleno || currentFilling) {
                        onSetQty(product, sizeKey, fk, isNaN(v) ? 0 : v);
                      }
                    }}
                    disabled={outOfStock && qty === 0}
                    className={`w-12 text-center bg-amber-950/60 border-2 rounded-lg py-1 text-sm font-bold focus:outline-none transition-colors tabular-nums ${
                      qty > 0
                        ? "border-amber-600 text-amber-300 focus:border-amber-400"
                        : "border-amber-800 text-amber-700 focus:border-amber-600"
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (!hasRelleno || currentFilling) {
                        onIncrement(product, sizeKey, fk);
                      }
                    }}
                    disabled={outOfStock || atMax || (hasRelleno && !currentFilling)}
                    className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                      outOfStock || atMax || (hasRelleno && !currentFilling)
                        ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                        : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              <TierBadges tiers={tiers} currentQty={totalQtyForSize} />

              {/* Botones de acceso rápido */}
              {!outOfStock && tiers.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {[3, 5, 10, 20].map((n) => {
                    const disabled =
                      (hasRelleno && !currentFilling) ||
                      (stockTracked && qty + n > (variantCap ?? Infinity));
                    return (
                      <button
                        key={n}
                        disabled={disabled}
                        onClick={() => {
                          if (!hasRelleno || currentFilling) {
                            onSetQty(product, sizeKey, fk, qty + n);
                          }
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          disabled
                            ? "border-amber-900 text-amber-900 cursor-not-allowed"
                            : "border-amber-700 text-amber-500 hover:border-amber-500 hover:text-amber-300 hover:bg-amber-800/40 cursor-pointer"
                        }`}
                      >
                        +{n}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasRelleno && !currentFilling && (
        <p className="text-[10px] text-amber-700 italic">
          Selecciona un relleno para ver el stock y agregar.
        </p>
      )}
    </div>
  );
}
