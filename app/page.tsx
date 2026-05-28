"use client";

import Header from "./components/header";
import Tabs from "./components/tabs";
import Cobrar from "./components/cobrar";
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
  ingredientMap: Record<string, Record<string, number>>;
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
  // Migrate legacy single-size drink
  const label = product.size ?? "Unidad";
  return {
    ...product,
    drinkSizes: [{ key: "default", label, price: product.price ?? 0, stock: 0 }],
  };
}

export type IngredientDeduction = { ingredientId: string; quantity: number };

/** Drink size deductions: each sold unit reduces that drinkSize's stock by 1 */
export type DrinkDeduction = { productId: number; drinkSizeKey: string; quantity: number };

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
      { key: "1l",    label: "1L",    price: 2.50, stock: 0 },
      { key: "2l",    label: "2L",    price: 4.00, stock: 0 },
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
  orderType?: "servir" | "llevar";
  deductions?: IngredientDeduction[];
  drinkDeductions?: DrinkDeduction[];
};

export default function Home() {
  const [products,    setProducts]    = useLocalStorage<Product[]>   ("abuelo-products",    INITIAL_PRODUCTS);
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>("abuelo-ingredients", []);
  const [sales,       setSales]       = useLocalStorage<Sale[]>      ("abuelo-sales",       []);
  const [activeTab,   setActiveTab]   = useState(0);

  const deliveredRef = useRef<Set<number>>(new Set());

  const normalizedProducts = products.map((product) => ({
    ...normalizeDrinkSizes({
      ...product,
      tieredPrices:  product.tieredPrices  ?? {},
      sizeLabels:    product.sizeLabels    ?? {},
      fillingLabels: product.fillingLabels ?? {},
      ingredientMap: product.ingredientMap ?? {},
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

  // ── addSale ───────────────────────────────────────────────────────────────
  const addSale = (
    items: OrderItem[],
    total: number,
    paymentMethod: PaymentMethod,
    deductions: IngredientDeduction[],
    drinkDeductions: DrinkDeduction[],
    tax: number = 0,
    orderType: "servir" | "llevar" = "servir"
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
        deductions:      isServir ? undefined : deductions,
        drinkDeductions: isServir ? undefined : drinkDeductions,
      },
      ...prev,
    ]);

    if (isServir) {
      // Ingredient deductions
      if (deductions.length > 0) {
        const agg: Record<string, number> = {};
        deductions.forEach(({ ingredientId, quantity }) => {
          agg[ingredientId] = (agg[ingredientId] ?? 0) + quantity;
        });
        setIngredients((prev) =>
          prev.map((ing) =>
            agg[ing.id] !== undefined
              ? { ...ing, stock: Math.max(0, ing.stock - agg[ing.id]) }
              : ing
          )
        );
      }
      // Drink stock deductions
      applyDrinkDeductions(drinkDeductions);
    }
  };

  const addIngredient    = (ing: Ingredient) => setIngredients((prev) => [...prev, ing]);
  const editIngredient   = (ing: Ingredient) => setIngredients((prev) => prev.map((i) => i.id === ing.id ? ing : i));
  const deleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setProducts((prev) =>
      prev.map((p) => {
        const newMap: Record<string, Record<string, number>> = {};
        Object.entries(p.ingredientMap).forEach(([vk, qty]) => {
          const filtered: Record<string, number> = {};
          Object.entries(qty).forEach(([iid, q]) => { if (iid !== id) filtered[iid] = q; });
          newMap[vk] = filtered;
        });
        return { ...p, ingredientMap: newMap };
      })
    );
  };

  const addProduct    = (p: Product) => setProducts((prev) => [...prev, p]);
  const editProduct   = (p: Product) => setProducts((prev) => prev.map((x) => x.id === p.id ? p : x));
  const deleteProduct = (id: number) => setProducts((prev) => prev.filter((p) => p.id !== id));

  const deleteSale = (id: number) => setSales((prev) => prev.filter((s) => s.id !== id));

  // ── markDelivered ─────────────────────────────────────────────────────────
  const markDelivered = (id: number) => {
    if (deliveredRef.current.has(id)) {
      setSales((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "delivered", deductions: undefined, drinkDeductions: undefined }
            : s
        )
      );
      return;
    }
    deliveredRef.current.add(id);

    const sale = sales.find((s) => s.id === id);

    if (sale?.orderType === "llevar") {
      // Ingredient deductions
      if (sale.deductions && sale.deductions.length > 0) {
        const agg: Record<string, number> = {};
        sale.deductions.forEach(({ ingredientId, quantity }) => {
          agg[ingredientId] = (agg[ingredientId] ?? 0) + quantity;
        });
        setIngredients((prev) =>
          prev.map((ing) =>
            agg[ing.id] !== undefined
              ? { ...ing, stock: Math.max(0, ing.stock - agg[ing.id]) }
              : ing
          )
        );
      }
      // Drink stock deductions
      if (sale.drinkDeductions && sale.drinkDeductions.length > 0) {
        applyDrinkDeductions(sale.drinkDeductions);
      }
    }

    setSales((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "delivered", deductions: undefined, drinkDeductions: undefined }
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
          onDelete={deleteSale}
          onMarkDelivered={markDelivered}
          onUnmarkDelivered={unmarkDelivered}
          onEdit={editSale}
        />
      ),
    },
    {
      label: "📦 Inventario",
      content: (
        <Inventario
          products={normalizedProducts}
          ingredients={ingredients}
          onAddProduct={addProduct}
          onDeleteProduct={deleteProduct}
          onEditProduct={editProduct}
          onAddIngredient={addIngredient}
          onEditIngredient={editIngredient}
          onDeleteIngredient={deleteIngredient}
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