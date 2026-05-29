"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type PriceTier    = { minQty: number; pricePerUnit: number };
type TieredPrices = Record<string, PriceTier[]>;
type Ingredient   = { id: string; name: string; stock: number };
type DrinkSize    = { key: string; label: string; price: number; stock: number };

type Product = {
  id: number;
  name: string;
  category: "Comida" | "Bebida";
  tieredPrices: TieredPrices;
  price?: number;
  sizeLabels:    Record<string, string>;
  fillingLabels: Record<string, string>;
  size?: string;
  ingredientMap: Record<string, Record<string, number>>;
  drinkSizes?: DrinkSize[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTierPrice(product: Product, sizeKey: string, qty: number): number {
  const tiers = product.tieredPrices[sizeKey];
  if (!tiers || tiers.length === 0) return product.price ?? 0;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find((t) => qty >= t.minQty);
  return match ? match.pricePerUnit : sorted[sorted.length - 1].pricePerUnit;
}

function getVariantKeys(product: Product): Array<{ variantKey: string; label: string }> {
  const sizes = Object.entries(product.sizeLabels).filter(([key]) => {
    const tiers = product.tieredPrices[key];
    return tiers && tiers.some((t) => t.pricePerUnit > 0);
  }).map(([key, label]) => ({ key, label }));

  const fillings = Object.entries(product.fillingLabels).map(([key, label]) => ({ key, label }));

  if (fillings.length === 0)
    return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));

  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes)
    for (const f of fillings)
      result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

function stockColor(v: number): string {
  return v === 0 ? "text-red-400" : v <= 5 ? "text-orange-400" : "text-green-400";
}
function stockBorderFocus(v: number): string {
  return v === 0 ? "border-red-800 focus:border-red-500"
    : v <= 5 ? "border-orange-800 focus:border-orange-500"
    : "border-amber-800 focus:border-amber-500";
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputClass =
  "bg-amber-950/60 border-2 border-amber-800 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500 transition-colors";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</label>
      {children}
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}

function StepperInput({ value, onChange, colorize = true, small = false }: {
  value: string; onChange: (v: string) => void; colorize?: boolean; small?: boolean;
}) {
  const num = Number(value); const hasVal = value !== "" && !isNaN(num);
  const btnCls = small ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm";
  const inpCls = small ? "w-10 text-xs py-1" : "w-14 text-sm py-1.5";
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(String(Math.max(0, (hasVal ? num : 0) - 1)))}
        className={`${btnCls} flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors`}>−</button>
      <input type="number" min={0} step={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        className={`${inpCls} text-center bg-amber-950/60 border-2 rounded-lg px-1 focus:outline-none transition-colors ${colorize && hasVal ? stockBorderFocus(num) : "border-amber-800 focus:border-amber-500"} ${colorize && hasVal ? stockColor(num) : "text-amber-100"}`} />
      <button onClick={() => onChange(String((hasVal ? num : 0) + 1))}
        className={`${btnCls} flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors`}>+</button>
    </div>
  );
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClick} />;
}
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// ── Tier editor for one food size ─────────────────────────────────────────────

type TierRow = { id: string; minQty: string; pricePerUnit: string };

function TierEditor({
  sizeKey, sizeLabel, rows, onChange, errors,
}: {
  sizeKey: string; sizeLabel: string; rows: TierRow[];
  onChange: (rows: TierRow[]) => void; errors: Record<string, string>;
}) {
  const update = (id: string, field: "minQty" | "pricePerUnit", val: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  return (
    <div className="flex flex-col gap-2 bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400">{sizeLabel}</p>
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-[9px] uppercase tracking-widest text-yellow-700 px-1">
        <span>Mín. unidades</span><span>Precio / u. ($)</span><span />
      </div>
      {rows.map((row, idx) => (
        <div key={row.id} className="grid grid-cols-[1fr_1fr_2rem] gap-2 items-start">
          <div className="flex flex-col gap-1">
            <input type="number" min={1} step={1} value={row.minQty}
              onChange={(e) => update(row.id, "minQty", e.target.value)}
              disabled={idx === 0} placeholder="1"
              className={`${inputClass} w-full text-center ${idx === 0 ? "opacity-50 cursor-not-allowed" : ""} ${errors[`${sizeKey}_minQty_${row.id}`] ? "border-red-600" : ""}`}
            />
            {errors[`${sizeKey}_minQty_${row.id}`] && (
              <p className="text-red-400 text-[10px]">{errors[`${sizeKey}_minQty_${row.id}`]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">$</span>
              <input type="number" min={0} step={0.01} value={row.pricePerUnit}
                onChange={(e) => update(row.id, "pricePerUnit", e.target.value)}
                placeholder="0.00"
                className={`${inputClass} pl-7 w-full ${errors[`${sizeKey}_price_${row.id}`] ? "border-red-600" : ""}`}
              />
            </div>
            {errors[`${sizeKey}_price_${row.id}`] && (
              <p className="text-red-400 text-[10px]">{errors[`${sizeKey}_price_${row.id}`]}</p>
            )}
          </div>
          <button
            onClick={() => { if (rows.length > 1) onChange(rows.filter((r) => r.id !== row.id)); }}
            disabled={rows.length <= 1 || idx === 0}
            className={`h-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors ${
              rows.length <= 1 || idx === 0
                ? "border-amber-900 text-amber-900 cursor-not-allowed"
                : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"
            }`}
          >×</button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { id: `r_${Date.now()}_${Math.random()}`, minQty: "", pricePerUnit: "" }])}
        className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        + Agregar escalón
      </button>
    </div>
  );
}

// ── DrinkSizeEditor ───────────────────────────────────────────────────────────

type DrinkSizeRow = { id: string; label: string; price: string; stock: string };

function DrinkSizeEditor({
  rows, onChange, errors,
}: {
  rows: DrinkSizeRow[];
  onChange: (rows: DrinkSizeRow[]) => void;
  errors: Record<string, string>;
}) {
  const update = (id: string, field: keyof Omit<DrinkSizeRow, "id">, val: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const addRow = () =>
    onChange([...rows, { id: `ds_${Date.now()}_${Math.random()}`, label: "", price: "", stock: "0" }]);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((r) => r.id !== id));
  };

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
          <div key={row.id} className="grid grid-cols-[1fr_auto_auto_2rem] gap-2 items-start">
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={row.label}
                onChange={(e) => update(row.id, "label", e.target.value)}
                placeholder="ej: 500ml, 1L, Taza…"
                className={`${inputClass} w-full ${errors[`ds_label_${row.id}`] ? "border-red-600" : ""}`}
              />
              {errors[`ds_label_${row.id}`] && (
                <p className="text-red-400 text-[10px]">{errors[`ds_label_${row.id}`]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1 w-24">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">$</span>
                <input
                  type="number" min={0} step={0.01}
                  value={row.price}
                  onChange={(e) => update(row.id, "price", e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-7 w-full ${errors[`ds_price_${row.id}`] ? "border-red-600" : ""}`}
                />
              </div>
              {errors[`ds_price_${row.id}`] && (
                <p className="text-red-400 text-[10px]">{errors[`ds_price_${row.id}`]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1 w-20">
              <input
                type="number" min={0} step={1}
                value={row.stock}
                onChange={(e) => update(row.id, "stock", e.target.value)}
                placeholder="0"
                className={`${inputClass} w-full text-center tabular-nums ${
                  hasStock ? stockBorderFocus(stockNum) : ""
                } ${hasStock ? stockColor(stockNum) : ""}`}
              />
            </div>

            <button
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
              className={`h-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors ${
                rows.length <= 1
                  ? "border-amber-900 text-amber-900 cursor-not-allowed"
                  : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"
              }`}
            >×</button>
          </div>
        );
      })}

      <button
        onClick={addRow}
        className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        + Agregar presentación
      </button>

      <p className="text-[10px] text-amber-800">
        El stock en 0 significa "sin seguimiento de stock". Ingresa un valor mayor para activar el control de inventario para esa presentación.
      </p>
    </div>
  );
}

// ── Ingredient assigner ───────────────────────────────────────────────────────

function IngredientAssigner({
  variantKeys, ingredientMap, ingredients, onChange,
}: {
  variantKeys:   Array<{ variantKey: string; label: string }>;
  ingredientMap: Record<string, Record<string, string>>;
  ingredients:   Ingredient[];
  onChange:      (map: Record<string, Record<string, string>>) => void;
}) {
  if (ingredients.length === 0) {
    return (
      <div className="text-[10px] text-amber-700 bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
        No hay ingredientes creados aún. Ve a la sección de Ingredientes primero.
      </div>
    );
  }

  const setQty = (variantKey: string, ingId: string, val: string) => {
    const current = ingredientMap[variantKey] ?? {};
    const num = Math.max(0, Math.round(Number(val) || 0));
    const updated = { ...current };
    if (num === 0) { delete updated[ingId]; } else { updated[ingId] = val; }
    onChange({ ...ingredientMap, [variantKey]: updated });
  };

  const copyToAll = (sourceVK: string) => {
    const source = ingredientMap[sourceVK] ?? {};
    const newMap: Record<string, Record<string, string>> = {};
    variantKeys.forEach(({ variantKey }) => { newMap[variantKey] = { ...source }; });
    onChange(newMap);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-[10px] uppercase tracking-widest text-yellow-700">Ingredientes por variante</p>
        <p className="text-[10px] text-amber-700">
          Unidades de cada ingrediente descontadas al vender una unidad de esta variante.
        </p>
      </div>

      {variantKeys.map(({ variantKey, label }, idx) => {
        const usage  = ingredientMap[variantKey] ?? {};
        const hasAny = Object.values(usage).some((v) => Number(v) > 0);
        return (
          <div key={variantKey} className="flex flex-col gap-2.5 bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-300">{label}</p>
              <div className="flex items-center gap-2">
                {!hasAny && <span className="text-[9px] italic text-amber-800">Sin asignar</span>}
                {idx === 0 && variantKeys.length > 1 && (
                  <button onClick={() => copyToAll(variantKey)}
                    className="text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-500 border border-amber-800 hover:border-amber-600 rounded px-2 py-0.5 cursor-pointer transition-colors">
                    Copiar a todas
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {ingredients.map((ing) => {
                const raw    = usage[ing.id] ?? "0";
                const num    = Number(raw);
                const active = num > 0;
                return (
                  <div key={ing.id} className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold truncate ${active ? "text-amber-200" : "text-amber-700"}`}>{ing.name}</span>
                      <span className={`text-[10px] shrink-0 ${stockColor(ing.stock)}`}>({ing.stock})</span>
                    </div>
                    <StepperInput
                      value={raw === "0" ? "" : raw}
                      onChange={(v) => setQty(variantKey, ing.id, v || "0")}
                      colorize={false}
                      small
                    />
                    {active && (
                      <span className="text-[10px] text-amber-600 shrink-0 w-16 text-right">×{num} por unidad</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Product form types ────────────────────────────────────────────────────────

type ProductForm = {
  name: string;
  category: "Comida" | "Bebida";
  price: string;
  size: string;
  tierRows: Record<string, TierRow[]>;
  sizeEnabled: Record<string, boolean>;
  hasRelleno: boolean;
  ingredientMap: Record<string, Record<string, string>>;
  drinkSizeRows: DrinkSizeRow[];
};

const FOOD_SIZE_KEYS   = ["grande", "normal", "bocadito"] as const;
const FOOD_SIZE_LABELS: Record<string, string> = { grande: "Grande", normal: "Normal", bocadito: "Bocadito" };

function defaultTierRow(minQty = 1, price = ""): TierRow {
  return { id: `r_${Date.now()}_${Math.random()}`, minQty: String(minQty), pricePerUnit: price };
}

function defaultDrinkSizeRow(): DrinkSizeRow {
  return { id: `ds_${Date.now()}_${Math.random()}`, label: "", price: "", stock: "0" };
}

const EMPTY_FORM: ProductForm = {
  name: "", category: "Comida", price: "", size: "",
  tierRows: {
    grande:   [defaultTierRow(1)],
    normal:   [defaultTierRow(1)],
    bocadito: [defaultTierRow(1)],
  },
  sizeEnabled: { grande: true, normal: true, bocadito: true },
  hasRelleno: true,
  ingredientMap: {},
  drinkSizeRows: [defaultDrinkSizeRow()],
};

function productToForm(product: Product): ProductForm {
  const ingredientMap: Record<string, Record<string, string>> = {};
  Object.entries(product.ingredientMap ?? {}).forEach(([vk, usage]) => {
    ingredientMap[vk] = {};
    Object.entries(usage).forEach(([ingId, qty]) => { ingredientMap[vk][ingId] = String(qty); });
  });

  if (product.category === "Comida") {
    const tierRows: Record<string, TierRow[]> = {};
    const sizeEnabled: Record<string, boolean> = {};

    FOOD_SIZE_KEYS.forEach((sk) => {
      const tiers = product.tieredPrices[sk] ?? [];
      sizeEnabled[sk] = tiers.some((t) => t.pricePerUnit > 0);
      tierRows[sk] = tiers.length > 0
        ? tiers.map((t) => defaultTierRow(t.minQty, String(t.pricePerUnit)))
        : [defaultTierRow(1)];
      if (tierRows[sk][0]) tierRows[sk][0].minQty = "1";
    });

    return {
      ...EMPTY_FORM, name: product.name, category: "Comida",
      hasRelleno: true,
      tierRows, sizeEnabled, ingredientMap,
      drinkSizeRows: [defaultDrinkSizeRow()],
    };
  }

  const drinkSizeRows: DrinkSizeRow[] = (product.drinkSizes ?? []).map((ds) => ({
    id: `ds_${Date.now()}_${Math.random()}`,
    label: ds.label,
    price: String(ds.price),
    stock: String(ds.stock),
  }));

  return {
    ...EMPTY_FORM, name: product.name, category: "Bebida",
    hasRelleno: false, ingredientMap,
    drinkSizeRows: drinkSizeRows.length > 0 ? drinkSizeRows : [defaultDrinkSizeRow()],
  };
}

function getVariantKeysFromForm(form: ProductForm): Array<{ variantKey: string; label: string }> {
  const sizes: Array<{ key: string; label: string }> = [];
  if (form.category === "Comida") {
    FOOD_SIZE_KEYS.forEach((sk) => {
      if (form.sizeEnabled[sk]) sizes.push({ key: sk, label: FOOD_SIZE_LABELS[sk] });
    });
  } else {
    sizes.push({ key: "single", label: "Unidad" });
  }
  if (sizes.length === 0) sizes.push({ key: "single", label: "Unidad" });

  const fillings: Array<{ key: string; label: string }> =
    form.category === "Comida" && form.hasRelleno
      ? [{ key: "carne", label: "Carne" }, { key: "pollo", label: "Pollo" }]
      : [];

  if (fillings.length === 0) return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));
  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes)
    for (const f of fillings)
      result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

// ── ProductFormFields ─────────────────────────────────────────────────────────

function ProductFormFields({
  form, setForm, errors, ingredients,
}: {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  errors: Record<string, string>;
  ingredients: Ingredient[];
}) {
  const variantKeys = getVariantKeysFromForm(form);

  return (
    <>
      <Field label="Nombre del producto" error={errors.name}>
        <input
          type="text" value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="ej: Empanada, Gaseosa…"
          className={inputClass}
        />
      </Field>

      <Field label="Categoría">
        <div className="flex gap-2">
          {(["Comida", "Bebida"] as const).map((cat) => (
            <button key={cat}
              onClick={() => setForm((p) => ({ ...p, category: cat, hasRelleno: cat === "Comida" ? p.hasRelleno : false }))}
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

      {form.category === "Comida" && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-widest text-yellow-700">Tamaños y precios escalonados</p>
              <p className="text-[10px] text-amber-700">
                Activa los tamaños que apliquen. El primer escalón (×1) es el precio base.
              </p>
            </div>
            {FOOD_SIZE_KEYS.map((sk) => (
              <div key={sk} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
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
                    <span className="text-sm font-bold text-amber-200">{FOOD_SIZE_LABELS[sk]}</span>
                  </label>
                </div>
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

          <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Control de stock (ingredientes)</p>
            <IngredientAssigner
              variantKeys={variantKeys}
              ingredientMap={form.ingredientMap}
              ingredients={ingredients}
              onChange={(map) => setForm((p) => ({ ...p, ingredientMap: map }))}
            />
          </div>
        </>
      )}

      {form.category === "Bebida" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Presentaciones y stock</p>
            <p className="text-[10px] text-amber-700">
              Cada presentación tiene su propio precio y stock independiente.
            </p>
          </div>

          <div className="bg-amber-900/20 border border-amber-800/60 rounded-lg p-3">
            <DrinkSizeEditor
              rows={form.drinkSizeRows}
              onChange={(rows) => setForm((p) => ({ ...p, drinkSizeRows: rows }))}
              errors={errors}
            />
          </div>

          {Object.keys(errors).some((k) => k.startsWith("drinkSizes")) && (
            <p className="text-red-400 text-[10px]">{errors.drinkSizes}</p>
          )}
        </div>
      )}
    </>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(
  form: ProductForm,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
): boolean {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = "El nombre es obligatorio.";

  if (form.category === "Comida") {
    const anySizeEnabled = FOOD_SIZE_KEYS.some((sk) => form.sizeEnabled[sk]);
    if (!anySizeEnabled) {
      e.size_grande = "Activa al menos un tamaño.";
    } else {
      FOOD_SIZE_KEYS.forEach((sk) => {
        if (!form.sizeEnabled[sk]) return;
        const rows = form.tierRows[sk] ?? [];
        if (rows.length === 0) { e[`size_${sk}`] = "Agrega al menos un escalón."; return; }
        let anyPositive = false;
        rows.forEach((row) => {
          const qty   = Number(row.minQty);
          const price = Number(row.pricePerUnit);
          if (row.minQty === "" || isNaN(qty) || qty < 1)
            e[`${sk}_minQty_${row.id}`] = "Mín. 1.";
          if (row.pricePerUnit === "" || isNaN(price) || price < 0)
            e[`${sk}_price_${row.id}`] = "Precio inválido.";
          else if (price > 0) anyPositive = true;
        });
        if (!anyPositive) e[`size_${sk}`] = "Al menos un escalón debe tener precio mayor a $0.";
      });
    }
  } else {
    if (form.drinkSizeRows.length === 0) {
      e.drinkSizes = "Agrega al menos una presentación.";
    } else {
      form.drinkSizeRows.forEach((row) => {
        if (!row.label.trim()) e[`ds_label_${row.id}`] = "La presentación requiere un nombre.";
        const price = Number(row.price);
        if (row.price === "" || isNaN(price) || price < 0) e[`ds_price_${row.id}`] = "Precio inválido.";
      });
    }
  }

  setErrors(e);
  return Object.keys(e).length === 0;
}

// ── Form → Product ────────────────────────────────────────────────────────────

function formToProduct(form: ProductForm, id: number): Product {
  const ingredientMap: Record<string, Record<string, number>> = {};
  Object.entries(form.ingredientMap).forEach(([vk, usage]) => {
    const nums: Record<string, number> = {};
    Object.entries(usage).forEach(([ingId, qty]) => {
      const n = Math.round(Number(qty) || 0);
      if (n > 0) nums[ingId] = n;
    });
    if (Object.keys(nums).length > 0) ingredientMap[vk] = nums;
  });

  if (form.category === "Comida") {
    const tieredPrices: TieredPrices = {};
    const sizeLabels: Record<string, string> = {};
    FOOD_SIZE_KEYS.forEach((sk) => {
      if (!form.sizeEnabled[sk]) return;
      sizeLabels[sk] = FOOD_SIZE_LABELS[sk];
      tieredPrices[sk] = (form.tierRows[sk] ?? [])
        .filter((r) => r.pricePerUnit !== "" && Number(r.pricePerUnit) > 0)
        .map((r) => ({ minQty: Math.max(1, Number(r.minQty) || 1), pricePerUnit: Number(r.pricePerUnit) }))
        .sort((a, b) => a.minQty - b.minQty);
      if (tieredPrices[sk].length > 0 && tieredPrices[sk][0].minQty !== 1) {
        tieredPrices[sk].unshift({ ...tieredPrices[sk][0], minQty: 1 });
      }
    });

    return {
      id, name: form.name.trim(), category: "Comida",
      tieredPrices, sizeLabels,
      fillingLabels: form.hasRelleno ? { carne: "Carne", pollo: "Pollo" } : {},
      ingredientMap,
    };
  }

  const drinkSizes: DrinkSize[] = form.drinkSizeRows.map((row) => ({
    key: row.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || `size_${row.id}`,
    label: row.label.trim(),
    price: Math.max(0, Number(row.price) || 0),
    stock: Math.max(0, Math.round(Number(row.stock) || 0)),
  }));

  return {
    id, name: form.name.trim(), category: "Bebida",
    tieredPrices: {}, sizeLabels: {}, fillingLabels: {},
    ingredientMap,
    drinkSizes,
  };
}

// ── Main Inventario ───────────────────────────────────────────────────────────

export default function Inventario({
  products, ingredients,
  onAddProduct, onDeleteProduct, onEditProduct,
  onAddIngredient, onEditIngredient, onDeleteIngredient,
  readOnly = false,
}: {
  products: Product[]; ingredients: Ingredient[];
  onAddProduct?: (p: Product) => void;
  onDeleteProduct?: (id: number) => void;
  onEditProduct?: (p: Product) => void;
  onAddIngredient?: (i: Ingredient) => void;
  onEditIngredient?: (i: Ingredient) => void;
  onDeleteIngredient?: (id: string) => void;
  readOnly?: boolean;
}) {
  const [section, setSection] = useState<"ingredientes" | "productos">("productos");

  const [showAddModal,  setShowAddModal]  = useState(false);
  const [addForm,       setAddForm]       = useState<ProductForm>(EMPTY_FORM);
  const [addErrors,     setAddErrors]     = useState<Record<string, string>>({});
  const [editTarget,    setEditTarget]    = useState<Product | null>(null);
  const [editForm,      setEditForm]      = useState<ProductForm>(EMPTY_FORM);
  const [editErrors,    setEditErrors]    = useState<Record<string, string>>({});
  const [deleteTarget,  setDeleteTarget]  = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [showIngModal,     setShowIngModal]     = useState(false);
  const [ingName,          setIngName]          = useState("");
  const [ingStock,         setIngStock]         = useState("0");
  const [ingEditTarget,    setIngEditTarget]    = useState<Ingredient | null>(null);
  const [ingEditName,      setIngEditName]      = useState("");
  const [ingEditStock,     setIngEditStock]     = useState("0");
  const [ingDeleteTarget,  setIngDeleteTarget]  = useState<Ingredient | null>(null);
  const [ingDeleteConfirm, setIngDeleteConfirm] = useState("");

  const handleAdd = () => {
    if (!onAddProduct || !validate(addForm, setAddErrors)) return;
    onAddProduct(formToProduct(addForm, Date.now()));
    setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({});
  };
  const handleEdit = () => {
    if (!editTarget || !onEditProduct || !validate(editForm, setEditErrors)) return;
    onEditProduct(formToProduct(editForm, editTarget.id));
    setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({});
  };

  const handleAddIngredient = () => {
    if (!ingName.trim() || !onAddIngredient) return;
    onAddIngredient({ id: `ing_${Date.now()}`, name: ingName.trim(), stock: Math.max(0, Math.round(Number(ingStock) || 0)) });
    setShowIngModal(false); setIngName(""); setIngStock("0");
  };
  const handleEditIngredient = () => {
    if (!ingEditTarget || !onEditIngredient) return;
    onEditIngredient({ ...ingEditTarget, name: ingEditName.trim(), stock: Math.max(0, Math.round(Number(ingEditStock) || 0)) });
    setIngEditTarget(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col max-w-4xl mx-auto gap-4">
      {/* Aviso de modo solo lectura */}
      {readOnly && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800 rounded-lg px-4 py-3">
          <span className="text-base leading-none">👁️</span>
          <p className="text-xs text-amber-700 uppercase tracking-widest font-bold">
            Modo solo lectura — no puedes modificar el inventario
          </p>
        </div>
      )}

      {/* Section switcher */}
      <div className="flex bg-amber-900/40 border-2 border-amber-800 rounded-xl p-1 gap-1">
        {([["productos", "🍽️ Productos"], ["ingredientes", "🧂 Ingredientes"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${
              section === key ? "bg-amber-500 text-amber-950" : "text-amber-700 hover:text-amber-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ INGREDIENTES ══ */}
      {section === "ingredientes" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-yellow-700 text-xs">Stock global compartido entre todos los productos</p>
            {!readOnly && onAddIngredient && (
              <button onClick={() => { setIngName(""); setIngStock("0"); setShowIngModal(true); }}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors">
                + Nuevo ingrediente
              </button>
            )}
          </div>
          {ingredients.length === 0 ? (
            <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-8 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🧂</span>
              <p className="text-amber-600 text-sm font-semibold">Sin ingredientes</p>
              <p className="text-amber-800 text-xs max-w-xs">
                {readOnly
                  ? "No hay ingredientes registrados."
                  : 'Crea ingredientes como "Masa Grande", "Carne"… Luego asígnalos a cada variante de producto.'}
              </p>
              {!readOnly && onAddIngredient && (
                <button onClick={() => { setIngName(""); setIngStock("0"); setShowIngModal(true); }}
                  className="mt-2 bg-amber-700 hover:bg-amber-600 text-amber-100 text-xs font-bold py-2 px-5 rounded-lg cursor-pointer uppercase transition-colors">
                  Crear primer ingrediente
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ingredients.map((ing) => {
                const usedIn = products.filter((p) =>
                  Object.values(p.ingredientMap ?? {}).some((usage) => ing.id in usage)
                ).length;
                return (
                  <div key={ing.id} className="flex items-center gap-3 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-3">
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-amber-100">{ing.name}</span>
                      {usedIn > 0
                        ? <span className="text-[10px] text-amber-700">Usado en {usedIn} producto{usedIn !== 1 ? "s" : ""}</span>
                        : <span className="text-[10px] text-amber-800 italic">Sin asignar</span>}
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${stockColor(ing.stock)}`}>{ing.stock}</span>
                    {!readOnly && onEditIngredient && (
                      <button onClick={() => { setIngEditTarget(ing); setIngEditName(ing.name); setIngEditStock(String(ing.stock)); }}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white p-1.5 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                      </button>
                    )}
                    {!readOnly && onDeleteIngredient && (
                      <button onClick={() => { setIngDeleteTarget(ing); setIngDeleteConfirm(""); }}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ PRODUCTOS ══ */}
      {section === "productos" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-yellow-700 text-xs">
              {readOnly ? "Lista de productos disponibles" : "Agrega, edita o elimina productos"}
            </p>
            {!readOnly && onAddProduct && (
              <button onClick={() => setShowAddModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors">
                + Agregar producto
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {products.length === 0 ? (
              <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">
                {readOnly ? "No hay productos disponibles." : "No hay productos. Agrega uno con el botón de arriba."}
              </div>
            ) : products.map((product) => {
              const isBebida = product.category === "Bebida";

              const variants = getVariantKeys(product);
              const assignedIngIds = new Set(
                Object.values(product.ingredientMap ?? {}).flatMap((u) => Object.keys(u))
              );
              const assignedIngs  = ingredients.filter((i) => assignedIngIds.has(i.id));
              const hasLowStock   = assignedIngs.some((i) => i.stock > 0 && i.stock <= 5);
              const hasOutOfStock = assignedIngs.some((i) => i.stock === 0);

              const drinkSizesWithStock = (product.drinkSizes ?? []).filter((ds) => ds.stock > 0);
              const drinkHasLow    = (product.drinkSizes ?? []).some((ds) => ds.stock > 0 && ds.stock <= 5);
              const drinkHasOut    = (product.drinkSizes ?? []).some((ds) => ds.stock === 0 && drinkSizesWithStock.length > 0);
              const drinkAllUntk   = (product.drinkSizes ?? []).every((ds) => ds.stock === 0);

              return (
                <div key={product.id} className="flex flex-col bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
                  <div className="relative flex gap-2 justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap max-w-[70%]">
                      <h2 className="font-bold text-sm">{product.name}</h2>
                      <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-900/60 border border-amber-800 rounded-full px-2 py-0.5">
                        {product.category}
                      </span>
                      {isBebida ? (
                        drinkAllUntk ? null : (
                          drinkHasOut
                            ? <span className="text-[9px] font-bold uppercase text-red-400 bg-red-900/40 border border-red-800 rounded-full px-2 py-0.5">⚠ Sin stock</span>
                            : drinkHasLow
                            ? <span className="text-[9px] font-bold uppercase text-orange-400 bg-orange-900/30 border border-orange-800 rounded-full px-2 py-0.5">↓ Stock bajo</span>
                            : <span className="text-[9px] font-bold uppercase text-green-500 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">✓ Con stock</span>
                        )
                      ) : (
                        assignedIngs.length > 0 && (
                          hasOutOfStock
                            ? <span className="text-[9px] font-bold uppercase text-red-400 bg-red-900/40 border border-red-800 rounded-full px-2 py-0.5">⚠ Sin stock</span>
                            : hasLowStock
                            ? <span className="text-[9px] font-bold uppercase text-orange-400 bg-orange-900/30 border border-orange-800 rounded-full px-2 py-0.5">↓ Stock bajo</span>
                            : <span className="text-[9px] font-bold uppercase text-green-500 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">✓ Con stock</span>
                        )
                      )}
                    </div>
                    {/* Botones de acción solo si no es readOnly */}
                    {!readOnly && (
                      <div className="absolute top-0 right-0 flex gap-2">
                        {onEditProduct && (
                          <button
                            onClick={() => { setEditTarget(product); setEditForm(productToForm(product)); setEditErrors({}); }}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white p-1.5 cursor-pointer transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                          </button>
                        )}
                        {onDeleteProduct && (
                          <button onClick={() => { setDeleteTarget(product); setDeleteConfirm(""); }}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price / size summary */}
                  {isBebida ? (
                    <div className="flex flex-col gap-1.5">
                      {(product.drinkSizes ?? []).map((ds) => (
                        <div key={ds.key} className="flex items-center gap-3">
                          <span className="text-xs text-amber-300 font-semibold min-w-16">{ds.label}</span>
                          <span className="text-xs font-bold text-amber-500">${ds.price.toFixed(2)}</span>
                          <span className={`text-xs font-bold tabular-nums ml-auto ${stockColor(ds.stock)}`}>
                            {ds.stock === 0 ? "" : `stock: ${ds.stock}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {Object.entries(product.sizeLabels).map(([sk, sl]) => {
                        const tiers = product.tieredPrices[sk] ?? [];
                        if (tiers.length === 0) return null;
                        return (
                          <div key={sk} className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-yellow-700">{sl}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {tiers.map((t) => (
                                <span key={t.minQty}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-700 text-amber-400">
                                  ×{t.minQty} → ${t.pricePerUnit.toFixed(2)}/u.
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(product.fillingLabels).length > 0 && (
                        <p className="text-xs text-gray-300 uppercase">
                          {Object.values(product.fillingLabels).join(" · ")}
                        </p>
                      )}

                      {variants.some((v) => Object.keys(product.ingredientMap?.[v.variantKey] ?? {}).length > 0) && (
                        <div className="mt-3 pt-3 border-t border-amber-800/60 flex flex-col gap-2">
                          <p className="text-[10px] uppercase tracking-widest text-yellow-700">Ingredientes</p>
                          <div className="flex flex-col gap-1.5">
                            {variants.map(({ variantKey, label }) => {
                              const usage = product.ingredientMap?.[variantKey] ?? {};
                              if (Object.keys(usage).length === 0) return null;
                              return (
                                <div key={variantKey} className="flex items-start gap-2">
                                  <span className="text-[10px] text-amber-700 uppercase min-w-24 pt-0.5 shrink-0">{label}</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(usage).map(([ingId, qty]) => {
                                      const ing = ingredients.find((i) => i.id === ingId);
                                      if (!ing) return null;
                                      return (
                                        <span key={ingId} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          ing.stock === 0   ? "border-red-800 text-red-400 bg-red-900/20"
                                          : ing.stock <= 5  ? "border-orange-800 text-orange-400 bg-orange-900/20"
                                          : "border-green-900 text-green-500 bg-green-900/10"
                                        }`}>
                                          {ing.name} ×{qty} <span className="opacity-60">({ing.stock})</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Modals — solo si no es readOnly ══ */}

      {/* Add product */}
      {showAddModal && !readOnly && onAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }} />
          <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <CloseBtn onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }} />
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Nuevo Producto</h2>
            <ProductFormFields form={addForm} setForm={setAddForm} errors={addErrors} ingredients={ingredients} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={handleAdd}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit product */}
      {editTarget && !readOnly && onEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }} />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <CloseBtn onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }} />
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Editar Producto</h2>
            </div>
            <ProductFormFields form={editForm} setForm={setEditForm} errors={editErrors} ingredients={ingredients} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={handleEdit}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete product */}
      {deleteTarget && !readOnly && onDeleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar producto</h2></div>
            <p className="text-amber-200 text-sm">
              Estás a punto de eliminar <span className="font-bold text-amber-400">"{deleteTarget.name}"</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">
                Escribe <span className="font-bold text-red-400">eliminar producto</span> para confirmar
              </label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="eliminar producto"
                className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button
                disabled={deleteConfirm.trim().toLowerCase() !== "eliminar producto"}
                onClick={() => { onDeleteProduct(deleteTarget.id); setDeleteTarget(null); setDeleteConfirm(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  deleteConfirm.trim().toLowerCase() === "eliminar producto"
                    ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-red-950/40 text-red-900 cursor-not-allowed"
                }`}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add ingredient */}
      {showIngModal && !readOnly && onAddIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => setShowIngModal(false)} />
          <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <CloseBtn onClick={() => setShowIngModal(false)} />
            <div className="flex items-center gap-2"><span className="text-lg">🧂</span><h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Nuevo Ingrediente</h2></div>
            <Field label="Nombre">
              <input type="text" value={ingName} onChange={(e) => setIngName(e.target.value)}
                placeholder="ej: Masa Grande, Carne, Pollo…" className={inputClass} autoFocus />
            </Field>
            <Field label="Stock inicial"><StepperInput value={ingStock} onChange={setIngStock} /></Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowIngModal(false)}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddIngredient} disabled={!ingName.trim()}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  ingName.trim() ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer" : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                }`}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit ingredient */}
      {ingEditTarget && !readOnly && onEditIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => setIngEditTarget(null)} />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <CloseBtn onClick={() => setIngEditTarget(null)} />
            <div className="flex items-center gap-2"><span className="text-lg">✏️</span><h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Editar Ingrediente</h2></div>
            <Field label="Nombre"><input type="text" value={ingEditName} onChange={(e) => setIngEditName(e.target.value)} className={inputClass} autoFocus /></Field>
            <Field label="Stock"><StepperInput value={ingEditStock} onChange={setIngEditStock} /></Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setIngEditTarget(null)}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={handleEditIngredient} disabled={!ingEditName.trim()}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  ingEditName.trim() ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer" : "bg-amber-900/40 text-amber-800 cursor-not-allowed"
                }`}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ingredient */}
      {ingDeleteTarget && !readOnly && onDeleteIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setIngDeleteTarget(null); setIngDeleteConfirm(""); }} />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar ingrediente</h2></div>
            <p className="text-amber-200 text-sm">
              Eliminar <span className="font-bold text-amber-400">"{ingDeleteTarget.name}"</span> lo quitará de todos los productos.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">
                Escribe <span className="font-bold text-red-400">eliminar</span> para confirmar
              </label>
              <input type="text" value={ingDeleteConfirm} onChange={(e) => setIngDeleteConfirm(e.target.value)} placeholder="eliminar"
                className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setIngDeleteTarget(null); setIngDeleteConfirm(""); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">
                Cancelar
              </button>
              <button
                disabled={ingDeleteConfirm.trim().toLowerCase() !== "eliminar"}
                onClick={() => { onDeleteIngredient(ingDeleteTarget.id); setIngDeleteTarget(null); setIngDeleteConfirm(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  ingDeleteConfirm.trim().toLowerCase() === "eliminar"
                    ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-red-950/40 text-red-900 cursor-not-allowed"
                }`}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}