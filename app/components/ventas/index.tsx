// app/components/ventas/index.tsx
//
// Orquestador del módulo Ventas.
// Contiene únicamente estado, lógica de filtrado y cálculo de estadísticas.
// El renderizado está delegado a los subcomponentes de esta carpeta.

"use client";

import { useState } from "react";

import type { Sale, PaymentMethod } from "./types";
import { toLocalDateString } from "./types";

import DateRangeFilter      from "./DateRangeFilter";
import StatsBar             from "./StatsBar";
import SaleCard             from "./SaleCard";
import DeleteSaleModal      from "./DeleteSaleModal";
import UnmarkDeliveredModal from "./UnmarkDeliveredModal";
import EditSaleModal        from "./EditSaleModal";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  sales: Sale[];
  onDelete?: (id: number) => void;
  onMarkDelivered: (id: number) => string | null;
  onUnmarkDelivered: (id: number) => void;
  onEdit?: (id: number, date: Date, paymentMethod: PaymentMethod) => void;
  readOnly?: boolean;
};

// ── Modal de error de stock ───────────────────────────────────────────────────

function StockErrorModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-amber-950 border-2 border-red-700 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-red-400 font-bold text-base uppercase tracking-widest leading-tight">
            Sin stock suficiente
          </h2>
        </div>
        <p className="text-amber-300 text-sm">
          No se puede marcar el pedido como entregado porque faltan productos en inventario:
        </p>
        <div className="flex flex-col gap-1.5 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {message.split("\n").map((line, i) => (
            <p key={i} className="text-red-300 text-xs font-semibold">
              • {line}
            </p>
          ))}
        </div>
        <p className="text-[10px] text-amber-700 uppercase tracking-widest">
          Ingresa stock en Inventario → Ingresar inventario y vuelve a intentarlo.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-red-800 hover:bg-red-700 text-white rounded-xl text-sm font-bold uppercase tracking-widest cursor-pointer transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function Ventas({
  sales,
  onDelete,
  onMarkDelivered,
  onUnmarkDelivered,
  onEdit,
  readOnly = false,
}: Props) {
  const todayStr = toLocalDateString(new Date());

  // ── Estado del filtro ──────────────────────────────────────────────────────

  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // ── Estado de modales ──────────────────────────────────────────────────────

  const [deleteTarget,    setDeleteTarget]    = useState<Sale | null>(null);
  const [unmarkTarget,    setUnmarkTarget]    = useState<Sale | null>(null);
  const [editTarget,      setEditTarget]      = useState<Sale | null>(null);
  const [stockError,      setStockError]      = useState<string | null>(null);

  // ── Handler con captura de error de stock ──────────────────────────────────

  const handleMarkDelivered = (id: number) => {
    const error = onMarkDelivered(id);
    if (error) setStockError(error);
  };

  // ── Lógica de filtrado ─────────────────────────────────────────────────────

  const inRange = (dateStr: string): boolean => {
    if (startDate && endDate) return dateStr >= startDate && dateStr <= endDate;
    if (startDate) return dateStr >= startDate;
    if (endDate)   return dateStr <= endDate;
    return true;
  };

  const filteredSales = (() => {
    const filtered =
      !startDate && !endDate
        ? sales
        : sales.filter((s) => inRange(toLocalDateString(new Date(s.date))));

    return [...filtered].sort((a, b) => {
      const aP = a.status === "pending" || !a.status ? 0 : 1;
      const bP = b.status === "pending" || !b.status ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  })();

  // ── Estadísticas ───────────────────────────────────────────────────────────

  const rangeSales =
    !startDate && !endDate
      ? sales.filter((s) => toLocalDateString(new Date(s.date)) === todayStr)
      : sales.filter((s) => inRange(toLocalDateString(new Date(s.date))));

  const rangeRevenue = rangeSales.reduce((acc, s) => acc + s.total, 0);

  const monthSalesFiltered = (() => {
    if (!startDate && !endDate) {
      const now = new Date();
      return sales.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }
    const months = new Set<string>();
    const cursor = new Date((startDate || endDate) + "T00:00:00");
    const end    = new Date((endDate || startDate) + "T00:00:00");
    while (cursor <= end) {
      months.add(`${cursor.getFullYear()}-${cursor.getMonth()}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return sales.filter((s) => {
      const d = new Date(s.date);
      return months.has(`${d.getFullYear()}-${d.getMonth()}`);
    });
  })();

  const monthRevenue = monthSalesFiltered.reduce((acc, s) => acc + s.total, 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const pendingCount = sales.filter((s) => s.status === "pending" || !s.status).length;

  // ── Etiquetas ──────────────────────────────────────────────────────────────

  const rangeLabel = (() => {
    if (!startDate && !endDate) return "Hoy";
    if (startDate === endDate && startDate)
      return new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", {
        day: "numeric", month: "long", year: "numeric",
      });
    const s = startDate
      ? new Date(startDate + "T00:00:00").toLocaleDateString("es-EC", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "…";
    const e = endDate
      ? new Date(endDate + "T00:00:00").toLocaleDateString("es-EC", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "…";
    return `${s} – ${e}`;
  })();

  const monthLabel = (() => {
    if (!startDate && !endDate)
      return new Date().toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    const start = new Date((startDate || endDate) + "T00:00:00");
    const end   = new Date((endDate || startDate) + "T00:00:00");
    if (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()
    )
      return start.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    const sL = start.toLocaleDateString("es-EC", {
      month: "long",
      ...(start.getFullYear() !== end.getFullYear() ? { year: "numeric" } : {}),
    });
    const eL = end.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    return `${sL} – ${eL}`;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">

      {/* Banner de pedidos pendientes */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-900/40 border-2 border-yellow-600 rounded-lg px-4 py-3">
          <span className="text-xl leading-none">🕐</span>
          <p className="text-sm text-yellow-300">
            Tienes{" "}
            <span className="text-yellow-400">
              {pendingCount} pedido{pendingCount !== 1 ? "s" : ""}
            </span>{" "}
            pendiente{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Aviso solo lectura */}
      {readOnly && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800 rounded-lg px-4 py-3">
          <span className="text-base leading-none">👁️</span>
          <p className="text-xs text-amber-700 uppercase tracking-widest font-bold">
            Modo solo lectura — no puedes modificar ventas
          </p>
        </div>
      )}

      {/* Filtro de fechas */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onChangeStart={setStartDate}
        onChangeEnd={setEndDate}
        onSetToday={() => { setStartDate(todayStr); setEndDate(todayStr); }}
        onClear={() => { setStartDate(""); setEndDate(""); }}
      />

      {/* Estadísticas */}
      <StatsBar
        rangeLabel={rangeLabel}
        rangeSalesCount={rangeSales.length}
        rangeRevenue={rangeRevenue}
        monthLabel={monthLabel}
        monthSalesCount={monthSalesFiltered.length}
        monthRevenue={monthRevenue}
        totalSalesCount={sales.length}
        totalRevenue={totalRevenue}
      />

      {/* Lista de ventas */}
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
            <SaleCard
              key={sale.id}
              sale={sale}
              readOnly={readOnly || !onEdit || !onDelete}
              onMarkDelivered={handleMarkDelivered}
              onOpenUnmark={setUnmarkTarget}
              onOpenEdit={onEdit ? setEditTarget : () => {}}
              onOpenDelete={onDelete ? setDeleteTarget : () => {}}
            />
          ))
        )}
      </div>

      {/* Botón flotante a Reporte */}
      <button
        onClick={() => window.location.href = "/reporte"}
        className="fixed cursor-pointer bottom-6 right-6 bg-amber-500 hover:bg-amber-400 text-amber-950 py-3 px-4 rounded-md shadow-lg flex items-center gap-2 text-sm font-bold transition-colors"
      >
        📊 Reporte
      </button>

      {/* Modal error de stock */}
      {stockError && (
        <StockErrorModal
          message={stockError}
          onClose={() => setStockError(null)}
        />
      )}

      {/* Modales */}
      {deleteTarget && !readOnly && onDelete && (
        <DeleteSaleModal
          sale={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDelete}
        />
      )}

      {unmarkTarget && (
        <UnmarkDeliveredModal
          sale={unmarkTarget}
          onClose={() => setUnmarkTarget(null)}
          onConfirm={onUnmarkDelivered}
        />
      )}

      {editTarget && !readOnly && onEdit && (
        <EditSaleModal
          sale={editTarget}
          onClose={() => setEditTarget(null)}
          onConfirm={onEdit}
        />
      )}
    </div>
  );
}