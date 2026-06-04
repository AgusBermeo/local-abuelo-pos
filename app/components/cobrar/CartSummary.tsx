// app/components/cobrar/CartSummary.tsx
//
// Muestra el resumen del carrito: ítems, descuento, IVA, totales
// y los botones de cancelar / guardar pedido / cobrar.

import type { Product } from "../../home-client";
import type { CartEntry } from "./types";

// ── Iconos inline ─────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  cart: CartEntry[];
  allProducts: Product[];
  /** Referencia para el Intersection Observer del bloque de totales. */
  totalBlockRef: React.RefObject<HTMLDivElement | null>;

  /** Precio unitario ya calculado (con escalones) para una entrada del carrito. */
  getEntryPrice: (entry: CartEntry) => number;

  // Descuento
  discount: number;
  discountAmount: number;
  showDiscount: boolean;
  onToggleDiscount: () => void;
  onChangeDiscount: (v: number) => void;

  // IVA
  taxEnabled: boolean;
  taxRate: number;
  taxRateInput: string;
  taxAmount: number;
  afterDiscount: number;
  onToggleTax: () => void;
  onChangeTaxRateInput: (raw: string) => void;
  onChangeTaxRate: (v: number) => void;

  // Delivery
  effectiveDeliveryCost: number;

  // Totales
  subtotal: number;
  total: number;

  // Acciones del carrito
  onDecrement: (cartKey: string) => void;
  onIncrement: (product: Product, sizeKey: string, fillingKey: string) => void;
  onRemoveEntry: (cartKey: string) => void;
  onClearCart: () => void;
  onOpenPaymentModal: () => void;

  // Pedido guardado
  hasItemsInCart: boolean;
  activeOrderId: string | null;
  onSaveOrder: () => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function CartSummary({
  cart,
  allProducts,
  totalBlockRef,
  getEntryPrice,
  discount,
  discountAmount,
  showDiscount,
  onToggleDiscount,
  onChangeDiscount,
  taxEnabled,
  taxRate,
  taxRateInput,
  taxAmount,
  afterDiscount,
  onToggleTax,
  onChangeTaxRateInput,
  onChangeTaxRate,
  effectiveDeliveryCost,
  subtotal,
  total,
  onDecrement,
  onIncrement,
  onRemoveEntry,
  onClearCart,
  onOpenPaymentModal,
  hasItemsInCart,
  activeOrderId,
  onSaveOrder,
}: Props) {
  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
      <h2 className="uppercase text-amber-500 font-bold text-sm mb-3">Pedido Actual</h2>

      {/* Lista de ítems */}
      {cart.length === 0 ? (
        <p className="text-xs text-amber-700 py-2">No hay productos en el pedido.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {cart.map((entry) => {
            const product = allProducts.find((p) => p.id === entry.productId);

            let displayName: string;
            if (product?.category === "Bebida") {
              const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
              displayName = ds?.label ?? entry.sizeKey;
            } else {
              const sizeLabel    = product?.sizeLabels[entry.sizeKey] ?? entry.sizeKey;
              const fillingLabel =
                entry.fillingKey !== "none"
                  ? (product?.fillingLabels[entry.fillingKey] ?? entry.fillingKey)
                  : null;
              displayName = [sizeLabel, fillingLabel].filter(Boolean).join(" · ");
            }

            const unitPrice = getEntryPrice(entry);
            const lineTotal = unitPrice * entry.quantity;

            return (
              <div
                key={entry.key}
                className="flex items-center gap-2 py-2 border-b border-yellow-800 last:border-0"
              >
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold truncate">
                    {product?.name ?? "?"}{" "}
                    <span className="text-amber-700 font-normal">{displayName}</span>
                  </span>
                  <span className="text-[10px] text-amber-700 tabular-nums">
                    ${unitPrice.toFixed(2)} × {entry.quantity}
                  </span>
                </div>

                {/* Controles inline del ítem */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onDecrement(entry.key)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold w-6 text-center tabular-nums">
                    {entry.quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (product) onIncrement(product, entry.sizeKey, entry.fillingKey);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <p className="text-sm font-bold text-amber-500 w-16 text-right tabular-nums">
                  ${lineTotal.toFixed(2)}
                </p>

                <button
                  onClick={() => onRemoveEntry(entry.key)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Toggle descuento */}
      <div className="flex justify-end gap-2 mt-4 flex-wrap">
        <button
          onClick={onToggleDiscount}
          className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold py-1.5 px-3 rounded-lg border-2 cursor-pointer transition-colors ${
            showDiscount
              ? "border-amber-500 text-amber-400 bg-amber-900/40"
              : "border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500"
          }`}
        >
          <span
            className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
              showDiscount ? "bg-amber-500 border-amber-500" : "border-amber-700"
            }`}
          >
            {showDiscount && (
              <span className="text-amber-950 text-[9px] font-black leading-none">✓</span>
            )}
          </span>
          Aplicar descuento
        </button>
      </div>

      {showDiscount && (
        <div className="flex justify-end gap-4 items-center mt-2">
          <h3 className="font-semibold text-sm">Descuento</h3>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold">
              $
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={discount === 0 ? "" : discount}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChangeDiscount(isNaN(v) || v < 0 ? 0 : v);
              }}
              placeholder="0.00"
              autoFocus
              className="w-28 text-center pl-7 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {/* IVA */}
      <div className="mt-3 flex flex-col gap-2 bg-blue-900/10 border border-blue-900/40 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={onToggleTax}
              className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                taxEnabled ? "bg-blue-500" : "bg-amber-800"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  taxEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-widest ${
                taxEnabled ? "text-blue-300" : "text-amber-700"
              }`}
            >
              IVA {taxEnabled ? "incluido" : "no incluido"}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-blue-400/70">Tasa</span>
            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRateInput}
                onChange={(e) => {
                  onChangeTaxRateInput(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0 && v <= 100) onChangeTaxRate(v);
                }}
                className="w-16 text-center bg-blue-950/60 border-2 border-blue-800 focus:border-blue-500 rounded-lg px-2 py-1.5 text-blue-100 text-sm focus:outline-none transition-colors"
              />
              <span className="absolute right-2 text-blue-400 text-xs font-bold pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>

        {taxEnabled && taxAmount > 0 && (
          <p className="text-[10px] text-blue-400/80">
            {taxRate}% sobre ${afterDiscount.toFixed(2)} ={" "}
            <span className="font-bold text-blue-300">+${taxAmount.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Bloque de totales (observado para la barra flotante) */}
      <div ref={totalBlockRef} className="mt-4 flex flex-col gap-1">
        {(discount > 0 || taxEnabled || effectiveDeliveryCost > 0) && (
          <div className="flex justify-between text-sm text-amber-700">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Descuento</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
        )}
        {taxEnabled && (
          <div className="flex justify-between text-sm text-blue-400">
            <span>IVA ({taxRate}%)</span>
            <span>+${taxAmount.toFixed(2)}</span>
          </div>
        )}
        {effectiveDeliveryCost > 0 && (
          <div className="flex justify-between text-sm text-teal-400">
            <span>🛵 Envío</span>
            <span>+${effectiveDeliveryCost.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-amber-800/40 pt-1 mt-0.5">
          <h3 className="font-bold">TOTAL</h3>
          <h3 className="font-bold text-xl text-amber-500">${total.toFixed(2)}</h3>
        </div>
      </div>

      {/* Acciones */}
      {cart.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {/* Fila superior: Cancelar + Guardar */}
          <div className="flex gap-2">
            <button
              onClick={onClearCart}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 px-4 rounded-lg font-bold cursor-pointer transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onSaveOrder}
              disabled={!hasItemsInCart}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest cursor-pointer transition-colors border-2 ${
                hasItemsInCart
                  ? activeOrderId
                    ? "border-amber-500 bg-amber-900/40 text-amber-400 hover:bg-amber-800/40"
                    : "border-amber-700 bg-amber-900/30 text-amber-500 hover:border-amber-500 hover:text-amber-400"
                  : "border-amber-900 text-amber-800 cursor-not-allowed"
              }`}
              title={activeOrderId ? "Actualizar pedido guardado" : "Guardar pedido como borrador"}
            >
              <SaveIcon />
              <span className="hidden sm:inline">
                {activeOrderId ? "Actualizar" : "Guardar"}
              </span>
            </button>
          </div>

          {/* Fila inferior: Cobrar */}
          <button
            onClick={onOpenPaymentModal}
            className="w-full py-3 px-6 rounded-lg font-bold uppercase tracking-widest text-sm bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer transition-colors"
          >
            Cobrar ${total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}