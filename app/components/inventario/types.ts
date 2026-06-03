// app/components/inventario/types.ts
//
// Tipos y constantes locales al módulo Inventario.

// ── Tipos de dominio ──────────────────────────────────────────────────────────

export type PriceTier    = { minQty: number; pricePerUnit: number };
export type TieredPrices = Record<string, PriceTier[]>;

export type DrinkSize = { key: string; label: string; price: number; stock: number };

export type Product = {
  id: number;
  name: string;
  category: "Comida" | "Bebida";
  tieredPrices: TieredPrices;
  price?: number;
  sizeLabels:    Record<string, string>;
  fillingLabels: Record<string, string>;
  size?: string;
  /** Food only: stock per variant "grande-carne", "normal-pollo", etc. */
  variantStock?: Record<string, number>;
  drinkSizes?: DrinkSize[];
};

// ── Tipos de filas de formulario ──────────────────────────────────────────────

export type TierRow     = { id: string; minQty: string; pricePerUnit: string };
export type DrinkSizeRow = { id: string; label: string; price: string; stock: string };

// ── Tipo del formulario principal ─────────────────────────────────────────────

export type ProductForm = {
  name: string;
  category: "Comida" | "Bebida";
  price: string;
  size: string;
  // Tamaños
  hasSizes: boolean;
  tierRows: Record<string, TierRow[]>;
  sizeEnabled: Record<string, boolean>;
  // Rellenos
  hasFillings: boolean;
  fillingRows: Array<{ id: string; key: string; label: string }>;
  // Stock
  variantStockMap: Record<string, string>;
  // Bebidas
  drinkSizeRows: DrinkSizeRow[];
};

// ── Constantes ────────────────────────────────────────────────────────────────

export const FOOD_SIZE_KEYS = ["grande", "normal", "bocadito"] as const;

export const FOOD_SIZE_LABELS: Record<string, string> = {
  grande:   "Grande",
  normal:   "Normal",
  bocadito: "Bocadito",
};