// app/components/inventario/ProductFormFields.tsx
//
// Formulario completo de producto: nombre, categoría, precios
// escalonados (comida) o presentaciones (bebida) y stock por variante.

import type { ProductForm } from "./types";
import { FOOD_SIZE_KEYS, FOOD_SIZE_LABELS } from "./types";
import { getVariantKeysFromForm, defaultTierRow } from "./helpers";
import { Field, inputClass } from "./ui";
import TierEditor         from "./TierEditor";
import DrinkSizeEditor    from "./DrinkSizeEditor";
import VariantStockEditor from "./VariantStockEditor";

type Props = {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  errors: Record<string, string>;
};

// ── Toggle reutilizable ───────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-5 rounded-full relative transition-colors shrink-0 ${
          checked ? "bg-amber-500" : "bg-amber-800"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${checked ? "text-amber-200" : "text-amber-700"}`}>
          {label}
        </span>
        {desc && <span className="text-[10px] text-amber-800">{desc}</span>}
      </div>
    </label>
  );
}

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
          placeholder="ej: Empanada, Bandeja, Gaseosa…"
          className={inputClass}
          autoFocus
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

      {/* ── Comida ── */}
      {form.category === "Comida" && (
        <>
          {/* Toggles: tamaño y relleno */}
          <div className="flex flex-col gap-3 bg-amber-900/20 border border-amber-800/60 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700 font-bold">
              Estructura del producto
            </p>
            <Toggle
              checked={form.hasSizes}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  hasSizes: v,
                  sizeEnabled: v
                    ? p.sizeEnabled
                    : { grande: false, normal: false, bocadito: false },
                }))
              }
              label="Tiene tamaños"
              desc="Grande, Normal, Bocadito (o los que actives)"
            />
            <Toggle
              checked={form.hasFillings}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  hasFillings: v,
                }))
              }
              label="Tiene rellenos"
              desc="Carne, Pollo… (editables)"
            />
          </div>

          {/* Tamaños + escalones de precio */}
          {form.hasSizes ? (
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
                        setForm((p) => ({ ...p, tierRows: { ...p.tierRows, [sk]: rows } }))
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
          ) : (
            /* Sin tamaños: precio único */
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">
                Precio
              </p>
              <TierEditor
                sizeKey="single"
                sizeLabel="Precio base"
                rows={form.tierRows["single"] ?? [defaultTierRow(1)]}
                onChange={(rows) =>
                  setForm((p) => ({ ...p, tierRows: { ...p.tierRows, single: rows } }))
                }
                errors={errors}
              />
              {errors.single_price && (
                <p className="text-red-400 text-[10px]">{errors.single_price}</p>
              )}
            </div>
          )}

          {/* Rellenos editables */}
          {form.hasFillings && (
            <div className="flex flex-col gap-3 bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700 font-bold">
                Rellenos
              </p>
              {errors.fillings && (
                <p className="text-red-400 text-[10px]">{errors.fillings}</p>
              )}
              <div className="flex flex-col gap-2">
                {form.fillingRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          fillingRows: p.fillingRows.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  label: e.target.value,
                                  key: e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, "_")
                                    .replace(/[^a-z0-9_]/g, ""),
                                }
                              : r
                          ),
                        }))
                      }
                      placeholder="ej: Carne, Pollo, Queso…"
                      className={`${inputClass} flex-1 ${
                        errors[`filling_label_${row.id}`] ? "border-red-600" : ""
                      }`}
                    />
                    <button
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          fillingRows: p.fillingRows.filter((r) => r.id !== row.id),
                        }))
                      }
                      disabled={form.fillingRows.length <= 1}
                      className={`h-9 w-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors shrink-0 ${
                        form.fillingRows.length <= 1
                          ? "border-amber-900 text-amber-900 cursor-not-allowed"
                          : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"
                      }`}
                    >
                      ×
                    </button>
                    {errors[`filling_label_${row.id}`] && (
                      <p className="text-red-400 text-[10px] absolute">
                        {errors[`filling_label_${row.id}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    fillingRows: [
                      ...p.fillingRows,
                      { id: `f_${Date.now()}_${Math.random()}`, key: "", label: "" },
                    ],
                  }))
                }
                className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                + Agregar relleno
              </button>
            </div>
          )}

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

      {/* ── Bebida ── */}
      {form.category === "Bebida" && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-yellow-700">
            Presentaciones y stock
          </p>
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