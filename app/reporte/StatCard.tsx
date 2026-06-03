// app/reporte/StatCard.tsx
//
// Tarjeta de KPI individual con valor, delta vs período anterior y subtítulo.

type DeltaResult = { pct: number; up: boolean; neutral: boolean };

type Props = {
  label: string;
  value: string;
  sub?: string;
  accent?: "amber" | "green" | "blue" | "purple";
  delta?: DeltaResult;
};

export default function StatCard({
  label,
  value,
  sub,
  accent = "amber",
  delta: d,
}: Props) {
  const colors: Record<string, string> = {
    amber:  "text-amber-400",
    green:  "text-green-400",
    blue:   "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      {d && !d.neutral && (
        <p className={`text-[10px] font-bold ${d.up ? "text-green-500" : "text-red-400"}`}>
          {d.up ? "▲" : "▼"} {d.pct.toFixed(1)}% vs período anterior
        </p>
      )}
      {sub && <p className="text-xs text-amber-700">{sub}</p>}
    </div>
  );
}
