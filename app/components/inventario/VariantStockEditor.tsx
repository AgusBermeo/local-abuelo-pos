// app/components/inventario/VariantStockEditor.tsx
//
// Tabla de stock por variante de comida (tamaño × relleno).

import { StepperInput } from "./ui";

type Props = {
  variantKeys: Array<{ variantKey: string; label: string }>;
  stockMap: Record<string, string>;
  onChange: (map: Record<string, string>) => void;
};

export default function VariantStockEditor({
  variantKeys,
  stockMap,
  onChange,
}: Props) {
  if (variantKeys.length === 0) return null;

  const setVal = (vk: string, val: string) =>
    onChange({ ...stockMap, [vk]: val });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2 text-[9px] uppercase tracking-widest text-yellow-700 px-1">
        <span>Variante</span>
        <span className="w-28 text-center">Stock</span>
      </div>

      {variantKeys.map(({ variantKey, label }) => {
        const raw    = stockMap[variantKey] ?? "0";
        const num    = Number(raw);
        const hasVal = raw !== "" && !isNaN(num);

        return (
          <div key={variantKey} className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <span
              className={`text-xs font-semibold ${
                hasVal && num > 0 ? "text-amber-200" : "text-amber-700"
              }`}
            >
              {label}
            </span>
            <div className="w-28">
              <StepperInput
                value={raw === "0" ? "0" : raw}
                onChange={(v) => setVal(variantKey, v)}
                colorize
              />
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-amber-800">
        Stock en 0 = sin seguimiento. Mayor a 0 activa el control de inventario para esa
        variante.
      </p>
    </div>
  );
}
