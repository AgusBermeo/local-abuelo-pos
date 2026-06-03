// app/components/inventario/TierEditor.tsx
//
// Editor de escalones de precio (precio escalonado) para un tamaño concreto.

import type { TierRow } from "./types";
import { inputClass } from "./ui";
import { defaultTierRow } from "./helpers";

type Props = {
  sizeKey: string;
  sizeLabel: string;
  rows: TierRow[];
  onChange: (rows: TierRow[]) => void;
  errors: Record<string, string>;
};

export default function TierEditor({
  sizeKey,
  sizeLabel,
  rows,
  onChange,
  errors,
}: Props) {
  const update = (id: string, field: "minQty" | "pricePerUnit", val: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  return (
    <div className="flex flex-col gap-2 bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400">
        {sizeLabel}
      </p>
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-[9px] uppercase tracking-widest text-yellow-700 px-1">
        <span>Mín. unidades</span>
        <span>Precio / u. ($)</span>
        <span />
      </div>

      {rows.map((row, idx) => (
        <div key={row.id} className="grid grid-cols-[1fr_1fr_2rem] gap-2 items-start">
          {/* Mín. unidades */}
          <div className="flex flex-col gap-1">
            <input
              type="number"
              min={1}
              step={1}
              value={row.minQty}
              onChange={(e) => update(row.id, "minQty", e.target.value)}
              disabled={idx === 0}
              placeholder="1"
              className={`${inputClass} w-full text-center ${
                idx === 0 ? "opacity-50 cursor-not-allowed" : ""
              } ${errors[`${sizeKey}_minQty_${row.id}`] ? "border-red-600" : ""}`}
            />
            {errors[`${sizeKey}_minQty_${row.id}`] && (
              <p className="text-red-400 text-[10px]">
                {errors[`${sizeKey}_minQty_${row.id}`]}
              </p>
            )}
          </div>

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">
                $
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={row.pricePerUnit}
                onChange={(e) => update(row.id, "pricePerUnit", e.target.value)}
                placeholder="0.00"
                className={`${inputClass} pl-7 w-full ${
                  errors[`${sizeKey}_price_${row.id}`] ? "border-red-600" : ""
                }`}
              />
            </div>
            {errors[`${sizeKey}_price_${row.id}`] && (
              <p className="text-red-400 text-[10px]">
                {errors[`${sizeKey}_price_${row.id}`]}
              </p>
            )}
          </div>

          {/* Eliminar fila */}
          <button
            onClick={() => {
              if (rows.length > 1) onChange(rows.filter((r) => r.id !== row.id));
            }}
            disabled={rows.length <= 1 || idx === 0}
            className={`h-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors ${
              rows.length <= 1 || idx === 0
                ? "border-amber-900 text-amber-900 cursor-not-allowed"
                : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"
            }`}
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          onChange([
            ...rows,
            defaultTierRow(),
          ])
        }
        className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        + Agregar escalón
      </button>
    </div>
  );
}
