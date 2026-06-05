// app/components/ventas/types.ts
//
// Tipos y constantes locales al módulo Ventas.

// ── Tipos de dominio ──────────────────────────────────────────────────────────

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type PaymentMethod = "efectivo" | "transferencia" | "deuna";

export type Sale = {
  id: number;
  date: Date;
  items: OrderItem[];
  total: number;
  status?: "pending" | "delivered";
  paymentMethod?: PaymentMethod;
  tax?: number;
  orderType?: "servir" | "llevar" | "delivery";
  deliveryCost?: number;
  /** Fecha/hora programada de entrega (ISO string) — solo llevar y delivery */
  scheduledFor?: string;
  soldBy?: { userId: string; displayName: string };
};

// ── Constantes de presentación ────────────────────────────────────────────────

export const PAYMENT_LABELS: Record<
  PaymentMethod,
  { label: string; emoji: string; classes: string }
> = {
  efectivo: {
    label: "Efectivo",
    emoji: "💵",
    classes: "text-green-400 bg-green-900/30 border-green-800",
  },
  transferencia: {
    label: "Transferencia",
    emoji: "🏦",
    classes: "text-blue-400 bg-blue-900/30 border-blue-800",
  },
  deuna: {
    label: "De Una",
    emoji: "📱",
    classes: "text-purple-400 bg-purple-900/30 border-purple-800",
  },
};

export const ORDER_TYPE_LABELS: Record<
  "servir" | "llevar" | "delivery",
  { label: string; emoji: string }
> = {
  servir:   { label: "Para servir", emoji: "🍽️" },
  llevar:   { label: "Para llevar", emoji: "🛍️" },
  delivery: { label: "Delivery",    emoji: "🛵"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getItemEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("empanada") || n.includes("bandeja")) return "🥟";
  if (n.includes("café") || n.includes("aromática") || n.includes("infusión")) return "☕";
  if (n.includes("gaseosa")) return "🥤";
  if (n.includes("agua")) return "💧";
  if (n.includes("cerveza")) return "🍺";
  return "🍽️";
}