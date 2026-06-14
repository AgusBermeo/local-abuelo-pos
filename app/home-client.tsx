"use client";

import type { SessionPayload } from "../lib/auth/session";

import Header from "./components/header";
import Tabs from "./components/tabs";
import Cobrar from "./components/cobrar/index";
import Ventas from "./components/ventas";
import Inventario from "./components/inventario";

import { useState, useRef } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";

// ── Price tier ────────────────────────────────────────────────────────────────
export type PriceTier = { minQty: number; pricePerUnit: number };
export type TieredPrices = Record<string, PriceTier[]>;

// ── Ingredient ────────────────────────────────────────────────────────────────
export type Ingredient = { id: string; name: string; stock: number };

// ── DrinkSize ─────────────────────────────────────────────────────────────────
export type DrinkSize = { key: string; label: string; price: number; stock: number };

// ── Product ───────────────────────────────────────────────────────────────────
export type Product = {
  id: number;
  name: string;
  category: "Comida" | "Bebida";
  tieredPrices: TieredPrices;
  price?: number;
  sizeLabels: Record<string, string>;
  fillingLabels: Record<string, string>;
  size?: string;
  variantStock?: Record<string, number>;
  ingredientMap?: Record<string, Record<string, number>>;
  drinkSizes?: DrinkSize[];
};

// ── StockEntryLog ─────────────────────────────────────────────────────────────
export type StockEntryLog = {
  id: number;
  date: Date;
  productId: number;
  productName: string;
  variantKey: string;
  variantLabel: string;
  delta: number;
  category: "Comida" | "Bebida";
  doneBy?: { userId: string; displayName: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTierPrice(product: Product, sizeKey: string, qty: number): number {
  const tiers = product.tieredPrices[sizeKey];
  if (!tiers || tiers.length === 0) return product.price ?? 0;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find((t) => qty >= t.minQty);
  return match ? match.pricePerUnit : sorted[sorted.length - 1].pricePerUnit;
}

export function getAvailableSizeKeys(product: Product): Array<{ key: string; label: string }> {
  return Object.entries(product.sizeLabels)
    .filter(([key]) => {
      const tiers = product.tieredPrices[key];
      return tiers && tiers.some((t) => t.pricePerUnit > 0);
    })
    .map(([key, label]) => ({ key, label }));
}

export function getAvailableFillingKeys(product: Product): Array<{ key: string; label: string }> {
  return Object.entries(product.fillingLabels).map(([key, label]) => ({ key, label }));
}

export function getVariantKeys(product: Product): Array<{ variantKey: string; label: string }> {
  const sizes    = getAvailableSizeKeys(product);
  const fillings = getAvailableFillingKeys(product);
  if (fillings.length === 0)
    return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));
  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes)
    for (const f of fillings)
      result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

export function normalizeDrinkSizes(product: Product): Product {
  if (product.category !== "Bebida") return product;
  if (product.drinkSizes && product.drinkSizes.length > 0) return product;
  const label = product.size ?? "Unidad";
  return {
    ...product,
    drinkSizes: [{ key: "default", label, price: product.price ?? 0, stock: 0 }],
  };
}

export function getFoodVariantStock(product: Product, variantKey: string): number | null {
  if (!product.variantStock) return null;
  const s = product.variantStock[variantKey];
  return s !== undefined && s > 0 ? s : null;
}

// ── Deduction types ───────────────────────────────────────────────────────────
export type IngredientDeduction  = { ingredientId: string; quantity: number };
export type DrinkDeduction       = { productId: number; drinkSizeKey: string; quantity: number };
export type FoodVariantDeduction = { productId: number; variantKey: string; quantity: number };

// ── Default products ──────────────────────────────────────────────────────────
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Empanada",
    category: "Comida",
    sizeLabels:    { grande: "Grande", normal: "Normal", bocadito: "Bocadito" },
    fillingLabels: { carne: "Carne", pollo: "Pollo" },
    tieredPrices: {
      grande:   [
        { minQty: 1,  pricePerUnit: 1.75 },
        { minQty: 5,  pricePerUnit: 1.70 },
        { minQty: 10, pricePerUnit: 1.60 },
      ],
      normal:   [
        { minQty: 1,  pricePerUnit: 1.50 },
        { minQty: 5,  pricePerUnit: 1.40 },
      ],
      bocadito: [
        { minQty: 1,  pricePerUnit: 0.60 },
        { minQty: 10, pricePerUnit: 0.55 },
        { minQty: 20, pricePerUnit: 0.50 },
      ],
    },
    ingredientMap: {},
    variantStock: {},
  },
  {
    id: 6, name: "Café Pasado", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "taza", label: "Taza", price: 1.25, stock: 0 }],
  },
  {
    id: 7, name: "Aromática", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "taza", label: "Taza", price: 1.25, stock: 0 }],
  },
  {
    id: 8, name: "Gaseosa", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "500ml", label: "500ml", price: 1.50, stock: 0 }],
  },
  {
    id: 9, name: "Agua sin gas", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "500ml", label: "500ml", price: 1.00, stock: 0 }],
  },
  {
    id: 10, name: "Agua con gas", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "300ml", label: "300ml", price: 1.25, stock: 0 }],
  },
  {
    id: 11, name: "Infusión de frutas deshidratadas", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "taza", label: "Taza", price: 2.50, stock: 0 }],
  },
  {
    id: 12, name: "Cerveza Pilsener", category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {}, ingredientMap: {},
    drinkSizes: [{ key: "350ml", label: "350ml", price: 2.50, stock: 0 }],
  },
];

export type OrderItem     = { name: string; quantity: number; price: number };
export type PaymentMethod = "efectivo" | "transferencia" | "deuna";

export type Sale = {
  id: number; date: Date; items: OrderItem[];
  total: number; status: "pending" | "delivered"; paymentMethod: PaymentMethod;
  tax?: number;
  orderType?: "servir" | "llevar" | "delivery";
  deliveryCost?: number;
  boxesCost?: number;
  scheduledFor?: string;
  deductions?: IngredientDeduction[];
  drinkDeductions?: DrinkDeduction[];
  foodVariantDeductions?: FoodVariantDeduction[];
  soldBy?: { userId: string; displayName: string };
};

export default function HomeClient({ session }: { session: SessionPayload | null }) {
  const [products,     setProducts]     = useLocalStorage<Product[]>      ("abuelo-products",      INITIAL_PRODUCTS);
  const [ingredients,  setIngredients]  = useLocalStorage<Ingredient[]>   ("abuelo-ingredients",   []);
  const [sales,        setSales]        = useLocalStorage<Sale[]>         ("abuelo-sales",         []);
  const [stockEntries, setStockEntries] = useLocalStorage<StockEntryLog[]>("abuelo-stock-entries", []);
  const [activeTab,    setActiveTab]    = useState(0);

  const deliveredRef = useRef<Set<number>>(new Set());

  const userRole           = session?.role ?? "cajero";
  const canManageSales     = userRole === "superadmin" || userRole === "admin";
  const canManageInventory = userRole === "superadmin" || userRole === "admin";

  const pendingCount = sales.filter((s) => s.status === "pending" || !s.status).length;

  const normalizedProducts = products.map((product) => ({
    ...normalizeDrinkSizes({
      ...product,
      tieredPrices:  product.tieredPrices  ?? {},
      sizeLabels:    product.sizeLabels    ?? {},
      fillingLabels: product.fillingLabels ?? {},
      ingredientMap: product.ingredientMap ?? {},
      variantStock:  product.variantStock  ?? {},
    }),
  }));

  // ── Stock deductions ──────────────────────────────────────────────────────

  const applyDrinkDeductions = (deductions: DrinkDeduction[]) => {
    if (!deductions || deductions.length === 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.category !== "Bebida" || !p.drinkSizes) return p;
        const relevant = deductions.filter((d) => d.productId === p.id);
        if (relevant.length === 0) return p;
        const newSizes = p.drinkSizes.map((ds) => {
          const ded = relevant.find((d) => d.drinkSizeKey === ds.key);
          if (!ded) return ds;
          return { ...ds, stock: Math.max(0, ds.stock - ded.quantity) };
        });
        return { ...p, drinkSizes: newSizes };
      })
    );
  };

  const applyFoodVariantDeductions = (deductions: FoodVariantDeduction[]) => {
    if (!deductions || deductions.length === 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.category !== "Comida") return p;
        const relevant = deductions.filter((d) => d.productId === p.id);
        if (relevant.length === 0) return p;
        const newStock = { ...(p.variantStock ?? {}) };
        for (const ded of relevant) {
          if (newStock[ded.variantKey] !== undefined && newStock[ded.variantKey] > 0) {
            newStock[ded.variantKey] = Math.max(0, newStock[ded.variantKey] - ded.quantity);
          }
        }
        return { ...p, variantStock: newStock };
      })
    );
  };

  // ── addSale ───────────────────────────────────────────────────────────────

  const addSale = (
    items: OrderItem[],
    total: number,
    paymentMethod: PaymentMethod,
    foodVariantDeductions: FoodVariantDeduction[],
    drinkDeductions: DrinkDeduction[],
    tax: number = 0,
    orderType: "servir" | "llevar" | "delivery" = "servir",
    deliveryCost: number = 0,
    scheduledFor?: string,
    boxesCost: number = 0,
  ) => {
    const isServir = orderType === "servir";
    setSales((prev) => [
      {
        id: Date.now(),
        date: new Date(),
        items,
        total,
        status: "pending",
        paymentMethod,
        tax,
        orderType,
        deliveryCost: orderType === "delivery" ? deliveryCost : undefined,
        boxesCost: boxesCost > 0 ? boxesCost : undefined,
        scheduledFor: scheduledFor || undefined,
        soldBy: session
          ? { userId: session.userId, displayName: session.displayName }
          : undefined,
        foodVariantDeductions: isServir ? undefined : foodVariantDeductions,
        drinkDeductions:       isServir ? undefined : drinkDeductions,
      },
      ...prev,
    ]);
    if (isServir) {
      applyFoodVariantDeductions(foodVariantDeductions);
      applyDrinkDeductions(drinkDeductions);
    }
  };

  // ── Stock entry log ───────────────────────────────────────────────────────

  const addStockEntries = (entries: Omit<StockEntryLog, "id" | "date">[]) => {
    const now = new Date();
    setStockEntries((prev) => [
      ...entries.map((e) => ({
        ...e,
        id: Date.now() + Math.random(),
        date: now,
        doneBy: session
          ? { userId: session.userId, displayName: session.displayName }
          : undefined,
      })),
      ...prev,
    ]);
  };

  // ── Ingredient CRUD ───────────────────────────────────────────────────────

  const addIngredient    = (ing: Ingredient) => setIngredients((prev) => [...prev, ing]);
  const editIngredient   = (ing: Ingredient) => setIngredients((prev) => prev.map((i) => i.id === ing.id ? ing : i));
  const deleteIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id));

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const addProduct = (p: Partial<Product>) =>
    setProducts((prev) => [
      ...prev,
      ({
        id: p.id ?? Date.now(),
        name: p.name ?? "",
        category: p.category ?? "Comida",
        tieredPrices: p.tieredPrices ?? {},
        price: p.price,
        sizeLabels: p.sizeLabels ?? {},
        fillingLabels: p.fillingLabels ?? {},
        size: p.size,
        variantStock: p.variantStock ?? {},
        ingredientMap: p.ingredientMap ?? {},
        drinkSizes: p.drinkSizes ?? [],
      } as Product),
    ]);
  const editProduct   = (p: Product) => setProducts((prev) => prev.map((x) => x.id === p.id ? p : x));
  const deleteProduct = (id: number) => setProducts((prev) => prev.filter((p) => p.id !== id));

  // ── Sale mutations ────────────────────────────────────────────────────────

  const deleteSale = (id: number) => setSales((prev) => prev.filter((s) => s.id !== id));

  const checkStockForSale = (sale: Sale): string | null => {
    const errors: string[] = [];

    for (const ded of sale.foodVariantDeductions ?? []) {
      const product = products.find((p) => p.id === ded.productId);
      if (!product) continue;
      const current = product.variantStock?.[ded.variantKey] ?? 0;
      if (current === 0) continue;
      if (current < ded.quantity) {
        const parts = ded.variantKey.split("-");
        const sizeLabel = product.sizeLabels?.[parts[0]] ?? parts[0];
        const fillingLabel = parts[1] && parts[1] !== "none"
          ? (product.fillingLabels?.[parts[1]] ?? parts[1])
          : null;
        const variantLabel = fillingLabel ? `${sizeLabel} · ${fillingLabel}` : sizeLabel;
        errors.push(`${product.name} ${variantLabel}: stock ${current}, necesita ${ded.quantity}`);
      }
    }

    for (const ded of sale.drinkDeductions ?? []) {
      const product = products.find((p) => p.id === ded.productId);
      if (!product || product.category !== "Bebida") continue;
      const ds = product.drinkSizes?.find((d) => d.key === ded.drinkSizeKey);
      if (!ds || ds.stock === 0) continue;
      if (ds.stock < ded.quantity) {
        errors.push(`${product.name} ${ds.label}: stock ${ds.stock}, necesita ${ded.quantity}`);
      }
    }

    if (errors.length === 0) return null;
    return errors.join("\n");
  };

  const markDelivered = (id: number): string | null => {
    if (deliveredRef.current.has(id)) {
      setSales((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "delivered", foodVariantDeductions: undefined, drinkDeductions: undefined }
            : s
        )
      );
      return null;
    }

    const sale = sales.find((s) => s.id === id);

    if (sale?.orderType === "llevar" || sale?.orderType === "delivery") {
      const error = checkStockForSale(sale);
      if (error) return error;
      deliveredRef.current.add(id);
      if (sale.foodVariantDeductions?.length) applyFoodVariantDeductions(sale.foodVariantDeductions);
      if (sale.drinkDeductions?.length)       applyDrinkDeductions(sale.drinkDeductions);
    } else {
      deliveredRef.current.add(id);
    }

    setSales((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "delivered", foodVariantDeductions: undefined, drinkDeductions: undefined }
          : s
      )
    );
    return null;
  };

  const unmarkDelivered = (id: number) => {
    deliveredRef.current.delete(id);
    setSales((prev) => prev.map((s) => s.id === id ? { ...s, status: "pending" } : s));
  };

  const editSale = (id: number, date: Date, paymentMethod: PaymentMethod) =>
    setSales((prev) => prev.map((s) => s.id === id ? { ...s, date, paymentMethod } : s));

  // ── Derived ───────────────────────────────────────────────────────────────

  const foodProducts  = normalizedProducts.filter((p) => p.category === "Comida");
  const drinkProducts = normalizedProducts.filter((p) => p.category === "Bebida");

  const handleBellClick = () => setActiveTab(1);

  const TABS = [
    {
      label: "🛒 Cobrar",
      content: (
        <Cobrar
          foodProducts={foodProducts}
          drinkProducts={drinkProducts}
          ingredients={ingredients}
          onSaleComplete={addSale}
        />
      ),
    },
    {
      label: "📋 Ventas",
      content: (
        <Ventas
          sales={sales}
          onDelete={canManageSales ? deleteSale : undefined}
          onMarkDelivered={markDelivered}
          onUnmarkDelivered={unmarkDelivered}
          onEdit={canManageSales ? editSale : undefined}
          readOnly={!canManageSales}
        />
      ),
    },
    {
      label: "📦 Inventario",
      content: (
        <Inventario
          products={normalizedProducts}
          onAddProduct={canManageInventory ? addProduct : undefined}
          onDeleteProduct={canManageInventory ? deleteProduct : undefined}
          onEditProduct={canManageInventory ? editProduct : undefined}
          onLogStockEntry={canManageInventory ? addStockEntries : undefined}
          readOnly={!canManageInventory}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-dvh font-sans bg-amber-950/60">
      <Header
        session={session}
        pendingCount={pendingCount}
        onBellClick={handleBellClick}
      />
      <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex justify-center w-full md:px-6 px-3 pt-6 pb-4">
        {TABS[activeTab].content}
      </div>
    </div>
  );
}