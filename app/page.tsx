"use client";

import Header from "./components/header";
import Tabs from "./components/tabs";
import Cobrar from "./components/cobrar";
import Ventas from "./components/ventas";
import Inventario from "./components/inventario";

import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";

export type FoodSizes  = { grande: number; normal: number; bocadito: number };
export type DrinkSizes = Record<string, { label: string; price: number }>;

// ── Ingredient (global stock pool) ──────────────────────────────────────────
export type Ingredient = {
  id: string;
  name: string;
  stock: number;
};

// ── Product ──────────────────────────────────────────────────────────────────
// ingredientMap: variantKey → { ingredientId → quantity consumed per unit sold }
// e.g. "normal-carne" → { "ing_normal": 3, "ing_carne": 3 }  (bandeja de 3)
export type Product = {
  id: number;
  name: string;
  category: "Comida" | "Bebida";
  price: number | FoodSizes | DrinkSizes;
  size: string | { grande: string; normal: string; bocadito: string };
  relleno?: { carne: string; pollo: string } | null;
  ingredientMap: Record<string, Record<string, number>>;
};

export function isFoodSizes(price: Product["price"]): price is FoodSizes {
  return typeof price === "object" && "grande" in price && typeof (price as FoodSizes).grande === "number";
}
export function isDrinkSizes(price: Product["price"]): price is DrinkSizes {
  if (typeof price !== "object" || "grande" in price) return false;
  const vals = Object.values(price as DrinkSizes);
  return vals.length > 0 && typeof vals[0] === "object" && "label" in vals[0];
}

export function getAvailableSizeKeys(product: Product): Array<{ key: string; label: string }> {
  if (isFoodSizes(product.price)) {
    const sizeObj = product.size as Record<string, string>;
    return Object.entries(product.price as FoodSizes).filter(([, p]) => p > 0).map(([k]) => ({ key: k, label: sizeObj[k] ?? k }));
  }
  if (isDrinkSizes(product.price))
    return Object.entries(product.price as DrinkSizes).filter(([, { price }]) => price > 0).map(([k, { label }]) => ({ key: k, label }));
  return [{ key: "single", label: product.size as string }];
}
export function getAvailableFillingKeys(product: Product): Array<{ key: string; label: string }> {
  if (!product.relleno) return [];
  return Object.entries(product.relleno).map(([key, label]) => ({ key, label }));
}
export function getVariantKeys(product: Product): Array<{ variantKey: string; label: string }> {
  const sizes    = getAvailableSizeKeys(product);
  const fillings = getAvailableFillingKeys(product);
  if (fillings.length === 0)
    return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));
  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes) for (const f of fillings)
    result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

// ── Deduction: ingredientId → total quantity to subtract ────────────────────
export type IngredientDeduction = { ingredientId: string; quantity: number };

const INITIAL_PRODUCTS: Product[] = [
  { id: 1,  name: "Empanada",                price: { grande: 1.75, normal: 1.5, bocadito: 0.6 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" }, relleno: { carne: "Carne", pollo: "Pollo" }, ingredientMap: {} },
  { id: 2,  name: "Bandeja de 3 empanadas",  price: { grande: 5.25, normal: 4.5, bocadito: 0 },   category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" }, relleno: { carne: "Carne", pollo: "Pollo" }, ingredientMap: {} },
  { id: 3,  name: "Bandeja de 5 empanadas",  price: { grande: 8.5,  normal: 7,   bocadito: 3 },   category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" }, relleno: { carne: "Carne", pollo: "Pollo" }, ingredientMap: {} },
  { id: 4,  name: "Bandeja de 10 empanadas", price: { grande: 16,   normal: 14,  bocadito: 5.5 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" }, relleno: { carne: "Carne", pollo: "Pollo" }, ingredientMap: {} },
  { id: 5,  name: "Bandeja de 20 empanadas", price: { grande: 0,    normal: 0,   bocadito: 10 },  category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" }, relleno: { carne: "Carne", pollo: "Pollo" }, ingredientMap: {} },
  { id: 6,  name: "Café Pasado",             price: 1.25, category: "Bebida", size: "Taza",   ingredientMap: {} },
  { id: 7,  name: "Aromática",               price: 1.25, category: "Bebida", size: "Taza",   ingredientMap: {} },
  { id: 8,  name: "Gaseosa",                 price: 1.50, category: "Bebida", size: "500ml",  ingredientMap: {} },
  { id: 9,  name: "Agua sin gas",            price: 1,    category: "Bebida", size: "500ml",  ingredientMap: {} },
  { id: 10, name: "Agua con gas",            price: 1.25, category: "Bebida", size: "300ml",  ingredientMap: {} },
  { id: 11, name: "Infusión de frutas deshidratadas", price: 2.5, category: "Bebida", size: "Taza", ingredientMap: {} },
  { id: 12, name: "Cerveza Pilsener",        price: 2.5,  category: "Bebida", size: "350ml",  ingredientMap: {} },
];

export type OrderItem = { name: string; quantity: number; price: number };
export type PaymentMethod = "efectivo" | "transferencia" | "deuna";
export type Sale = {
  id: number; date: Date; items: OrderItem[];
  total: number; status: "pending" | "delivered"; paymentMethod: PaymentMethod;
};

export default function Home() {
  const [products,    setProducts]    = useLocalStorage<Product[]>   ('abuelo-products',    INITIAL_PRODUCTS);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('abuelo-ingredients', []);
  const [sales,       setSales]       = useLocalStorage<Sale[]>       ('abuelo-sales',       []);
  const [activeTab,   setActiveTab]   = useState(0);

  const addSale = (
    items: OrderItem[],
    total: number,
    paymentMethod: PaymentMethod,
    deductions: IngredientDeduction[]
  ) => {
    setSales((prev) => [{ id: Date.now(), date: new Date(), items, total, status: "pending", paymentMethod }, ...prev]);
    if (deductions.length > 0) {
      // Aggregate by ingredientId across all order items
      const agg: Record<string, number> = {};
      deductions.forEach(({ ingredientId, quantity }) => {
        agg[ingredientId] = (agg[ingredientId] ?? 0) + quantity;
      });
      setIngredients((prev) =>
        prev.map((ing) =>
          agg[ing.id] !== undefined ? { ...ing, stock: Math.max(0, ing.stock - agg[ing.id]) } : ing
        )
      );
    }
  };

  const addIngredient    = (ing: Ingredient) => setIngredients((prev) => [...prev, ing]);
  const editIngredient   = (ing: Ingredient) => setIngredients((prev) => prev.map((i) => i.id === ing.id ? ing : i));
  const deleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setProducts((prev) => prev.map((p) => {
      const newMap: Record<string, Record<string, number>> = {};
      Object.entries(p.ingredientMap).forEach(([vk, qty]) => {
        const filtered: Record<string, number> = {};
        Object.entries(qty).forEach(([iid, q]) => { if (iid !== id) filtered[iid] = q; });
        newMap[vk] = filtered;
      });
      return { ...p, ingredientMap: newMap };
    }));
  };

  const addProduct    = (p: Product) => setProducts((prev) => [...prev, p]);
  const editProduct   = (p: Product) => setProducts((prev) => prev.map((x) => x.id === p.id ? p : x));
  const deleteProduct = (id: number) => setProducts((prev) => prev.filter((p) => p.id !== id));

  const deleteSale      = (id: number) => setSales((prev) => prev.filter((s) => s.id !== id));
  const markDelivered   = (id: number) => setSales((prev) => prev.map((s) => s.id === id ? { ...s, status: "delivered" } : s));
  const unmarkDelivered = (id: number) => setSales((prev) => prev.map((s) => s.id === id ? { ...s, status: "pending"   } : s));
  const editSale = (id: number, date: Date, paymentMethod: PaymentMethod) =>
  setSales((prev) =>
    prev.map((s) => s.id === id ? { ...s, date, paymentMethod } : s)
  );

  const foodProducts  = products.filter((p) => p.category === "Comida");
  const drinkProducts = products.filter((p) => p.category === "Bebida");

  const TABS = [
    {
      label: "🛒 Cobrar",
      content: <Cobrar foodProducts={foodProducts} drinkProducts={drinkProducts} ingredients={ingredients} onSaleComplete={addSale} />,
    },
    {
      label: "📋 Ventas",
      content: <Ventas sales={sales} onDelete={deleteSale} onMarkDelivered={markDelivered} onUnmarkDelivered={unmarkDelivered} onEdit={editSale} />,
    },
    {
      label: "📦 Inventario",
      content: (
        <Inventario
          products={products} ingredients={ingredients}
          onAddProduct={addProduct} onDeleteProduct={deleteProduct} onEditProduct={editProduct}
          onAddIngredient={addIngredient} onEditIngredient={editIngredient} onDeleteIngredient={deleteIngredient}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-dvh bg-amber-950/60 font-sans">
      <Header />
      <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex justify-center w-full md:px-6 px-3 pt-6 pb-4">
        {TABS[activeTab].content}
      </div>
    </div>
  );
}