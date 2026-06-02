"use client";

import { useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "../components/header";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderItem  = { name: string; quantity: number; price: number };
type PaymentMethod = "efectivo" | "transferencia" | "deuna";
type Sale = {
  id: number; date: Date; items: OrderItem[];
  total: number; status: "pending" | "delivered"; paymentMethod: PaymentMethod;
  orderType?: "servir" | "llevar" | "delivery";
  deliveryCost?: number;
  soldBy?: { userId: string; displayName: string };
};
type DrinkSize = { key: string; label: string; price: number; stock: number };
type Product = {
  id: number; name: string; category: "Comida" | "Bebida";
  sizeLabels: Record<string, string>;
  fillingLabels: Record<string, string>;
  tieredPrices: Record<string, unknown[]>;
  /** Stock restante por variante: { "grande-carne": 12, ... } */
  variantStock?: Record<string, number>;
  ingredientMap: Record<string, Record<string, number>>;
  drinkSizes?: DrinkSize[];
};

const PAYMENT_LABELS: Record<PaymentMethod, { label: string; emoji: string; bar: string }> = {
  efectivo:      { label: "Efectivo",      emoji: "💵", bar: "bg-green-500"  },
  transferencia: { label: "Transferencia", emoji: "🏦", bar: "bg-blue-500"   },
  deuna:         { label: "De Una",        emoji: "📱", bar: "bg-purple-500" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Period = "today" | "yesterday" | "week" | "month" | "all";

function getPeriodSales(sales: Sale[], period: Period, selectedMonth?: string): Sale[] {
  const now = new Date();
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "today")     return toLocalDateStr(d) === toLocalDateStr(now);
    if (period === "yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); return toLocalDateStr(d) === toLocalDateStr(y); }
    if (period === "week") {
      const w = new Date(now); w.setDate(now.getDate() - 6); w.setHours(0, 0, 0, 0);
      return d >= w;
    }
    if (period === "month") {
      if (selectedMonth) {
        const [y, m] = selectedMonth.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      }
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  });
}

function getPrevPeriodSales(sales: Sale[], period: Period, selectedMonth?: string): Sale[] {
  const now = new Date();
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "today") { const y = new Date(now); y.setDate(now.getDate() - 1); return toLocalDateStr(d) === toLocalDateStr(y); }
    if (period === "yesterday") { const y2 = new Date(now); y2.setDate(now.getDate() - 2); return toLocalDateStr(d) === toLocalDateStr(y2); }
    if (period === "week") {
      const end = new Date(now); end.setDate(now.getDate() - 7); end.setHours(23, 59, 59, 999);
      const start = new Date(now); start.setDate(now.getDate() - 13); start.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    }
    if (period === "month") {
      let year: number; let month: number;
      if (selectedMonth) { const [y, m] = selectedMonth.split("-").map(Number); year = y; month = m - 1; }
      else { year = now.getFullYear(); month = now.getMonth(); }
      const prev = new Date(year, month - 1, 1);
      return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
    }
    return false;
  });
}

function delta(curr: number, prev: number): { pct: number; up: boolean; neutral: boolean } {
  if (prev === 0) return { pct: 0, up: true, neutral: true };
  const pct = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(pct), up: pct >= 0, neutral: false };
}

function lastNDays(n: number, endOffset = 0): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - endOffset - (n - 1 - i));
    return toLocalDateStr(d);
  });
}

function getAvailableMonths(sales: Sale[]): string[] {
  const set = new Set<string>();
  for (const s of sales) {
    const d = new Date(s.date);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", { month: "long", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-4">
      <h3 className="text-xs uppercase tracking-widest text-yellow-700 font-bold">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, accent = "amber", delta: d }: {
  label: string; value: string; sub?: string;
  accent?: "amber" | "green" | "blue" | "purple";
  delta?: { pct: number; up: boolean; neutral: boolean };
}) {
  const colors = { amber: "text-amber-400", green: "text-green-400", blue: "text-blue-400", purple: "text-purple-400" };
  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      {d && !d.neutral && (
        <p className={`text-[10px] font-bold ${d.up ? "text-green-500" : "text-red-400"}`}>
          {d.up ? "▲" : "▼"} {d.pct.toFixed(1)}% vs período anterior
        </p>
      )}
      {sub && <p className="text-xs text-amber-700">{sub}</p>}
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function DailyBarChart({ sales, days, endOffset = 0, monthYM }: { sales: Sale[]; days: number; endOffset?: number; monthYM?: string }) {
  let dates: string[];
  if (monthYM) {
    const [y, m] = monthYM.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${y}-${String(m).padStart(2, "0")}-${day}`;
    });
  } else {
    dates = lastNDays(days, endOffset);
  }

  const byDate: Record<string, { revenue: number; count: number }> = {};
  dates.forEach((d) => { byDate[d] = { revenue: 0, count: 0 }; });
  sales.forEach((s) => {
    const k = toLocalDateStr(s.date);
    if (byDate[k]) { byDate[k].revenue += s.total; byDate[k].count++; }
  });

  const maxRev = Math.max(...Object.values(byDate).map((v) => v.revenue), 1);
  const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
  const todayStr = toLocalDateStr(new Date());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-0.5 h-28">
        {dates.map((date) => {
          const { revenue, count } = byDate[date];
          const heightPct = (revenue / maxRev) * 100;
          const d = new Date(date + "T12:00:00");
          const isToday = date === todayStr;
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-amber-900 border border-amber-600 rounded-lg px-2 py-1 text-[10px] text-amber-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <span className="font-bold">${revenue.toFixed(2)}</span>
                <span className="text-amber-600 ml-1">({count})</span>
              </div>
              <div className="w-full flex items-end" style={{ height: "100px" }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${isToday ? "bg-amber-400" : "bg-amber-700 group-hover:bg-amber-500"}`}
                  style={{ height: `${Math.max(heightPct, revenue > 0 ? 4 : 0)}%` }}
                />
              </div>
              {dates.length <= 14 && (
                <span className={`text-[9px] uppercase font-bold ${isToday ? "text-amber-400" : "text-amber-700"}`}>
                  {dayNames[d.getDay()]}
                </span>
              )}
              {dates.length > 14 && (d.getDate() === 1 || d.getDate() % 5 === 0) && (
                <span className="text-[8px] text-amber-800">{d.getDate()}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-amber-800">
        <span>${Math.floor(maxRev * 0.25).toFixed(0)}</span>
        <span>${Math.floor(maxRev * 0.5).toFixed(0)}</span>
        <span>${maxRev.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Comparativa ───────────────────────────────────────────────────────────────
function ComparativaRow({ label, curr, prev, format = (v: number) => String(v) }: {
  label: string; curr: number; prev: number; format?: (v: number) => string;
}) {
  const d = delta(curr, prev);
  const maxVal = Math.max(curr, prev, 0.01);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-amber-300 font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-amber-600">{format(prev)}</span>
          <span className={`font-bold tabular-nums ${d.neutral ? "text-amber-400" : d.up ? "text-green-400" : "text-red-400"}`}>
            {format(curr)} {!d.neutral && <span className="text-[10px]">({d.up ? "▲" : "▼"}{d.pct.toFixed(0)}%)</span>}
          </span>
        </div>
      </div>
      <div className="flex gap-1 h-1.5">
        <div className="flex-1 bg-amber-900 rounded-full overflow-hidden">
          <div className="h-full bg-amber-700 rounded-full" style={{ width: `${(prev / maxVal) * 100}%` }} />
        </div>
        <div className="flex-1 bg-amber-900 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${d.neutral ? "bg-amber-500" : d.up ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${(curr / maxVal) * 100}%` }} />
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-amber-800">
        <span>Período anterior</span><span>Período actual</span>
      </div>
    </div>
  );
}

// ── Historial ─────────────────────────────────────────────────────────────────
function HistorialSection({ sales }: { sales: Sale[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  if (sorted.length === 0) return <p className="text-amber-700 text-sm">Sin ventas en este período.</p>;

  const ORDER_TYPE_LABELS = {
    servir:   { emoji: "🍽️", label: "Servir" },
    llevar:   { emoji: "🛍️", label: "Llevar" },
    delivery: { emoji: "🛵", label: "Delivery" },
  };

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((sale) => {
        const isOpen = expanded === sale.id;
        const pay = PAYMENT_LABELS[sale.paymentMethod] ?? { emoji: "?", label: "—" };
        const isDelivered = sale.status === "delivered";
        const orderTypeInfo = sale.orderType ? ORDER_TYPE_LABELS[sale.orderType] : null;
        return (
          <div key={sale.id}
            className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${isOpen ? "border-amber-600 bg-amber-900/40" : "border-amber-800 bg-amber-900/20 hover:border-amber-700"}`}
            onClick={() => setExpanded(isOpen ? null : sale.id)}>
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0">{pay.emoji}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-amber-200 font-semibold truncate">
                    {new Date(sale.date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{new Date(sale.date).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-amber-700 uppercase">{pay.label}</span>
                    {orderTypeInfo && (
                      <span className="text-[10px] text-amber-600 uppercase">
                        · {orderTypeInfo.emoji} {orderTypeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDelivered ? "text-green-400 border-green-800 bg-green-900/20" : "text-yellow-400 border-yellow-800 bg-yellow-900/20"}`}>
                  {isDelivered ? "✅" : "🕐"}
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">${sale.total.toFixed(2)}</span>
                <span className={`text-amber-700 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </div>
            </div>
            {isOpen && (
              <div className="border-t border-amber-800 px-4 py-3 flex flex-col gap-1.5">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-amber-200">{item.name} <span className="text-amber-700">×{item.quantity}</span></span>
                    <span className="text-amber-500 tabular-nums font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {typeof sale.deliveryCost === "number" && sale.deliveryCost > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-amber-800/40">
                    <span className="text-teal-400">🛵 Envío</span>
                    <span className="text-teal-400 font-semibold tabular-nums">+${sale.deliveryCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {sales.length > 20 && (
        <p className="text-[10px] text-amber-700 text-center pt-1">Mostrando las últimas 20 ventas del período.</p>
      )}
    </div>
  );
}

// ── Top Products ──────────────────────────────────────────────────────────────
type SortMode = "revenue" | "quantity";

function TopProductsSection({ productTotals }: { productTotals: Record<string, { quantity: number; revenue: number }> }) {
  const [sortMode, setSortMode] = useState<SortMode>("revenue");
  const topProducts = Object.entries(productTotals)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => sortMode === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity)
    .slice(0, 5);
  const maxVal = topProducts.length > 0 ? (sortMode === "revenue" ? topProducts[0].revenue : topProducts[0].quantity) : 1;

  return (
    <SectionCard title="🏆 Productos más vendidos">
      <div className="flex bg-amber-900/40 border border-amber-800 rounded-lg p-0.5 gap-0.5 self-start">
        {([["revenue", "💰 Recaudado"], ["quantity", "🔢 Cantidad"]] as [SortMode, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setSortMode(key)}
            className={`py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
              sortMode === key ? "bg-amber-500 text-amber-950" : "text-amber-700 hover:text-amber-500"
            }`}>{label}</button>
        ))}
      </div>
      {topProducts.length === 0 ? (
        <p className="text-amber-700 text-sm">Sin datos para este período.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {topProducts.map(({ name, quantity, revenue }, idx) => {
            const barVal = sortMode === "revenue" ? revenue : quantity;
            return (
              <div key={name} className="flex flex-col gap-1 py-2 border-b border-amber-800/60 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-amber-700 w-4 shrink-0">#{idx + 1}</span>
                  <span className="flex-1 text-sm text-amber-100 truncate">{name}</span>
                  <span className={`text-xs shrink-0 tabular-nums font-semibold ${sortMode === "quantity" ? "text-amber-400" : "text-amber-700"}`}>×{quantity}</span>
                  <span className={`text-sm font-bold tabular-nums shrink-0 w-16 text-right ${sortMode === "revenue" ? "text-amber-400" : "text-amber-500"}`}>${revenue.toFixed(2)}</span>
                </div>
                <div className="ml-7 h-1.5 bg-amber-900 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${sortMode === "revenue" ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${(barVal / maxVal) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Order Type ────────────────────────────────────────────────────────────────
function OrderTypeSection({ sales }: { sales: Sale[] }) {
  const servir   = sales.filter((s) => s.orderType === "servir" || !s.orderType).length;
  const llevar   = sales.filter((s) => s.orderType === "llevar").length;
  const delivery = sales.filter((s) => s.orderType === "delivery").length;
  const total    = sales.length;
  if (total === 0) return null;

  const revenueServir   = sales.filter((s) => s.orderType === "servir" || !s.orderType).reduce((acc, s) => acc + s.total, 0);
  const revenueLlevar   = sales.filter((s) => s.orderType === "llevar").reduce((acc, s) => acc + s.total, 0);
  const revenueDelivery = sales.filter((s) => s.orderType === "delivery").reduce((acc, s) => acc + s.total, 0);

  return (
    <SectionCard title="🍽️ Tipo de pedido">
      <div className="flex flex-col gap-4">
        {[
          { label: "Para servir", emoji: "🍽️", count: servir,   pct: (servir/total)*100,   revenue: revenueServir,   bar: "bg-amber-500" },
          { label: "Para llevar", emoji: "🛍️", count: llevar,   pct: (llevar/total)*100,   revenue: revenueLlevar,   bar: "bg-teal-500"  },
          { label: "Delivery",    emoji: "🛵", count: delivery, pct: (delivery/total)*100, revenue: revenueDelivery, bar: "bg-blue-500"  },
        ].map(({ label, emoji, count, pct, revenue, bar }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-200 font-semibold">{emoji} {label}</span>
              <span className="text-amber-500 font-bold tabular-nums">
                ${revenue.toFixed(2)}{" "}
                <span className="text-amber-700">· {count} pedido{count !== 1 ? "s" : ""} · {pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Ventas por usuario ────────────────────────────────────────────────────────
function VentasPorUsuario({ sales }: { sales: Sale[] }) {
  const userMap: Record<string, { displayName: string; count: number; total: number; methods: Record<string, number> }> = {};
  for (const sale of sales) {
    const key = sale.soldBy?.userId ?? "__unknown__";
    const name = sale.soldBy?.displayName ?? "Usuario desconocido";
    if (!userMap[key]) userMap[key] = { displayName: name, count: 0, total: 0, methods: {} };
    userMap[key].count++;
    userMap[key].total += sale.total;
    const m = sale.paymentMethod;
    userMap[key].methods[m] = (userMap[key].methods[m] ?? 0) + 1;
  }
  const rows = Object.entries(userMap).sort((a, b) => b[1].total - a[1].total);
  if (rows.length === 0) return <p className="text-amber-700 text-sm">Sin datos para este período.</p>;
  const maxTotal = rows[0][1].total || 1;
  const AVATAR_COLORS = ["bg-amber-700 border-amber-600","bg-blue-800 border-blue-700","bg-purple-800 border-purple-700","bg-teal-800 border-teal-700","bg-rose-800 border-rose-700"];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] text-amber-700">Resumen de actividad por cajero en el período seleccionado.</p>
      {rows.map(([, data], idx) => {
        const pct = (data.total / maxTotal) * 100;
        const avgTicket = data.count > 0 ? data.total / data.count : 0;
        return (
          <div key={idx} className="bg-amber-900/20 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                <span className="text-sm font-bold text-white">{data.displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-100 truncate">{data.displayName}</p>
                <p className="text-[10px] text-amber-700">{data.count} venta{data.count !== 1 ? "s" : ""} · ticket prom. ${avgTicket.toFixed(2)}</p>
              </div>
              <p className="text-lg font-bold text-amber-400 tabular-nums shrink-0">${data.total.toFixed(2)}</p>
            </div>
            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(data.methods).map(([method, count]) => {
                const info = PAYMENT_LABELS[method as PaymentMethod];
                if (!info) return null;
                return (
                  <span key={method} className="text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 text-amber-300 border-amber-700 bg-amber-900/40">
                    {info.emoji} {info.label} ×{count}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Métodos de pago ───────────────────────────────────────────────────────────
function MetodosPagoSection({ sales, total }: { sales: Sale[]; total: number }) {
  const byPayment = (["efectivo", "transferencia", "deuna"] as PaymentMethod[]).map((m) => {
    const f = sales.filter((s) => s.paymentMethod === m);
    return { method: m, count: f.length, total: f.reduce((s, x) => s + x.total, 0) };
  });
  return (
    <div className="flex flex-col gap-3">
      {byPayment.map(({ method, count, total: t }) => {
        const pct = total > 0 ? (t / total) * 100 : 0;
        const { label, emoji, bar } = PAYMENT_LABELS[method];
        return (
          <div key={method} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-200 font-semibold">{emoji} {label}</span>
              <span className="text-amber-500 font-bold tabular-nums">
                ${t.toFixed(2)} <span className="text-amber-700">· {count} pedido{count !== 1 ? "s" : ""} · {pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── VariantesSection ──────────────────────────────────────────────────────────
function VariantesSection({ sales, products }: { sales: Sale[]; products: Product[] }) {
  const soldByName: Record<string, number> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      soldByName[item.name] = (soldByName[item.name] ?? 0) + item.quantity;
    }
  }

  type VariantRow = {
    productName: string;
    variantLabel: string;
    variantKey: string;
    sold: number;
    stockRemaining: number | null;
  };

  const rows: VariantRow[] = [];

  for (const product of products) {
    if (product.category !== "Comida") continue;

    const sizes = Object.entries(product.sizeLabels ?? {}).filter(([sk]) => {
      const tiers = product.tieredPrices?.[sk];
      return Array.isArray(tiers) && tiers.length > 0;
    });
    const fillings = Object.entries(product.fillingLabels ?? {});

    const combinations: Array<{ variantKey: string; sizeLabel: string; fillingLabel: string | null }> = [];
    if (fillings.length === 0) {
      sizes.forEach(([sk, sl]) => combinations.push({ variantKey: `${sk}-none`, sizeLabel: sl, fillingLabel: null }));
    } else {
      sizes.forEach(([sk, sl]) =>
        fillings.forEach(([fk, fl]) =>
          combinations.push({ variantKey: `${sk}-${fk}`, sizeLabel: sl, fillingLabel: fl })
        )
      );
    }

    for (const { variantKey, sizeLabel, fillingLabel } of combinations) {
      const label = fillingLabel ? `${sizeLabel} · ${fillingLabel}` : sizeLabel;
      let sold = 0;
      const sizeKey = variantKey.split("-")[0];
      const fillingKey = variantKey.split("-").slice(1).join("-");

      for (const [itemName, qty] of Object.entries(soldByName)) {
        if (!itemName.startsWith(product.name)) continue;
        const suffix = itemName.slice(product.name.length).toLowerCase();
        const sizeMatch = suffix.includes(sizeKey.toLowerCase()) || sizeKey === "single";
        const fillMatch = fillingKey === "none" || suffix.includes(fillingKey.toLowerCase());
        if (sizeMatch && fillMatch) sold += qty;
      }

      const stockRaw = product.variantStock?.[variantKey];
      const stockRemaining = stockRaw !== undefined ? stockRaw : null;

      if (sold > 0 || stockRemaining !== null) {
        rows.push({ productName: product.name, variantLabel: label, variantKey, sold, stockRemaining });
      }
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin datos de variantes para este período.</p>
        <p className="text-[10px] text-amber-800">Configura el stock por variante en Inventario para ver esta sección.</p>
      </div>
    );
  }

  const maxSold = Math.max(...rows.map((r) => r.sold), 1);
  const BAR_COLORS = ["bg-amber-500","bg-orange-500","bg-red-500","bg-yellow-500","bg-lime-500","bg-teal-500","bg-blue-500","bg-violet-500","bg-pink-500"];

  function stockBadge(remaining: number | null) {
    if (remaining === null) return <span className="text-[10px] text-amber-800 italic">Sin seguimiento</span>;
    if (remaining === 0) return <span className="text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-800 rounded-full px-2 py-0.5">Agotado</span>;
    if (remaining <= 5) return <span className="text-[10px] font-bold text-orange-400 bg-orange-900/20 border border-orange-800 rounded-full px-2 py-0.5">{remaining} restantes</span>;
    return <span className="text-[10px] font-bold text-green-400 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">{remaining} restantes</span>;
  }

  const byProduct: Record<string, VariantRow[]> = {};
  for (const row of rows) {
    if (!byProduct[row.productName]) byProduct[row.productName] = [];
    byProduct[row.productName].push(row);
  }

  let colorIdx = 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[10px] text-amber-700">Unidades vendidas por variante en el período, con stock actual.</p>
      {Object.entries(byProduct).map(([productName, productRows]) => (
        <div key={productName} className="flex flex-col gap-3">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest">{productName}</p>
          {productRows.map((row) => {
            const bar = BAR_COLORS[colorIdx % BAR_COLORS.length];
            colorIdx++;
            return (
              <div key={row.variantKey} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-amber-200 font-semibold">{row.variantLabel}</span>
                  <div className="flex items-center gap-3">
                    {stockBadge(row.stockRemaining)}
                    <span className={`text-sm font-bold tabular-nums ${row.sold > 0 ? "text-amber-400" : "text-amber-800"}`}>
                      ×{row.sold} vendidas
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-amber-900/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${bar}`}
                    style={{ width: `${(row.sold / maxSold) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <p className="text-[10px] text-amber-800 text-right pt-1 border-t border-amber-800/40">
        Total vendidas: {rows.reduce((s, r) => s + r.sold, 0)} unidades
      </p>
    </div>
  );
}

// ── ConsumoVariantesSection ───────────────────────────────────────────────────
function ConsumoVariantesSection({ sales, products }: { sales: Sale[]; products: Product[] }) {
  const foodWithStock = products.filter(
    (p) => p.category === "Comida" && p.variantStock && Object.values(p.variantStock).some((v) => v > 0)
  );

  if (foodWithStock.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin stock configurado para productos de comida.</p>
        <p className="text-[10px] text-amber-800">Ve a Inventario → edita un producto de comida → configura el stock por variante.</p>
      </div>
    );
  }

  const soldByName: Record<string, number> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      soldByName[item.name] = (soldByName[item.name] ?? 0) + item.quantity;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[10px] text-amber-700">
        Stock actual vs unidades vendidas en el período para cada variante.
      </p>
      {foodWithStock.map((product) => {
        const sizes = Object.entries(product.sizeLabels ?? {});
        const fillings = Object.entries(product.fillingLabels ?? {});
        const combinations: Array<{ variantKey: string; label: string }> = [];
        if (fillings.length === 0) {
          sizes.forEach(([sk, sl]) => combinations.push({ variantKey: `${sk}-none`, label: sl }));
        } else {
          sizes.forEach(([sk, sl]) =>
            fillings.forEach(([fk, fl]) =>
              combinations.push({ variantKey: `${sk}-${fk}`, label: `${sl} · ${fl}` })
            )
          );
        }

        const rows = combinations.map(({ variantKey, label }) => {
          const sizeKey = variantKey.split("-")[0];
          const fillingKey = variantKey.split("-").slice(1).join("-");
          let sold = 0;
          for (const [itemName, qty] of Object.entries(soldByName)) {
            if (!itemName.startsWith(product.name)) continue;
            const suffix = itemName.slice(product.name.length).toLowerCase();
            const sizeMatch = suffix.includes(sizeKey.toLowerCase()) || sizeKey === "single";
            const fillMatch = fillingKey === "none" || suffix.includes(fillingKey.toLowerCase());
            if (sizeMatch && fillMatch) sold += qty;
          }
          const stockRemaining = product.variantStock?.[variantKey] ?? null;
          return { label, variantKey, sold, stockRemaining };
        });

        const visibleRows = rows.filter((r) => r.stockRemaining !== null || r.sold > 0);
        if (visibleRows.length === 0) return null;

        return (
          <div key={product.id} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-amber-300 uppercase tracking-widest border-b border-amber-800/60 pb-1">
              {product.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleRows.map(({ label, variantKey, sold, stockRemaining }) => {
                const tracked = stockRemaining !== null;
                const stockVal = stockRemaining ?? 0;
                const maxVal = Math.max(stockVal + sold, 1);
                const stockPct = (stockVal / maxVal) * 100;
                const soldPct  = (sold / maxVal) * 100;

                return (
                  <div key={variantKey}
                    className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${
                      tracked && stockVal === 0 ? "border-red-900/60 bg-red-950/10"
                      : tracked && stockVal <= 5 ? "border-orange-900/60 bg-orange-950/10"
                      : "border-amber-800/60 bg-amber-900/20"
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-200">{label}</span>
                      {tracked ? (
                        <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${
                          stockVal === 0 ? "text-red-400 bg-red-900/40 border-red-800"
                          : stockVal <= 5 ? "text-orange-400 bg-orange-900/20 border-orange-800"
                          : "text-green-400 bg-green-900/20 border-green-900"
                        }`}>
                          {stockVal === 0 ? "Agotado" : `${stockVal} en stock`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 italic">Sin seguimiento</span>
                      )}
                    </div>

                    {tracked && (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-amber-950/60">
                          <div className="h-full bg-amber-500/70 rounded-l-full transition-all duration-500 shrink-0"
                            style={{ width: `${soldPct}%` }} />
                          <div className={`h-full rounded-r-full transition-all duration-500 shrink-0 ${
                            stockVal === 0 ? "bg-red-700/50" : stockVal <= 5 ? "bg-orange-500/70" : "bg-green-500/70"
                          }`}
                            style={{ width: `${stockPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-amber-700">
                          <span>Vendidas: <span className="font-bold text-amber-400">{sold}</span></span>
                          <span>Restante: <span className={`font-bold ${stockVal === 0 ? "text-red-400" : stockVal <= 5 ? "text-orange-400" : "text-green-400"}`}>{stockVal}</span></span>
                        </div>
                      </div>
                    )}
                    {!tracked && sold > 0 && (
                      <p className="text-[10px] text-amber-600">Vendidas en período: <span className="font-bold text-amber-400">{sold}</span></p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportePage() {
  const [sales]    = useLocalStorage<Sale[]>   ("abuelo-sales",    []);
  const [products] = useLocalStorage<Product[]>("abuelo-products", []);
  const [period, setPeriod] = useState<Period>("week");

  const nowYM = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();
  const [selectedMonth, setSelectedMonth] = useState<string>(nowYM);

  const availableMonths = getAvailableMonths(sales);
  const monthOptions = availableMonths.includes(nowYM) ? availableMonths : [nowYM, ...availableMonths];

  const periodSales = getPeriodSales(sales, period, selectedMonth);
  const prevSales   = getPrevPeriodSales(sales, period, selectedMonth);

  const total     = periodSales.reduce((s, x) => s + x.total, 0);
  const prevTotal = prevSales.reduce((s, x) => s + x.total, 0);
  const delivered = periodSales.filter((s) => s.status === "delivered").length;
  const pending   = periodSales.filter((s) => s.status !== "delivered").length;
  const avgTicket = periodSales.length > 0 ? total / periodSales.length : 0;
  const prevAvg   = prevSales.length > 0 ? prevTotal / prevSales.length : 0;

  const productTotals: Record<string, { quantity: number; revenue: number }> = {};
  for (const sale of periodSales)
    for (const item of sale.items) {
      if (!productTotals[item.name]) productTotals[item.name] = { quantity: 0, revenue: 0 };
      productTotals[item.name].quantity += item.quantity;
      productTotals[item.name].revenue  += item.price * item.quantity;
    }

  const chartDays      = period === "today" || period === "yesterday" ? 1 : period === "week" ? 7 : 30;
  const chartEndOffset = period === "yesterday" ? 1 : 0;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today",     label: "Hoy"    },
    { key: "yesterday", label: "Ayer"   },
    { key: "week",      label: "7 días" },
    { key: "month",     label: "Mes"    },
    { key: "all",       label: "Total"  },
  ];

  const prevMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 2, 1).toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  })();

  const prevLabel: Record<Period, string> = {
    today: "ayer", yesterday: "anteayer", week: "semana pasada",
    month: prevMonthLabel, all: "—",
  };

  const hasFoodWithVariantStock = products.some(
    (p) => p.category === "Comida" && p.variantStock && Object.keys(p.variantStock).length > 0
  );

  return (
    <div className="flex flex-col min-h-dvh bg-amber-950/60 font-sans">
      <Header session={null} />

      <div className="px-5 pt-4">
        <button onClick={() => window.history.back()}
          className="flex items-center gap-2 text-amber-700 hover:text-amber-400 text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer">
          ← Volver a Ventas
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-5 py-6 pb-12">

        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-amber-400 uppercase tracking-widest">📊 Reporte</h2>
          <p className="text-xs text-yellow-700">Resumen de ventas y rendimiento del negocio</p>
        </div>

        {/* Period selector */}
        <div className="flex bg-amber-900/40 border-2 border-amber-800 rounded-xl p-1 gap-1">
          {PERIODS.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${period === key ? "bg-amber-500 text-amber-950" : "text-amber-700 hover:text-amber-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Month picker */}
        {period === "month" && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Seleccionar mes</p>
            <div className="flex flex-wrap gap-2">
              {monthOptions.map((ym) => (
                <button key={ym} onClick={() => setSelectedMonth(ym)}
                  className={`px-4 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all capitalize ${
                    selectedMonth === ym
                      ? "border-amber-500 bg-amber-500 text-amber-950"
                      : "border-amber-800 text-amber-600 hover:border-amber-600 hover:text-amber-400 bg-amber-900/20"
                  }`}>
                  {monthLabel(ym)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Ventas"       value={String(periodSales.length)} accent="amber"  delta={delta(periodSales.length, prevSales.length)} />
          <StatCard label="Recaudado"    value={`$${total.toFixed(2)}`}     accent="green"  delta={delta(total, prevTotal)} />
          <StatCard label="Ticket prom." value={`$${avgTicket.toFixed(2)}`} accent="blue"   delta={delta(avgTicket, prevAvg)} />
          <StatCard label="Pendientes"   value={String(pending)}            accent="purple" sub={`${delivered} entregados`} />
        </div>

        {/* Gráfico diario */}
        <SectionCard title="📈 Ventas por día">
          {periodSales.length === 0
            ? <p className="text-amber-700 text-sm">Sin datos para este período.</p>
            : <DailyBarChart sales={periodSales} days={chartDays} endOffset={chartEndOffset}
                monthYM={period === "month" ? selectedMonth : undefined} />
          }
        </SectionCard>

        {/* Comparativa */}
        {period !== "all" && (
          <SectionCard title={`🔄 Comparativa vs ${prevLabel[period]}`}>
            <div className="flex flex-col gap-4">
              <ComparativaRow label="Ventas (nº pedidos)" curr={periodSales.length} prev={prevSales.length} format={(v) => String(v)} />
              <ComparativaRow label="Recaudado"           curr={total}              prev={prevTotal}         format={(v) => `$${v.toFixed(2)}`} />
              <ComparativaRow label="Ticket promedio"     curr={avgTicket}          prev={prevAvg}           format={(v) => `$${v.toFixed(2)}`} />
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

        {/* Ventas por usuario */}
        <SectionCard title="👤 Ventas por usuario">
          <VentasPorUsuario sales={periodSales} />
        </SectionCard>

        {/* Historial */}
        <SectionCard title="📋 Historial detallado">
          <HistorialSection sales={periodSales} />
        </SectionCard>

        {periodSales.length === 0 && (
          <div className="bg-amber-900/20 border-2 border-amber-900 rounded-xl p-8 text-center flex flex-col gap-2">
            <span className="text-4xl">📭</span>
            <p className="text-amber-600 font-semibold">Sin ventas en este período</p>
            <p className="text-amber-800 text-xs">Selecciona otro período o registra nuevas ventas.</p>
          </div>
        )}
      </div>
    </div>
  );
}