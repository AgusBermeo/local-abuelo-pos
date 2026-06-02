// app/components/cobrar/FoodStockBadge.tsx
//
// Badge de stock restante para una variante de comida.
// Recibe null cuando el stock no está siendo rastreado (no muestra nada).

type Props = {
  /** null = sin seguimiento → no se renderiza nada */
  stock: number | null;
  /** Cantidad ya reservada en el carrito para este ítem. */
  cartQty: number;
};

export default function FoodStockBadge({ stock, cartQty }: Props) {
  if (stock === null) return null;

  const remaining = Math.max(0, stock - cartQty);

  if (stock === 0 && cartQty === 0) {
    return (
      <span className="text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 text-red-400 bg-red-900/40 border-red-800">
        Agotado
      </span>
    );
  }

  if (remaining <= 5) {
    return (
      <span
        className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${
          remaining === 0
            ? "text-red-400 bg-red-900/40 border-red-800"
            : "text-orange-400 bg-orange-900/30 border-orange-800"
        }`}
      >
        {remaining} disp.
      </span>
    );
  }

  return (
    <span className="text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 text-green-500 bg-green-900/20 border-green-900">
      {remaining} disp.
    </span>
  );
}
