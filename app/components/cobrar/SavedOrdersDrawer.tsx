// app/components/cobrar/SavedOrdersDrawer.tsx
//
// Panel lateral (drawer) que lista los pedidos guardados.
// Permite cargar un pedido al carrito o eliminarlo.

import type { SavedOrder } from "./savedOrders";
import type { CartEntry } from "./types";

type Props = {
  orders: SavedOrder[];
  activeOrderId: string | null;
  /** Precio total calculado por el padre para cada pedido guardado */
  getOrderTotal: (cart: CartEntry[]) => number;
  onLoad: (order: SavedOrder) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function SavedOrdersDrawer({
  orders,
  activeOrderId,
  getOrderTotal,
  onLoad,
  onDelete,
  onClose,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-amber-950 border-l-2 border-amber-700 shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]">
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-amber-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest leading-tight">
                Pedidos guardados
              </h2>
              <p className="text-[10px] text-amber-700 uppercase tracking-widest">
                {orders.length} borrador{orders.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-amber-800 hover:border-amber-600 text-amber-700 hover:text-amber-400 cursor-pointer transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full text-center py-12">
              <span className="text-4xl opacity-40">🗒️</span>
              <p className="text-amber-700 text-sm">No hay pedidos guardados.</p>
              <p className="text-[10px] text-amber-800 uppercase tracking-widest">
                Usa "Guardar pedido" en el carrito
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isActive = order.id === activeOrderId;
              const total    = getOrderTotal(order.cart);
              const itemCount = order.cart.reduce((s, e) => s + e.quantity, 0);

              return (
                <div
                  key={order.id}
                  className={`flex flex-col gap-3 rounded-xl border-2 p-4 transition-all ${
                    isActive
                      ? "border-amber-500 bg-amber-900/50"
                      : "border-amber-800 bg-amber-900/20 hover:border-amber-700"
                  }`}
                >
                  {/* Cabecera de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-amber-100 truncate">
                          {order.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 border border-amber-500 text-amber-400 rounded-full px-2 py-0.5 shrink-0">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-amber-700">
                        {timeAgo(order.updatedAt)}
                      </p>
                      {order.note && (
                        <p className="text-[10px] text-amber-600 italic mt-0.5">
                          "{order.note}"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-base font-bold text-amber-400 tabular-nums">
                        ${total.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-amber-700">
                        {itemCount} ítem{itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Preview de ítems */}
                  {order.cart.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {order.cart.slice(0, 4).map((entry) => (
                        <span
                          key={entry.key}
                          className="text-[9px] font-bold uppercase tracking-widest bg-amber-900/60 border border-amber-800 text-amber-600 rounded-full px-2 py-0.5"
                        >
                          ×{entry.quantity} {entry.sizeKey}
                          {entry.fillingKey !== "none" ? ` · ${entry.fillingKey}` : ""}
                        </span>
                      ))}
                      {order.cart.length > 4 && (
                        <span className="text-[9px] text-amber-700 italic py-0.5">
                          +{order.cart.length - 4} más
                        </span>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onLoad(order); onClose(); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                        isActive
                          ? "bg-amber-700/40 border-2 border-amber-600 text-amber-400"
                          : "bg-amber-500 hover:bg-amber-400 text-amber-950"
                      }`}
                    >
                      {isActive ? "Ya cargado" : "Cargar"}
                    </button>
                    <button
                      onClick={() => onDelete(order.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-900/40 hover:bg-red-800 border border-red-900 hover:border-red-700 text-red-500 hover:text-red-300 cursor-pointer transition-colors shrink-0"
                      title="Eliminar pedido guardado"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-amber-800/60 shrink-0">
          <p className="text-[10px] text-amber-800 text-center uppercase tracking-widest">
            Los pedidos se guardan localmente en este dispositivo
          </p>
        </div>
      </div>
    </>
  );
}