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
  status?: "pending" | "delivered";
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
  onMarkDelivered,
  onUnmarkDelivered,
}: {
  sales: Sale[];
  onDelete: (id: number) => void;
  onMarkDelivered: (id: number) => void;
  onUnmarkDelivered: (id: number) => void;
}) {
  const todayStr = toLocalDateString(new Date());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Unmark (revert to pending) confirmation — two-step
  const [unmarkTarget, setUnmarkTarget] = useState<Sale | null>(null);
  const [unmarkStep, setUnmarkStep] = useState<1 | 2>(1);
  const [unmarkConfirmText, setUnmarkConfirmText] = useState("");

  const setToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
  };

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

  const todaySales = (() => {
  return sales.filter((s) => toLocalDateString(new Date(s.date)) === todayStr);
})();

const rangeSales = (() => {
  if (!startDate && !endDate) return todaySales;
  return sales.filter((s) => {
    const d = toLocalDateString(new Date(s.date));
    if (startDate && endDate) return d >= startDate && d <= endDate;
    if (startDate) return d >= startDate;
    if (endDate) return d <= endDate;
    return true;
  });
})();

const rangeRevenue = rangeSales.reduce((acc, s) => acc + s.total, 0);

  const rangeStart = startDate ? new Date(startDate + "T00:00:00") : null;
const rangeEnd = endDate ? new Date(endDate + "T23:59:59") : null;

const monthSalesFiltered = (() => {
  if (!rangeStart && !rangeEnd) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    return sales.filter((s) => new Date(s.date) >= currentMonth);
  }
  return sales.filter((s) => {
    const d = new Date(s.date);
    if (rangeStart && rangeEnd) return d >= rangeStart && d <= rangeEnd;
    if (rangeStart) return d >= rangeStart;
    if (rangeEnd) return d <= rangeEnd;
    return true;
  });
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

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  const rangeLabel = (() => {
  if (!startDate && !endDate) return "Hoy";  // 👈 solo este cambio
  if (startDate === endDate && startDate) {
    return new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", {
      day: "numeric", month: "long", year: "numeric",
    });
  }
  const s = startDate
    ? new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
    : "…";
  const e = endDate
    ? new Date(endDate + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
    : "…";
  return `${s} – ${e}`;
})();


  const hasFilter = startDate || endDate;

  const openUnmarkModal = (sale: Sale) => {
    setUnmarkTarget(sale);
    setUnmarkStep(1);
    setUnmarkConfirmText("");
  };

  const closeUnmarkModal = () => {
    setUnmarkTarget(null);
    setUnmarkStep(1);
    setUnmarkConfirmText("");
  };

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
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 capitalize leading-tight">
            {rangeLabel}
          </p>
          <p className="text-2xl font-bold text-amber-400">{rangeSales.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-amber-400">${rangeRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 capitalize leading-tight">
            {monthLabel}
          </p>
          <p className="text-2xl font-bold text-yellow-500">{monthSalesFiltered.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-yellow-500">${monthRevenue.toFixed(2)}</p>
        </div>

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
          filteredSales.map((sale) => {
            const isDelivered = sale.status === "delivered";
            return (
              <div
                key={sale.id}
                className={`border-2 rounded-lg p-4 transition-colors ${
                  isDelivered
                    ? "bg-green-950/20 border-green-900"
                    : (() => {
                        const minutesAgo = (Date.now() - new Date(sale.date).getTime()) / 60000;
                        if (minutesAgo > 1440) return "bg-red-950/20 border-red-700";
                        if (minutesAgo > 720)   return "bg-orange-950 border-orange-700";
                        return "bg-amber-900/30 border-amber-800";
                      })()
                }`}
              >
                {/* Header row: date + total + delete */}
                <div className="flex items-center justify-between mb-2">
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
                      onClick={() => { setDeleteTarget(sale); setDeleteConfirmText(""); }}
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

                {/* Status row */}
                <div className="flex items-center justify-between mb-3">
                  {isDelivered ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-900/40 border border-green-700 rounded-full px-3 py-1">
                      ✅ Entregado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded-full px-3 py-1">
                      🕐 Pendiente
                    </span>
                  )}

                  {isDelivered ? (
                    <button
                      onClick={() => openUnmarkModal(sale)}
                      className="text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full bg-transparent border border-green-800 hover:border-yellow-700 text-green-700 hover:text-yellow-500 cursor-pointer transition-colors"
                    >
                      ↩ Deshacer entrega
                    </button>
                  ) : (
                    <button
                      onClick={() => onMarkDelivered(sale.id)}
                      className="text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full bg-green-800 hover:bg-green-700 border border-green-700 text-green-100 cursor-pointer transition-colors"
                    >
                      ✓ Marcar entregado
                    </button>
                  )}
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
            );
          })
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
          />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar venta</h2>
            </div>
            <p className="text-amber-200 text-sm">
              Estás a punto de eliminar la venta del{" "}
              <span className="font-bold text-amber-400">
                {new Date(deleteTarget.date).toLocaleDateString("es-EC", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>{" "}
              por <span className="font-bold text-amber-400">${deleteTarget.total.toFixed(2)}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">
                Escribe <span className="font-bold text-red-400">eliminar venta</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="eliminar venta"
                className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleteConfirmText.trim().toLowerCase() !== "eliminar venta"}
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  deleteConfirmText.trim().toLowerCase() === "eliminar venta"
                    ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-red-950/40 text-red-900 cursor-not-allowed"
                }`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmark delivered — two-step confirmation modal */}
      {unmarkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeUnmarkModal}
          />
          <div className="relative bg-amber-950 border-2 border-yellow-700 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">↩</span>
              <div className="flex flex-col">
                <h2 className="text-yellow-400 font-bold text-base uppercase tracking-widest leading-tight">
                  Deshacer entrega
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-yellow-700">
                  Paso {unmarkStep} de 2
                </p>
              </div>
            </div>

            {/* Step 1: first confirmation */}
            {unmarkStep === 1 && (
              <>
                <p className="text-amber-200 text-sm">
                  ¿Estás seguro de que quieres revertir el pedido del{" "}
                  <span className="font-bold text-amber-400">
                    {new Date(unmarkTarget.date).toLocaleDateString("es-EC", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>{" "}
                  por <span className="font-bold text-amber-400">${unmarkTarget.total.toFixed(2)}</span> a estado{" "}
                  <span className="font-bold text-yellow-400">Pendiente</span>?
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeUnmarkModal}
                    className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setUnmarkStep(2)}
                    className="flex-1 py-2.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
                  >
                    Sí, continuar
                  </button>
                </div>
              </>
            )}

            {/* Step 2: type "pendiente" to confirm */}
            {unmarkStep === 2 && (
              <>
                <p className="text-amber-200 text-sm">
                  Esta acción marcará el pedido como <span className="font-bold text-yellow-400">Pendiente</span> nuevamente.
                  Escribe la palabra de confirmación para proceder.
                </p>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-yellow-600">
                    Escribe <span className="font-bold text-yellow-400">pendiente</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={unmarkConfirmText}
                    onChange={(e) => setUnmarkConfirmText(e.target.value)}
                    placeholder="pendiente"
                    autoFocus
                    className="bg-amber-950/60 border-2 border-yellow-900 focus:border-yellow-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setUnmarkStep(1)}
                    className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                  >
                    ← Volver
                  </button>
                  <button
                    disabled={unmarkConfirmText.trim().toLowerCase() !== "pendiente"}
                    onClick={() => {
                      onUnmarkDelivered(unmarkTarget.id);
                      closeUnmarkModal();
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                      unmarkConfirmText.trim().toLowerCase() === "pendiente"
                        ? "bg-yellow-700 hover:bg-yellow-600 text-white cursor-pointer"
                        : "bg-yellow-950/40 text-yellow-900 cursor-not-allowed"
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}