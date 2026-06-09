// app/components/cobrar/index.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import {
  getTierPrice,
  getAvailableFillingKeys,
  type Product,
  type Ingredient,
  type FoodVariantDeduction,
  type DrinkDeduction,
  type PaymentMethod,
} from "../../home-client";

import type { CartEntry, OrderType, BoxEntry } from "./types";
import { makeCartKey, variantKeyStr, totalBoxesCost } from "./types";
import type { SavedOrder } from "./savedOrders";
import { createSavedOrder, updateSavedOrder } from "./savedOrders";

import FoodProductCard    from "./FoodProductCard";
import DrinkProductCard   from "./DrinkProductCard";
import CartSummary        from "./CartSummary";
import PaymentModal       from "./PaymentModal";
import FloatingTotalBar   from "./FloatingTotalBar";
import SaveOrderModal     from "./SaveOrderModal";
import SavedOrdersDrawer  from "./SavedOrdersDrawer";

// ── Helpers de stock ──────────────────────────────────────────────────────────

function getFoodVariantCap(
  product: Product,
  sizeKey: string,
  fillingKey: string,
): number | null {
  const vk    = variantKeyStr(sizeKey, fillingKey);
  const stock = product.variantStock?.[vk];
  return stock !== undefined ? stock : null;
}

function getDrinkEffectiveCapacity(drinkStock: number): number | null {
  if (drinkStock === 0) return null;
  return drinkStock;
}

// ── Tipos de venta ────────────────────────────────────────────────────────────

type SaleItem = { name: string; quantity: number; price: number };

// ── Props del componente ──────────────────────────────────────────────────────

type Props = {
  foodProducts: Product[];
  drinkProducts: Product[];
  ingredients: Ingredient[];
  onSaleComplete: (
    items: SaleItem[],
    total: number,
    paymentMethod: PaymentMethod,
    foodVariantDeductions: FoodVariantDeduction[],
    drinkDeductions: DrinkDeduction[],
    tax: number,
    orderType: "servir" | "llevar" | "delivery",
    deliveryCost: number,
    scheduledFor?: string,
    boxesCost?: number,
  ) => void;
};

// ── Helpers localStorage para pedidos guardados ───────────────────────────────

const SAVED_ORDERS_KEY = "abuelo-saved-orders";

function loadSavedOrders(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedOrders(orders: SavedOrder[]): void {
  try {
    window.localStorage.setItem(SAVED_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // silently ignore
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Cobrar({
  foodProducts,
  drinkProducts,
  onSaleComplete,
}: Props) {
  // ── Estado del carrito ───────────────────────────────────────────────────────

  const [cart,              setCart]              = useState<CartEntry[]>([]);
  const [discount,          setDiscount]          = useState(0);
  const [showDiscount,      setShowDiscount]      = useState(false);
  const [taxEnabled,        setTaxEnabled]        = useState(false);
  const [taxRate,           setTaxRate]           = useState(15);
  const [taxRateInput,      setTaxRateInput]      = useState("15");
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [selectedPayment,   setSelectedPayment]   = useState<PaymentMethod | null>(null);
  const [orderType,         setOrderType]         = useState<OrderType | null>(null);
  const [deliveryCost,      setDeliveryCost]      = useState(0);
  const [deliveryCostInput, setDeliveryCostInput] = useState("");
  const [scheduledFor,      setScheduledFor]      = useState("");
  const [boxes,             setBoxes]             = useState<BoxEntry[]>([]);

  const [selectedFilling, setSelectedFilling] = useState<Record<number, string>>({});

  // ── Estado de pedidos guardados ──────────────────────────────────────────────

  const [savedOrders,   setSavedOrders]   = useState<SavedOrder[]>(() => loadSavedOrders());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDrawer,    setShowDrawer]    = useState(false);

  useEffect(() => {
    persistSavedOrders(savedOrders);
  }, [savedOrders]);

  // ── Intersection Observer para barra flotante ────────────────────────────────

  const totalBlockRef    = useRef<HTMLDivElement>(null);
  const [isTotalVisible, setIsTotalVisible] = useState(false);

  useEffect(() => {
    const el = totalBlockRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsTotalVisible(e.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Productos combinados ─────────────────────────────────────────────────────

  const allProducts = [...foodProducts, ...drinkProducts];

  // ── Mutaciones del carrito ───────────────────────────────────────────────────

  const setQty = useCallback(
    (product: Product, sizeKey: string, fillingKey: string, newQty: number) => {
      const key = makeCartKey(product.id, sizeKey, fillingKey);
      if (newQty <= 0) {
        setCart((prev) => prev.filter((e) => e.key !== key));
        return;
      }

      let capped = newQty;

      if (product.category === "Comida") {
        const cap = getFoodVariantCap(product, sizeKey, fillingKey);
        if (cap !== null) capped = Math.min(newQty, cap);
      } else {
        const ds = product.drinkSizes?.find((d) => d.key === sizeKey);
        if (ds) {
          const cap = getDrinkEffectiveCapacity(ds.stock);
          if (cap !== null) capped = Math.min(newQty, cap);
        }
      }

      setCart((prev) => {
        const ex = prev.find((e) => e.key === key);
        if (ex) return prev.map((e) => e.key === key ? { ...e, quantity: capped } : e);
        return [...prev, { key, productId: product.id, sizeKey, fillingKey, quantity: capped }];
      });
    },
    [cart],
  );

  const increment = useCallback(
    (product: Product, sizeKey: string, fillingKey: string) => {
      const key     = makeCartKey(product.id, sizeKey, fillingKey);
      const current = cart.find((e) => e.key === key)?.quantity ?? 0;

      if (product.category === "Comida") {
        const cap = getFoodVariantCap(product, sizeKey, fillingKey);
        if (cap !== null && current >= cap) return;
      } else {
        const ds = product.drinkSizes?.find((d) => d.key === sizeKey);
        if (ds) {
          const cap = getDrinkEffectiveCapacity(ds.stock);
          if (cap !== null && current >= cap) return;
        }
      }

      setCart((prev) => {
        const ex = prev.find((e) => e.key === key);
        if (ex) return prev.map((e) => e.key === key ? { ...e, quantity: e.quantity + 1 } : e);
        return [...prev, { key, productId: product.id, sizeKey, fillingKey, quantity: 1 }];
      });
    },
    [cart],
  );

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

  // ── Totales derivados ────────────────────────────────────────────────────────

  const sizeTotals: Record<string, number> = {};
  for (const entry of cart) {
    const k = `${entry.productId}::${entry.sizeKey}`;
    sizeTotals[k] = (sizeTotals[k] ?? 0) + entry.quantity;
  }

  const getEntryPrice = useCallback(
    (entry: CartEntry): number => {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product) return 0;
      if (product.category === "Bebida") {
        const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
        return ds ? ds.price : (product.price ?? 0);
      }
      if (!product.tieredPrices[entry.sizeKey]) return product.price ?? 0;
      const totalQtyForSize = sizeTotals[`${product.id}::${entry.sizeKey}`] ?? entry.quantity;
      return getTierPrice(product, entry.sizeKey, totalQtyForSize);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, allProducts],
  );

  const getOrderTotal = useCallback(
    (orderCart: CartEntry[]): number => {
      return orderCart.reduce((sum, entry) => {
        const product = allProducts.find((p) => p.id === entry.productId);
        if (!product) return sum;
        let price = 0;
        if (product.category === "Bebida") {
          const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
          price = ds ? ds.price : (product.price ?? 0);
        } else {
          const tiers = product.tieredPrices[entry.sizeKey];
          if (tiers) price = getTierPrice(product, entry.sizeKey, entry.quantity);
          else price = product.price ?? 0;
        }
        return sum + price * entry.quantity;
      }, 0);
    },
    [allProducts],
  );

  // ── Empanadas en el carrito (nivel componente para pasarlo al modal) ──────────

  const empanadasCount = cart
    .filter((e) => {
      const p = allProducts.find((x) => x.id === e.productId);
      return p?.name.toLowerCase().includes("empanada");
    })
    .reduce((s, e) => s + e.quantity, 0);

  const subtotal       = cart.reduce((s, e) => s + getEntryPrice(e) * e.quantity, 0);
  const discountAmount = Math.min(discount, subtotal);
  const afterDiscount  = subtotal - discountAmount;
  const taxAmount      = taxEnabled ? afterDiscount * (taxRate / 100) : 0;
  const effectiveDeliveryCost = orderType === "delivery" ? deliveryCost : 0;
  const boxesCost      = totalBoxesCost(boxes);
  const total          = afterDiscount + taxAmount + effectiveDeliveryCost + boxesCost;
  const totalItems     = cart.reduce((s, e) => s + e.quantity, 0);

  // ── Guardar pedido ───────────────────────────────────────────────────────────

  const handleSaveOrder = (name: string, note?: string) => {
    if (activeOrderId) {
      setSavedOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? updateSavedOrder(o, cart, discount, taxEnabled, taxRate)
            : o
        )
      );
    } else {
      const newOrder = createSavedOrder(name, cart, discount, taxEnabled, taxRate, note);
      setSavedOrders((prev) => [newOrder, ...prev]);
      setActiveOrderId(newOrder.id);
    }
  };

  const handleLoadOrder = (order: SavedOrder) => {
    setCart(order.cart);
    setDiscount(order.discount);
    setShowDiscount(order.discount > 0);
    setTaxEnabled(order.taxEnabled);
    setTaxRate(order.taxRate);
    setTaxRateInput(String(order.taxRate));
    setActiveOrderId(order.id);
    setSelectedFilling({});
  };

  const handleDeleteSavedOrder = (id: string) => {
    setSavedOrders((prev) => prev.filter((o) => o.id !== id));
    if (activeOrderId === id) setActiveOrderId(null);
  };

  // ── Confirmar venta ──────────────────────────────────────────────────────────

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
        const fillingLabel =
          entry.fillingKey !== "none"
            ? (product?.fillingLabels[entry.fillingKey] ?? entry.fillingKey)
            : null;
        name = [product?.name ?? "", sizeLabel, fillingLabel].filter(Boolean).join(" ");
      }
      return { name, quantity: entry.quantity, price: getEntryPrice(entry) };
    });

    const foodVariantDeductions: FoodVariantDeduction[] = [];
    for (const entry of cart) {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product || product.category !== "Comida") continue;
      const vk  = variantKeyStr(entry.sizeKey, entry.fillingKey);
      const cap = getFoodVariantCap(product, entry.sizeKey, entry.fillingKey);
      if (cap === null) continue;
      foodVariantDeductions.push({ productId: product.id, variantKey: vk, quantity: entry.quantity });
    }

    const drinkDeductions: DrinkDeduction[] = [];
    for (const entry of cart) {
      const product = allProducts.find((p) => p.id === entry.productId);
      if (!product || product.category !== "Bebida") continue;
      const ds = product.drinkSizes?.find((d) => d.key === entry.sizeKey);
      if (!ds || ds.stock === 0) continue;
      drinkDeductions.push({ productId: product.id, drinkSizeKey: entry.sizeKey, quantity: entry.quantity });
    }

    onSaleComplete(
      saleItems,
      total,
      selectedPayment,
      foodVariantDeductions,
      drinkDeductions,
      taxEnabled ? taxAmount : 0,
      orderType,
      orderType === "delivery" ? deliveryCost : 0,
      scheduledFor || undefined,
      boxesCost,
    );

    if (activeOrderId) {
      setSavedOrders((prev) => prev.filter((o) => o.id !== activeOrderId));
      setActiveOrderId(null);
    }

    // Reset
    setCart([]);
    setSelectedFilling({});
    setDiscount(0);
    setShowDiscount(false);
    setTaxEnabled(false);
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setOrderType(null);
    setDeliveryCost(0);
    setDeliveryCostInput("");
    setScheduledFor("");
    setBoxes([]);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedFilling({});
    setDiscount(0);
    setShowDiscount(false);
    setTaxEnabled(false);
    setOrderType(null);
    setDeliveryCost(0);
    setDeliveryCostInput("");
    setScheduledFor("");
    setActiveOrderId(null);
    setBoxes([]);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const showFloatingBar = total > 0 && !isTotalVisible;
  const activeOrder     = savedOrders.find((o) => o.id === activeOrderId) ?? null;
  const cartHasItems    = cart.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">

      {activeOrder && (
        <div className="flex items-center gap-3 bg-amber-900/30 border-2 border-amber-600 rounded-xl px-4 py-3">
          <span className="text-base leading-none shrink-0">📋</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300 truncate">
              Editando: <span className="text-amber-400">{activeOrder.name}</span>
            </p>
            {activeOrder.note && (
              <p className="text-[10px] text-amber-700 italic truncate">"{activeOrder.note}"</p>
            )}
          </div>
          <button
            onClick={() => setActiveOrderId(null)}
            className="text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-500 border border-amber-800 hover:border-amber-600 rounded-lg px-2.5 py-1 cursor-pointer transition-colors shrink-0"
          >
            Desanclar
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowDrawer(true)}
          className="relative flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Pedidos guardados
          {savedOrders.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-amber-950 text-[10px] font-black px-1 leading-none">
              {savedOrders.length}
            </span>
          )}
        </button>
      </div>

      {foodProducts.length > 0 && (
        <>
          <h3 className="uppercase text-amber-500 font-bold text-sm">Comida</h3>
          <div className="grid grid-cols-6 gap-3">
            {foodProducts.map((p) => (
              <FoodProductCard
                key={p.id}
                product={p}
                cart={cart}
                sizeTotals={sizeTotals}
                selectedFilling={selectedFilling[p.id] ?? null}
                onSelectFilling={(fk) =>
                  setSelectedFilling((prev) => ({ ...prev, [p.id]: fk }))
                }
                onIncrement={increment}
                onDecrement={decrement}
                onSetQty={setQty}
              />
            ))}
          </div>
        </>
      )}

      {drinkProducts.length > 0 && (
        <>
          <h3 className="uppercase text-amber-500 font-bold text-sm">Bebidas</h3>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
            {drinkProducts.map((p) => (
              <DrinkProductCard
                key={p.id}
                product={p}
                cart={cart}
                onIncrement={increment}
                onDecrement={decrement}
                onSetQty={setQty}
              />
            ))}
          </div>
        </>
      )}

      <CartSummary
        cart={cart}
        allProducts={allProducts}
        totalBlockRef={totalBlockRef}
        getEntryPrice={getEntryPrice}
        discount={discount}
        discountAmount={discountAmount}
        showDiscount={showDiscount}
        onToggleDiscount={() => {
          setShowDiscount((v) => !v);
          if (showDiscount) setDiscount(0);
        }}
        onChangeDiscount={setDiscount}
        taxEnabled={taxEnabled}
        taxRate={taxRate}
        taxRateInput={taxRateInput}
        taxAmount={taxAmount}
        afterDiscount={afterDiscount}
        onToggleTax={() => setTaxEnabled((v) => !v)}
        onChangeTaxRateInput={setTaxRateInput}
        onChangeTaxRate={setTaxRate}
        effectiveDeliveryCost={effectiveDeliveryCost}
        boxesCost={boxesCost}
        subtotal={subtotal}
        total={total}
        onDecrement={decrement}
        onIncrement={increment}
        onRemoveEntry={removeEntry}
        onClearCart={clearCart}
        onOpenPaymentModal={() => {
          setSelectedPayment(null);
          setOrderType(null);
          setDeliveryCost(0);
          setDeliveryCostInput("");
          setScheduledFor("");
          setShowPaymentModal(true);
        }}
        hasItemsInCart={cartHasItems}
        activeOrderId={activeOrderId}
        onSaveOrder={() => setShowSaveModal(true)}
      />

      {showPaymentModal && (
        <PaymentModal
          total={total}
          afterDiscount={afterDiscount}
          taxAmount={taxAmount}
          orderType={orderType}
          onSelectOrderType={(type) => {
            setOrderType(type);
            if (type !== "delivery") {
              setDeliveryCost(0);
              setDeliveryCostInput("");
            }
            if (type === "servir") setScheduledFor("");
          }}
          deliveryCost={deliveryCost}
          deliveryCostInput={deliveryCostInput}
          onChangeDeliveryCostInput={setDeliveryCostInput}
          onChangeDeliveryCost={setDeliveryCost}
          scheduledFor={scheduledFor}
          onChangeScheduledFor={setScheduledFor}
          selectedPayment={selectedPayment}
          onSelectPayment={setSelectedPayment}
          onCancel={() => setShowPaymentModal(false)}
          onConfirm={confirmPayment}
          empanadasCount={empanadasCount}
          boxes={boxes}
          onChangeBoxes={setBoxes}
        />
      )}

      {showSaveModal && (
        <SaveOrderModal
          existingName={activeOrder?.name}
          onClose={() => setShowSaveModal(false)}
          onConfirm={handleSaveOrder}
        />
      )}

      {showDrawer && (
        <SavedOrdersDrawer
          orders={savedOrders}
          activeOrderId={activeOrderId}
          getOrderTotal={getOrderTotal}
          onLoad={handleLoadOrder}
          onDelete={handleDeleteSavedOrder}
          onClose={() => setShowDrawer(false)}
        />
      )}

      <FloatingTotalBar
        visible={showFloatingBar}
        totalItems={totalItems}
        subtotal={subtotal}
        total={total}
        hasModifiers={discount > 0 || taxEnabled || effectiveDeliveryCost > 0 || boxesCost > 0}
        onScrollToTotal={() =>
          totalBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      />

      {showFloatingBar && <div className="h-20" />}
    </div>
  );
}