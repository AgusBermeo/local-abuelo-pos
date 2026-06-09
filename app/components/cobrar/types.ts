// app/components/cobrar/types.ts

import type { PaymentMethod } from "../../home-client";

// ── Carrito ───────────────────────────────────────────────────────────────────

export type CartEntry = {
  key: string;
  productId: number;
  sizeKey: string;
  fillingKey: string;
  quantity: number;
};

// ── Caja ──────────────────────────────────────────────────────────────────────

export type BoxEntry = {
  /** Cuántas empanadas van en esta caja */
  empanadasCount: number;
  /** Precio por esta caja */
  pricePerBox: number;
};

/** Calcula el precio sugerido por caja según el número de empanadas que contiene */
export function suggestedBoxPrice(empanadasInBox: number): number {
  if (empanadasInBox <= 5) return 0.60;
  if (empanadasInBox <= 9) return 0.50;
  return 0.40;
}

/**
 * Distribuye N empanadas en cajas de hasta 10 unidades.
 * Cada caja tiene su precio según cuántas empanadas lleva.
 * Ej: 13 → [{10, $0.40}, {3, $0.60}]
 */
export function distributeEmpanadasInBoxes(total: number): BoxEntry[] {
  if (total <= 0) return [];
  const boxes: BoxEntry[] = [];
  let remaining = total;
  while (remaining > 0) {
    const inThisBox = Math.min(remaining, 10);
    boxes.push({ empanadasCount: inThisBox, pricePerBox: suggestedBoxPrice(inThisBox) });
    remaining -= inThisBox;
  }
  return boxes;
}

export function totalBoxesCost(boxes: BoxEntry[]): number {
  return boxes.reduce((s, b) => s + b.pricePerBox, 0);
}

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
export type ScheduledFor = string;

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