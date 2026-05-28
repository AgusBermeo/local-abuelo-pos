/**
 * app/home-client.tsx  — Client Component
 *
 * Contiene toda la lógica que antes vivía en app/page.tsx.
 * Recibe la sesión como prop desde el Server Component.
 *
 * NOTA: Solo se muestra el snippet del cambio — el resto del archivo
 * es idéntico al page.tsx original. Copiarlo aquí y cambiar:
 *   1. Añadir prop { session } a la función
 *   2. Pasar session al <Header />
 */

"use client";

import Header from "./components/header";
import Tabs from "./components/tabs";
import Cobrar from "./components/cobrar";
import Ventas from "./components/ventas";
import Inventario from "./components/inventario";

import { useState, useRef } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { SessionPayload } from "../lib/auth/session";

// ── (todos los tipos y helpers que ya existían en page.tsx) ─────────────────
// Cópialos aquí tal cual desde el page.tsx original:
//   PriceTier, TieredPrices, Ingredient, DrinkSize, Product,
//   OrderItem, PaymentMethod, Sale, IngredientDeduction, DrinkDeduction,
//   getTierPrice, getAvailableSizeKeys, getAvailableFillingKeys,
//   getVariantKeys, normalizeDrinkSizes, INITIAL_PRODUCTS
// ...

// El único cambio en la función principal:
export default function HomeClient({ session }: { session: SessionPayload | null }) {
  // ... (todo el estado y lógica igual que antes)

  return (
    <div className="flex flex-col flex-1 min-h-dvh bg-amber-950/60 font-sans">
      {/* Ahora Header recibe la sesión */}
      <Header session={session} />
      {/* El resto igual */}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   INSTRUCCIONES DE MIGRACIÓN
   ──────────────────────────────────────────────────────────────────────────

   1. Renombrar el app/page.tsx ORIGINAL a app/home-client.tsx
   2. Añadir "use client"; al inicio (si no lo tiene)
   3. Cambiar la línea:
        export default function Home() {
      por:
        export default function HomeClient({ session }: { session: SessionPayload | null }) {
   4. Importar SessionPayload:
        import type { SessionPayload } from "../lib/auth/session";
   5. En el return, cambiar <Header /> por <Header session={session} />
   6. Crear el nuevo app/page.tsx (el Server Component) con el contenido
      de auth-system/app/page.tsx

   ────────────────────────────────────────────────────────────────────────── */
