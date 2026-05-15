"use client";

import { useState } from "react";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type Sale = {
  id: number;
  date: Date;
  items: OrderItem[];
  total: number;
};

function getEmoji(name: string) {
  if (name.toLowerCase().includes("empanada") || name.toLowerCase().includes("bandeja"))
    return "🥟";
  if (name.toLowerCase().includes("café") || name.toLowerCase().includes("aromática") || name.toLowerCase().includes("infusión"))
    return "☕";
  if (name.toLowerCase().includes("gaseosa")) return "🥤";
  if (name.toLowerCase().includes("agua")) return "💧";
  if (name.toLowerCase().includes("cerveza")) return "🍺";
  return "🍽️";
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthLabel(startDate: Date, endDate: Date): string {
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  const startLabel = startDate.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  const endLabel = endDate.toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  if (startMonth === endMonth && startYear === endYear) {
    return startLabel;
  }
  return `${startLabel} – ${endLabel}`;
}

export default function Ventas({
  sales,
  onDelete,
}: {
  sales: Sale[];
  onDelete: (id: number) => void;
}) {
  const todayStr = toLocalDateString(new Date());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const setToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  // Sales filtered by selected range (for the list)
  const filteredSales = (() => {
    if (!startDate && !endDate) return sales;
    return sales.filter((s) => {
      const d = toLocalDateString(new Date(s.date));
      if (startDate && endDate) return d >= startDate && d <= endDate;
      if (startDate) return d >= startDate;
      if (endDate) return d <= endDate;
      return true;
    });
  })();

  // Stats: range block
  const rangeStart = startDate ? new Date(startDate + "T00:00:00") : null;
  const rangeEnd = endDate ? new Date(endDate + "T23:59:59") : null;

  const rangeSales = (() => {
    if (!rangeStart && !rangeEnd) return sales;
    return sales.filter((s) => {
      const d = new Date(s.date);
      if (rangeStart && rangeEnd) return d >= rangeStart && d <= rangeEnd;
      if (rangeStart) return d >= rangeStart;
      if (rangeEnd) return d <= rangeEnd;
      return true;
    });
  })();
  const rangeRevenue = rangeSales.reduce((acc, s) => acc + s.total, 0);

  // Stats: month(s) block — based on selected range
  const monthSalesFiltered = (() => {
    if (!rangeStart && !rangeEnd) {
      // Default: current month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      return sales.filter((s) => new Date(s.date) >= currentMonth);
    }
    // Use same range as selected
    return rangeSales;
  })();
  const monthRevenue = monthSalesFiltered.reduce((acc, s) => acc + s.total, 0);

  const monthLabel = (() => {
    if (!rangeStart && !rangeEnd) {
      return new Date().toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    }
    const start = rangeStart ?? (rangeSales.length > 0 ? new Date(rangeSales[rangeSales.length - 1].date) : new Date());
    const end = rangeEnd ?? new Date();
    return formatMonthLabel(start, end);
  })();

  // Stats: global
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  const rangeLabel = (() => {
    if (!startDate && !endDate) return "Total Global";
    if (startDate === endDate && startDate) {
      return new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", {
        day: "numeric", month: "long", year: "numeric",
      });
    }
    const s = startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }) : "…";
    const e = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }) : "…";
    return `${s} – ${e}`;
  })();

  const hasFilter = startDate || endDate;

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* Date range filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase text-yellow-700 tracking-widest">
          Filtrar por rango de fechas
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-yellow-700 tracking-widest">Desde</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-yellow-700 tracking-widest">Hasta</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
            />
          </div>
          <button
            onClick={setToday}
            className="py-2.5 px-4 bg-amber-700 hover:bg-amber-600 border-2 border-amber-700 hover:border-amber-600 text-amber-100 text-xs font-bold rounded-lg uppercase tracking-widest cursor-pointer transition-colors"
          >
            Hoy
          </button>
          {hasFilter && (
            <button
              onClick={clearFilter}
              className="py-2.5 px-4 bg-amber-900/50 hover:bg-amber-800 border-2 border-amber-800 text-amber-500 text-xs font-bold rounded-lg uppercase tracking-widest cursor-pointer transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* Block 1: selected range (or all-time if no filter) */}
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 capitalize leading-tight">
            {rangeLabel}
          </p>
          <p className="text-2xl font-bold text-amber-400">{rangeSales.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-amber-400">${rangeRevenue.toFixed(2)}</p>
        </div>

        {/* Block 2: month(s) */}
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 capitalize leading-tight">
            {monthLabel}
          </p>
          <p className="text-2xl font-bold text-yellow-500">{monthSalesFiltered.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-yellow-500">${monthRevenue.toFixed(2)}</p>
        </div>

        {/* Block 3: global total */}
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1">Total Global</p>
          <p className="text-2xl font-bold text-purple-400">{sales.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-purple-400">${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales list */}
      <div className="flex flex-col gap-3">
        {sales.length === 0 ? (
          <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">
            Aún no hay ventas registradas. ¡Cobra tu primer pedido!
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">
            No hay ventas para el rango de fechas seleccionado.
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4"
            >
              {/* Sale header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-yellow-700">
                  <span>🗓️</span>
                  <span>
                    {new Date(sale.date).toLocaleDateString("es-EC", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(sale.date).toLocaleTimeString("es-EC", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">${sale.total.toFixed(2)}</span>
                  <button
                    onClick={() => onDelete(sale.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md border-2 border-amber-600 hover:bg-amber-800 text-amber-500 transition-colors cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-amber-100">
                      {getEmoji(item.name)} {item.name} ×{item.quantity}
                    </span>
                    <span className="text-yellow-700">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}