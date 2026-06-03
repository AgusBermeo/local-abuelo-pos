// app/reporte/ComparativaRow.tsx
//
// Fila de comparativa entre período anterior y actual,
// con barras horizontales proporcionales y delta porcentual.

import { delta } from "./helpers";

type Props = {
  label: string;
  curr: number;
  prev: number;
  format?: (v: number) => string;
};

export default function ComparativaRow({
  label,
  curr,
  prev,
  format = (v) => String(v),
}: Props) {
  const d      = delta(curr, prev);
  const maxVal = Math.max(curr, prev, 0.01);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-amber-300 font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-amber-600">{format(prev)}</span>
          <span
            className={`font-bold tabular-nums ${
              d.neutral ? "text-amber-400" : d.up ? "text-green-400" : "text-red-400"
            }`}
          >
            {format(curr)}{" "}
            {!d.neutral && (
              <span className="text-[10px]">
                ({d.up ? "▲" : "▼"}{d.pct.toFixed(0)}%)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Barras dobles */}
      <div className="flex gap-1 h-1.5">
        <div className="flex-1 bg-amber-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-700 rounded-full"
            style={{ width: `${(prev / maxVal) * 100}%` }}
          />
        </div>
        <div className="flex-1 bg-amber-900 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              d.neutral ? "bg-amber-500" : d.up ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${(curr / maxVal) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[9px] text-amber-800">
        <span>Período anterior</span>
        <span>Período actual</span>
      </div>
    </div>
  );
}
