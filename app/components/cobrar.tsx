"use client";

import { useState, useRef, useEffect } from "react";

type FoodSizes  = { grande: number; normal: number; bocadito: number };
type DrinkSizes = Record<string, { label: string; price: number }>;
type Ingredient = { id: string; name: string; stock: number };

type Product = {
  id: number;
  name: string;
  price: number | FoodSizes | DrinkSizes;
  category: string;
  size: string | { grande: string; normal: string; bocadito: string };
  relleno?: { carne: string; pollo: string } | null;
  // variantKey → { ingredientId → qty consumed per unit sold }
  ingredientMap: Record<string, Record<string, number>>;
};

type OrderItem = {
  key: string; productId: number; name: string;
  variantKey: string; sizeKey: string;
  sizeLabel: string | null; fillingKey: string | null; fillingLabel: string | null;
  price: number; quantity: number;
};

type SaleItem = { name: string; quantity: number; price: number };
type IngredientDeduction = { ingredientId: string; quantity: number };
type PaymentMethod = "efectivo" | "transferencia" | "deuna";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; emoji: string; desc: string }[] = [
  { value: "efectivo",      label: "Efectivo",      emoji: "💵", desc: "Pago en billetes o monedas" },
  { value: "transferencia", label: "Transferencia", emoji: "🏦", desc: "Transferencia bancaria" },
  { value: "deuna",         label: "De Una",        emoji: "📱", desc: "Pago con billetera digital" },
];

function isFoodSizes(p: Product["price"]): p is FoodSizes {
  return typeof p === "object" && "grande" in p;
}
function isDrinkSizes(p: Product["price"]): p is DrinkSizes {
  if (typeof p !== "object" || "grande" in p) return false;
  const vals = Object.values(p as DrinkSizes);
  return vals.length > 0 && typeof vals[0] === "object" && "label" in vals[0];
}

function getAvailableSizes(product: Product): [string, string][] {
  if (isFoodSizes(product.price)) {
    const obj = product.size as Record<string, string>;
    return Object.entries(product.price as FoodSizes).filter(([, p]) => p > 0).map(([k]) => [k, obj[k] ?? k]);
  }
  if (isDrinkSizes(product.price))
    return Object.entries(product.price as DrinkSizes).filter(([, { price }]) => price > 0).map(([k, { label }]) => [k, label]);
  return [];
}
function getPrice(product: Product, sizeKey: string | null): number {
  if (isFoodSizes(product.price) && sizeKey) return (product.price as FoodSizes)[sizeKey as keyof FoodSizes] ?? 0;
  if (isDrinkSizes(product.price) && sizeKey) return (product.price as DrinkSizes)[sizeKey]?.price ?? 0;
  return typeof product.price === "number" ? product.price : 0;
}
function getSizeLabel(product: Product, sizeKey: string | null): string | null {
  if (!sizeKey) return typeof product.size === "string" ? product.size : null;
  if (isFoodSizes(product.price) && typeof product.size === "object")
    return (product.size as Record<string, string>)[sizeKey] ?? null;
  if (isDrinkSizes(product.price)) return (product.price as DrinkSizes)[sizeKey]?.label ?? null;
  return null;
}
function makeVariantKey(sizeKey: string | null, fillingKey: string | null): string {
  return `${sizeKey ?? "single"}-${fillingKey ?? "none"}`;
}

// How many units of each ingredient this variant consumes per order unit
function getIngredientUsage(product: Product, variantKey: string): Record<string, number> {
  return product.ingredientMap?.[variantKey] ?? {};
}

// Total capacity = floor( min over all ingredients of stock / qty_per_unit )
// Maximum order-units that can be in the cart for this variant, ignoring reservations.
// Returns null if no ingredients are mapped (untracked).
function getTotalCapacity(
  product: Product,
  variantKey: string,
  ingredientById: Record<string, Ingredient>
): number | null {
  const usage = getIngredientUsage(product, variantKey);
  const entries = Object.entries(usage);
  if (entries.length === 0) return null;

  let min = Infinity;
  for (const [ingId, qtyPerUnit] of entries) {
    if (qtyPerUnit <= 0) continue;
    const ing = ingredientById[ingId];
    if (!ing) continue;
    min = Math.min(min, Math.floor(ing.stock / qtyPerUnit));
  }
  return min === Infinity ? null : min;
}

// Effective stock after accounting for cart reservations from OTHER products sharing
// the same ingredients. Used for cross-product badge/hint display.
function getEffectiveStock(
  product: Product,
  variantKey: string,
  ingredientById: Record<string, Ingredient>,
  cartReservations: Record<string, number>
): number | null {
  const usage = getIngredientUsage(product, variantKey);
  const entries = Object.entries(usage);
  if (entries.length === 0) return null;

  let min = Infinity;
  for (const [ingId, qtyPerUnit] of entries) {
    if (qtyPerUnit <= 0) continue;
    const ing = ingredientById[ingId];
    if (!ing) continue;
    const reserved  = cartReservations[ingId] ?? 0;
    const available = Math.max(0, ing.stock - reserved);
    min = Math.min(min, Math.floor(available / qtyPerUnit));
  }
  return min === Infinity ? null : min;
}

function stockBadge(stock: number | null): { label: string; cls: string } | null {
  if (stock === null) return null;
  if (stock === 0)  return { label: "Agotado",       cls: "bg-red-900/60 text-red-400 border-red-700" };
  if (stock <= 5)   return { label: `${stock} disp.`, cls: "bg-orange-900/50 text-orange-400 border-orange-700" };
  return { label: `${stock} disp.`, cls: "bg-green-900/30 text-green-500 border-green-800" };
}



export default function Cobrar(props: {
  foodProducts: Product[];
  drinkProducts: Product[];
  ingredients: Ingredient[];
  onSaleComplete: (items: SaleItem[], total: number, paymentMethod: PaymentMethod, deductions: IngredientDeduction[]) => void;
}) {
  const [selectedFilling, setSelectedFilling] = useState<Record<number, string>>({});
  const [selectedSize,    setSelectedSize]    = useState<Record<number, string>>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discount,   setDiscount]   = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment,  setSelectedPayment]  = useState<PaymentMethod | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);

  const totalBlockRef    = useRef<HTMLDivElement>(null);
  const [isTotalVisible, setIsTotalVisible] = useState(false);

  useEffect(() => {
    const el = totalBlockRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setIsTotalVisible(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const ingredientById: Record<string, Ingredient> = {};
  props.ingredients.forEach((ing) => { ingredientById[ing.id] = ing; });

  const allProducts = [...props.foodProducts, ...props.drinkProducts];

  // Compute raw ingredient reservations from current cart
  // Each order item of quantity N with usage { ingId: qtyPerUnit } reserves N * qtyPerUnit raw units
  const cartReservations: Record<string, number> = {};
  for (const item of orderItems) {
    const product = allProducts.find((p) => p.id === item.productId);
    if (!product) continue;
    const usage = getIngredientUsage(product, item.variantKey);
    for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
      cartReservations[ingId] = (cartReservations[ingId] ?? 0) + item.quantity * qtyPerUnit;
    }
  }

  const requiresSize = (p: Product) => isFoodSizes(p.price) || isDrinkSizes(p.price);

  const addToOrder = (product: Product) => {
    const needsSize  = requiresSize(product);
    const rawSizeKey = needsSize ? (selectedSize[product.id] || null) : null;
    const fillingKey = product.relleno ? (selectedFilling[product.id] || null) : null;
    if (needsSize && !rawSizeKey) return;
    if (product.relleno && !fillingKey) return;

    const variantKey = makeVariantKey(rawSizeKey, fillingKey);
    const cartKey    = `${product.id}-${variantKey}`;
    const inCart     = orderItems.find((i) => i.key === cartKey)?.quantity ?? 0;
    const capacity   = getTotalCapacity(product, variantKey, ingredientById);
    if (capacity !== null && inCart >= capacity) return;

    const sizeLabel    = getSizeLabel(product, rawSizeKey);
    const fillingLabel = fillingKey && product.relleno ? product.relleno[fillingKey as keyof typeof product.relleno] : null;
    const price        = getPrice(product, rawSizeKey);

    setOrderItems((prev) => {
      const ex = prev.find((i) => i.key === cartKey);
      if (ex) return prev.map((i) => i.key === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { key: cartKey, productId: product.id, name: product.name, variantKey, sizeKey: rawSizeKey ?? "single", sizeLabel, fillingKey, fillingLabel, price, quantity: 1 }];
    });
  };

  const removeFromOrder = (key: string) =>
    setOrderItems((prev) => {
      const ex = prev.find((i) => i.key === key);
      if (!ex) return prev;
      return ex.quantity <= 1 ? prev.filter((i) => i.key !== key) : prev.map((i) => i.key === key ? { ...i, quantity: i.quantity - 1 } : i);
    });

  const deleteFromOrder = (key: string) => setOrderItems((prev) => prev.filter((i) => i.key !== key));

  const getItemCount = (product: Product): number => {
    const needsSize  = requiresSize(product);
    const rawSizeKey = needsSize ? (selectedSize[product.id] || null) : null;
    const fillingKey = product.relleno ? (selectedFilling[product.id] || null) : null;
    return orderItems.find((i) => i.key === `${product.id}-${makeVariantKey(rawSizeKey, fillingKey)}`)?.quantity ?? 0;
  };

  const subtotal       = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = Math.min(discount, subtotal);
  const total          = subtotal - discountAmount;
  const totalItems     = orderItems.reduce((s, i) => s + i.quantity, 0);

  const confirmPayment = () => {
    if (!selectedPayment) return;
    const saleItems: SaleItem[] = orderItems.map((item) => ({
      name: [item.name, item.sizeLabel, item.fillingLabel].filter(Boolean).join(" "),
      quantity: item.quantity, price: item.price,
    }));
    // Build deductions: for each order item, multiply ingredient qty by order quantity
    const deductions: IngredientDeduction[] = [];
    for (const item of orderItems) {
      const product = allProducts.find((p) => p.id === item.productId);
      const usage   = getIngredientUsage(product!, item.variantKey);
      for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
        deductions.push({ ingredientId: ingId, quantity: item.quantity * qtyPerUnit });
      }
    }
    props.onSaleComplete(saleItems, total, selectedPayment, deductions);
    setOrderItems([]); setSelectedFilling({}); setSelectedSize({}); setDiscount(0);
    setShowPaymentModal(false); setSelectedPayment(null);
  };

  const clearCart = () => { setOrderItems([]); setSelectedSize({}); setSelectedFilling({}); setDiscount(0); };

  // ── ProductCard ──────────────────────────────────────────────────────────────
  const ProductCard = ({ product }: { product: Product }) => {
    const count      = getItemCount(product);
    const rawSizeKey = selectedSize[product.id] ?? null;
    const fillingKey = selectedFilling[product.id] ?? null;
    const needsSize  = requiresSize(product);
    const selectionComplete = (!needsSize || !!rawSizeKey) && (!product.relleno || !!fillingKey);

    const variantKey = makeVariantKey(rawSizeKey, fillingKey);
    const cartKey    = `${product.id}-${variantKey}`;
    const inCart     = orderItems.find((i) => i.key === cartKey)?.quantity ?? 0;

    // Total capacity (ignores reservations) — used to cap this product's own cart quantity
    const capacity   = selectionComplete ? getTotalCapacity(product, variantKey, ingredientById) : null;
    // Effective stock (accounts for cross-product reservations) — used for badge display
    const effStock   = selectionComplete ? getEffectiveStock(product, variantKey, ingredientById, cartReservations) : null;
    const badge      = selectionComplete ? stockBadge(effStock) : null;
    const outOfStock = capacity !== null && capacity === 0;
    const atMax      = capacity !== null && inCart >= capacity;
    const canAdd     = selectionComplete && !outOfStock && !atMax;

    const allSizes = getAvailableSizes(product);

    const getFillingStock = (fk: string) =>
      !rawSizeKey && needsSize ? null : getEffectiveStock(product, makeVariantKey(rawSizeKey, fk), ingredientById, cartReservations);
    const getSizeStock = (sk: string) =>
      getEffectiveStock(product, makeVariantKey(sk, fillingKey), ingredientById, cartReservations);

    return (
      <div className={`relative bg-amber-900/30 border-2 rounded-lg p-4 transition-colors ${outOfStock && selectionComplete ? "border-red-900 opacity-70" : "border-amber-800"}`}>
        <h2 className="font-bold text-sm max-w-[90%] mb-2">{product.name}</h2>

        <div className={`flex flex-col mb-2 ${product.relleno ? "gap-2" : ""}`}>
          {product.relleno && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(product.relleno).map(([key, value]) => {
                const fs = getFillingStock(key);
                const depleted = fs !== null && fs === 0;
                return (
                  <button key={key}
                    onClick={() => !depleted && setSelectedFilling((prev) => ({ ...prev, [product.id]: key }))}
                    disabled={depleted}
                    className={`py-1 px-2 text-xs border rounded-lg font-bold transition-colors ${
                      depleted ? "border-red-900 text-red-800 cursor-not-allowed line-through"
                      : fillingKey === key ? "bg-amber-800 border-amber-800 cursor-pointer"
                      : "border-amber-800 hover:bg-amber-800 cursor-pointer"}`}>
                    {value}
                    {fs !== null && !depleted && fs <= 5 && <span className="ml-1 text-orange-400 text-[9px]">({fs})</span>}
                  </button>
                );
              })}
            </div>
          )}
          {allSizes.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {allSizes.map(([key, label]) => {
                const ss = getSizeStock(key);
                const depleted = ss !== null && ss === 0;
                return (
                  <button key={key}
                    onClick={() => !depleted && setSelectedSize((prev) => ({ ...prev, [product.id]: key }))}
                    disabled={depleted}
                    className={`py-1 px-2 text-xs border rounded-lg font-bold transition-colors ${
                      depleted ? "border-red-900 text-red-800 cursor-not-allowed line-through"
                      : rawSizeKey === key ? "bg-amber-800 border-amber-800 cursor-pointer"
                      : "border-amber-800 hover:bg-amber-800 cursor-pointer"}`}>
                    {label}
                    {ss !== null && !depleted && ss <= 5 && <span className="ml-1 text-orange-400 text-[9px]">({ss})</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-amber-700 font-bold">{product.size as string}</span>
          )}
        </div>

        {badge && (
          <div className={`mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${badge.cls}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            {badge.label}
          </div>
        )}

        <div className="flex justify-between items-center">
          <p className="font-bold text-amber-500">
            {needsSize ? (rawSizeKey ? `$${getPrice(product, rawSizeKey).toFixed(2)}` : "$0.00") : `$${getPrice(product, null).toFixed(2)}`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => removeFromOrder(cartKey)} className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer transition-colors">−</button>
            <button onClick={() => addToOrder(product)} disabled={!canAdd}
              className={`w-8 h-8 text-white rounded-lg font-bold transition-colors ${canAdd ? "bg-amber-800 hover:bg-amber-700 cursor-pointer" : "bg-amber-900/40 cursor-not-allowed"}`}>+</button>
          </div>
        </div>

        {count > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{count}</div>
        )}
      </div>
    );
  };

  const showFloatingBar = total > 0 && !isTotalVisible;

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <h3 className="uppercase text-amber-500 font-bold text-sm">Comida</h3>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {props.foodProducts.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      <h3 className="uppercase text-amber-500 font-bold text-sm">Bebidas</h3>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {props.drinkProducts.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {/* Cart */}
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <h2 className="uppercase text-amber-500 font-bold text-sm mb-2">Pedido Actual</h2>
        {orderItems.length === 0
          ? <p className="text-xs text-amber-700 py-2">No hay productos en el pedido.</p>
          : orderItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2 py-2 border-b border-yellow-800">
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-xs font-semibold">{item.name}</span>
                <span className="text-[10px] text-amber-700 uppercase">
                  {[item.sizeLabel, item.fillingLabel].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => removeFromOrder(item.key)} className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">−</button>
                <p className="text-sm font-bold w-4 text-center">{item.quantity}</p>
                <button onClick={() => {
                    const product = allProducts.find((p) => p.id === item.productId);
                    if (product) {
                      const capacity = getTotalCapacity(product, item.variantKey, ingredientById);
                      if (capacity !== null && item.quantity >= capacity) return;
                    }
                    setOrderItems((prev) => prev.map((i) => i.key === item.key ? { ...i, quantity: i.quantity + 1 } : i));
                  }} className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">+</button>
              </div>
              <p className="text-sm font-bold text-amber-500 w-14 text-right">${(item.price * item.quantity).toFixed(2)}</p>
              <button onClick={() => deleteFromOrder(item.key)} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ))
        }

        <div className="flex justify-end mt-4">
          <button
            onClick={() => { setShowDiscount((v) => !v); if (showDiscount) setDiscount(0); }}
            className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold py-1.5 px-3 rounded-lg border-2 cursor-pointer transition-colors ${
              showDiscount
                ? "border-amber-500 text-amber-400 bg-amber-900/40"
                : "border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${showDiscount ? "bg-amber-500 border-amber-500" : "border-amber-700"}`}>
              {showDiscount && <span className="text-amber-950 text-[9px] font-black leading-none">✓</span>}
            </span>
            Aplicar descuento
          </button>
        </div>

        {showDiscount && (
          <div className="flex justify-end gap-4 items-center mt-2">
            <h3 className="font-semibold text-sm">Descuento</h3>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold">$</span>
              <input type="number" min={0} step={0.01} value={discount === 0 ? "" : discount}
                onChange={(e) => { const v = parseFloat(e.target.value); setDiscount(isNaN(v) || v < 0 ? 0 : v); }}
                placeholder="0.00"
                autoFocus
                className="w-28 text-center pl-7 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            {discount > 0 && <span className="text-xs text-amber-600 font-semibold">-${Math.min(discount, subtotal).toFixed(2)} aplicado</span>}
          </div>
        )}

        <div ref={totalBlockRef} className="mt-4 flex flex-col gap-1">
          {discount > 0 && <>
            <div className="flex justify-between text-sm text-amber-700"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-amber-600"><span>Descuento</span><span>-${discountAmount.toFixed(2)}</span></div>
          </>}
          <div className="flex justify-between items-center">
            <h3 className="font-bold">TOTAL</h3>
            <h3 className="font-bold text-xl text-amber-500">${total.toFixed(2)}</h3>
          </div>
        </div>

        {orderItems.length > 0 && (
          <div className="flex gap-3">
            <button onClick={clearCart} className="flex-1 mt-4 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-lg font-bold cursor-pointer transition-colors">Cancelar</button>
            <button onClick={() => { setSelectedPayment(null); setShowPaymentModal(true); }}
              className="flex-2 mt-4 py-3 px-6 rounded-lg font-bold uppercase tracking-widest text-sm bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer transition-colors">
              Cobrar ${total.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">Forma de pago</h2>
                <p className="text-[10px] uppercase tracking-widest text-yellow-700">Total: <span className="text-amber-400 font-bold">${total.toFixed(2)}</span></p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setSelectedPayment(opt.value)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${selectedPayment === opt.value ? "border-amber-500 bg-amber-900/60" : "border-amber-800 hover:border-amber-600 bg-amber-900/20"}`}>
                  <span className="text-2xl leading-none">{opt.emoji}</span>
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${selectedPayment === opt.value ? "text-amber-400" : "text-amber-200"}`}>{opt.label}</span>
                    <span className="text-[10px] text-amber-700">{opt.desc}</span>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPayment === opt.value ? "border-amber-500 bg-amber-500" : "border-amber-700"}`}>
                    {selectedPayment === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button disabled={!selectedPayment} onClick={confirmPayment}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${selectedPayment ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer" : "bg-amber-900/40 text-amber-800 cursor-not-allowed"}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${showFloatingBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="bg-amber-950/95 backdrop-blur-md border-t-2 border-amber-600 shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
          <button onClick={() => totalBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-full max-w-4xl m-auto flex items-center justify-between px-6 py-4 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-amber-950 text-xs font-bold">{totalItems}</div>
              <span className="text-xs uppercase tracking-widest text-amber-600 font-bold group-hover:text-amber-400">Ver pedido</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-amber-600 -rotate-90">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <div className="flex items-center gap-3">
              {discount > 0 && <span className="text-xs text-amber-700 line-through">${subtotal.toFixed(2)}</span>}
              <span className="text-2xl font-bold text-amber-400">${total.toFixed(2)}</span>
            </div>
          </button>
        </div>
      </div>
      {showFloatingBar && <div className="h-20" />}
    </div>
  );
}