// app/components/ventas/DateRangeFilter.tsx
//
// Inputs de fecha (desde / hasta) con accesos rápidos Hoy y Limpiar.

type Props = {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onSetToday: () => void;
  onClear: () => void;
};

export default function DateRangeFilter({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onSetToday,
  onClear,
}: Props) {
  const hasFilter = startDate || endDate;

  return (
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
            onChange={(e) => onChangeStart(e.target.value)}
            className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase text-yellow-700 tracking-widest">Hasta</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-4 py-2.5 text-amber-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
          />
        </div>
        <button
          onClick={onSetToday}
          className="py-2.5 px-4 bg-amber-700 hover:bg-amber-600 border-2 border-amber-700 hover:border-amber-600 text-amber-100 text-xs font-bold rounded-lg uppercase tracking-widest cursor-pointer transition-colors"
        >
          Hoy
        </button>
        {hasFilter && (
          <button
            onClick={onClear}
            className="py-2.5 px-4 bg-amber-900/50 hover:bg-amber-800 border-2 border-amber-800 text-amber-500 text-xs font-bold rounded-lg uppercase tracking-widest cursor-pointer transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
