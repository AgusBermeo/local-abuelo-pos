// app/reporte/RecordsSection.tsx
//
// Muestra los récords de ventas: día/semana/mes que más se vendió.
// Permite filtrar por semana, mes y año.

import { useState } from "react";
import type { Sale } from "./types";

type Props = { sales: Sale[] };

type ViewMode = "semana" | "mes" | "año";

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekStart(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysToFirstMonday = (8 - (jan1.getDay() || 7)) % 7;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
  return weekStart;
}

function formatDayFull(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-EC", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", {
    month: "long", year: "numeric",
  });
}

// ── Cálculo de récords ────────────────────────────────────────────────────────

type DayRecord = { dateStr: string; revenue: number; count: number };
type PeriodRecord = { label: string; revenue: number; count: number; bestDay: DayRecord | null };

function getDayRecords(sales: Sale[]): Record<string, DayRecord> {
  const map: Record<string, DayRecord> = {};
  for (const s of sales) {
    const k = toLocalDateStr(new Date(s.date));
    if (!map[k]) map[k] = { dateStr: k, revenue: 0, count: 0 };
    map[k].revenue += s.total;
    map[k].count++;
  }
  return map;
}

function getBestDay(dayMap: Record<string, DayRecord>, keys: string[]): DayRecord | null {
  let best: DayRecord | null = null;
  for (const k of keys) {
    if (!dayMap[k]) continue;
    if (!best || dayMap[k].revenue > best.revenue) best = dayMap[k];
  }
  return best;
}

// ── Opciones disponibles ──────────────────────────────────────────────────────

function getAvailableYears(sales: Sale[]): number[] {
  const set = new Set<number>();
  for (const s of sales) set.add(new Date(s.date).getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}

function getAvailableMonths(sales: Sale[]): string[] {
  const set = new Set<string>();
  for (const s of sales) {
    const d = new Date(s.date);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

function getAvailableWeeks(sales: Sale[], year: number): Array<{ year: number; week: number; label: string }> {
  const set = new Set<string>();
  for (const s of sales) {
    const d = new Date(s.date);
    if (d.getFullYear() !== year) continue;
    const w = getWeekNumber(d);
    set.add(`${year}-${w}`);
  }
  return Array.from(set)
    .map((k) => {
      const [y, w] = k.split("-").map(Number);
      const start = getWeekStart(y, w);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const label = `Semana ${w} · ${start.toLocaleDateString("es-EC", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("es-EC", { day: "numeric", month: "short" })}`;
      return { year: y, week: w, label };
    })
    .sort((a, b) => b.week - a.week);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function RecordsSection({ sales }: Props) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowYM = `${nowYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nowWeek = getWeekNumber(now);

  const [mode, setMode] = useState<ViewMode>("mes");
  const [selectedYear, setSelectedYear]   = useState<number>(nowYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(nowYM);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(`${nowYear}-${nowWeek}`);

  const availableYears  = getAvailableYears(sales);
  const availableMonths = getAvailableMonths(sales);

  // Weeks for the year selector (used in semana mode)
  const weekYear = parseInt(selectedWeekKey.split("-")[0]);
  const availableWeeks = getAvailableWeeks(sales, weekYear || nowYear);

  const dayMap = getDayRecords(sales);

  // ── Calcular récord global (mejor día de todos) ────────────────────────────

  const allDays = Object.values(dayMap);
  const globalBestDay = allDays.length > 0
    ? allDays.reduce((a, b) => b.revenue > a.revenue ? b : a)
    : null;

  // ── Calcular récord del período seleccionado ───────────────────────────────

  let periodRecord: PeriodRecord | null = null;
  let periodTitle = "";

  if (mode === "semana") {
    const [wy, wn] = selectedWeekKey.split("-").map(Number);
    const weekStart = getWeekStart(wy, wn);
    const daysInWeek: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      daysInWeek.push(toLocalDateStr(d));
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    periodTitle = `Semana ${wn} · ${weekStart.toLocaleDateString("es-EC", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}`;

    const weekSales = sales.filter((s) => daysInWeek.includes(toLocalDateStr(new Date(s.date))));
    const weekRevenue = weekSales.reduce((a, s) => a + s.total, 0);
    const bestDay = getBestDay(dayMap, daysInWeek);

    // Mejor semana del año para comparar
    const allWeeksInYear = getAvailableWeeks(sales, wy);
    let bestWeek: { week: number; revenue: number } | null = null;
    for (const { week } of allWeeksInYear) {
      const ws = getWeekStart(wy, week);
      const wdays: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d2 = new Date(ws); d2.setDate(d2.getDate() + i);
        wdays.push(toLocalDateStr(d2));
      }
      const rev = sales.filter((s) => wdays.includes(toLocalDateStr(new Date(s.date)))).reduce((a, s) => a + s.total, 0);
      if (!bestWeek || rev > bestWeek.revenue) bestWeek = { week, revenue: rev };
    }
    const isBestWeek = bestWeek?.week === wn;

    periodRecord = {
      label: periodTitle,
      revenue: weekRevenue,
      count: weekSales.length,
      bestDay,
    };
    // attach bestWeek info via extra field trick
    (periodRecord as any).isBestPeriod = isBestWeek;
    (periodRecord as any).bestPeriodRevenue = bestWeek?.revenue ?? 0;
    (periodRecord as any).periodType = "semana";
  }

  if (mode === "mes") {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthDays: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      monthDays.push(`${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
    }
    periodTitle = formatMonth(selectedMonth);

    const monthSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const monthRevenue = monthSales.reduce((a, s) => a + s.total, 0);
    const bestDay = getBestDay(dayMap, monthDays);

    // Mejor mes global
    const allMonthRevenues: Record<string, number> = {};
    for (const s of sales) {
      const d = new Date(s.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      allMonthRevenues[k] = (allMonthRevenues[k] ?? 0) + s.total;
    }
    const bestMonthRev = Math.max(...Object.values(allMonthRevenues), 0);
    const isBestMonth = allMonthRevenues[selectedMonth] === bestMonthRev && bestMonthRev > 0;

    periodRecord = {
      label: periodTitle,
      revenue: monthRevenue,
      count: monthSales.length,
      bestDay,
    };
    (periodRecord as any).isBestPeriod = isBestMonth;
    (periodRecord as any).bestPeriodRevenue = bestMonthRev;
    (periodRecord as any).periodType = "mes";
  }

  if (mode === "año") {
    const yearSales = sales.filter((s) => new Date(s.date).getFullYear() === selectedYear);
    const yearRevenue = yearSales.reduce((a, s) => a + s.total, 0);
    periodTitle = String(selectedYear);

    const yearDays = Object.keys(dayMap).filter((k) => k.startsWith(String(selectedYear)));
    const bestDay = getBestDay(dayMap, yearDays);

    // Mejor mes del año
    const monthRevenues: Record<string, number> = {};
    for (const s of yearSales) {
      const d = new Date(s.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthRevenues[k] = (monthRevenues[k] ?? 0) + s.total;
    }
    const bestMonthEntry = Object.entries(monthRevenues).sort((a, b) => b[1] - a[1])[0];

    // Mejor año global
    const yearRevenues: Record<number, number> = {};
    for (const s of sales) {
      const y2 = new Date(s.date).getFullYear();
      yearRevenues[y2] = (yearRevenues[y2] ?? 0) + s.total;
    }
    const bestYearRev = Math.max(...Object.values(yearRevenues), 0);
    const isBestYear = yearRevenues[selectedYear] === bestYearRev && bestYearRev > 0;

    periodRecord = {
      label: periodTitle,
      revenue: yearRevenue,
      count: yearSales.length,
      bestDay,
    };
    (periodRecord as any).isBestPeriod = isBestYear;
    (periodRecord as any).bestPeriodRevenue = bestYearRev;
    (periodRecord as any).periodType = "año";
    (periodRecord as any).bestMonth = bestMonthEntry ? { ym: bestMonthEntry[0], revenue: bestMonthEntry[1] } : null;
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-amber-700 text-sm">Sin datos de ventas para calcular récords.</p>
      </div>
    );
  }

  const pr = periodRecord as any;

  return (
    <div className="flex flex-col gap-4">

      {/* Récord absoluto: mejor día de todos */}
      {globalBestDay && (
        <div className="bg-gradient-to-r from-amber-900/60 to-yellow-900/40 border-2 border-amber-500 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">🏆</span>
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
              Récord histórico — Mejor día
            </p>
          </div>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <p className="text-lg font-bold text-amber-200 capitalize">
                {formatDayFull(globalBestDay.dateStr)}
              </p>
              <p className="text-[10px] text-amber-700">
                {globalBestDay.count} venta{globalBestDay.count !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-400 tabular-nums shrink-0">
              ${globalBestDay.revenue.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Selector de modo */}
      <div className="flex bg-amber-900/40 border border-amber-800 rounded-xl p-1 gap-1">
        {(["semana", "mes", "año"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${
              mode === m ? "bg-amber-500 text-amber-950" : "text-amber-700 hover:text-amber-500"
            }`}
          >
            {m === "semana" ? "Por semana" : m === "mes" ? "Por mes" : "Por año"}
          </button>
        ))}
      </div>

      {/* Selector específico por modo */}
      {mode === "semana" && (
        <div className="flex flex-col gap-2">
          {/* Selector de año para las semanas */}
          <div className="flex gap-2 flex-wrap">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => {
                  const weeks = getAvailableWeeks(sales, y);
                  if (weeks.length > 0) setSelectedWeekKey(`${weeks[0].year}-${weeks[0].week}`);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest cursor-pointer transition-all ${
                  weekYear === y
                    ? "border-amber-500 bg-amber-500 text-amber-950"
                    : "border-amber-800 text-amber-600 hover:border-amber-600"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <select
            value={selectedWeekKey}
            onChange={(e) => setSelectedWeekKey(e.target.value)}
            className="bg-amber-950/60 border-2 border-amber-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-100 text-sm focus:outline-none transition-colors cursor-pointer"
          >
            {availableWeeks.map(({ year, week, label }) => (
              <option key={`${year}-${week}`} value={`${year}-${week}`}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "mes" && (
        <div className="flex flex-wrap gap-2">
          {(availableMonths.includes(nowYM) ? availableMonths : [nowYM, ...availableMonths]).map((ym) => (
            <button
              key={ym}
              onClick={() => setSelectedMonth(ym)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-widest cursor-pointer transition-all ${
                selectedMonth === ym
                  ? "border-amber-500 bg-amber-500 text-amber-950"
                  : "border-amber-800 text-amber-600 hover:border-amber-600 hover:text-amber-400 bg-amber-900/20"
              }`}
            >
              {formatMonth(ym)}
            </button>
          ))}
        </div>
      )}

      {mode === "año" && (
        <div className="flex gap-2 flex-wrap">
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all ${
                selectedYear === y
                  ? "border-amber-500 bg-amber-500 text-amber-950"
                  : "border-amber-800 text-amber-600 hover:border-amber-600 hover:text-amber-400 bg-amber-900/20"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Resultado del período seleccionado */}
      {periodRecord && (
        <div className="flex flex-col gap-3">

          {/* Tarjeta principal del período */}
          <div className={`border-2 rounded-xl p-4 flex flex-col gap-3 ${
            pr.isBestPeriod
              ? "border-yellow-500 bg-yellow-900/20"
              : "border-amber-800 bg-amber-900/20"
          }`}>
            <div className="flex items-center gap-2">
              {pr.isBestPeriod && <span className="text-lg leading-none">🥇</span>}
              <p className="text-[10px] uppercase tracking-widest text-yellow-700 font-bold">
                {mode === "semana" ? "Semana seleccionada" : mode === "mes" ? "Mes seleccionado" : "Año seleccionado"}
              </p>
              {pr.isBestPeriod && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-900/40 border border-yellow-700 rounded-full px-2 py-0.5">
                  ¡Récord!
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-bold text-amber-200 capitalize">
                  {periodRecord.label}
                </p>
                <p className="text-[10px] text-amber-700">
                  {periodRecord.count} venta{periodRecord.count !== 1 ? "s" : ""}
                  {periodRecord.count > 0 && (
                    <span> · ticket prom. ${(periodRecord.revenue / periodRecord.count).toFixed(2)}</span>
                  )}
                </p>
              </div>
              <p className={`text-2xl font-bold tabular-nums shrink-0 ${
                pr.isBestPeriod ? "text-yellow-400" : "text-amber-400"
              }`}>
                ${periodRecord.revenue.toFixed(2)}
              </p>
            </div>

            {/* Barra de progreso vs récord */}
            {pr.bestPeriodRevenue > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] text-amber-800">
                  <span>vs. récord del {mode === "año" ? "histórico" : mode}</span>
                  <span>${pr.bestPeriodRevenue.toFixed(2)}</span>
                </div>
                <div className="h-1.5 bg-amber-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pr.isBestPeriod ? "bg-yellow-400" : "bg-amber-600"
                    }`}
                    style={{ width: `${Math.min(100, (periodRecord.revenue / pr.bestPeriodRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mejor día del período */}
          {periodRecord.bestDay && periodRecord.count > 0 && (
            <div className="border border-amber-800/60 rounded-xl p-3 bg-amber-900/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base leading-none shrink-0">📅</span>
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-yellow-700 font-bold">
                    Mejor día {mode === "semana" ? "de la semana" : mode === "mes" ? "del mes" : "del año"}
                  </p>
                  <p className="text-xs font-bold text-amber-200 capitalize truncate">
                    {formatDayFull(periodRecord.bestDay.dateStr)}
                  </p>
                  <p className="text-[10px] text-amber-700">
                    {periodRecord.bestDay.count} venta{periodRecord.bestDay.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-400 tabular-nums shrink-0">
                ${periodRecord.bestDay.revenue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Mejor mes del año (solo en modo año) */}
          {mode === "año" && pr.bestMonth && (
            <div className="border border-amber-800/60 rounded-xl p-3 bg-amber-900/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base leading-none shrink-0">📆</span>
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-yellow-700 font-bold">
                    Mejor mes del año
                  </p>
                  <p className="text-xs font-bold text-amber-200 capitalize">
                    {formatMonth(pr.bestMonth.ym)}
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-400 tabular-nums shrink-0">
                ${pr.bestMonth.revenue.toFixed(2)}
              </p>
            </div>
          )}

          {/* Sin ventas en el período */}
          {periodRecord.count === 0 && (
            <p className="text-xs text-amber-800 italic text-center py-2">
              Sin ventas en este período.
            </p>
          )}
        </div>
      )}
    </div>
  );
}