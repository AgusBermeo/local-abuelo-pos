// app/components/inventario/StockEntryModal.tsx
//
// Modal de ingreso de inventario: permite sumar unidades a cada
// variante de comida y cada presentación de bebida en un solo paso.
// Llama onLogEntry para registrar el historial persistente.

import { useState } from "react";
import type { Product } from "./types";
import type { StockEntryLog } from "../../home-client";
import { Backdrop, CloseBtn } from "./ui";
import { getFoodVariantKeys, stockColor } from "./helpers";

// ── Tipos locales ─────────────────────────────────────────────────────────────

type StockDelta = Record<string, number>;

type Props = {
  products: Product[];
  onClose: () => void;
  onConfirm: (deltas: Array<{ productId: number; key: string; delta: number }>) => void;
  onLogEntry: (entries: Omit<StockEntryLog, "id" | "date">[]) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePositiveInt(raw: string): number {
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ── Sub-componente: fila de variante ──────────────────────────────────────────

function VariantRow({
  label,
  currentStock,
  delta,
  onChange,
}: {
  label: string;
  currentStock: number;
  delta: number;
  onChange: (v: string) => void;
}) {
  const tracked  = currentStock > 0;
  const newStock = currentStock + delta;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-amber-800/40 last:border-0">
      <span className="flex-1 text-xs text-amber-200 truncate min-w-0">{label}</span>

      <span
        className={`text-xs tabular-nums font-bold w-14 text-right shrink-0 ${
          tracked ? stockColor(currentStock) : "text-amber-800 italic"
        }`}
      >
        {tracked ? currentStock : "—"}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange(String(Math.max(0, delta - 1)))}
          disabled={delta === 0}
          className={`w-7 h-7 flex items-center justify-center rounded-md font-bold text-sm transition-colors ${
            delta === 0
              ? "bg-amber-900/30 text-amber-800 cursor-not-allowed"
              : "bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
          }`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={delta === 0 ? "" : delta}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className={`w-14 text-center bg-amber-950/60 border-2 rounded-lg py-1 text-sm font-bold focus:outline-none transition-colors tabular-nums ${
            delta > 0
              ? "border-green-700 text-green-300 focus:border-green-500"
              : "border-amber-800 text-amber-700 focus:border-amber-600"
          }`}
        />
        <button
          onClick={() => onChange(String(delta + 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white font-bold text-sm cursor-pointer transition-colors"
        >
          +
        </button>
      </div>

      <span
        className={`text-xs tabular-nums font-bold w-14 text-right shrink-0 ${
          delta > 0
            ? "text-green-400"
            : tracked
            ? stockColor(currentStock)
            : "text-amber-800 italic"
        }`}
      >
        {tracked || delta > 0 ? newStock : "—"}
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function StockEntryModal({ products, onClose, onConfirm, onLogEntry }: Props) {
  const [deltas, setDeltas] = useState<Record<number, StockDelta>>({});

  const setDelta = (productId: number, key: string, raw: string) => {
    const val = parsePositiveInt(raw);
    setDeltas((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? {}), [key]: val },
    }));
  };

  const getDelta = (productId: number, key: string): number =>
    deltas[productId]?.[key] ?? 0;

  const totalUnits = Object.values(deltas).reduce(
    (sum, d) => sum + Object.values(d).reduce((s, v) => s + v, 0),
    0,
  );

  const handleConfirm = () => {
    const stockDeltas: Array<{ productId: number; key: string; delta: number }> = [];
    const logEntries: Omit<StockEntryLog, "id" | "date">[] = [];

    for (const [pidStr, keyMap] of Object.entries(deltas)) {
      const productId = Number(pidStr);
      const product   = products.find((p) => p.id === productId);
      if (!product) continue;

      for (const [key, delta] of Object.entries(keyMap)) {
        if (delta <= 0) continue;

        stockDeltas.push({ productId, key, delta });

        // Resolver etiqueta legible de la variante
        let variantLabel = key;
        if (product.category === "Comida") {
          const variantKeys = getFoodVariantKeys(product);
          variantLabel = variantKeys.find((v) => v.variantKey === key)?.label ?? key;
        } else {
          variantLabel =
            product.drinkSizes?.find((ds) => ds.key === key)?.label ?? key;
        }

        logEntries.push({
          productId,
          productName: product.name,
          variantKey: key,
          variantLabel,
          delta,
          category: product.category,
        });
      }
    }

    if (stockDeltas.length > 0) {
      onConfirm(stockDeltas);
      onLogEntry(logEntries);
    }
    onClose();
  };

  const foodProducts  = products.filter((p) => p.category === "Comida");
  const drinkProducts = products.filter((p) => p.category === "Bebida");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={onClose} />
      <div className="relative bg-amber-950 border-2 border-amber-600 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Encabezado fijo */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-amber-800/60 shrink-0">
          <span className="text-2xl leading-none">📥</span>
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">
              Ingreso de inventario
            </h2>
            <p className="text-[10px] text-amber-700 uppercase tracking-widest">
              Suma unidades al stock actual de cada variante
            </p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        {/* Leyenda de columnas */}
        <div className="grid grid-cols-[1fr_56px_116px_56px] gap-3 px-6 py-2 shrink-0">
          <span className="text-[9px] uppercase tracking-widest text-amber-800">Variante</span>
          <span className="text-[9px] uppercase tracking-widest text-amber-800 text-right">Actual</span>
          <span className="text-[9px] uppercase tracking-widest text-amber-800 text-center">Ingresar</span>
          <span className="text-[9px] uppercase tracking-widest text-amber-800 text-right">Nuevo</span>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1 px-6 pb-4 flex flex-col gap-5">

          {foodProducts.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500 pt-2">
                🍽️ Comida
              </p>
              {foodProducts.map((product) => {
                const variantKeys = getFoodVariantKeys(product);
                if (variantKeys.length === 0) return null;
                return (
                  <div
                    key={product.id}
                    className="bg-amber-900/20 border border-amber-800/60 rounded-xl p-3 flex flex-col"
                  >
                    <p className="text-xs font-bold text-amber-300 mb-2">{product.name}</p>
                    {variantKeys.map(({ variantKey, label }) => {
                      const currentStock = product.variantStock?.[variantKey] ?? 0;
                      const delta = getDelta(product.id, variantKey);
                      return (
                        <VariantRow
                          key={variantKey}
                          label={label}
                          currentStock={currentStock}
                          delta={delta}
                          onChange={(v) => setDelta(product.id, variantKey, v)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {drinkProducts.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500">
                🥤 Bebidas
              </p>
              {drinkProducts.map((product) => {
                const sizes = product.drinkSizes ?? [];
                if (sizes.length === 0) return null;
                return (
                  <div
                    key={product.id}
                    className="bg-amber-900/20 border border-amber-800/60 rounded-xl p-3 flex flex-col"
                  >
                    <p className="text-xs font-bold text-amber-300 mb-2">{product.name}</p>
                    {sizes.map((ds) => {
                      const delta = getDelta(product.id, ds.key);
                      return (
                        <VariantRow
                          key={ds.key}
                          label={ds.label}
                          currentStock={ds.stock}
                          delta={delta}
                          onChange={(v) => setDelta(product.id, ds.key, v)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {foodProducts.length === 0 && drinkProducts.length === 0 && (
            <p className="text-amber-700 text-sm text-center py-6">
              No hay productos para mostrar.
            </p>
          )}
        </div>

        {/* Pie fijo */}
        <div className="px-6 py-4 border-t border-amber-800/60 flex gap-3 shrink-0 bg-amber-950 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={totalUnits === 0}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors ${
              totalUnits > 0
                ? "bg-green-600 hover:bg-green-500 text-white cursor-pointer"
                : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
            }`}
          >
            {totalUnits > 0
              ? `Ingresar ${totalUnits} unidad${totalUnits !== 1 ? "es" : ""}`
              : "Sin cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}