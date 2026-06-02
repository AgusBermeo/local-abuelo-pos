// app/components/cobrar/FloatingTotalBar.tsx
//
// Barra fija en la parte inferior que aparece cuando el bloque de totales
// sale del viewport. Permite hacer scroll hasta él con un clic.

type Props = {
  visible: boolean;
  totalItems: number;
  subtotal: number;
  total: number;
  hasModifiers: boolean; // descuento | IVA | delivery activos
  onScrollToTotal: () => void;
};

export default function FloatingTotalBar({
  visible,
  totalItems,
  subtotal,
  total,
  hasModifiers,
  onScrollToTotal,
}: Props) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-amber-950/95 backdrop-blur-md border-t-2 border-amber-600 shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
        <button
          onClick={onScrollToTotal}
          className="w-full max-w-4xl m-auto flex items-center justify-between px-6 py-4 cursor-pointer group"
        >
          {/* Izquierda: contador + etiqueta */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-amber-950 text-xs font-bold">
              {totalItems}
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-600 font-bold group-hover:text-amber-400">
              Ver pedido
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-3.5 h-3.5 text-amber-600 -rotate-90"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          {/* Derecha: precios */}
          <div className="flex items-center gap-3">
            {hasModifiers && (
              <span className="text-xs text-amber-700 line-through">
                ${subtotal.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-bold text-amber-400">
              ${total.toFixed(2)}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
