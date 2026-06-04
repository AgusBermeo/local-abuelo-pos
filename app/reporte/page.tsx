"use client";

// app/reporte/page.tsx

import { useState }          from "react";
import { useLocalStorage }   from "../hooks/useLocalStorage";
import Header                from "../components/header";

import type { Sale, Product, Period } from "./types";
import type { StockEntryLog }         from "../home-client";
import { PERIODS }                    from "./types";
import {
  getPeriodSales,
  getPrevPeriodSales,
  delta,
  getAvailableMonths,
  monthLabel,
} from "./helpers";

import SectionCard                from "./SectionCard";
import StatCard                   from "./StatCard";
import DailyBarChart              from "./DailyBarChart";
import ComparativaRow             from "./ComparativaRow";
import TopProductsSection         from "./TopProductsSection";
import OrderTypeSection           from "./OrderTypeSection";
import MetodosPagoSection         from "./MetodosPagoSection";
import VentasPorUsuario           from "./VentasPorUsuario";
import HistorialSection           from "./HistorialSection";
import VariantesSection           from "./VariantesSection";
import ConsumoVariantesSection    from "./ConsumoVariantesSection";
import IngresoInventarioSection   from "./IngresoInventarioSection";

// ── Helper de filtrado de StockEntryLog por período ───────────────────────────

function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPeriodStockEntries(
  entries: StockEntryLog[],
  period: Period,
  selectedMonth: string,
): StockEntryLog[] {
  const now = new Date();
  return entries.filter((e) => {
    const d = new Date(e.date);
    if (period === "today")
      return toLocalDateStr(d) === toLocalDateStr(now);
    if (period === "yesterday") {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return toLocalDateStr(d) === toLocalDateStr(y);
    }
    if (period === "week") {
      const w = new Date(now); w.setDate(now.getDate() - 6); w.setHours(0, 0, 0, 0);
      return d >= w;
    }
    if (period === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    }
    return true; // "all"
  });
}

export default function ReportePage() {
  const [sales]        = useLocalStorage<Sale[]>         ("abuelo-sales",         []);
  const [products]     = useLocalStorage<Product[]>      ("abuelo-products",      []);
  const [stockEntries] = useLocalStorage<StockEntryLog[]>("abuelo-stock-entries", []);

  const [period, setPeriod] = useState<Period>("week");

  const nowYM = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();
  const [selectedMonth, setSelectedMonth] = useState<string>(nowYM);

  const availableMonths = getAvailableMonths(sales);
  const monthOptions    = availableMonths.includes(nowYM)
    ? availableMonths
    : [nowYM, ...availableMonths];

  // ── Ventas filtradas ─────────────────────────────────────────────────────

  const periodSales = getPeriodSales(sales, period, selectedMonth);
  const prevSales   = getPrevPeriodSales(sales, period, selectedMonth);

  // ── Ingresos de inventario filtrados ─────────────────────────────────────

  const periodStockEntries = getPeriodStockEntries(stockEntries, period, selectedMonth);

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const total     = periodSales.reduce((s, x) => s + x.total, 0);
  const prevTotal = prevSales.reduce((s, x) => s + x.total, 0);
  const delivered = periodSales.filter((s) => s.status === "delivered").length;
  const pending   = periodSales.filter((s) => s.status !== "delivered").length;
  const avgTicket = periodSales.length > 0 ? total / periodSales.length : 0;
  const prevAvg   = prevSales.length   > 0 ? prevTotal / prevSales.length : 0;

  // ── Totales por producto ─────────────────────────────────────────────────

  const productTotals: Record<string, { quantity: number; revenue: number }> = {};
  for (const sale of periodSales)
    for (const item of sale.items) {
      if (!productTotals[item.name])
        productTotals[item.name] = { quantity: 0, revenue: 0 };
      productTotals[item.name].quantity += item.quantity;
      productTotals[item.name].revenue  += item.price * item.quantity;
    }

  const chartDays      = period === "today" || period === "yesterday" ? 1 : period === "week" ? 7 : 30;
  const chartEndOffset = period === "yesterday" ? 1 : 0;

  const prevMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 2, 1).toLocaleDateString("es-EC", {
      month: "long", year: "numeric",
    });
  })();

  const prevLabel: Record<Period, string> = {
    today:     "ayer",
    yesterday: "anteayer",
    week:      "semana pasada",
    month:     prevMonthLabel,
    all:       "—",
  };

  const hasFoodWithVariantStock = products.some(
    (p) =>
      p.category === "Comida" &&
      p.variantStock &&
      Object.keys(p.variantStock).length > 0,
  );

  return (
    <div className="flex flex-col min-h-dvh bg-amber-950/60 font-sans">
      <Header session={null} />

      <div className="px-5 pt-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-amber-700 hover:text-amber-400 text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
        >
          ← Volver a Ventas
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-5 py-6 pb-12">

        {/* Título */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-amber-400 uppercase tracking-widest">
            📊 Reporte
          </h2>
          <p className="text-xs text-yellow-700">
            Resumen de ventas y rendimiento del negocio
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex bg-amber-900/40 border-2 border-amber-800 rounded-xl p-1 gap-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                period === key
                  ? "bg-amber-500 text-amber-950"
                  : "text-amber-700 hover:text-amber-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selector de mes */}
        {period === "month" && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              Seleccionar mes
            </p>
            <div className="flex flex-wrap gap-2">
              {monthOptions.map((ym) => (
                <button
                  key={ym}
                  onClick={() => setSelectedMonth(ym)}
                  className={`px-4 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all capitalize ${
                    selectedMonth === ym
                      ? "border-amber-500 bg-amber-500 text-amber-950"
                      : "border-amber-800 text-amber-600 hover:border-amber-600 hover:text-amber-400 bg-amber-900/20"
                  }`}
                >
                  {monthLabel(ym)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Ventas"
            value={String(periodSales.length)}
            accent="amber"
            delta={delta(periodSales.length, prevSales.length)}
          />
          <StatCard
            label="Recaudado"
            value={`$${total.toFixed(2)}`}
            accent="green"
            delta={delta(total, prevTotal)}
          />
          <StatCard
            label="Ticket prom."
            value={`$${avgTicket.toFixed(2)}`}
            accent="blue"
            delta={delta(avgTicket, prevAvg)}
          />
          <StatCard
            label="Pendientes"
            value={String(pending)}
            accent="purple"
            sub={`${delivered} entregados`}
          />
        </div>

        {/* Gráfico diario */}
        <SectionCard title="📈 Ventas por día">
          {periodSales.length === 0 ? (
            <p className="text-amber-700 text-sm">Sin datos para este período.</p>
          ) : (
            <DailyBarChart
              sales={periodSales}
              days={chartDays}
              endOffset={chartEndOffset}
              monthYM={period === "month" ? selectedMonth : undefined}
            />
          )}
        </SectionCard>

        {/* Comparativa */}
        {period !== "all" && (
          <SectionCard title={`🔄 Comparativa vs ${prevLabel[period]}`}>
            <div className="flex flex-col gap-4">
              <ComparativaRow
                label="Ventas (nº pedidos)"
                curr={periodSales.length}
                prev={prevSales.length}
                format={(v) => String(v)}
              />
              <ComparativaRow
                label="Recaudado"
                curr={total}
                prev={prevTotal}
                format={(v) => `$${v.toFixed(2)}`}
              />
              <ComparativaRow
                label="Ticket promedio"
                curr={avgTicket}
                prev={prevAvg}
                format={(v) => `$${v.toFixed(2)}`}
              />
            </div>
          </SectionCard>
        )}

        {/* Tipo de pedido */}
        {periodSales.length > 0 && <OrderTypeSection sales={periodSales} />}

        {/* Métodos de pago */}
        <SectionCard title="💳 Métodos de pago">
          <MetodosPagoSection sales={periodSales} total={total} />
        </SectionCard>

        {/* Top productos */}
        <TopProductsSection productTotals={productTotals} />

        {/* Stock y consumo por variante */}
        {hasFoodWithVariantStock && (
          <SectionCard title="📦 Stock y consumo por variante (Comida)">
            <ConsumoVariantesSection sales={periodSales} products={products} />
          </SectionCard>
        )}

        {/* Variantes vendidas + stock restante */}
        <SectionCard title="🥟 Variantes vendidas · stock actual">
          <VariantesSection sales={periodSales} products={products} />
        </SectionCard>

        {/* Ingresos de inventario */}
        <SectionCard title="📥 Ingresos de inventario">
          <IngresoInventarioSection
            entries={stockEntries}
            periodEntries={periodStockEntries}
          />
        </SectionCard>

        {/* Ventas por usuario */}
        <SectionCard title="👤 Ventas por usuario">
          <VentasPorUsuario sales={periodSales} />
        </SectionCard>

        {/* Historial */}
        <SectionCard title="📋 Historial detallado">
          <HistorialSection sales={periodSales} />
        </SectionCard>

        {/* Estado vacío */}
        {periodSales.length === 0 && periodStockEntries.length === 0 && (
          <div className="bg-amber-900/20 border-2 border-amber-900 rounded-xl p-8 text-center flex flex-col gap-2">
            <span className="text-4xl">📭</span>
            <p className="text-amber-600 font-semibold">Sin actividad en este período</p>
            <p className="text-amber-800 text-xs">
              Selecciona otro período o registra nuevas ventas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}