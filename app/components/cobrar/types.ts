// app/components/cobrar/types.ts
//
// Tipos locales al módulo Cobrar.
// Los tipos de dominio (Product, Sale, PaymentMethod, etc.) siguen
// viviendo en app/home-client.tsx y se importan desde allí.

import type { PaymentMethod } from "../../home-client";

// ── Carrito ───────────────────────────────────────────────────────────────────

export type CartEntry = {
  /** Clave única: "{productId}-{sizeKey}-{fillingKey}" */
  key: string;
  productId: number;
  sizeKey: string;
  fillingKey: string;
  quantity: number;
};

// ── Opciones de pago ──────────────────────────────────────────────────────────

export type PaymentOption = {
  value: PaymentMethod;
  label: string;
  emoji: string;
  desc: string;
};

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { value: "efectivo",      label: "Efectivo",      emoji: "💵", desc: "Pago en billetes o monedas" },
  { value: "transferencia", label: "Transferencia", emoji: "🏦", desc: "Transferencia bancaria" },
  { value: "deuna",         label: "De Una",        emoji: "📱", desc: "Pago con billetera digital" },
];

// ── Tipo de pedido ────────────────────────────────────────────────────────────

export type OrderType = "servir" | "llevar" | "delivery";

/** Fecha/hora programada de entrega (solo llevar y delivery) */
export type ScheduledFor = string; // ISO string

export type OrderTypeOption = {
  value: OrderType;
  label: string;
  emoji: string;
};

export const ORDER_TYPE_OPTIONS: OrderTypeOption[] = [
  { value: "servir",   label: "Para servir", emoji: "🍽️" },
  { value: "llevar",   label: "Para llevar", emoji: "🛍️" },
  { value: "delivery", label: "Delivery",    emoji: "🛵" },
];

// ── Helpers de clave ──────────────────────────────────────────────────────────

export function makeCartKey(
  productId: number,
  sizeKey: string,
  fillingKey: string,
): string {
  return `${productId}-${sizeKey}-${fillingKey}`;
}

export function variantKeyStr(sizeKey: string, fillingKey: string): string {
  return `${sizeKey}-${fillingKey}`;
}
