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

// ── Ingredient (kept for legacy compatibility, no longer used for food stock) ─
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
  /** Food only: stock per variant key ("grande-carne": 20). 0 = untracked */
  variantStock?: Record<string, number>;
  /** @deprecated use variantStock for food */
  ingredientMap?: Record<string, Record<string, number>>;
  // Bebidas: multiple presentations with individual stock
  drinkSizes?: DrinkSize[];
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

/** Normalize a drink product: if it has legacy price/size fields but no drinkSizes, create one. */
export function normalizeDrinkSizes(product: Product): Product {
  if (product.category !== "Bebida") return product;
  if (product.drinkSizes && product.drinkSizes.length > 0) return product;
  const label = product.size ?? "Unidad";
  return {
    ...product,
    drinkSizes: [{ key: "default", label, price: product.price ?? 0, stock: 0 }],
  };
}

/** Get stock for a food variant. Returns null if untracked (no variantStock or 0). */
export function getFoodVariantStock(product: Product, variantKey: string): number | null {
  if (!product.variantStock) return null;
  const s = product.variantStock[variantKey];
  return s !== undefined && s > 0 ? s : null;
}

// ── Deduction types ───────────────────────────────────────────────────────────
/** @deprecated no longer used for food */
export type IngredientDeduction = { ingredientId: string; quantity: number };

/** Drink size deductions */
export type DrinkDeduction = { productId: number; drinkSizeKey: string; quantity: number };

/** Food variant deductions */
export type FoodVariantDeduction = { productId: number; variantKey: string; quantity: number };

// ── Default products ──────────────────────────────────────────────────────────
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Empanada",
    category: "Comida",
    sizeLabels:   { grande: "Grande", normal: "Normal", bocadito: "Bocadito" },
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
    drinkSizes: [
      { key: "500ml", label: "500ml", price: 1.50, stock: 0 },
    ],
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

export type OrderItem = { name: string; quantity: number; price: number };
export type PaymentMethod = "efectivo" | "transferencia" | "deuna";

export type Sale = {
  id: number; date: Date; items: OrderItem[];
  total: number; status: "pending" | "delivered"; paymentMethod: PaymentMethod;
  tax?: number;
  orderType?: "servir" | "llevar" | "delivery";
  deliveryCost?: number;
  /** @deprecated */
  deductions?: IngredientDeduction[];
  drinkDeductions?: DrinkDeduction[];
  foodVariantDeductions?: FoodVariantDeduction[];
  soldBy?: { userId: string; displayName: string };
};

export default function HomeClient({ session }: { session: SessionPayload | null }) {
  const [products,    setProducts]    = useLocalStorage<Product[]>   ("abuelo-products",    INITIAL_PRODUCTS);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>("abuelo-ingredients", []);
  const [sales,       setSales]       = useLocalStorage<Sale[]>      ("abuelo-sales",       []);
  const [activeTab,   setActiveTab]   = useState(0);

  const deliveredRef = useRef<Set<number>>(new Set());

  const userRole = session?.role ?? "cajero";
  const canManageSales = userRole === "superadmin" || userRole === "admin";
  const canManageInventory = userRole === "superadmin" || userRole === "admin";

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

  // ── applyDrinkDeductions ──────────────────────────────────────────────────
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

  // ── applyFoodVariantDeductions ────────────────────────────────────────────
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
    deliveryCost: number = 0
  ) => {
    const isServir = orderType === "servir" || orderType === "delivery";

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

  const addIngredient    = (ing: Ingredient) => setIngredients((prev) => [...prev, ing]);
  const editIngredient   = (ing: Ingredient) => setIngredients((prev) => prev.map((i) => i.id === ing.id ? ing : i));
  const deleteIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id));

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

  const deleteSale = (id: number) => setSales((prev) => prev.filter((s) => s.id !== id));

  // ── markDelivered ─────────────────────────────────────────────────────────
  const markDelivered = (id: number) => {
    if (deliveredRef.current.has(id)) {
      setSales((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "delivered", foodVariantDeductions: undefined, drinkDeductions: undefined }
            : s
        )
      );
      return;
    }
    deliveredRef.current.add(id);

    const sale = sales.find((s) => s.id === id);

    if (sale?.orderType === "llevar") {
      if (sale.foodVariantDeductions && sale.foodVariantDeductions.length > 0) {
        applyFoodVariantDeductions(sale.foodVariantDeductions);
      }
      if (sale.drinkDeductions && sale.drinkDeductions.length > 0) {
        applyDrinkDeductions(sale.drinkDeductions);
      }
    }

    setSales((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "delivered", foodVariantDeductions: undefined, drinkDeductions: undefined }
          : s
      )
    );
  };

  const unmarkDelivered = (id: number) => {
    deliveredRef.current.delete(id);
    setSales((prev) => prev.map((s) => s.id === id ? { ...s, status: "pending" } : s));
  };

  const editSale = (id: number, date: Date, paymentMethod: PaymentMethod) =>
    setSales((prev) => prev.map((s) => s.id === id ? { ...s, date, paymentMethod } : s));

  const foodProducts  = normalizedProducts.filter((p) => p.category === "Comida");
  const drinkProducts = normalizedProducts.filter((p) => p.category === "Bebida");

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
          readOnly={!canManageInventory}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-dvh font-sans bg-amber-950/60">
      <Header session={session} />
      <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex justify-center w-full md:px-6 px-3 pt-6 pb-4">
        {TABS[activeTab].content}
      </div>
    </div>
  );
}