// app/reporte/IngresoInventarioSection.tsx
//
// Muestra el historial de ingresos de inventario agrupado por día.
// Cada entrada registra qué producto/variante se ingresó, cuántas
// unidades y quién lo hizo.

import { useState } from "react";
import type { StockEntryLog } from "../home-client";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  entries: StockEntryLog[];
  /** Filtra solo las entradas dentro del período activo */
  periodEntries: StockEntryLog[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function IngresoInventarioSection({ periodEntries }: Props) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  if (periodEntries.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">
          Sin ingresos de inventario en este período.
        </p>
        <p className="text-[10px] text-amber-800">
          Usa el botón &quot;📥 Ingresar inventario&quot; en la pestaña Inventario para
          registrar entradas de stock.
        </p>
      </div>
    );
  }

  // ── Agrupar por día ────────────────────────────────────────────────────────

  const byDay: Record<
    string,
    {
      entries: StockEntryLog[];
      totalUnits: number;
      products: Set<string>;
    }
  > = {};

  for (const entry of periodEntries) {
    const day = toLocalDateStr(entry.date);
    if (!byDay[day]) byDay[day] = { entries: [], totalUnits: 0, products: new Set() };
    byDay[day].entries.push(entry);
    byDay[day].totalUnits += entry.delta;
    byDay[day].products.add(entry.productName);
  }

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  // ── Totales generales del período ──────────────────────────────────────────

  const totalUnits    = periodEntries.reduce((s, e) => s + e.delta, 0);
  const totalSessions = new Set(periodEntries.map((e) => toLocalDateStr(e.date))).size;

  return (
    <div className="flex flex-col gap-4">

      {/* Resumen del período */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-900/40 border border-amber-800 rounded-xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">Días con ingreso</p>
          <p className="text-xl font-bold text-amber-400 tabular-nums">{totalSessions}</p>
        </div>
        <div className="bg-amber-900/40 border border-amber-800 rounded-xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">Unidades ingresadas</p>
          <p className="text-xl font-bold text-green-400 tabular-nums">{totalUnits}</p>
        </div>
        <div className="bg-amber-900/40 border border-amber-800 rounded-xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">Productos distintos</p>
          <p className="text-xl font-bold text-blue-400 tabular-nums">
            {new Set(periodEntries.map((e) => e.productName)).size}
          </p>
        </div>
      </div>

      {/* Lista de días */}
      <div className="flex flex-col gap-2">
        {sortedDays.map((day) => {
          const { entries, totalUnits: dayUnits, products } = byDay[day];
          const isOpen = expandedDay === day;

          // Agrupar entradas del día por sesión (misma fecha ISO redondeada al minuto)
          // y luego por producto para mostrar de forma compacta
          const byProduct: Record<
            string,
            { variantLabel: string; delta: number; category: string }[]
          > = {};
          for (const e of entries) {
            if (!byProduct[e.productName]) byProduct[e.productName] = [];
            byProduct[e.productName].push({
              variantLabel: e.variantLabel,
              delta: e.delta,
              category: e.category,
            });
          }

          return (
            <div
              key={day}
              className={`border rounded-xl overflow-hidden transition-colors ${
                isOpen
                  ? "border-amber-600 bg-amber-900/40"
                  : "border-amber-800 bg-amber-900/20 hover:border-amber-700"
              }`}
            >
              {/* Cabecera del día */}
              <button
                onClick={() => setExpandedDay(isOpen ? null : day)}
                className="w-full flex items-center justify-between px-4 py-3 gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base leading-none shrink-0">📅</span>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-bold text-amber-200 capitalize truncate">
                      {formatDate(day)}
                    </span>
                    <span className="text-[10px] text-amber-700">
                      {products.size} producto{products.size !== 1 ? "s" : ""}
                      {" · "}
                      {entries.length} variante{entries.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-green-400 tabular-nums">
                    +{dayUnits} u.
                  </span>
                  <span
                    className={`text-amber-700 text-xs transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Detalle expandido */}
              {isOpen && (
                <div className="border-t border-amber-800/60 px-4 py-3 flex flex-col gap-3">
                  {Object.entries(byProduct).map(([productName, variants]) => {
                    const cat       = variants[0]?.category;
                    const emoji     = cat === "Bebida" ? "🥤" : "🍽️";
                    const subtotal  = variants.reduce((s, v) => s + v.delta, 0);

                    return (
                      <div key={productName} className="flex flex-col gap-1.5">
                        {/* Nombre del producto */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300">
                            {emoji} {productName}
                          </span>
                          <span className="text-xs font-bold text-green-400 tabular-nums">
                            +{subtotal} u.
                          </span>
                        </div>

                        {/* Variantes */}
                        <div className="flex flex-col gap-1 pl-4 border-l-2 border-amber-800/60">
                          {variants.map((v, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-amber-500">{v.variantLabel}</span>
                              <span className="font-bold text-green-500 tabular-nums">
                                +{v.delta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Quién hizo el ingreso */}
                  {entries[0]?.doneBy && (
                    <div className="flex items-center gap-2 pt-1 border-t border-amber-800/40">
                      <span className="text-[10px] text-amber-800 uppercase tracking-widest">
                        Ingresado por:
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                        👤 {entries[0].doneBy.displayName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
