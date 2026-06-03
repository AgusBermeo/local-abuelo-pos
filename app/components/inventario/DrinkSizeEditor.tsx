// app/components/inventario/DrinkSizeEditor.tsx
//
// Editor de presentaciones de bebida: nombre, precio y stock inicial.

import type { DrinkSizeRow } from "./types";
import { inputClass } from "./ui";
import { stockColor, stockBorderFocus } from "./helpers";
import { defaultDrinkSizeRow } from "./helpers";

type Props = {
  rows: DrinkSizeRow[];
  onChange: (rows: DrinkSizeRow[]) => void;
  errors: Record<string, string>;
};

export default function DrinkSizeEditor({ rows, onChange, errors }: Props) {
  const update = (
    id: string,
    field: keyof Omit<DrinkSizeRow, "id">,
    val: string,
  ) => onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_auto_2rem] gap-2 text-[9px] uppercase tracking-widest text-yellow-700 px-1">
        <span>Presentación</span>
        <span className="w-24">Precio ($)</span>
        <span className="w-20">Stock inicial</span>
        <span />
      </div>

      {rows.map((row) => {
        const stockNum = Number(row.stock);
        const hasStock = row.stock !== "" && !isNaN(stockNum);

        return (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_auto_auto_2rem] gap-2 items-start"
          >
            {/* Nombre de presentación */}
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={row.label}
                onChange={(e) => update(row.id, "label", e.target.value)}
                placeholder="ej: 500ml, 1L…"
                className={`${inputClass} w-full ${
                  errors[`ds_label_${row.id}`] ? "border-red-600" : ""
                }`}
              />
              {errors[`ds_label_${row.id}`] && (
                <p className="text-red-400 text-[10px]">
                  {errors[`ds_label_${row.id}`]}
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="flex flex-col gap-1 w-24">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.price}
                  onChange={(e) => update(row.id, "price", e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-7 w-full ${
                    errors[`ds_price_${row.id}`] ? "border-red-600" : ""
                  }`}
                />
              </div>
              {errors[`ds_price_${row.id}`] && (
                <p className="text-red-400 text-[10px]">
                  {errors[`ds_price_${row.id}`]}
                </p>
              )}
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1 w-20">
              <input
                type="number"
                min={0}
                step={1}
                value={row.stock}
                onChange={(e) => update(row.id, "stock", e.target.value)}
                placeholder="0"
                className={`${inputClass} w-full text-center tabular-nums ${
                  hasStock ? stockBorderFocus(stockNum) : ""
                } ${hasStock ? stockColor(stockNum) : ""}`}
              />
            </div>

            {/* Eliminar fila */}
            <button
              onClick={() => {
                if (rows.length > 1) onChange(rows.filter((r) => r.id !== row.id));
              }}
              disabled={rows.length <= 1}
              className={`h-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors ${
                rows.length <= 1
                  ? "border-amber-900 text-amber-900 cursor-not-allowed"
                  : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"
              }`}
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        onClick={() => onChange([...rows, defaultDrinkSizeRow()])}
        className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        + Agregar presentación
      </button>
      <p className="text-[10px] text-amber-800">
        Stock en 0 = sin seguimiento. Ingresa mayor a 0 para activar control de inventario.
      </p>
    </div>
  );
}
