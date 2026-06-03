// app/components/inventario/ProductFormFields.tsx
//
// Formulario completo de producto: nombre, categoría, precios
// escalonados (comida) o presentaciones (bebida) y stock por variante.

import type { ProductForm } from "./types";
import { FOOD_SIZE_KEYS, FOOD_SIZE_LABELS } from "./types";
import { getVariantKeysFromForm, defaultTierRow } from "./helpers";
import { Field } from "./ui";
import TierEditor        from "./TierEditor";
import DrinkSizeEditor   from "./DrinkSizeEditor";
import VariantStockEditor from "./VariantStockEditor";

type Props = {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  errors: Record<string, string>;
};

export default function ProductFormFields({ form, setForm, errors }: Props) {
  const variantKeys = getVariantKeysFromForm(form);

  return (
    <>
      {/* Nombre */}
      <Field label="Nombre del producto" error={errors.name}>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="ej: Empanada, Gaseosa…"
          className="bg-amber-950/60 border-2 border-amber-800 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
      </Field>

      {/* Categoría */}
      <Field label="Categoría">
        <div className="flex gap-2">
          {(["Comida", "Bebida"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setForm((p) => ({ ...p, category: cat }))}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 cursor-pointer transition-colors ${
                form.category === cat
                  ? "bg-amber-500 border-amber-500 text-amber-950"
                  : "bg-transparent border-amber-800 text-amber-700 hover:border-amber-600"
              }`}
            >
              {cat === "Comida" ? "🍽️ Comida" : "🥤 Bebida"}
            </button>
          ))}
        </div>
      </Field>

      {/* Comida: tamaños + tiers + stock por variante */}
      {form.category === "Comida" && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">
                Tamaños y precios escalonados
              </p>
              <p className="text-[10px] text-amber-700">
                Activa los tamaños que apliquen. El primer escalón (×1) es el precio base.
              </p>
            </div>

            {FOOD_SIZE_KEYS.map((sk) => (
              <div key={sk} className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.sizeEnabled[sk]}
                    onChange={() =>
                      setForm((p) => ({
                        ...p,
                        sizeEnabled: { ...p.sizeEnabled, [sk]: !p.sizeEnabled[sk] },
                      }))
                    }
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-amber-200">
                    {FOOD_SIZE_LABELS[sk]}
                  </span>
                </label>

                {form.sizeEnabled[sk] && (
                  <TierEditor
                    sizeKey={sk}
                    sizeLabel={FOOD_SIZE_LABELS[sk]}
                    rows={form.tierRows[sk] ?? [defaultTierRow(1)]}
                    onChange={(rows) =>
                      setForm((p) => ({
                        ...p,
                        tierRows: { ...p.tierRows, [sk]: rows },
                      }))
                    }
                    errors={errors}
                  />
                )}

                {errors[`size_${sk}`] && (
                  <p className="text-red-400 text-[10px]">{errors[`size_${sk}`]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Stock por variante */}
          <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              📦 Stock por variante
            </p>
            <VariantStockEditor
              variantKeys={variantKeys}
              stockMap={form.variantStockMap}
              onChange={(map) => setForm((p) => ({ ...p, variantStockMap: map }))}
            />
          </div>
        </>
      )}

      {/* Bebida: presentaciones + stock */}
      {form.category === "Bebida" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">
              Presentaciones y stock
            </p>
          </div>
          <div className="bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
            <DrinkSizeEditor
              rows={form.drinkSizeRows}
              onChange={(rows) => setForm((p) => ({ ...p, drinkSizeRows: rows }))}
              errors={errors}
            />
          </div>
        </div>
      )}
    </>
  );
}
