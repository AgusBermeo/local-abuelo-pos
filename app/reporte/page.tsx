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
  orderType?: "servir" | "llevar";
  soldBy?: { userId: string; displayName: string };
};
type Ingredient = { id: string; name: string; stock: number };
type Product = {
  id: number; name: string; category: "Comida" | "Bebida";
  price: unknown; size: unknown; relleno?: unknown;
  ingredientMap: Record<string, Record<string, number>>;
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

// selectedMonth: "YYYY-MM" string, only used when period === "month"
function getPeriodSales(sales: Sale[], period: Period, selectedMonth?: string): Sale[] {
  const now = new Date();
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "today")     return toLocalDateStr(d) === toLocalDateStr(now);
    if (period === "yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); return toLocalDateStr(d) === toLocalDateStr(y); }
    if (period === "week") {
      const w = new Date(now);
      w.setDate(now.getDate() - 6);
      w.setHours(0, 0, 0, 0);
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
    if (period === "today") {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return toLocalDateStr(d) === toLocalDateStr(y);
    }
    if (period === "yesterday") {
      const y2 = new Date(now); y2.setDate(now.getDate() - 2);
      return toLocalDateStr(d) === toLocalDateStr(y2);
    }
    if (period === "week") {
      const end = new Date(now); end.setDate(now.getDate() - 7); end.setHours(23, 59, 59, 999);
      const start = new Date(now); start.setDate(now.getDate() - 13); start.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    }
    if (period === "month") {
      let year: number;
      let month: number; // 0-indexed
      if (selectedMonth) {
        const [y, m] = selectedMonth.split("-").map(Number);
        year = y;
        month = m - 1;
      } else {
        year = now.getFullYear();
        month = now.getMonth();
      }
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

/** Returns all "YYYY-MM" months that appear in sales, sorted descending */
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

function StatCard({
  label, value, sub, accent = "amber", delta: d,
}: {
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
  // If monthYM provided, generate all days in that month instead of last N days
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
              {/* Only show day label if not too many bars */}
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
function ComparativaRow({
  label, curr, prev, format = (v: number) => String(v),
}: {
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

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((sale) => {
        const isOpen = expanded === sale.id;
        const pay    = PAYMENT_LABELS[sale.paymentMethod] ?? { emoji: "?", label: "—" };
        const isDelivered = sale.status === "delivered";
        return (
          <div key={sale.id}
            className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${isOpen ? "border-amber-600 bg-amber-900/40" : "border-amber-800 bg-amber-900/20 hover:border-amber-700"}`}
            onClick={() => setExpanded(isOpen ? null : sale.id)}
          >
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0">{pay.emoji}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-amber-200 font-semibold truncate">
                    {new Date(sale.date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {new Date(sale.date).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-amber-700 uppercase">{pay.label}</span>
                    {sale.orderType && (
                      <span className="text-[10px] text-amber-600 uppercase">
                        · {sale.orderType === "servir" ? "🍽️ Servir" : "🛍️ Llevar"}
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

// ── SVG Pie Chart ─────────────────────────────────────────────────────────────
type PieSlice = { label: string; value: number; color: string };

function PieChart({ slices, size = 120 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 6;

  let cumAngle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    if (slices.length === 1) {
      return <circle key={slice.label} cx={cx} cy={cy} r={r} fill={slice.color} />;
    }
    return (
      <path
        key={slice.label}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={slice.color}
        stroke="#1c0a00"
        strokeWidth="1.5"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.42} fill="#1c0a00" />
    </svg>
  );
}

// ── Palettes ──────────────────────────────────────────────────────────────────
const PIE_COLORS_RELLENO = ["#ef4444", "#f59e0b", "#f97316", "#fbbf24", "#dc2626"];
const PIE_COLORS_TAMANO  = ["#3b82f6", "#06b6d4", "#8b5cf6", "#0ea5e9", "#6366f1"];

function classifyIngredient(name: string): "relleno" | "tamano" | "other" {
  const n = name.toLowerCase();
  if (n.includes("carne") || n.includes("pollo")) return "relleno";
  if (n.includes("masa"))                          return "tamano";
  if (n.includes("grande") || n.includes("normal") || n.includes("bocadito")) return "tamano";
  return "other";
}

function IngredientesSection({
  sales, products, ingredients,
}: {
  sales: Sale[]; products: Product[]; ingredients: Ingredient[];
}) {
  const ingConsumed: Record<string, number> = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      const product = products.find((p) => p.category === "Comida" && item.name.startsWith(p.name));
      if (!product) continue;

      const nameSuffix = item.name.slice(product.name.length).trim().toLowerCase();
      let matched = false;

      for (const [vk, usage] of Object.entries(product.ingredientMap)) {
        const dashIdx    = vk.lastIndexOf("-");
        const sizeKey    = dashIdx >= 0 ? vk.slice(0, dashIdx) : vk;
        const fillingKey = dashIdx >= 0 ? vk.slice(dashIdx + 1) : "none";

        const sizeMatch = sizeKey === "single" || nameSuffix.includes(sizeKey.toLowerCase());
        const fillMatch = fillingKey === "none"  || nameSuffix.includes(fillingKey.toLowerCase());

        if (sizeMatch && fillMatch) {
          for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
            ingConsumed[ingId] = (ingConsumed[ingId] ?? 0) + qtyPerUnit * item.quantity;
          }
          matched = true;
          break;
        }
      }
      if (!matched) {
        const entries = Object.entries(product.ingredientMap);
        if (entries.length > 0) {
          const [, usage] = entries[0];
          for (const [ingId, qtyPerUnit] of Object.entries(usage)) {
            ingConsumed[ingId] = (ingConsumed[ingId] ?? 0) + qtyPerUnit * item.quantity;
          }
        }
      }
    }
  }

  type IngRow = { ing: Ingredient; consumed: number };
  const rellenoRows: IngRow[] = [];
  const tamanoRows:  IngRow[] = [];

  for (const ing of ingredients) {
    const consumed = ingConsumed[ing.id] ?? 0;
    if (consumed === 0) continue;
    const cat = classifyIngredient(ing.name);
    if (cat === "relleno") rellenoRows.push({ ing, consumed });
    else                   tamanoRows.push({ ing, consumed });
  }

  rellenoRows.sort((a, b) => b.consumed - a.consumed);
  tamanoRows.sort((a, b) => b.consumed - a.consumed);

  const hasAny = rellenoRows.length > 0 || tamanoRows.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin datos de consumo para este período.</p>
        <p className="text-[10px] text-amber-800">Asegúrate de haber configurado los ingredientes en el Inventario.</p>
      </div>
    );
  }

  const rellenoSlices: PieSlice[] = rellenoRows.map((r, i) => ({
    label: r.ing.name, value: r.consumed,
    color: PIE_COLORS_RELLENO[i % PIE_COLORS_RELLENO.length],
  }));
  const tamanoSlices: PieSlice[] = tamanoRows.map((r, i) => ({
    label: r.ing.name, value: r.consumed,
    color: PIE_COLORS_TAMANO[i % PIE_COLORS_TAMANO.length],
  }));

  function PiePanel({
    title, subtitle, rows, slices, accentText, borderColor, emptyMsg,
  }: {
    title: string; subtitle: string; rows: IngRow[]; slices: PieSlice[];
    accentText: string; borderColor: string; emptyMsg: string;
  }) {
    const totalConsumed = rows.reduce((s, r) => s + r.consumed, 0);
    const maxConsumed   = Math.max(...rows.map((r) => r.consumed), 1);

    return (
      <div className={`flex-1 flex flex-col gap-4 bg-amber-900/20 border-2 ${borderColor} rounded-xl p-4 min-w-0`}>
        <div className="flex flex-col gap-0.5">
          <p className={`text-[10px] uppercase tracking-widest font-bold ${accentText}`}>{title}</p>
          <p className="text-[10px] text-amber-800">{subtitle}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-amber-800 text-xs italic">{emptyMsg}</p>
        ) : (
          <>
            <div className="flex justify-center">
              <PieChart slices={slices} size={120} />
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r, i) => {
                const pct = totalConsumed > 0 ? ((r.consumed / totalConsumed) * 100).toFixed(0) : "0";
                return (
                  <div key={r.ing.id} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slices[i]?.color }} />
                    <span className="text-xs text-amber-200 flex-1 truncate">{r.ing.name}</span>
                    <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: slices[i]?.color }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-amber-800/40">
              {rows.map(({ ing, consumed }, i) => (
                <div key={ing.id} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="text-amber-300 font-semibold truncate max-w-[55%]">{ing.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] ${ing.stock === 0 ? "text-red-400" : ing.stock <= 5 ? "text-orange-400" : "text-green-400"}`}>
                        stock: {ing.stock}
                      </span>
                      <span className="text-amber-500 font-bold tabular-nums">−{consumed}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-amber-900/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(consumed / maxConsumed) * 100}%`, background: slices[i]?.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-amber-700">
        Consumo separado por tipo de ingrediente. Stock actual en verde / naranja / rojo.
      </p>
      <div className="flex gap-3 items-start flex-col sm:flex-row">
        <PiePanel
          title="🥩 Relleno"
          subtitle="Carne · Pollo"
          rows={rellenoRows}
          slices={rellenoSlices}
          accentText="text-amber-400"
          borderColor="border-amber-700/60"
          emptyMsg="Sin datos de relleno"
        />
        <PiePanel
          title="📐 Tamaño"
          subtitle="Masa Grande · Normal · Bocadito"
          rows={tamanoRows}
          slices={tamanoSlices}
          accentText="text-blue-400"
          borderColor="border-blue-900/60"
          emptyMsg="Sin datos de tamaño"
        />
      </div>
    </div>
  );
}

// ── Variantes vendidas ────────────────────────────────────────────────────────
function VariantesSection({ sales, products }: { sales: Sale[]; products: Product[] }) {
  const variantCount: Record<string, number> = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      const product = products.find(
        (p) => p.category === "Comida" && item.name.startsWith(p.name)
      );
      if (!product) continue;

      const suffix = item.name.slice(product.name.length).trim().toLowerCase();
      let matchedLabel: string | null = null;

      for (const vk of Object.keys(product.ingredientMap)) {
        const dashIdx    = vk.lastIndexOf("-");
        const sizeKey    = dashIdx >= 0 ? vk.slice(0, dashIdx)   : vk;
        const fillingKey = dashIdx >= 0 ? vk.slice(dashIdx + 1)  : "none";

        const sizeMatch    = sizeKey    === "single" || suffix.includes(sizeKey.toLowerCase());
        const fillingMatch = fillingKey === "none"   || suffix.includes(fillingKey.toLowerCase());

        if (sizeMatch && fillingMatch) {
          const sizeLabel    = sizeKey    !== "single" ? sizeKey.charAt(0).toUpperCase()    + sizeKey.slice(1)    : null;
          const fillingLabel = fillingKey !== "none"   ? fillingKey.charAt(0).toUpperCase() + fillingKey.slice(1) : null;
          matchedLabel = [sizeLabel, fillingLabel].filter(Boolean).join(" · ");
          break;
        }
      }

      if (!matchedLabel) {
        matchedLabel = suffix
          ? suffix.charAt(0).toUpperCase() + suffix.slice(1)
          : "Sin variante";
      }

      variantCount[matchedLabel] = (variantCount[matchedLabel] ?? 0) + item.quantity;
    }
  }

  const rows = Object.entries(variantCount)
    .map(([label, qty]) => ({ label, qty }))
    .sort((a, b) => b.qty - a.qty);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin datos de variantes para este período.</p>
        <p className="text-[10px] text-amber-800">
          Asegúrate de haber configurado ingredientes por variante en el Inventario.
        </p>
      </div>
    );
  }

  const maxQty  = rows[0].qty;
  const total   = rows.reduce((s, r) => s + r.qty, 0);

  const BAR_COLORS = [
    "bg-amber-500", "bg-orange-500", "bg-red-500",
    "bg-yellow-500", "bg-lime-500",  "bg-teal-500",
    "bg-blue-500",  "bg-violet-500", "bg-pink-500",
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] text-amber-700">
        Unidades totales vendidas por combinación de tamaño y relleno, todos los productos.
      </p>
      <div className="flex flex-col gap-3">
        {rows.map(({ label, qty }, idx) => {
          const barColor  = BAR_COLORS[idx % BAR_COLORS.length];
          const textColor = barColor.replace("bg-", "text-");
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-200 font-semibold">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-amber-700 tabular-nums">
                    {((qty / total) * 100).toFixed(0)}%
                  </span>
                  <span className={`font-bold tabular-nums text-sm ${textColor}`}>
                    ×{qty}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-amber-900/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${(qty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-amber-800 text-right pt-1 border-t border-amber-800/40">
        Total: {total} unidades
      </p>
    </div>
  );
}

// ── Top Products Section ──────────────────────────────────────────────────────
type SortMode = "revenue" | "quantity";

function TopProductsSection({ productTotals }: { productTotals: Record<string, { quantity: number; revenue: number }> }) {
  const [sortMode, setSortMode] = useState<SortMode>("revenue");

  const topProducts = Object.entries(productTotals)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => sortMode === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity)
    .slice(0, 5);

  const maxVal = topProducts.length > 0
    ? (sortMode === "revenue" ? topProducts[0].revenue : topProducts[0].quantity)
    : 1;

  return (
    <SectionCard title="🏆 Productos más vendidos">
      <div className="flex bg-amber-900/40 border border-amber-800 rounded-lg p-0.5 gap-0.5 self-start">
        {([["revenue", "💰 Recaudado"], ["quantity", "🔢 Cantidad"]] as [SortMode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortMode(key)}
            className={`py-1.5 px-3 rounded-md text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
              sortMode === key
                ? "bg-amber-500 text-amber-950"
                : "text-amber-700 hover:text-amber-500"
            }`}
          >
            {label}
          </button>
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
                  <span className={`text-xs shrink-0 tabular-nums font-semibold ${sortMode === "quantity" ? "text-amber-400" : "text-amber-700"}`}>
                    ×{quantity}
                  </span>
                  <span className={`text-sm font-bold tabular-nums shrink-0 w-16 text-right ${sortMode === "revenue" ? "text-amber-400" : "text-amber-500"}`}>
                    ${revenue.toFixed(2)}
                  </span>
                </div>
                <div className="ml-7 h-1.5 bg-amber-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${sortMode === "revenue" ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${(barVal / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Order Type Section ────────────────────────────────────────────────────────
function OrderTypeSection({ sales }: { sales: Sale[] }) {
  const servir = sales.filter((s) => s.orderType === "servir" || !s.orderType).length;
  const llevar = sales.filter((s) => s.orderType === "llevar").length;
  const total  = sales.length;

  if (total === 0) return null;

  const pctServir = total > 0 ? (servir / total) * 100 : 0;
  const pctLlevar = total > 0 ? (llevar / total) * 100 : 0;

  const revenueServir = sales
    .filter((s) => s.orderType === "servir" || !s.orderType)
    .reduce((acc, s) => acc + s.total, 0);
  const revenueLlevar = sales
    .filter((s) => s.orderType === "llevar")
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <SectionCard title="🍽️ Servir vs 🛍️ Llevar">
      <div className="flex flex-col gap-4">
        {[
          { label: "Para servir", emoji: "🍽️", count: servir, pct: pctServir, revenue: revenueServir, bar: "bg-amber-500" },
          { label: "Para llevar", emoji: "🛍️", count: llevar, pct: pctLlevar, revenue: revenueLlevar, bar: "bg-teal-500" },
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
    if (!userMap[key]) {
      userMap[key] = { displayName: name, count: 0, total: 0, methods: {} };
    }
    userMap[key].count++;
    userMap[key].total += sale.total;
    const m = sale.paymentMethod;
    userMap[key].methods[m] = (userMap[key].methods[m] ?? 0) + 1;
  }

  const rows = Object.entries(userMap).sort((a, b) => b[1].total - a[1].total);

  if (rows.length === 0) {
    return <p className="text-amber-700 text-sm">Sin datos para este período.</p>;
  }

  const maxTotal = rows[0][1].total || 1;

  const AVATAR_COLORS = [
    "bg-amber-700 border-amber-600",
    "bg-blue-800 border-blue-700",
    "bg-purple-800 border-purple-700",
    "bg-teal-800 border-teal-700",
    "bg-rose-800 border-rose-700",
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] text-amber-700">
        Resumen de actividad por cajero en el período seleccionado.
      </p>
      {rows.map(([, data], idx) => {
        const pct = (data.total / maxTotal) * 100;
        const avgTicket = data.count > 0 ? data.total / data.count : 0;
        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const initial = data.displayName.charAt(0).toUpperCase();

        return (
          <div
            key={idx}
            className="bg-amber-900/20 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${avatarColor}`}>
                <span className="text-sm font-bold text-white">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-100 truncate">{data.displayName}</p>
                <p className="text-[10px] text-amber-700">
                  {data.count} venta{data.count !== 1 ? "s" : ""} · ticket prom. ${avgTicket.toFixed(2)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-amber-400 tabular-nums">${data.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Bar */}
            <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Payment method breakdown */}
            <div className="flex gap-3 flex-wrap">
              {Object.entries(data.methods).map(([method, count]) => {
                const info = PAYMENT_LABELS[method as PaymentMethod];
                if (!info) return null;
                return (
                  <span
                    key={method}
                    className="text-[10px] font-bold uppercase tracking-widest border rounded-full px-2.5 py-0.5 text-amber-300 border-amber-700 bg-amber-900/40"
                  >
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportePage() {
  const [sales]       = useLocalStorage<Sale[]>      ("abuelo-sales",       []);
  const [products]    = useLocalStorage<Product[]>   ("abuelo-products",    []);
  const [ingredients] = useLocalStorage<Ingredient[]>("abuelo-ingredients", []);
  const [period, setPeriod] = useState<Period>("week");

  // Current month as default: "YYYY-MM"
  const nowYM = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();
  const [selectedMonth, setSelectedMonth] = useState<string>(nowYM);

  const availableMonths = getAvailableMonths(sales);
  // Ensure current month is always in the list even if no sales yet
  const monthOptions = availableMonths.includes(nowYM)
    ? availableMonths
    : [nowYM, ...availableMonths];

  const periodSales = getPeriodSales(sales, period, selectedMonth);
  const prevSales   = getPrevPeriodSales(sales, period, selectedMonth);

  const total       = periodSales.reduce((s, x) => s + x.total, 0);
  const prevTotal   = prevSales.reduce((s, x) => s + x.total, 0);
  const delivered   = periodSales.filter((s) => s.status === "delivered").length;
  const pending     = periodSales.filter((s) => s.status !== "delivered").length;
  const avgTicket   = periodSales.length > 0 ? total / periodSales.length : 0;
  const prevAvg     = prevSales.length > 0 ? prevTotal / prevSales.length : 0;

  const byPayment = (["efectivo", "transferencia", "deuna"] as PaymentMethod[]).map((m) => {
    const f = periodSales.filter((s) => s.paymentMethod === m);
    return { method: m, count: f.length, total: f.reduce((s, x) => s + x.total, 0) };
  });

  const productTotals: Record<string, { quantity: number; revenue: number }> = {};
  for (const sale of periodSales)
    for (const item of sale.items) {
      if (!productTotals[item.name]) productTotals[item.name] = { quantity: 0, revenue: 0 };
      productTotals[item.name].quantity += item.quantity;
      productTotals[item.name].revenue  += item.price * item.quantity;
    }

  // Chart config
  const chartDays      = period === "today" || period === "yesterday" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 14;
  const chartEndOffset = period === "yesterday" ? 1 : 0;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today",     label: "Hoy"    },
    { key: "yesterday", label: "Ayer"   },
    { key: "week",      label: "7 días" },
    { key: "month",     label: "Mes"    },
    { key: "all",       label: "Total"  },
  ];

  // Prev month label for "comparativa" title
  const prevMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1); // m-2 because month is 1-indexed and we want previous
    return prev.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  })();

  const prevLabel: Record<Period, string> = {
    today:     "ayer",
    yesterday: "anteayer",
    week:      "semana pasada",
    month:     prevMonthLabel,
    all:       "—",
  };

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

        {/* Month picker — only shown when period === "month" */}
        {period === "month" && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Seleccionar mes</p>
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

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Ventas"       value={String(periodSales.length)} accent="amber"  delta={delta(periodSales.length, prevSales.length)} />
          <StatCard label="Recaudado"    value={`$${total.toFixed(2)}`}     accent="green"  delta={delta(total, prevTotal)} />
          <StatCard label="Ticket prom." value={`$${avgTicket.toFixed(2)}`} accent="blue"   delta={delta(avgTicket, prevAvg)} />
          <StatCard label="Pendientes"   value={String(pending)}            accent="purple" sub={`${delivered} entregados`} />
        </div>

        {/* Gráfico de ventas por día */}
        <SectionCard title="📈 Ventas por día">
          {periodSales.length === 0
            ? <p className="text-amber-700 text-sm">Sin datos para este período.</p>
            : <DailyBarChart
                sales={periodSales}
                days={chartDays}
                endOffset={chartEndOffset}
                monthYM={period === "month" ? selectedMonth : undefined}
              />
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

        {/* Servir vs Llevar */}
        {periodSales.length > 0 && <OrderTypeSection sales={periodSales} />}

        {/* Métodos de pago */}
        <SectionCard title="💳 Métodos de pago">
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
        </SectionCard>

        {/* Productos más vendidos */}
        <TopProductsSection productTotals={productTotals} />

        {/* Consumo de ingredientes */}
        {ingredients.length > 0 && (
          <SectionCard title="🧂 Consumo de ingredientes (Comida)">
            <IngredientesSection sales={periodSales} products={products} ingredients={ingredients} />
          </SectionCard>
        )}

        {/* Variantes vendidas */}
        {products.some((p) => Object.keys(p.ingredientMap ?? {}).length > 0) && (
          <SectionCard title="🥟 Combinaciones vendidas (Tamaño · Relleno)">
            <VariantesSection sales={periodSales} products={products} />
          </SectionCard>
        )}
        {/* Ventas por usuario */}
        <SectionCard title="👤 Ventas por usuario">
          <VentasPorUsuario sales={periodSales} />
        </SectionCard>
        
        {/* Historial detallado */}
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