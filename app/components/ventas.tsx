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

export default function Ventas({
  sales,
  onDelete,
}: {
  sales: Sale[];
  onDelete: (id: number) => void;
}) {
  const [filterDate, setFilterDate] = useState<string>("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const filteredSales = filterDate
    ? sales.filter((s) => {
        const d = new Date(s.date);
        const fd = new Date(filterDate);
        return (
          d.getFullYear() === fd.getFullYear() &&
          d.getMonth() === fd.getMonth() &&
          d.getDate() === fd.getDate()
        );
      })
    : sales;

  const todaySales = sales.filter((s) => new Date(s.date) >= today);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);

  const monthSales = sales.filter((s) => new Date(s.date) >= currentMonth);
  const monthRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  const monthName = new Date().toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      {/* Date filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase text-yellow-700 tracking-widest">
          Filtrar por fecha
        </label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer w-full max-w-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1">Hoy</p>
          <p className="text-2xl font-bold text-amber-400">{todaySales.length}</p>
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">Recaudado</p>
          <p className="text-lg font-bold text-amber-400">${todayRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
          <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 capitalize">
            Mes · {monthName}
          </p>
          <p className="text-2xl font-bold text-yellow-500">{monthSales.length}</p>
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
            No hay ventas para la fecha seleccionada.
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