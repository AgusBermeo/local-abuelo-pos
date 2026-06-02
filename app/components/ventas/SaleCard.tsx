// app/components/ventas/SaleCard.tsx
//
// Tarjeta de una venta individual: cabecera, badges de estado/pago/tipo,
// lista de ítems, desglose IVA + envío, y botones de acción.

import type { Sale, PaymentMethod } from "./types";
import { PAYMENT_LABELS, ORDER_TYPE_LABELS, toLocalDateString, getItemEmoji } from "./types";

type Props = {
  sale: Sale;
  readOnly: boolean;
  onMarkDelivered: (id: number) => void;
  onOpenUnmark: (sale: Sale) => void;
  onOpenEdit: (sale: Sale) => void;
  onOpenDelete: (sale: Sale) => void;
};

// ── Icono editar ──────────────────────────────────────────────────────────────

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

// ── Icono borrar ──────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SaleCard({
  sale,
  readOnly,
  onMarkDelivered,
  onOpenUnmark,
  onOpenEdit,
  onOpenDelete,
}: Props) {
  const isDelivered = sale.status === "delivered";
  const payment     = sale.paymentMethod ? PAYMENT_LABELS[sale.paymentMethod] : null;
  const hasTax      = typeof sale.tax === "number" && sale.tax > 0;
  const subtotalBeforeTax = hasTax ? sale.total - sale.tax! : null;
  const orderTypeInfo = sale.orderType ? ORDER_TYPE_LABELS[sale.orderType] : null;
  const hasDeliveryCost = typeof sale.deliveryCost === "number" && sale.deliveryCost > 0;

  // Color del borde según antigüedad del pedido pendiente
  const cardBorder = isDelivered
    ? "bg-green-950/20 border-green-900"
    : (() => {
        const minutesAgo = (Date.now() - new Date(sale.date).getTime()) / 60000;
        if (minutesAgo > 1440) return "bg-red-950/20 border-red-700";
        if (minutesAgo > 720)  return "bg-orange-950 border-orange-700";
        return "bg-amber-900/30 border-amber-800";
      })();

  return (
    <div className={`border-2 rounded-lg p-4 transition-colors ${cardBorder}`}>

      {/* ── Fila superior: fecha + total + botones de acción ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-yellow-700 flex-wrap">
          <span>🗓️</span>
          <span>
            {new Date(sale.date).toLocaleDateString("es-EC", {
              day: "numeric", month: "numeric", year: "numeric",
            })}{" "}
            ·{" "}
            {new Date(sale.date).toLocaleTimeString("es-EC", {
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          {sale.soldBy && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-900/40 border border-amber-800 rounded-full px-2 py-0.5">
              👤 {sale.soldBy.displayName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400">${sale.total.toFixed(2)}</span>
          {!readOnly && (
            <>
              <button
                onClick={() => onOpenEdit(sale)}
                className="w-8 h-8 flex items-center justify-center rounded-md border-2 border-amber-600 hover:bg-amber-800 text-amber-500 transition-colors cursor-pointer"
              >
                <EditIcon />
              </button>
              <button
                onClick={() => onOpenDelete(sale)}
                className="w-8 h-8 flex items-center justify-center rounded-md border-2 border-amber-600 hover:bg-amber-800 text-amber-500 transition-colors cursor-pointer"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Fila de badges: estado + pago + tipo + botón entregar ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isDelivered ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-900/40 border border-green-700 rounded-full px-3 py-1">
              ✅ Entregado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded-full px-3 py-1">
              🕐 Pendiente
            </span>
          )}
          {payment && (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border rounded-full px-3 py-1 ${payment.classes}`}>
              {payment.emoji} {payment.label}
            </span>
          )}
          {orderTypeInfo && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-900/30 border border-amber-700 rounded-full px-3 py-1">
              {orderTypeInfo.emoji} {orderTypeInfo.label}
            </span>
          )}
        </div>

        {isDelivered ? (
          <button
            onClick={() => onOpenUnmark(sale)}
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

      {/* ── Lista de ítems ── */}
      <div className="flex flex-col gap-1">
        {sale.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-amber-100">
              {getItemEmoji(item.name)} {item.name} ×{item.quantity}
            </span>
            <span className="text-yellow-700">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* ── Desglose IVA + envío ── */}
      {(hasTax || hasDeliveryCost) && (
        <div className="mt-2 pt-2 border-t border-amber-800/40 flex flex-col gap-0.5">
          {hasTax && (
            <>
              <div className="flex justify-between text-xs text-amber-700">
                <span>Subtotal</span>
                <span>${subtotalBeforeTax!.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-400">
                <span>IVA incluido</span>
                <span>+${sale.tax!.toFixed(2)}</span>
              </div>
            </>
          )}
          {hasDeliveryCost && (
            <div className="flex justify-between text-xs text-teal-400">
              <span>🛵 Envío</span>
              <span>+${sale.deliveryCost!.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold text-amber-400 pt-0.5">
            <span>Total</span>
            <span>${sale.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
