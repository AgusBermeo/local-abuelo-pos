"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  getTierPrice,
  PriceTier,
  TieredPrices,
  Ingredient,
  Product,
  DrinkSize,
  IngredientDeduction,
  DrinkDeduction,
  PaymentMethod,
} from "../page";

// One entry in the cart.
// For food: sizeKey / fillingKey as before.
// For drinks: sizeKey = drinkSize.key, fillingKey = "none".
type CartEntry = {
  key: string;
  productId: number;
  sizeKey: string;
  fillingKey: string;
  quantity: number;
};

type SaleItem = { name: string; quantity: number; price: number };

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; emoji: string; desc: string }[] = [
  { value: "efectivo",      label: "Efectivo",      emoji: "💵", desc: "Pago en billetes o monedas" },
  { value: "transferencia", label: "Transferencia", emoji: "🏦", desc: "Transferencia bancaria" },
  { value: "deuna",         label: "De Una",        emoji: "📱", desc: "Pago con billetera digital" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvailableSizes(product: Product): Array<{ key: string; label: string }> {
  return Object.entries(product.sizeLabels ?? {}).filter(([key]) => {
    const tiers = product.tieredPrices?.[key];
    return tiers && tiers.some((t) => t.pricePerUnit > 0);
  }).map(([key, label]) => ({ key, label }));
}

function getAvailableFillings(product: Product): Array<{ key: string; label: string }> {
  return Object.entries(product.fillingLabels ?? {}).map(([key, label]) => ({ key, label }));
}

function makeCartKey(productId: number, sizeKey: string, fillingKey: string): string {
  return `${productId}-${sizeKey}-${fillingKey}`;
}

function variantKey(sizeKey: string, fillingKey: string): string {
  return `${sizeKey}-${fillingKey}`;
}

/** Ingredient usage for a specific variant (food only) */
function getIngredientUsage(product: Product, vk: string): Record<string, number> {
  return product.ingredientMap?.[vk] ?? {};
}

/** Max addable units for a food variant given ingredient stock */
function getFoodEffectiveCapacity(
  product: Product,
  sizeKey: string,
  fillingKey: string,
  ingredientById: Record<string, Ingredient>,
  cartReservations: Record<string, number>,
  currentQtyInCart: number,
): number | null {
  const usage = getIngredientUsage(product, variantKey(sizeKey, fillingKey));
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
  return min === Infinity ? null : currentQtyInCart + min;
}

/** Max addable units for a drink size given its own stock */
function getDrinkEffectiveCapacity(
  drinkSize: DrinkSize,
  cartQty: number,
): number | null {
  // stock === 0 AND we haven't added any → untracked (no stock set)
  // We use stock > 0 OR cartQty > 0 as signal that tracking is active
  if (drinkSize.stock === 0 && cartQty === 0) return null; // untracked
  return drinkSize.stock; // absolute max (not cumulative)
}

// ── Price tier display ────────────────────────────────────────────────────────

function TierBadges({
  tiers,
  currentQty,
}: {
  tiers: PriceTier[];
  currentQty: number;
}) {
  if (!tiers || tiers.length <= 1) return null;
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sorted.map((tier, i) => {
        const isActive =
          currentQty >= tier.minQty &&
          (i === sorted.length - 1 || currentQty < sorted[i + 1].minQty);
        return (
          <span
            key={tier.minQty}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
              isActive
                ? "bg-amber-500 text-amber-950 border-amber-400"
                : "bg-amber-900/40 text-amber-700 border-amber-800"
            }`}
          >
            {tier.minQty === 1 ? "Base" : `×${tier.minQty}`} ${tier.pricePerUnit.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Cobrar(props: {
  foodProducts: Product[];
  drinkProducts: Product[];
  ingredients: Ingredient[];
  onSaleComplete: (
    items: SaleItem[],
    total: number,
    paymentMethod: PaymentMethod,
    deductions: IngredientDeduction[],
    drinkDeductions: DrinkDeduction[],
    tax: number,
    orderType: "servir" | "llevar"
  ) => void;
}) {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(15);
  const [taxRateInput, setTaxRateInput] = useState<string>("15");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [orderType, setOrderType] = useState<"servir" | "llevar" | null>(null);

  // Selected filling per food product (productId → fillingKey)
  const [selectedFilling, setSelectedFilling] = useState<Record<number, string>>({});

  const totalBlockRef    = useRef<HTMLDivElement>(null);
  const [isTotalVisible, setIsTotalVisible] = useState(false);

  useEffect(() => {
    const el = totalBlockRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsTotalVisible(e.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const ingredientById: Record<string, Ingredient> = {};
  props.ingredients.forEach((ing) => { ingredientById[ing.id] = ing; });

  const allProducts = [...props.foodProducts, ...props.drinkProducts];

  // Ingredient reservations across entire cart (food only)
  const cartReservations: Record<string, number> = {};
  for (const entry of cart) {
    const product = allProducts.find((p) => p.id === entry.productId);
    if (!product || product.category !== "Comida") continue;
    const usage = getIngredientUsage(product, variantKey(entry.sizeKey, entry.fillingKey));
    for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
      cartReservations[ingId] = (cartReservations[ingId] ?? 0) + entry.quantity * qtyPerUnit;
    }
  }

  // ── Cart mutations ──────────────────────────────────────────────────────────

  const setQty = useCallback((
    product: Product,
    sizeKey: string,
    fillingKey: string,
    newQty: number,
  ) => {
    const key = makeCartKey(product.id, sizeKey, fillingKey);
    if (newQty <= 0) {
      setCart((prev) => prev.filter((e) => e.key !== key));
      return;
    }

    let capped = newQty;
    if (product.category === "Comida") {
      const existing = cart.find((e) => e.key === key);
      const currentQ = existing?.quantity ?? 0;
      const capacity = getFoodEffectiveCapacity(
        product, sizeKey, fillingKey, ingredientById, cartReservations, currentQ
      );
      capped = capacity !== null ? Math.min(newQty, capacity) : newQty;
    } else {
      // Drink: cap by drinkSize stock
      const ds = product.drinkSizes?.find((d) => d.key === sizeKey);
      if (ds) {
        const cap = getDrinkEffectiveCapacity(ds, cart.find((e) => e.key === key)?.quantity ?? 0);
        if (cap !== null) capped = Math.min(newQty, cap);
      }
    }

    setCart((prev) => {
      const ex = prev.find((e) => e.key === key);
      if (ex) return prev.map((e) => e.key === key ? { ...e, quantity: capped } : e);
      return [...prev, { key, productId: product.id, sizeKey, fillingKey, quantity: capped }];
    });
  }, [cart, ingredientById, cartReservations]);

  const increment = useCallback((product: Product, sizeKey: string, fillingKey: string) => {
    const key = makeCartKey(product.id, sizeKey, fillingKey);
    const current = cart.find((e) => e.key === key)?.quantity ?? 0;

    if (product.category === "Comida") {
      const capacity = getFoodEffectiveCapacity(
        product, sizeKey, fillingKey, ingredientById, cartReservations, current
      );
      if (capacity !== null && current >= capacity) return;
    } else {
      const ds = product.drinkSizes?.find((d) => d.key === sizeKey);
      if (ds) {
        const cap = getDrinkEffectiveCapacity(ds, current);
        if (cap !== null && current >= cap) return;
      }
    }

    setCart((prev) => {
      const ex = prev.find((e) => e.key === key);
      if (ex) return prev.map((e) => e.key === key ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { key, productId: product.id, sizeKey, fillingKey, quantity: 1 }];
    });
  }, [cart, ingredientById, cartReservations]);

  const decrement = useCallback((key: string) => {
    setCart((prev) => {
      const ex = prev.find((e) => e.key === key);
      if (!ex) return prev;
      if (ex.quantity <= 1) return prev.filter((e) => e.key !== key);
      return prev.map((e) => e.key === key ? { ...e, quantity: e.quantity - 1 } : e);
    });
  }, []);

  const removeEntry = useCallback((key: string) => {
    setCart((prev) => prev.filter((e) => e.key !== key));
  }, []);

  // ── Derived totals ──────────────────────────────────────────────────────────

  const sizeTotals: Record<string, number> = {};
  for (const entry of cart) {
    const k = `${entry.productId}::${entry.sizeKey}`;
    sizeTotals[k] = (sizeTotals[k] ?? 0) + entry.quantity;
  }

  function getEntryPrice(entry: CartEntry): number {
    const product = allProducts.find((p) => p.id === entry.productId);
    if (!product) return 0;
    if (product.category === "Bebida") {
      const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
      return ds ? ds.price : product.price ?? 0;
    }
    if (!product.tieredPrices[entry.sizeKey]) return product.price ?? 0;
    const totalQtyForSize = sizeTotals[`${entry.productId}::${entry.sizeKey}`] ?? entry.quantity;
    return getTierPrice(product, entry.sizeKey, totalQtyForSize);
  }

  const subtotal       = cart.reduce((s, e) => s + getEntryPrice(e) * e.quantity, 0);
  const discountAmount = Math.min(discount, subtotal);
  const afterDiscount  = subtotal - discountAmount;
  const taxAmount      = taxEnabled ? afterDiscount * (taxRate / 100) : 0;
  const total          = afterDiscount + taxAmount;
  const totalItems     = cart.reduce((s, e) => s + e.quantity, 0);

  // ── Payment ─────────────────────────────────────────────────────────────────

  const confirmPayment = () => {
    if (!selectedPayment || !orderType) return;

    const saleItems: SaleItem[] = cart.map((entry) => {
      const product = allProducts.find((p) => p.id === entry.productId);
      let name: string;
      if (product?.category === "Bebida") {
        const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
        name = [product?.name ?? "", ds?.label ?? entry.sizeKey].filter(Boolean).join(" ");
      } else {
        const sizeLabel    = product?.sizeLabels[entry.sizeKey] ?? entry.sizeKey;
        const fillingLabel = entry.fillingKey !== "none"
          ? (product?.fillingLabels[entry.fillingKey] ?? entry.fillingKey)
          : null;
        name = [product?.name ?? "", sizeLabel, fillingLabel].filter(Boolean).join(" ");
      }
      return { name, quantity: entry.quantity, price: getEntryPrice(entry) };
    });

    // Food ingredient deductions
    const deductions: IngredientDeduction[] = [];
    for (const entry of cart) {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product || product.category !== "Comida") continue;
      const usage = getIngredientUsage(product, variantKey(entry.sizeKey, entry.fillingKey));
      for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
        deductions.push({ ingredientId: ingId, quantity: entry.quantity * qtyPerUnit });
      }
    }

    // Drink stock deductions
    const drinkDeductions: DrinkDeduction[] = [];
    for (const entry of cart) {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product || product.category !== "Bebida") continue;
      const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
      if (!ds || ds.stock === 0) continue; // untracked → skip
      drinkDeductions.push({ productId: product.id, drinkSizeKey: entry.sizeKey, quantity: entry.quantity });
    }

    props.onSaleComplete(
      saleItems, total, selectedPayment,
      deductions, drinkDeductions,
      taxEnabled ? taxAmount : 0,
      orderType
    );
    setCart([]);
    setSelectedFilling({});
    setDiscount(0);
    setShowDiscount(false);
    setTaxEnabled(false);
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setOrderType(null);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedFilling({});
    setDiscount(0);
    setShowDiscount(false);
    setTaxEnabled(false);
    setOrderType(null);
  };

  // ── FoodProductCard ─────────────────────────────────────────────────────────

  const FoodProductCard = ({ product }: { product: Product }) => {
    const sizes    = getAvailableSizes(product);
    const fillings = getAvailableFillings(product);
    const hasRelleno = fillings.length > 0;
    const currentFilling = hasRelleno ? (selectedFilling[product.id] ?? null) : "none";

    return (
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4 flex flex-col col-span-2 gap-3">
        <h2 className="font-bold text-sm">{product.name}</h2>

        {/* Relleno selector */}
        {hasRelleno && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-yellow-700">Relleno</span>
            <div className="flex gap-2 flex-wrap">
              {fillings.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilling((prev) => ({ ...prev, [product.id]: key }))}
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

        {/* One row per size */}
        <div className="flex flex-wrap gap-3">
          {sizes.map(({ key: sizeKey, label: sizeLabel }) => {
            const fk = currentFilling ?? "none";
            const ck = makeCartKey(product.id, sizeKey, fk);
            const entry = cart.find((e) => e.key === ck);
            const qty   = entry?.quantity ?? 0;

            const totalQtyForSize = sizeTotals[`${product.id}::${sizeKey}`] ?? qty;
            const unitPrice = getTierPrice(product, sizeKey, totalQtyForSize);
            const tiers = product.tieredPrices[sizeKey] ?? [];

            const capacity = (currentFilling || !hasRelleno)
              ? getFoodEffectiveCapacity(
                  product, sizeKey, fk, ingredientById, cartReservations, qty
                )
              : null;
            const outOfStock = capacity !== null && capacity === 0 && qty === 0;
            const atMax      = capacity !== null && qty >= capacity;
            const addlCapacity = capacity !== null ? Math.max(0, capacity - qty) : null;

            const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
            const nextTier = sortedTiers.find((t) => t.minQty > totalQtyForSize);

            return (
              <div
                key={sizeKey}
                className={`flex flex-col gap-1.5 rounded-lg border p-3 transition-colors ${
                  outOfStock
                    ? "border-red-900/60 bg-red-950/10 opacity-60"
                    : qty > 0
                    ? "border-amber-600 bg-amber-900/40"
                    : "border-amber-800/60 bg-amber-900/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-200">{sizeLabel}</span>
                      {outOfStock && (
                        <span className="text-[9px] font-bold uppercase text-red-400 bg-red-900/40 border border-red-800 rounded-full px-2 py-0.5">
                          Agotado
                        </span>
                      )}
                      {!outOfStock && addlCapacity !== null && addlCapacity + qty <= 5 && (
                        <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${
                          addlCapacity + qty === 0
                            ? "text-red-400 bg-red-900/40 border-red-800"
                            : "text-orange-400 bg-orange-900/30 border-orange-800"
                        }`}>
                          {addlCapacity + qty} disp.
                        </span>
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => decrement(ck)}
                      disabled={qty === 0}
                      className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                        qty === 0
                          ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                          : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                      }`}
                    >−</button>
                    <input
                      type="number" min={0}
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!hasRelleno || currentFilling) {
                          setQty(product, sizeKey, fk, isNaN(v) ? 0 : v);
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
                        if (!hasRelleno || currentFilling) increment(product, sizeKey, fk);
                      }}
                      disabled={outOfStock || atMax || (hasRelleno && !currentFilling)}
                      className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                        outOfStock || atMax || (hasRelleno && !currentFilling)
                          ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                          : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                      }`}
                    >+</button>
                  </div>
                </div>

                <TierBadges tiers={tiers} currentQty={totalQtyForSize} />

                {!outOfStock && tiers.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                    {[3, 5, 10, 20].map((n) => {
                      const disabled = (hasRelleno && !currentFilling) || (capacity !== null && qty + n > capacity);
                      return (
                        <button
                          key={n}
                          disabled={disabled}
                          onClick={() => {
                            if (!hasRelleno || currentFilling) setQty(product, sizeKey, fk, qty + n);
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
          <p className="text-[10px] text-amber-700 italic">Selecciona un relleno para agregar.</p>
        )}
      </div>
    );
  };

  // ── DrinkProductCard ────────────────────────────────────────────────────────

  const DrinkProductCard = ({ product }: { product: Product }) => {
    const drinkSizes = product.drinkSizes ?? [];

    return (
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4 flex flex-col gap-3 col-span-1">
        <h2 className="font-bold text-sm">{product.name}</h2>

        <div className="flex flex-col gap-2">
          {drinkSizes.map((ds) => {
            const ck = makeCartKey(product.id, ds.key, "none");
            const entry = cart.find((e) => e.key === ck);
            const qty = entry?.quantity ?? 0;

            // Stock tracking: only active if stock > 0 or already in cart
            const cap = getDrinkEffectiveCapacity(ds, qty);
            const outOfStock = cap !== null && cap === 0 && qty === 0;
            const atMax      = cap !== null && qty >= cap;
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
                {/* Label + price + stock badge */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-200">{ds.label}</span>
                    {stockTracked && (
                      <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${
                        outOfStock
                          ? "text-red-400 bg-red-900/40 border-red-800"
                          : ds.stock <= 3
                          ? "text-orange-400 bg-orange-900/30 border-orange-800"
                          : "text-green-500 bg-green-900/20 border-green-900"
                      }`}>
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

                {/* Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decrement(ck)}
                    disabled={qty === 0}
                    className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                      qty === 0
                        ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                        : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                    }`}
                  >−</button>
                  <input
                    type="number" min={0}
                    value={qty === 0 ? "" : qty}
                    placeholder="0"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQty(product, ds.key, "none", isNaN(v) ? 0 : v);
                    }}
                    disabled={outOfStock && qty === 0}
                    className={`w-12 text-center bg-amber-950/60 border-2 rounded-lg py-1 text-sm font-bold focus:outline-none transition-colors tabular-nums ${
                      qty > 0
                        ? "border-amber-600 text-amber-300 focus:border-amber-400"
                        : "border-amber-800 text-amber-700 focus:border-amber-600"
                    }`}
                  />
                  <button
                    onClick={() => increment(product, ds.key, "none")}
                    disabled={outOfStock || atMax}
                    className={`w-8 h-8 rounded-lg font-bold text-lg transition-colors ${
                      outOfStock || atMax
                        ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
                        : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
                    }`}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Cart display ─────────────────────────────────────────────────────────────

  const showFloatingBar = total > 0 && !isTotalVisible;

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">

      {/* Food products */}
      {props.foodProducts.length > 0 && (
        <>
          <h3 className="uppercase text-amber-500 font-bold text-sm">Comida</h3>
          <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-3">
            {props.foodProducts.map((p) => <FoodProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}

      {/* Drink products */}
      {props.drinkProducts.length > 0 && (
        <>
          <h3 className="uppercase text-amber-500 font-bold text-sm">Bebidas</h3>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
            {props.drinkProducts.map((p) => <DrinkProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}

      {/* Cart summary */}
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <h2 className="uppercase text-amber-500 font-bold text-sm mb-3">Pedido Actual</h2>

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
                const fillingLabel = entry.fillingKey !== "none"
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => decrement(entry.key)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer"
                    >−</button>
                    <span className="text-sm font-bold w-6 text-center tabular-nums">{entry.quantity}</span>
                    <button
                      onClick={() => {
                        const product = allProducts.find((p) => p.id === entry.productId);
                        if (product) increment(product, entry.sizeKey, entry.fillingKey);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer"
                    >+</button>
                  </div>
                  <p className="text-sm font-bold text-amber-500 w-16 text-right tabular-nums">
                    ${lineTotal.toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeEntry(entry.key)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Discount toggle */}
        <div className="flex justify-end gap-2 mt-4 flex-wrap">
          <button
            onClick={() => { setShowDiscount((v) => !v); if (showDiscount) setDiscount(0); }}
            className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold py-1.5 px-3 rounded-lg border-2 cursor-pointer transition-colors ${
              showDiscount
                ? "border-amber-500 text-amber-400 bg-amber-900/40"
                : "border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${showDiscount ? "bg-amber-500 border-amber-500" : "border-amber-700"}`}>
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
              <input
                type="number" min={0} step={0.01}
                value={discount === 0 ? "" : discount}
                onChange={(e) => { const v = parseFloat(e.target.value); setDiscount(isNaN(v) || v < 0 ? 0 : v); }}
                placeholder="0.00" autoFocus
                className="w-28 text-center pl-7 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            {discount > 0 && (
              <span className="text-xs text-amber-600 font-semibold">
                -${Math.min(discount, subtotal).toFixed(2)} aplicado
              </span>
            )}
          </div>
        )}

        {/* IVA / Tax panel */}
        <div className="mt-3 flex flex-col gap-2 bg-blue-900/10 border border-blue-900/40 rounded-lg px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setTaxEnabled((v) => !v)}
                className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${taxEnabled ? "bg-blue-500" : "bg-amber-800"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${taxEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-widest ${taxEnabled ? "text-blue-300" : "text-amber-700"}`}>
                IVA {taxEnabled ? "incluido" : "no incluido"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-blue-400/70">Tasa</span>
              <div className="relative flex items-center">
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={taxRateInput}
                  onChange={(e) => {
                    setTaxRateInput(e.target.value);
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= 100) setTaxRate(v);
                  }}
                  className="w-16 text-center bg-blue-950/60 border-2 border-blue-800 focus:border-blue-500 rounded-lg px-2 py-1.5 text-blue-100 text-sm focus:outline-none transition-colors"
                />
                <span className="absolute right-2 text-blue-400 text-xs font-bold pointer-events-none">%</span>
              </div>
            </div>
          </div>
          {taxEnabled && taxAmount > 0 && (
            <p className="text-[10px] text-blue-400/80">
              {taxRate}% sobre ${afterDiscount.toFixed(2)} = <span className="font-bold text-blue-300">+${taxAmount.toFixed(2)}</span>
            </p>
          )}
        </div>

        {/* Totals */}
        <div ref={totalBlockRef} className="mt-4 flex flex-col gap-1">
          {(discount > 0 || taxEnabled) && (
            <div className="flex justify-between text-sm text-amber-700">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>Descuento</span><span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          {taxEnabled && (
            <div className="flex justify-between text-sm text-blue-400">
              <span>IVA ({taxRate}%)</span><span>+${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-amber-800/40 pt-1 mt-0.5">
            <h3 className="font-bold">TOTAL</h3>
            <h3 className="font-bold text-xl text-amber-500">${total.toFixed(2)}</h3>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={clearCart}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-lg font-bold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setSelectedPayment(null); setOrderType(null); setShowPaymentModal(true); }}
              className="flex-2 py-3 px-6 rounded-lg font-bold uppercase tracking-widest text-sm bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer transition-colors"
            >
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
                <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">Finalizar pedido</h2>
                <p className="text-[10px] uppercase tracking-widest text-yellow-700">
                  Total: <span className="text-amber-400 font-bold">${total.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Servir o llevar */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">¿Cómo se sirve?</p>
              <div className="flex gap-2">
                {([
                  { value: "servir", label: "Para servir", emoji: "🍽️" },
                  { value: "llevar", label: "Para llevar", emoji: "🛍️" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOrderType(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${
                      orderType === opt.value
                        ? "border-amber-500 bg-amber-900/60 text-amber-400"
                        : "border-amber-800 hover:border-amber-600 bg-amber-900/20 text-amber-700"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Forma de pago */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">Forma de pago</p>
              <div className="flex flex-col gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setSelectedPayment(opt.value)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                      selectedPayment === opt.value
                        ? "border-amber-500 bg-amber-900/60"
                        : "border-amber-800 hover:border-amber-600 bg-amber-900/20"
                    }`}
                  >
                    <span className="text-2xl leading-none">{opt.emoji}</span>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${selectedPayment === opt.value ? "text-amber-400" : "text-amber-200"}`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-amber-700">{opt.desc}</span>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPayment === opt.value ? "border-amber-500 bg-amber-500" : "border-amber-700"
                    }`}>
                      {selectedPayment === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button
                disabled={!selectedPayment || !orderType}
                onClick={confirmPayment}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
                  selectedPayment && orderType
                    ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer"
                    : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                }`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating total bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${showFloatingBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="bg-amber-950/95 backdrop-blur-md border-t-2 border-amber-600 shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => totalBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-full max-w-4xl m-auto flex items-center justify-between px-6 py-4 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-amber-950 text-xs font-bold">
                {totalItems}
              </div>
              <span className="text-xs uppercase tracking-widest text-amber-600 font-bold group-hover:text-amber-400">Ver pedido</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5 text-amber-600 -rotate-90">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <div className="flex items-center gap-3">
              {(discount > 0 || taxEnabled) && <span className="text-xs text-amber-700 line-through">${subtotal.toFixed(2)}</span>}
              <span className="text-2xl font-bold text-amber-400">${total.toFixed(2)}</span>
            </div>
          </button>
        </div>
      </div>
      {showFloatingBar && <div className="h-20" />}
    </div>
  );
}