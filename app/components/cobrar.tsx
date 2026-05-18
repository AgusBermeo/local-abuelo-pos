"use client";

import { useState } from "react";

type FoodSizes = { grande: number; normal: number; bocadito: number };
type DrinkSizes = Record<string, { label: string; price: number }>;

type Product = {
  id: number;
  name: string;
  price: number | FoodSizes | DrinkSizes;
  stock?: number | FoodSizes;
  category: string;
  size: string | { grande: string; normal: string; bocadito: string };
  relleno?: { carne: string; pollo: string } | null;
};

type OrderItem = {
  key: string;
  productId: number;
  name: string;
  size: string | null;
  sizeLabel: string | null;
  relleno: string | null;
  rellenoLabel: string | null;
  price: number;
  quantity: number;
};

type SaleItem = {
  name: string;
  quantity: number;
  price: number;
};

// ── type guards ──────────────────────────────────────────────────────────────
function isFoodSizes(price: Product["price"]): price is FoodSizes {
  return typeof price === "object" && "grande" in price;
}

function isDrinkSizes(price: Product["price"]): price is DrinkSizes {
  if (typeof price !== "object") return false;
  if ("grande" in price) return false;
  const vals = Object.values(price as DrinkSizes);
  return vals.length > 0 && typeof vals[0] === "object" && "label" in vals[0];
}

// ── helpers ──────────────────────────────────────────────────────────────────
/** Returns available food sizes (price > 0) as [key, label] pairs */
function getAvailableFoodSizes(product: Product): [string, string][] {
  if (!isFoodSizes(product.price) || typeof product.size !== "object") return [];
  return Object.entries(product.size as Record<string, string>).filter(([key]) => {
    const price = (product.price as FoodSizes)[key as keyof FoodSizes];
    return typeof price === "number" && price > 0;
  });
}

/** Returns available drink sizes (price > 0) as [key, label] pairs */
function getAvailableDrinkSizes(product: Product): [string, string][] {
  if (!isDrinkSizes(product.price)) return [];
  return Object.entries(product.price as DrinkSizes)
    .filter(([, { price }]) => price > 0)
    .map(([key, { label }]) => [key, label]);
}

function getPrice(product: Product, sizeKey: string | null): number {
  if (isFoodSizes(product.price) && sizeKey) {
    return (product.price as FoodSizes)[sizeKey as keyof FoodSizes] ?? 0;
  }
  if (isDrinkSizes(product.price) && sizeKey) {
    return (product.price as DrinkSizes)[sizeKey]?.price ?? 0;
  }
  return typeof product.price === "number" ? product.price : 0;
}

function getSizeLabel(product: Product, sizeKey: string | null): string | null {
  if (!sizeKey) return typeof product.size === "string" ? product.size : null;
  if (isFoodSizes(product.price) && typeof product.size === "object") {
    return (product.size as Record<string, string>)[sizeKey] ?? null;
  }
  if (isDrinkSizes(product.price)) {
    return (product.price as DrinkSizes)[sizeKey]?.label ?? null;
  }
  return null;
}

// ── component ────────────────────────────────────────────────────────────────
export default function Cobrar(props: {
  foodProducts: Product[];
  drinkProducts: Product[];
  onSaleComplete: (items: SaleItem[], total: number) => void;
}) {
  const [selectedRelleno, setSelectedRelleno] = useState<Record<number, string>>({});
  const [selectedSize, setSelectedSize] = useState<Record<number, string>>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  const requiresSize = (product: Product) =>
    isFoodSizes(product.price) || isDrinkSizes(product.price);

  const addToOrder = (product: Product) => {
    const needsSize = requiresSize(product);
    const sizeKey = needsSize ? (selectedSize[product.id] || null) : null;
    const rellenoKey = product.relleno ? (selectedRelleno[product.id] || null) : null;

    if (needsSize && !sizeKey) return;

    const sizeLabel = getSizeLabel(product, sizeKey);
    const rellenoLabel =
      rellenoKey && product.relleno
        ? product.relleno[rellenoKey as keyof typeof product.relleno]
        : null;

    const key = `${product.id}-${sizeKey ?? "single"}-${rellenoKey ?? "none"}`;
    const price = getPrice(product, sizeKey);

    setOrderItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          size: sizeKey,
          sizeLabel,
          relleno: rellenoKey,
          rellenoLabel,
          price,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromOrder = (key: string) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((i) => i.key !== key);
      return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  const deleteFromOrder = (key: string) => {
    setOrderItems((prev) => prev.filter((i) => i.key !== key));
  };

  const getItemCount = (product: Product): number => {
    const sizeKey = requiresSize(product) ? (selectedSize[product.id] || null) : null;
    const rellenoKey = product.relleno ? (selectedRelleno[product.id] || null) : null;
    const key = `${product.id}-${sizeKey ?? "single"}-${rellenoKey ?? "none"}`;
    return orderItems.find((i) => i.key === key)?.quantity ?? 0;
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.min(discount, subtotal);
  const total = subtotal - discountAmount;

  const handleCobrar = () => {
    if (orderItems.length === 0) return;
    const saleItems: SaleItem[] = orderItems.map((item) => {
      const parts = [item.sizeLabel, item.rellenoLabel].filter(Boolean);
      const fullName = parts.length > 0 ? `${item.name} ${parts.join(" · ")}` : item.name;
      return { name: fullName, quantity: item.quantity, price: item.price };
    });
    props.onSaleComplete(saleItems, total);
    setOrderItems([]);
    setSelectedRelleno({});
    setSelectedSize({});
    setDiscount(0);
  };

  const clearCart = () => {
    setOrderItems([]);
    setSelectedSize({});
    setSelectedRelleno({});
    setDiscount(0);
  };

  // ── ProductCard ─────────────────────────────────────────────────────────────
  const ProductCard = ({ product }: { product: Product }) => {
    const count = getItemCount(product);
    const sizeKey = selectedSize[product.id];
    const rellenoKey = selectedRelleno[product.id];
    const price = getPrice(product, sizeKey ?? null);

    const needsSize = requiresSize(product);
    const canAdd = !needsSize || !!sizeKey;

    // Which size buttons to render
    const foodSizes = isFoodSizes(product.price) ? getAvailableFoodSizes(product) : [];
    const drinkSizes = isDrinkSizes(product.price) ? getAvailableDrinkSizes(product) : [];
    const allSizes = [...foodSizes, ...drinkSizes]; // one or the other will be populated

    const removeKey = `${product.id}-${sizeKey ?? "single"}-${rellenoKey ?? "none"}`;

    return (
      <div className="relative bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <h2 className="font-bold text-sm max-w-[90%] mb-2">{product.name}</h2>

        <div className={`flex flex-col mb-2 ${product.relleno ? "gap-2" : ""}`}>
          {/* Relleno selector (food only) */}
          {product.relleno && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(product.relleno).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRelleno((prev) => ({ ...prev, [product.id]: key }))}
                  className={`py-1 px-2 text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer transition-colors ${
                    rellenoKey === key ? "bg-amber-800" : ""
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {/* Size selector (food or drink multi-size) */}
          {allSizes.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {allSizes.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedSize((prev) => ({ ...prev, [product.id]: key }))}
                  className={`py-1 px-2 text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer transition-colors ${
                    sizeKey === key ? "bg-amber-800" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            // Simple single-size label
            <span className="text-xs text-amber-700 font-bold">
              {product.size as string}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <p className="font-bold text-amber-500">
            {needsSize
              ? sizeKey
                ? `$${price.toFixed(2)}`
                : "$0.00"
              : `$${price.toFixed(2)}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => removeFromOrder(removeKey)}
              className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer transition-colors"
            >
              -
            </button>
            <button
              onClick={() => addToOrder(product)}
              disabled={!canAdd}
              className={`w-8 h-8 text-white rounded-lg font-bold transition-colors ${
                canAdd
                  ? "bg-amber-800 hover:bg-amber-700 cursor-pointer"
                  : "bg-amber-900/40 cursor-not-allowed"
              }`}
            >
              +
            </button>
          </div>
        </div>

        {count > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {count}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <h3 className="uppercase text-amber-500 font-bold text-sm">Comida</h3>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {props.foodProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <h3 className="uppercase text-amber-500 font-bold text-sm">Bebidas</h3>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {props.drinkProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Cart */}
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <h2 className="uppercase text-amber-500 font-bold text-sm mb-2">Pedido Actual</h2>
        {orderItems.length === 0 ? (
          <p className="text-xs text-amber-700 py-2">No hay productos en el pedido.</p>
        ) : (
          orderItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2 py-2 border-b border-yellow-800">
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-xs font-semibold">{item.name}</span>
                <span className="text-[10px] text-amber-700 uppercase">
                  {[item.sizeLabel, item.rellenoLabel].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => removeFromOrder(item.key)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer"
                >
                  -
                </button>
                <p className="text-sm font-bold w-4 text-center">{item.quantity}</p>
                <button
                  onClick={() =>
                    setOrderItems((prev) =>
                      prev.map((i) =>
                        i.key === item.key ? { ...i, quantity: i.quantity + 1 } : i
                      )
                    )
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <p className="text-sm font-bold text-amber-500 w-14 text-right">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => deleteFromOrder(item.key)}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ))
        )}

        {/* Discount */}
        <div className="flex justify-end mt-4 gap-4 items-center">
          <h3 className="font-semibold text-md">Descuento</h3>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={discount === 0 ? "" : discount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setDiscount(isNaN(val) || val < 0 ? 0 : val);
              }}
              placeholder="0.00"
              className="w-28 text-center pl-7 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          {discount > 0 && (
            <span className="text-xs text-amber-600 font-semibold">
              -{discount > subtotal ? subtotal.toFixed(2) : discount.toFixed(2)} aplicado
            </span>
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 flex flex-col gap-1">
          {discount > 0 && (
            <div className="flex justify-between items-center text-sm text-amber-700">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between items-center text-sm text-amber-600">
              <span>Descuento</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <h3 className="font-bold">TOTAL</h3>
            <h3 className="font-bold text-xl text-amber-500">${total.toFixed(2)}</h3>
          </div>
        </div>

        {orderItems.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={clearCart}
              className="flex-1 mt-4 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-lg font-bold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCobrar}
              disabled={orderItems.length === 0}
              className={`flex-2 mt-4 py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors ${
                orderItems.length > 0
                  ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer"
                  : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
              }`}
            >
              Cobrar ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}