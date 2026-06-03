// app/components/inventario/helpers.ts
//
// Funciones puras: cálculos de precio, stock, conversión form↔product,
// validación y factories de filas. Sin JSX.

import type {
  Product,
  ProductForm,
  TierRow,
  DrinkSizeRow,
  DrinkSize,
  TieredPrices,
} from "./types";
import { FOOD_SIZE_KEYS, FOOD_SIZE_LABELS } from "./types";

// ── Precio escalonado ─────────────────────────────────────────────────────────

export function getTierPrice(product: Product, sizeKey: string, qty: number): number {
  const tiers = product.tieredPrices[sizeKey];
  if (!tiers || tiers.length === 0) return product.price ?? 0;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find((t) => qty >= t.minQty);
  return match ? match.pricePerUnit : sorted[sorted.length - 1].pricePerUnit;
}

// ── Variantes de comida ───────────────────────────────────────────────────────

export function getFoodVariantKeys(
  product: Product,
): Array<{ variantKey: string; label: string }> {
  const sizes = Object.entries(product.sizeLabels)
    .filter(([key]) => {
      const tiers = product.tieredPrices[key];
      return tiers && tiers.some((t) => t.pricePerUnit > 0);
    })
    .map(([key, label]) => ({ key, label }));

  const fillings = Object.entries(product.fillingLabels).map(([key, label]) => ({
    key,
    label,
  }));

  if (fillings.length === 0)
    return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));

  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes)
    for (const f of fillings)
      result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

// ── Colores de stock ──────────────────────────────────────────────────────────

export function stockColor(v: number): string {
  return v === 0
    ? "text-red-400"
    : v <= 5
    ? "text-orange-400"
    : "text-green-400";
}

export function stockBorderFocus(v: number): string {
  return v === 0
    ? "border-red-800 focus:border-red-500"
    : v <= 5
    ? "border-orange-800 focus:border-orange-500"
    : "border-amber-800 focus:border-amber-500";
}

// ── Variantes del formulario ──────────────────────────────────────────────────

export function getVariantKeysFromForm(
  form: ProductForm,
): Array<{ variantKey: string; label: string }> {
  const sizes: Array<{ key: string; label: string }> = [];

  if (form.category === "Comida") {
    FOOD_SIZE_KEYS.forEach((sk) => {
      if (form.sizeEnabled[sk]) sizes.push({ key: sk, label: FOOD_SIZE_LABELS[sk] });
    });
  } else {
    sizes.push({ key: "single", label: "Unidad" });
  }

  if (sizes.length === 0) sizes.push({ key: "single", label: "Unidad" });

  const fillings: Array<{ key: string; label: string }> =
    form.category === "Comida"
      ? [
          { key: "carne", label: "Carne" },
          { key: "pollo", label: "Pollo" },
        ]
      : [];

  if (fillings.length === 0)
    return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));

  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes)
    for (const f of fillings)
      result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

// ── Factories de filas ────────────────────────────────────────────────────────

export function defaultTierRow(minQty = 1, price = ""): TierRow {
  return {
    id: `r_${Date.now()}_${Math.random()}`,
    minQty: String(minQty),
    pricePerUnit: price,
  };
}

export function defaultDrinkSizeRow(): DrinkSizeRow {
  return {
    id: `ds_${Date.now()}_${Math.random()}`,
    label: "",
    price: "",
    stock: "0",
  };
}

// ── Formulario vacío ──────────────────────────────────────────────────────────

export const EMPTY_FORM: ProductForm = {
  name: "",
  category: "Comida",
  price: "",
  size: "",
  tierRows: {
    grande:   [defaultTierRow(1)],
    normal:   [defaultTierRow(1)],
    bocadito: [defaultTierRow(1)],
  },
  sizeEnabled: { grande: true, normal: true, bocadito: true },
  variantStockMap: {},
  drinkSizeRows: [defaultDrinkSizeRow()],
};

// ── Conversión product → form ─────────────────────────────────────────────────

export function productToForm(product: Product): ProductForm {
  if (product.category === "Comida") {
    const tierRows: Record<string, TierRow[]> = {};
    const sizeEnabled: Record<string, boolean> = {};

    FOOD_SIZE_KEYS.forEach((sk) => {
      const tiers = product.tieredPrices[sk] ?? [];
      sizeEnabled[sk] = tiers.some((t) => t.pricePerUnit > 0);
      tierRows[sk] =
        tiers.length > 0
          ? tiers.map((t) => defaultTierRow(t.minQty, String(t.pricePerUnit)))
          : [defaultTierRow(1)];
      if (tierRows[sk][0]) tierRows[sk][0].minQty = "1";
    });

    const variantStockMap: Record<string, string> = {};
    if (product.variantStock) {
      Object.entries(product.variantStock).forEach(([vk, v]) => {
        variantStockMap[vk] = String(v);
      });
    }

    return {
      ...EMPTY_FORM,
      name: product.name,
      category: "Comida",
      tierRows,
      sizeEnabled,
      variantStockMap,
      drinkSizeRows: [defaultDrinkSizeRow()],
    };
  }

  const drinkSizeRows: DrinkSizeRow[] = (product.drinkSizes ?? []).map((ds) => ({
    id: `ds_${Date.now()}_${Math.random()}`,
    label: ds.label,
    price: String(ds.price),
    stock: String(ds.stock),
  }));

  return {
    ...EMPTY_FORM,
    name: product.name,
    category: "Bebida",
    variantStockMap: {},
    drinkSizeRows: drinkSizeRows.length > 0 ? drinkSizeRows : [defaultDrinkSizeRow()],
  };
}

// ── Validación del formulario ─────────────────────────────────────────────────

export function validate(
  form: ProductForm,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): boolean {
  const e: Record<string, string> = {};

  if (!form.name.trim()) e.name = "El nombre es obligatorio.";

  if (form.category === "Comida") {
    const anySizeEnabled = FOOD_SIZE_KEYS.some((sk) => form.sizeEnabled[sk]);
    if (!anySizeEnabled) {
      e.size_grande = "Activa al menos un tamaño.";
    } else {
      FOOD_SIZE_KEYS.forEach((sk) => {
        if (!form.sizeEnabled[sk]) return;
        const rows = form.tierRows[sk] ?? [];
        if (rows.length === 0) {
          e[`size_${sk}`] = "Agrega al menos un escalón.";
          return;
        }
        let anyPositive = false;
        rows.forEach((row) => {
          const qty   = Number(row.minQty);
          const price = Number(row.pricePerUnit);
          if (row.minQty === "" || isNaN(qty) || qty < 1)
            e[`${sk}_minQty_${row.id}`] = "Mín. 1.";
          if (row.pricePerUnit === "" || isNaN(price) || price < 0)
            e[`${sk}_price_${row.id}`] = "Precio inválido.";
          else if (price > 0) anyPositive = true;
        });
        if (!anyPositive)
          e[`size_${sk}`] = "Al menos un escalón debe tener precio mayor a $0.";
      });
    }
  } else {
    if (form.drinkSizeRows.length === 0) {
      e.drinkSizes = "Agrega al menos una presentación.";
    } else {
      form.drinkSizeRows.forEach((row) => {
        if (!row.label.trim())
          e[`ds_label_${row.id}`] = "La presentación requiere un nombre.";
        const price = Number(row.price);
        if (row.price === "" || isNaN(price) || price < 0)
          e[`ds_price_${row.id}`] = "Precio inválido.";
      });
    }
  }

  setErrors(e);
  return Object.keys(e).length === 0;
}

// ── Conversión form → product ─────────────────────────────────────────────────

export function formToProduct(form: ProductForm, id: number): Product {
  if (form.category === "Comida") {
    const tieredPrices: TieredPrices = {};
    const sizeLabels: Record<string, string> = {};

    FOOD_SIZE_KEYS.forEach((sk) => {
      if (!form.sizeEnabled[sk]) return;
      sizeLabels[sk] = FOOD_SIZE_LABELS[sk];
      tieredPrices[sk] = (form.tierRows[sk] ?? [])
        .filter((r) => r.pricePerUnit !== "" && Number(r.pricePerUnit) > 0)
        .map((r) => ({
          minQty: Math.max(1, Number(r.minQty) || 1),
          pricePerUnit: Number(r.pricePerUnit),
        }))
        .sort((a, b) => a.minQty - b.minQty);

      if (
        tieredPrices[sk].length > 0 &&
        tieredPrices[sk][0].minQty !== 1
      ) {
        tieredPrices[sk].unshift({ ...tieredPrices[sk][0], minQty: 1 });
      }
    });

    const variantStock: Record<string, number> = {};
    Object.entries(form.variantStockMap).forEach(([vk, raw]) => {
      variantStock[vk] = Math.max(0, Math.round(Number(raw) || 0));
    });

    return {
      id,
      name: form.name.trim(),
      category: "Comida",
      tieredPrices,
      sizeLabels,
      fillingLabels: { carne: "Carne", pollo: "Pollo" },
      variantStock,
    };
  }

  const drinkSizes: DrinkSize[] = form.drinkSizeRows.map((row) => ({
    key:
      row.label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "") || `size_${row.id}`,
    label: row.label.trim(),
    price: Math.max(0, Number(row.price) || 0),
    stock: Math.max(0, Math.round(Number(row.stock) || 0)),
  }));

  return {
    id,
    name: form.name.trim(),
    category: "Bebida",
    tieredPrices: {},
    sizeLabels: {},
    fillingLabels: {},
    variantStock: {},
    drinkSizes,
  };
}
