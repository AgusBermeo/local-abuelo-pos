// app/reporte/helpers.ts
//
// Funciones puras de filtrado, cálculo de períodos y formateo. Sin JSX.

import type { Sale, Period } from "./types";

// ── Fechas ────────────────────────────────────────────────────────────────────

export function toLocalDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function lastNDays(n: number, endOffset = 0): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - endOffset - (n - 1 - i));
    return toLocalDateStr(d);
  });
}

// ── Filtrado por período ──────────────────────────────────────────────────────

export function getPeriodSales(
  sales: Sale[],
  period: Period,
  selectedMonth?: string,
): Sale[] {
  const now = new Date();
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "today")
      return toLocalDateStr(d) === toLocalDateStr(now);
    if (period === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return toLocalDateStr(d) === toLocalDateStr(y);
    }
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
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }
    return true;
  });
}

export function getPrevPeriodSales(
  sales: Sale[],
  period: Period,
  selectedMonth?: string,
): Sale[] {
  const now = new Date();
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "today") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return toLocalDateStr(d) === toLocalDateStr(y);
    }
    if (period === "yesterday") {
      const y2 = new Date(now);
      y2.setDate(now.getDate() - 2);
      return toLocalDateStr(d) === toLocalDateStr(y2);
    }
    if (period === "week") {
      const end   = new Date(now); end.setDate(now.getDate() - 7);   end.setHours(23, 59, 59, 999);
      const start = new Date(now); start.setDate(now.getDate() - 13); start.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    }
    if (period === "month") {
      let year: number; let month: number;
      if (selectedMonth) {
        const [y, m] = selectedMonth.split("-").map(Number);
        year = y; month = m - 1;
      } else {
        year = now.getFullYear(); month = now.getMonth();
      }
      const prev = new Date(year, month - 1, 1);
      return (
        d.getFullYear() === prev.getFullYear() &&
        d.getMonth() === prev.getMonth()
      );
    }
    return false;
  });
}

// ── Cálculo de delta ──────────────────────────────────────────────────────────

export function delta(
  curr: number,
  prev: number,
): { pct: number; up: boolean; neutral: boolean } {
  if (prev === 0) return { pct: 0, up: true, neutral: true };
  const pct = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(pct), up: pct >= 0, neutral: false };
}

// ── Meses disponibles ─────────────────────────────────────────────────────────

export function getAvailableMonths(sales: Sale[]): string[] {
  const set = new Set<string>();
  for (const s of sales) {
    const d = new Date(s.date);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
}
