"use client";

import { useState } from "react";

type FoodSizes  = { grande: number; normal: number; bocadito: number };
type DrinkSizes = Record<string, { label: string; price: number }>;
type Ingredient = { id: string; name: string; stock: number };

type Product = {
  id: number;
  name: string;
  price: number | FoodSizes | DrinkSizes;
  category: "Comida" | "Bebida";
  size: string | { grande: string; normal: string; bocadito: string };
  relleno?: { carne: string; pollo: string } | null;
  // variantKey → { ingredientId → qty consumed per unit sold }
  ingredientMap: Record<string, Record<string, number>>;
};

function isFoodSizes(p: Product["price"]): p is FoodSizes {
  return typeof p === "object" && "grande" in p;
}
function isDrinkSizes(p: Product["price"]): p is DrinkSizes {
  if (typeof p !== "object" || "grande" in p) return false;
  const vals = Object.values(p as DrinkSizes);
  return vals.length > 0 && typeof vals[0] === "object" && "label" in vals[0];
}

function getAvailableSizeKeys(product: Product): Array<{ key: string; label: string }> {
  if (isFoodSizes(product.price)) {
    const obj = product.size as Record<string, string>;
    return Object.entries(product.price as FoodSizes).filter(([, p]) => p > 0).map(([k]) => ({ key: k, label: obj[k] ?? k }));
  }
  if (isDrinkSizes(product.price))
    return Object.entries(product.price as DrinkSizes).filter(([, { price }]) => price > 0).map(([k, { label }]) => ({ key: k, label }));
  return [{ key: "single", label: product.size as string }];
}
function getAvailableFillingKeys(product: Product): Array<{ key: string; label: string }> {
  if (!product.relleno) return [];
  return Object.entries(product.relleno).map(([key, label]) => ({ key, label }));
}
function getVariantKeys(product: Product): Array<{ variantKey: string; label: string }> {
  const sizes    = getAvailableSizeKeys(product);
  const fillings = getAvailableFillingKeys(product);
  if (fillings.length === 0) return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));
  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes) for (const f of fillings)
    result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}
function getAvailableSizePrices(product: Product): Array<{ key: string; label: string; price: number }> {
  if (isFoodSizes(product.price))
    return Object.entries(product.price).filter(([, p]) => p > 0).map(([k, p]) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), price: p as number }));
  if (isDrinkSizes(product.price))
    return Object.entries(product.price as DrinkSizes).filter(([, { price }]) => price > 0).map(([k, { label, price }]) => ({ key: k, label, price }));
  return [];
}

function stockColor(v: number): string { return v === 0 ? "text-red-400" : v <= 5 ? "text-orange-400" : "text-green-400"; }
function stockBorderFocus(v: number): string { return v === 0 ? "border-red-800 focus:border-red-500" : v <= 5 ? "border-orange-800 focus:border-orange-500" : "border-amber-800 focus:border-amber-500"; }

const inputClass = "bg-amber-950/60 border-2 border-amber-800 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500 transition-colors";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</label>
      {children}
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-3">
      <span className="text-xs text-amber-200">{label}</span>
      <div onClick={onChange} className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${value ? "bg-amber-500" : "bg-amber-800"}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}
function StepperInput({ value, onChange, colorize = true, small = false }: { value: string; onChange: (v: string) => void; colorize?: boolean; small?: boolean }) {
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
function Backdrop({ onClick }: { onClick: () => void }) { return <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClick} />; }
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
    </button>
  );
}

// ── Form types ────────────────────────────────────────────────────────────────
type DrinkSizeRow = { id: string; label: string; price: string };
type ProductForm = {
  name: string; category: "Comida" | "Bebida";
  hasFoodSizes: boolean; hasRelleno: boolean;
  priceGrande: string; priceNormal: string; precioBocadito: string;
  hasDrinkSizes: boolean; drinkSizeRows: DrinkSizeRow[];
  price: string; size: string;
  // variantKey → { ingredientId → qty string }
  ingredientMap: Record<string, Record<string, string>>;
};
const EMPTY_FORM: ProductForm = {
  name: "", category: "Bebida",
  hasFoodSizes: false, hasRelleno: false,
  priceGrande: "", priceNormal: "", precioBocadito: "",
  hasDrinkSizes: false, drinkSizeRows: [{ id: "row0", label: "", price: "" }],
  price: "", size: "", ingredientMap: {},
};
function newRow(): DrinkSizeRow { return { id: `row${Date.now()}_${Math.random()}`, label: "", price: "" }; }

function productToForm(product: Product): ProductForm {
  // Convert numeric ingredientMap to string values for form
  const ingredientMap: Record<string, Record<string, string>> = {};
  Object.entries(product.ingredientMap ?? {}).forEach(([vk, usage]) => {
    ingredientMap[vk] = {};
    Object.entries(usage).forEach(([ingId, qty]) => { ingredientMap[vk][ingId] = String(qty); });
  });

  if (product.category === "Comida") {
    const hasFoodSizes = isFoodSizes(product.price);
    return {
      ...EMPTY_FORM, name: product.name, category: "Comida",
      hasFoodSizes, hasRelleno: !!product.relleno,
      price: hasFoodSizes ? "" : String(product.price as number),
      size:  hasFoodSizes ? "" : (product.size as string),
      priceGrande:    hasFoodSizes ? String((product.price as FoodSizes).grande)   : "",
      priceNormal:    hasFoodSizes ? String((product.price as FoodSizes).normal)   : "",
      precioBocadito: hasFoodSizes ? String((product.price as FoodSizes).bocadito) : "",
      ingredientMap,
    };
  }
  const hasDrinkSizes = isDrinkSizes(product.price);
  const drinkSizeRows: DrinkSizeRow[] = hasDrinkSizes
    ? Object.entries(product.price as DrinkSizes).map(([id, { label, price }]) => ({ id, label, price: String(price) }))
    : [{ id: "row0", label: "", price: "" }];
  return { ...EMPTY_FORM, name: product.name, category: "Bebida", hasDrinkSizes, drinkSizeRows, price: hasDrinkSizes ? "" : String(product.price as number), size: hasDrinkSizes ? "" : (product.size as string), ingredientMap };
}

function getVariantKeysFromForm(form: ProductForm): Array<{ variantKey: string; label: string }> {
  const sizes: Array<{ key: string; label: string }> = [];
  if (form.category === "Comida") {
    if (form.hasFoodSizes) {
      ([["grande", form.priceGrande, "Grande"], ["normal", form.priceNormal, "Normal"], ["bocadito", form.precioBocadito, "Bocadito"]] as [string, string, string][])
        .filter(([, p]) => p !== "" && Number(p) > 0).forEach(([key, , label]) => sizes.push({ key, label }));
    } else { sizes.push({ key: "single", label: form.size || "Unidad" }); }
  } else {
    if (form.hasDrinkSizes) {
      form.drinkSizeRows.filter((r) => r.label && Number(r.price) > 0).forEach((r) => sizes.push({ key: r.id, label: r.label }));
    } else { sizes.push({ key: "single", label: form.size || "Unidad" }); }
  }
  if (sizes.length === 0) sizes.push({ key: "single", label: "Unidad" });
  const fillings: Array<{ key: string; label: string }> =
    form.category === "Comida" && form.hasFoodSizes && form.hasRelleno
      ? [{ key: "carne", label: "Carne" }, { key: "pollo", label: "Pollo" }] : [];
  if (fillings.length === 0) return sizes.map((s) => ({ variantKey: `${s.key}-none`, label: s.label }));
  const result: Array<{ variantKey: string; label: string }> = [];
  for (const s of sizes) for (const f of fillings)
    result.push({ variantKey: `${s.key}-${f.key}`, label: `${s.label} · ${f.label}` });
  return result;
}

// ── DrinkSizeEditor ───────────────────────────────────────────────────────────
function DrinkSizeEditor({ rows, onChange, errors }: { rows: DrinkSizeRow[]; onChange: (r: DrinkSizeRow[]) => void; errors: Record<string, string> }) {
  const update = (id: string, f: "label" | "price", v: string) => onChange(rows.map((r) => r.id === id ? { ...r, [f]: v } : r));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] uppercase tracking-widest text-yellow-700">Tamaños y precios</p>
      <div className="flex flex-col gap-2">
        {rows.map((row, idx) => (
          <div key={row.id} className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-1">
              <input type="text" value={row.label} onChange={(e) => update(row.id, "label", e.target.value)}
                placeholder={`ej: ${["1 vaso","500ml","1 litro"][idx] ?? "tamaño"}`}
                className={`${inputClass} ${errors[`drinkLabel_${row.id}`] ? "border-red-600" : ""}`} />
              {errors[`drinkLabel_${row.id}`] && <p className="text-red-400 text-[10px]">{errors[`drinkLabel_${row.id}`]}</p>}
            </div>
            <div className="w-28 flex flex-col gap-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-bold pointer-events-none">$</span>
                <input type="number" min={0} step={0.01} value={row.price} onChange={(e) => update(row.id, "price", e.target.value)}
                  placeholder="0.00" className={`${inputClass} pl-7 w-full ${errors[`drinkPrice_${row.id}`] ? "border-red-600" : ""}`} />
              </div>
              {errors[`drinkPrice_${row.id}`] && <p className="text-red-400 text-[10px]">{errors[`drinkPrice_${row.id}`]}</p>}
            </div>
            <button onClick={() => { if (rows.length > 1) onChange(rows.filter((r) => r.id !== row.id)); }} disabled={rows.length <= 1}
              className={`min-w-9 w-9 h-9 flex items-center justify-center rounded-lg border-2 text-sm transition-colors ${rows.length <= 1 ? "border-amber-900 text-amber-900 cursor-not-allowed" : "border-red-900 hover:border-red-700 text-red-700 hover:text-red-500 cursor-pointer"}`}>×</button>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...rows, newRow()])} className="self-start text-[10px] uppercase tracking-widest font-bold text-amber-600 hover:text-amber-400 border border-amber-800 hover:border-amber-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">+ Agregar tamaño</button>
      {errors.drinkSizes && <p className="text-red-400 text-[10px]">{errors.drinkSizes}</p>}
    </div>
  );
}

// ── IngredientAssigner — quantity per ingredient per variant ──────────────────
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

  // Copy first variant's map to all variants
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
          Indica cuántas unidades de cada ingrediente se descuentan al vender una unidad de esta variante.
        </p>
      </div>

      {variantKeys.map(({ variantKey, label }, idx) => {
        const usage = ingredientMap[variantKey] ?? {};
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
                const raw = usage[ing.id] ?? "0";
                const num = Number(raw);
                const active = num > 0;
                return (
                  <div key={ing.id} className="flex items-center gap-3">
                    {/* Ingredient name + current stock */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold truncate ${active ? "text-amber-200" : "text-amber-700"}`}>{ing.name}</span>
                      <span className={`text-[10px] shrink-0 ${stockColor(ing.stock)}`}>({ing.stock})</span>
                    </div>
                    {/* Quantity stepper */}
                    <StepperInput
                      value={raw === "0" ? "" : raw}
                      onChange={(v) => setQty(variantKey, ing.id, v || "0")}
                      colorize={false}
                      small
                    />
                    {active && (
                      <span className="text-[10px] text-amber-600 shrink-0 w-16 text-right">
                        ×{num} por unidad
                      </span>
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

// ── ProductFormFields ─────────────────────────────────────────────────────────
function ProductFormFields({ form, setForm, errors, ingredients }: { form: ProductForm; setForm: React.Dispatch<React.SetStateAction<ProductForm>>; errors: Record<string, string>; ingredients: Ingredient[] }) {
  const variantKeys = getVariantKeysFromForm(form);
  return (
    <>
      <Field label="Nombre del producto" error={errors.name}>
        <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ej: Empanada, Bandeja de 5…" className={inputClass} />
      </Field>
      <Field label="Categoría">
        <div className="flex gap-2">
          {(["Comida", "Bebida"] as const).map((cat) => (
            <button key={cat} onClick={() => setForm((p) => ({ ...p, category: cat, hasFoodSizes: cat === "Comida" ? p.hasFoodSizes : false, hasRelleno: cat === "Comida" ? p.hasRelleno : false, hasDrinkSizes: cat === "Bebida" ? p.hasDrinkSizes : false }))}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 cursor-pointer transition-colors ${form.category === cat ? "bg-amber-500 border-amber-500 text-amber-950" : "bg-transparent border-amber-800 text-amber-700 hover:border-amber-600"}`}>
              {cat === "Comida" ? "🍽️ Comida" : "🥤 Bebida"}
            </button>
          ))}
        </div>
      </Field>
      {form.category === "Comida" && (
        <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
          <Toggle label="Tiene tamaños (Grande / Normal / Bocadito)" value={form.hasFoodSizes} onChange={() => setForm((p) => ({ ...p, hasFoodSizes: !p.hasFoodSizes, hasRelleno: !p.hasFoodSizes ? p.hasRelleno : false }))} />
          {form.hasFoodSizes && <Toggle label="Tiene relleno (Carne / Pollo)" value={form.hasRelleno} onChange={() => setForm((p) => ({ ...p, hasRelleno: !p.hasRelleno }))} />}
        </div>
      )}
      {form.category === "Bebida" && (
        <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
          <Toggle label="Tiene múltiples tamaños" value={form.hasDrinkSizes} onChange={() => setForm((p) => ({ ...p, hasDrinkSizes: !p.hasDrinkSizes, drinkSizeRows: !p.hasDrinkSizes && p.drinkSizeRows.length === 0 ? [newRow()] : p.drinkSizeRows }))} />
        </div>
      )}
      {form.category === "Comida" && form.hasFoodSizes && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Precios por tamaño</p>
            <p className="text-[10px] text-amber-700">Ingresa $0 para ocultar ese tamaño.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Grande ($)" error={errors.priceGrande}><input type="number" min={0} step={0.01} value={form.priceGrande} onChange={(e) => setForm((p) => ({ ...p, priceGrande: e.target.value }))} placeholder="0.00" className={inputClass} /></Field>
            <Field label="Normal ($)" error={errors.priceNormal}><input type="number" min={0} step={0.01} value={form.priceNormal} onChange={(e) => setForm((p) => ({ ...p, priceNormal: e.target.value }))} placeholder="0.00" className={inputClass} /></Field>
            <Field label="Bocadito ($)" error={errors.precioBocadito}><input type="number" min={0} step={0.01} value={form.precioBocadito} onChange={(e) => setForm((p) => ({ ...p, precioBocadito: e.target.value }))} placeholder="0.00" className={inputClass} /></Field>
          </div>
        </div>
      )}
      {form.category === "Bebida" && form.hasDrinkSizes && (
        <DrinkSizeEditor rows={form.drinkSizeRows} onChange={(rows) => setForm((p) => ({ ...p, drinkSizeRows: rows }))} errors={errors} />
      )}
      {((form.category === "Comida" && !form.hasFoodSizes) || (form.category === "Bebida" && !form.hasDrinkSizes)) && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio ($)" error={errors.price}><input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" className={inputClass} /></Field>
          <Field label="Presentación" error={errors.size}><input type="text" value={form.size} onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))} placeholder="ej: 500ml, Taza, Unidad" className={inputClass} /></Field>
        </div>
      )}
      <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest text-yellow-700">Control de stock</p>
        <IngredientAssigner
          variantKeys={variantKeys}
          ingredientMap={form.ingredientMap}
          ingredients={ingredients}
          onChange={(map) => setForm((p) => ({ ...p, ingredientMap: map }))}
        />
      </div>
    </>
  );
}

// ── Main Inventario ───────────────────────────────────────────────────────────
export default function Inventario({
  products, ingredients,
  onAddProduct, onDeleteProduct, onEditProduct,
  onAddIngredient, onEditIngredient, onDeleteIngredient,
}: {
  products: Product[]; ingredients: Ingredient[];
  onAddProduct: (p: Product) => void; onDeleteProduct: (id: number) => void; onEditProduct: (p: Product) => void;
  onAddIngredient: (i: Ingredient) => void; onEditIngredient: (i: Ingredient) => void; onDeleteIngredient: (id: string) => void;
}) {
  const [section, setSection] = useState<"ingredientes" | "productos">("ingredientes");
  const [filterCategory, setFilterCategory] = useState<"Todas" | "Comida" | "Bebida">("Todas");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [showIngModal, setShowIngModal] = useState(false);
  const [ingName, setIngName] = useState(""); const [ingStock, setIngStock] = useState("0");
  const [ingEditTarget, setIngEditTarget] = useState<Ingredient | null>(null);
  const [ingEditName, setIngEditName] = useState(""); const [ingEditStock, setIngEditStock] = useState("0");
  const [ingDeleteTarget, setIngDeleteTarget] = useState<Ingredient | null>(null);
  const [ingDeleteConfirm, setIngDeleteConfirm] = useState("");

  const validate = (form: ProductForm, setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio.";
    if (form.category === "Comida") {
      if (form.hasFoodSizes) {
        const vals = [["priceGrande", form.priceGrande], ["priceNormal", form.priceNormal], ["precioBocadito", form.precioBocadito]];
        vals.forEach(([k, v]) => { if (v !== "" && (isNaN(Number(v)) || Number(v) < 0)) e[k] = "Precio inválido."; });
        if (!vals.some(([, v]) => v !== "" && !isNaN(Number(v)) && Number(v) > 0)) e.priceGrande = "Al menos un tamaño debe tener precio mayor a $0.";
      } else {
        if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = "Precio inválido.";
        if (!form.size.trim()) e.size = "La presentación es obligatoria.";
      }
    } else {
      if (form.hasDrinkSizes) {
        let any = false;
        form.drinkSizeRows.forEach((r) => {
          if (!r.label.trim()) e[`drinkLabel_${r.id}`] = "Nombre requerido.";
          const p = Number(r.price);
          if (r.price === "" || isNaN(p) || p < 0) e[`drinkPrice_${r.id}`] = "Precio inválido.";
          else if (p > 0) any = true;
        });
        if (!any) e.drinkSizes = "Al menos un tamaño debe tener precio mayor a $0.";
      } else {
        if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = "Precio inválido.";
        if (!form.size.trim()) e.size = "La presentación es obligatoria.";
      }
    }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const formToProduct = (form: ProductForm, id: number): Product => {
    // Convert string qty map → number qty map, dropping zeros
    const ingredientMap: Record<string, Record<string, number>> = {};
    Object.entries(form.ingredientMap).forEach(([vk, usage]) => {
      const nums: Record<string, number> = {};
      Object.entries(usage).forEach(([ingId, qty]) => { const n = Math.round(Number(qty) || 0); if (n > 0) nums[ingId] = n; });
      if (Object.keys(nums).length > 0) ingredientMap[vk] = nums;
    });

    if (form.category === "Comida") {
      if (form.hasFoodSizes) {
        return { id, name: form.name.trim(), category: "Comida",
          price: { grande: Number(form.priceGrande)||0, normal: Number(form.priceNormal)||0, bocadito: Number(form.precioBocadito)||0 },
          size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" },
          relleno: form.hasRelleno ? { carne: "Carne", pollo: "Pollo" } : null, ingredientMap };
      }
      return { id, name: form.name.trim(), category: "Comida", price: Number(form.price), size: form.size.trim(), relleno: null, ingredientMap };
    }
    if (form.hasDrinkSizes) {
      const drinkSizes: DrinkSizes = {};
      form.drinkSizeRows.forEach((r, i) => { drinkSizes[r.id.startsWith("row") ? r.id : `size${i}`] = { label: r.label.trim(), price: Number(r.price) }; });
      return { id, name: form.name.trim(), category: "Bebida", price: drinkSizes, size: "Tamaño", ingredientMap };
    }
    return { id, name: form.name.trim(), category: "Bebida", price: Number(form.price), size: form.size.trim(), ingredientMap };
  };

  const handleAdd  = () => { if (!validate(addForm,  setAddErrors))  return; onAddProduct(formToProduct(addForm, Date.now())); setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); };
  const handleEdit = () => { if (!editTarget || !validate(editForm, setEditErrors)) return; onEditProduct(formToProduct(editForm, editTarget.id)); setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); };

  const handleAddIngredient  = () => { if (!ingName.trim()) return; onAddIngredient({ id: `ing_${Date.now()}`, name: ingName.trim(), stock: Math.max(0, Math.round(Number(ingStock)||0)) }); setShowIngModal(false); setIngName(""); setIngStock("0"); };
  const handleEditIngredient = () => { if (!ingEditTarget) return; onEditIngredient({ ...ingEditTarget, name: ingEditName.trim(), stock: Math.max(0, Math.round(Number(ingEditStock)||0)) }); setIngEditTarget(null); };

  const filteredProducts = filterCategory === "Todas" ? products : products.filter((p) => p.category === filterCategory);

  return (
    <div className="w-full flex flex-col max-w-4xl mx-auto gap-4">
      {/* Section switcher */}
      <div className="flex bg-amber-900/40 border-2 border-amber-800 rounded-xl p-1 gap-1">
        {([["ingredientes", "🧂 Ingredientes"], ["productos", "🍽️ Productos"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${section === key ? "bg-amber-500 text-amber-950" : "text-amber-700 hover:text-amber-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ INGREDIENTES ══ */}
      {section === "ingredientes" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-yellow-700 text-xs">Stock global compartido entre todos los productos</p>
            <button onClick={() => { setIngName(""); setIngStock("0"); setShowIngModal(true); }}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors">+ Nuevo ingrediente</button>
          </div>
          {ingredients.length === 0 ? (
            <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-8 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🧂</span>
              <p className="text-amber-600 text-sm font-semibold">Sin ingredientes</p>
              <p className="text-amber-800 text-xs max-w-xs">Crea ingredientes como "Carne", "Masa Normal", "Gaseosa 500ml"… Luego asígnalos a cada variante de producto con su multiplicador.</p>
              <button onClick={() => { setIngName(""); setIngStock("0"); setShowIngModal(true); }}
                className="mt-2 bg-amber-700 hover:bg-amber-600 text-amber-100 text-xs font-bold py-2 px-5 rounded-lg cursor-pointer uppercase transition-colors">Crear primer ingrediente</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ingredients.map((ing) => {
                const usedIn = products.filter((p) => Object.values(p.ingredientMap ?? {}).some((usage) => ing.id in usage)).length;
                return (
                  <div key={ing.id} className="flex items-center gap-3 bg-amber-900/30 border-2 border-amber-800 rounded-lg px-4 py-3">
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-amber-100">{ing.name}</span>
                      {usedIn > 0
                        ? <span className="text-[10px] text-amber-700">Usado en {usedIn} producto{usedIn !== 1 ? "s" : ""}</span>
                        : <span className="text-[10px] text-amber-800 italic">Sin asignar</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold tabular-nums ${stockColor(ing.stock)}`}>{ing.stock}</span>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => onEditIngredient({ ...ing, stock: ing.stock + 1 })} className="w-6 h-5 flex items-center justify-center rounded bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer leading-none">+</button>
                        <button onClick={() => onEditIngredient({ ...ing, stock: Math.max(0, ing.stock - 1) })} className="w-6 h-5 flex items-center justify-center rounded bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer leading-none">−</button>
                      </div>
                    </div>
                    <button onClick={() => { setIngEditTarget(ing); setIngEditName(ing.name); setIngEditStock(String(ing.stock)); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white p-1.5 cursor-pointer transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                    </button>
                    <button onClick={() => { setIngDeleteTarget(ing); setIngDeleteConfirm(""); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
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
            <p className="text-yellow-700 text-xs">Agrega, edita o elimina un producto</p>
            <button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors">+ Agregar producto</button>
          </div>
          <div className="flex gap-2">
            {(["Todas", "Comida", "Bebida"] as const).map((cat) => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors border-2 ${filterCategory === cat ? "bg-amber-500 border-amber-500 text-amber-950" : "bg-transparent border-amber-700 text-amber-700 hover:border-amber-500 hover:text-amber-500"}`}>{cat}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {filteredProducts.length === 0 ? (
              <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">No hay productos en esta categoría.</div>
            ) : filteredProducts.map((product) => {
              const hasSizes = isFoodSizes(product.price) || isDrinkSizes(product.price);
              const sizePrices = getAvailableSizePrices(product);
              const variants = getVariantKeys(product);
              const assignedIngIds = new Set(Object.values(product.ingredientMap ?? {}).flatMap((u) => Object.keys(u)));
              const assignedIngs = ingredients.filter((i) => assignedIngIds.has(i.id));
              const hasLowStock = assignedIngs.some((i) => i.stock > 0 && i.stock <= 5);
              const hasOutOfStock = assignedIngs.some((i) => i.stock === 0);

              return (
                <div key={product.id} className="flex flex-col bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
                  <div className="relative flex gap-2 justify-between">
                    <div className="flex items-center gap-2 max-w-[70%] mb-1.5 flex-wrap">
                      <h2 className="font-bold text-sm">{product.name}</h2>
                      {assignedIngs.length > 0 && (
                        hasOutOfStock
                          ? <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-900/40 border border-red-800 rounded-full px-2 py-0.5">⚠ Sin stock</span>
                          : hasLowStock
                            ? <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-orange-400 bg-orange-900/30 border border-orange-800 rounded-full px-2 py-0.5">↓ Stock bajo</span>
                            : <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-green-500 bg-green-900/20 border border-green-900 rounded-full px-2 py-0.5">✓ Con stock</span>
                      )}
                    </div>
                    <div className="absolute top-0 right-0 flex gap-2">
                      <button onClick={() => { setEditTarget(product); setEditForm(productToForm(product)); setEditErrors({}); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white p-1.5 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                      </button>
                      <button onClick={() => { setDeleteTarget(product); setDeleteConfirm(""); }} className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white p-1.5 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    </div>
                  </div>
                  {product.relleno && <p className="text-xs mb-1 uppercase text-gray-200">{Object.values(product.relleno).join(" · ")}</p>}
                  <div className="flex gap-4 flex-wrap">
                    {hasSizes
                      ? sizePrices.map(({ key, label, price }) => (<div key={key} className="flex flex-col gap-0.5"><h3 className="text-[10px] text-yellow-700 uppercase">{label}</h3><p className="font-bold text-amber-500">${price.toFixed(2)}</p></div>))
                      : <div className="flex flex-col gap-0.5"><h3 className="text-[10px] text-yellow-700 uppercase">{typeof product.size === "string" ? product.size : ""}</h3><p className="font-bold text-amber-500">${(product.price as number).toFixed(2)}</p></div>
                    }
                  </div>
                  {/* Ingredient assignments summary */}
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
                                      ing.stock === 0 ? "border-red-800 text-red-400 bg-red-900/20"
                                      : ing.stock <= 5 ? "border-orange-800 text-orange-400 bg-orange-900/20"
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
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Modals ══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }} />
          <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <CloseBtn onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }} />
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Nuevo Producto</h2>
            <ProductFormFields form={addForm} setForm={setAddForm} errors={addErrors} ingredients={ingredients} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button onClick={handleAdd} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors">Agregar</button>
            </div>
          </div>
        </div>
      )}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }} />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <CloseBtn onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }} />
            <div className="flex items-center gap-2"><span className="text-lg">✏️</span><h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Editar Producto</h2></div>
            <ProductFormFields form={editForm} setForm={setEditForm} errors={editErrors} ingredients={ingredients} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button onClick={handleEdit} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors">Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar producto</h2></div>
            <p className="text-amber-200 text-sm">Estás a punto de eliminar <span className="font-bold text-amber-400">"{deleteTarget.name}"</span>. Esta acción no se puede deshacer.</p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">Escribe <span className="font-bold text-red-400">eliminar producto</span> para confirmar</label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="eliminar producto" className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button disabled={deleteConfirm.trim().toLowerCase() !== "eliminar producto"} onClick={() => { onDeleteProduct(deleteTarget.id); setDeleteTarget(null); setDeleteConfirm(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${deleteConfirm.trim().toLowerCase() === "eliminar producto" ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer" : "bg-red-950/40 text-red-900 cursor-not-allowed"}`}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {showIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => setShowIngModal(false)} />
          <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <CloseBtn onClick={() => setShowIngModal(false)} />
            <div className="flex items-center gap-2"><span className="text-lg">🧂</span><h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Nuevo Ingrediente</h2></div>
            <Field label="Nombre"><input type="text" value={ingName} onChange={(e) => setIngName(e.target.value)} placeholder="ej: Carne, Masa Normal, Gaseosa…" className={inputClass} autoFocus /></Field>
            <Field label="Stock inicial"><StepperInput value={ingStock} onChange={setIngStock} /></Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowIngModal(false)} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button onClick={handleAddIngredient} disabled={!ingName.trim()} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${ingName.trim() ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer" : "bg-amber-900/40 text-amber-800 cursor-not-allowed"}`}>Crear</button>
            </div>
          </div>
        </div>
      )}
      {ingEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => setIngEditTarget(null)} />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <CloseBtn onClick={() => setIngEditTarget(null)} />
            <div className="flex items-center gap-2"><span className="text-lg">✏️</span><h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Editar Ingrediente</h2></div>
            <Field label="Nombre"><input type="text" value={ingEditName} onChange={(e) => setIngEditName(e.target.value)} className={inputClass} autoFocus /></Field>
            <Field label="Stock"><StepperInput value={ingEditStock} onChange={setIngEditStock} /></Field>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setIngEditTarget(null)} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button onClick={handleEditIngredient} disabled={!ingEditName.trim()} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${ingEditName.trim() ? "bg-amber-500 hover:bg-amber-400 text-amber-950 cursor-pointer" : "bg-amber-900/40 text-amber-800 cursor-not-allowed"}`}>Guardar</button>
            </div>
          </div>
        </div>
      )}
      {ingDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClick={() => { setIngDeleteTarget(null); setIngDeleteConfirm(""); }} />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar ingrediente</h2></div>
            <p className="text-amber-200 text-sm">Eliminar <span className="font-bold text-amber-400">"{ingDeleteTarget.name}"</span> lo quitará de todos los productos donde esté asignado.</p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">Escribe <span className="font-bold text-red-400">eliminar</span> para confirmar</label>
              <input type="text" value={ingDeleteConfirm} onChange={(e) => setIngDeleteConfirm(e.target.value)} placeholder="eliminar" className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setIngDeleteTarget(null); setIngDeleteConfirm(""); }} className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancelar</button>
              <button disabled={ingDeleteConfirm.trim().toLowerCase() !== "eliminar"} onClick={() => { onDeleteIngredient(ingDeleteTarget.id); setIngDeleteTarget(null); setIngDeleteConfirm(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${ingDeleteConfirm.trim().toLowerCase() === "eliminar" ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer" : "bg-red-950/40 text-red-900 cursor-not-allowed"}`}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}