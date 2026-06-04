// app/components/cobrar/savedOrders.ts
//
// Tipos y helpers para pedidos guardados (borradores antes del checkout).

import type { CartEntry } from "./types";

export type SavedOrder = {
  id: string;
  name: string;           // ej: "Mesa 3", "Pedido Juan"
  createdAt: string;      // ISO string
  updatedAt: string;
  cart: CartEntry[];
  discount: number;
  taxEnabled: boolean;
  taxRate: number;
  note?: string;
};

export function createSavedOrder(
  name: string,
  cart: CartEntry[],
  discount: number,
  taxEnabled: boolean,
  taxRate: number,
  note?: string,
): SavedOrder {
  const now = new Date().toISOString();
  return {
    id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Pedido ${new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: now,
    updatedAt: now,
    cart,
    discount,
    taxEnabled,
    taxRate,
    note,
  };
}

export function updateSavedOrder(
  order: SavedOrder,
  cart: CartEntry[],
  discount: number,
  taxEnabled: boolean,
  taxRate: number,
): SavedOrder {
  return {
    ...order,
    cart,
    discount,
    taxEnabled,
    taxRate,
    updatedAt: new Date().toISOString(),
  };
}