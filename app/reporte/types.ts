// app/reporte/types.ts
//
// Tipos y constantes locales al módulo Reporte.

// ── Tipos de dominio ──────────────────────────────────────────────────────────

export type OrderItem = { name: string; quantity: number; price: number };

export type PaymentMethod = "efectivo" | "transferencia" | "deuna";

export type Sale = {
  id: number;
  date: Date;
  items: OrderItem[];
  total: number;
  status: "pending" | "delivered";
  paymentMethod: PaymentMethod;
  orderType?: "servir" | "llevar" | "delivery";
  deliveryCost?: number;
  soldBy?: { userId: string; displayName: string };
};

export type DrinkSize = { key: string; label: string; price: number; stock: number };

export type Product = {
  id: number;
  name: string;
  category: "Comida" | "Bebida";
  sizeLabels: Record<string, string>;
  fillingLabels: Record<string, string>;
  tieredPrices: Record<string, unknown[]>;
  variantStock?: Record<string, number>;
  ingredientMap: Record<string, Record<string, number>>;
  drinkSizes?: DrinkSize[];
};

// ── Período ───────────────────────────────────────────────────────────────────

export type Period = "today" | "yesterday" | "week" | "month" | "all";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "today",     label: "Hoy"    },
  { key: "yesterday", label: "Ayer"   },
  { key: "week",      label: "7 días" },
  { key: "month",     label: "Mes"    },
  { key: "all",       label: "Total"  },
];

// ── Constantes de presentación ────────────────────────────────────────────────

export const PAYMENT_LABELS: Record<
  PaymentMethod,
  { label: string; emoji: string; bar: string }
> = {
  efectivo:      { label: "Efectivo",      emoji: "💵", bar: "bg-green-500"  },
  transferencia: { label: "Transferencia", emoji: "🏦", bar: "bg-blue-500"   },
  deuna:         { label: "De Una",        emoji: "📱", bar: "bg-purple-500" },
};
