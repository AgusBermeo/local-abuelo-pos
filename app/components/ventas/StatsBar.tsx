// app/components/ventas/StatsBar.tsx
//
// Tres tarjetas de estadísticas: rango seleccionado, mes y total global.

type Props = {
  /** Etiqueta del período activo (ej: "Hoy", "1 ene – 5 ene 2026"). */
  rangeLabel: string;
  rangeSalesCount: number;
  rangeRevenue: number;

  /** Etiqueta del mes / rango de meses cubierto por el filtro. */
  monthLabel: string;
  monthSalesCount: number;
  monthRevenue: number;

  totalSalesCount: number;
  totalRevenue: number;
};

export default function StatsBar({
  rangeLabel,
  rangeSalesCount,
  rangeRevenue,
  monthLabel,
  monthSalesCount,
  monthRevenue,
  totalSalesCount,
  totalRevenue,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 leading-tight">
          {rangeLabel}
        </p>
        <p className="text-2xl font-bold text-amber-400">{rangeSalesCount}</p>
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">
          Recaudado
        </p>
        <p className="text-lg font-bold text-amber-400">${rangeRevenue.toFixed(2)}</p>
      </div>

      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1 leading-tight">
          {monthLabel}
        </p>
        <p className="text-2xl font-bold text-yellow-500">{monthSalesCount}</p>
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">
          Recaudado
        </p>
        <p className="text-lg font-bold text-yellow-500">${monthRevenue.toFixed(2)}</p>
      </div>

      <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mb-1">Total Global</p>
        <p className="text-2xl font-bold text-purple-400">{totalSalesCount}</p>
        <p className="text-[10px] uppercase text-yellow-700 tracking-widest mt-2 mb-0.5">
          Recaudado
        </p>
        <p className="text-lg font-bold text-purple-400">${totalRevenue.toFixed(2)}</p>
      </div>
    </div>
  );
}
