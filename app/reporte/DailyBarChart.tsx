// app/reporte/DailyBarChart.tsx
//
// Gráfico de barras verticales de ventas por día.
// Soporta vista de N días recientes o de un mes completo.

import type { Sale } from "./types";
import { toLocalDateStr, lastNDays } from "./helpers";

type Props = {
  sales: Sale[];
  days: number;
  endOffset?: number;
  /** Si se pasa, muestra todos los días del mes en lugar de los últimos N días. */
  monthYM?: string;
};

export default function DailyBarChart({
  sales,
  days,
  endOffset = 0,
  monthYM,
}: Props) {
  let dates: string[];

  if (monthYM) {
    const [y, m] = monthYM.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${y}-${String(m).padStart(2, "0")}-${day}`;
    });
  } else {
    dates = lastNDays(days, endOffset);
  }

  const byDate: Record<string, { revenue: number; count: number }> = {};
  dates.forEach((d) => { byDate[d] = { revenue: 0, count: 0 }; });
  sales.forEach((s) => {
    const k = toLocalDateStr(s.date);
    if (byDate[k]) { byDate[k].revenue += s.total; byDate[k].count++; }
  });

  const maxRev    = Math.max(...Object.values(byDate).map((v) => v.revenue), 1);
  const dayNames  = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
  const todayStr  = toLocalDateStr(new Date());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-0.5 h-28">
        {dates.map((date) => {
          const { revenue, count } = byDate[date];
          const heightPct = (revenue / maxRev) * 100;
          const d         = new Date(date + "T12:00:00");
          const isToday   = date === todayStr;

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-amber-900 border border-amber-600 rounded-lg px-2 py-1 text-[10px] text-amber-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <span className="font-bold">${revenue.toFixed(2)}</span>
                <span className="text-amber-600 ml-1">({count})</span>
              </div>

              {/* Barra */}
              <div className="w-full flex items-end" style={{ height: "100px" }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${
                    isToday ? "bg-amber-400" : "bg-amber-700 group-hover:bg-amber-500"
                  }`}
                  style={{
                    height: `${Math.max(heightPct, revenue > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>

              {/* Etiqueta día */}
              {dates.length <= 14 && (
                <span
                  className={`text-[9px] uppercase font-bold ${
                    isToday ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  {dayNames[d.getDay()]}
                </span>
              )}
              {dates.length > 14 &&
                (d.getDate() === 1 || d.getDate() % 5 === 0) && (
                  <span className="text-[8px] text-amber-800">{d.getDate()}</span>
                )}
            </div>
          );
        })}
      </div>

      {/* Escala Y */}
      <div className="flex justify-between text-[10px] text-amber-800">
        <span>${Math.floor(maxRev * 0.25).toFixed(0)}</span>
        <span>${Math.floor(maxRev * 0.5).toFixed(0)}</span>
        <span>${maxRev.toFixed(0)}</span>
      </div>
    </div>
  );
}
