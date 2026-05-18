"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number | { grande: number; normal: number; bocadito: number };
  category: string;
  size: string | { grande: string; normal: string; bocadito: string };
  relleno?: { carne: string; pollo: string } | null;
};

type ProductForm = {
  name: string;
  category: "Comida" | "Bebida";
  hasSizes: boolean;
  hasRelleno: boolean;
  price: string;
  size: string;
  priceGrande: string;
  priceNormal: string;
  precioBocadito: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "Bebida",
  hasSizes: false,
  hasRelleno: false,
  price: "",
  size: "",
  priceGrande: "",
  priceNormal: "",
  precioBocadito: "",
};

function productToForm(product: Product): ProductForm {
  const hasSizes = typeof product.price === "object";
  const hasRelleno = !!product.relleno;
  return {
    name: product.name,
    category: product.category as "Comida" | "Bebida",
    hasSizes,
    hasRelleno,
    price: hasSizes ? "" : String(product.price as number),
    size: hasSizes ? "" : (product.size as string),
    priceGrande: hasSizes ? String((product.price as { grande: number }).grande) : "",
    priceNormal: hasSizes ? String((product.price as { normal: number }).normal) : "",
    precioBocadito: hasSizes ? String((product.price as { bocadito: number }).bocadito) : "",
  };
}

// Returns only size entries whose price is > 0
function getAvailableSizePrices(product: Product): [string, number][] {
  if (typeof product.price !== "object") return [];
  return Object.entries(product.price).filter(
    ([, price]) => typeof price === "number" && price > 0
  ) as [string, number][];
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-yellow-700">{label}</label>
      {children}
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}

const inputClass =
  "bg-amber-950/60 border-2 border-amber-800 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-500 transition-colors";

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-3">
      <span className="text-xs text-amber-200">{label}</span>
      <div
        onClick={onChange}
        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
          value ? "bg-amber-500" : "bg-amber-800"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </label>
  );
}

function ProductFormFields({
  form,
  setForm,
  errors,
}: {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  errors: Record<string, string>;
}) {
  return (
    <>
      <Field label="Nombre del producto" error={errors.name}>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="ej: Empanada de verde, Jugo de naranja…"
          className={inputClass}
        />
      </Field>

      <Field label="Categoría">
        <div className="flex gap-2">
          {(["Comida", "Bebida"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  category: cat,
                  hasSizes: cat === "Comida" ? p.hasSizes : false,
                  hasRelleno: cat === "Comida" ? p.hasRelleno : false,
                }))
              }
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
        <div className="flex flex-col gap-3 bg-amber-900/30 border border-amber-800 rounded-lg p-3">
          <Toggle
            label="Tiene tamaños (Grande / Normal / Bocadito)"
            value={form.hasSizes}
            onChange={() =>
              setForm((p) => ({
                ...p,
                hasSizes: !p.hasSizes,
                hasRelleno: !p.hasSizes ? p.hasRelleno : false,
              }))
            }
          />
          {form.hasSizes && (
            <Toggle
              label="Tiene relleno (Carne / Pollo)"
              value={form.hasRelleno}
              onChange={() => setForm((p) => ({ ...p, hasRelleno: !p.hasRelleno }))}
            />
          )}
        </div>
      )}

      {form.hasSizes ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700">Precios por tamaño</p>
            <p className="text-[10px] text-amber-700">Ingresa $0 para ocultar ese tamaño.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Grande ($)" error={errors.priceGrande}>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.priceGrande}
                onChange={(e) => setForm((p) => ({ ...p, priceGrande: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
            <Field label="Normal ($)" error={errors.priceNormal}>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.priceNormal}
                onChange={(e) => setForm((p) => ({ ...p, priceNormal: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
            <Field label="Bocadito ($)" error={errors.precioBocadito}>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.precioBocadito}
                onChange={(e) => setForm((p) => ({ ...p, precioBocadito: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio ($)" error={errors.price}>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="Presentación" error={errors.size}>
            <input
              type="text"
              value={form.size}
              onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
              placeholder="ej: 500ml, Taza, Unidad"
              className={inputClass}
            />
          </Field>
        </div>
      )}
    </>
  );
}

export default function Inventario({
  products,
  onAddProduct,
  onDeleteProduct,
  onEditProduct,
}: {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (id: number) => void;
  onEditProduct: (product: Product) => void;
}) {
  const [filterCategory, setFilterCategory] = useState<"Todas" | "Comida" | "Bebida">("Todas");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Edit modal
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const filteredProducts =
    filterCategory === "Todas"
      ? products
      : products.filter((p) => p.category === filterCategory);

  const validate = (
    form: ProductForm,
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio.";
    if (form.hasSizes) {
      // Each field must be a valid number >= 0 if filled
      if (form.priceGrande !== "" && (isNaN(Number(form.priceGrande)) || Number(form.priceGrande) < 0))
        e.priceGrande = "Precio inválido.";
      if (form.priceNormal !== "" && (isNaN(Number(form.priceNormal)) || Number(form.priceNormal) < 0))
        e.priceNormal = "Precio inválido.";
      if (form.precioBocadito !== "" && (isNaN(Number(form.precioBocadito)) || Number(form.precioBocadito) < 0))
        e.precioBocadito = "Precio inválido.";
      // At least one size must have a price > 0
      const anyPositive = [form.priceGrande, form.priceNormal, form.precioBocadito].some(
        (v) => v !== "" && !isNaN(Number(v)) && Number(v) > 0
      );
      if (!anyPositive) e.priceGrande = "Al menos un tamaño debe tener precio mayor a $0.";
    } else {
      if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0)
        e.price = "Precio inválido.";
      if (!form.size.trim()) e.size = "La presentación es obligatoria (ej: 500ml, Taza).";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const formToProduct = (form: ProductForm, id: number): Product => ({
    id,
    name: form.name.trim(),
    category: form.category,
    ...(form.hasSizes
      ? {
          price: {
            grande: form.priceGrande !== "" ? Number(form.priceGrande) : 0,
            normal: form.priceNormal !== "" ? Number(form.priceNormal) : 0,
            bocadito: form.precioBocadito !== "" ? Number(form.precioBocadito) : 0,
          },
          size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito" },
          relleno: form.hasRelleno ? { carne: "Carne", pollo: "Pollo" } : null,
        }
      : {
          price: Number(form.price),
          size: form.size.trim(),
          relleno: null,
        }),
  });

  const handleAdd = () => {
    if (!validate(addForm, setAddErrors)) return;
    onAddProduct(formToProduct(addForm, Date.now()));
    setShowAddModal(false);
    setAddForm(EMPTY_FORM);
    setAddErrors({});
  };

  const handleEdit = () => {
    if (!editTarget) return;
    if (!validate(editForm, setEditErrors)) return;
    onEditProduct(formToProduct(editForm, editTarget.id));
    setEditTarget(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
  };

  const openEdit = (product: Product) => {
    setEditTarget(product);
    setEditForm(productToForm(product));
    setEditErrors({});
  };

  return (
    <div className="w-full flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pb-3">
        <p className="text-yellow-700 text-xs">Edita o elimina un producto</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors"
        >
          + Agregar producto
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4">
        {(["Todas", "Comida", "Bebida"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors border-2 ${
              filterCategory === cat
                ? "bg-amber-500 border-amber-500 text-amber-950"
                : "bg-transparent border-amber-700 text-amber-700 hover:border-amber-500 hover:text-amber-500"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-2.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">
            No hay productos en esta categoría.
          </div>
        ) : (
          filteredProducts.map((product) => {
            const availableSizePrices = getAvailableSizePrices(product);
            return (
              <div
                key={product.id}
                className="flex flex-col bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4"
              >
                <div className="relative flex gap-2 justify-between">
                  <h2 className="font-bold text-sm max-w-[70%] mb-1.5">{product.name}</h2>
                  <div className="absolute top-0 right-0 flex gap-2">
                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(product)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold p-1.5 cursor-pointer transition-colors"
                      title="Editar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => { setDeleteTarget(product); setDeleteConfirmText(""); }}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1.5 cursor-pointer transition-colors"
                      title="Eliminar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {product.relleno && (
                  <p className="text-xs mb-1 uppercase text-gray-200">
                    {Object.values(product.relleno).join(" · ")}
                  </p>
                )}
                <div className="flex gap-4 flex-wrap">
                  {typeof product.price === "object" ? (
                    availableSizePrices.map(([size, price]) => (
                      <div key={size} className="flex flex-col gap-0.5">
                        <h3 className="text-[10px] text-yellow-700 uppercase">{size}</h3>
                        <p className="font-bold text-amber-500">${(price as number).toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-yellow-700 uppercase">
                        {typeof product.size === "string" ? product.size : ""}
                      </span>
                      <p className="font-bold text-amber-500">${(product.price as number).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }}
          />
          <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }}
              className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Nuevo Producto</h2>
            <ProductFormFields form={addForm} setForm={setAddForm} errors={addErrors} />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddErrors({}); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }}
          />
          <div className="relative bg-amber-950 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }}
              className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">Editar Producto</h2>
            </div>
            <ProductFormFields form={editForm} setForm={setEditForm} errors={editErrors} />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setEditTarget(null); setEditForm(EMPTY_FORM); setEditErrors({}); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
          />
          <div className="relative bg-amber-950 border-2 border-red-800 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-red-400 font-bold text-base uppercase tracking-widest">Eliminar producto</h2>
            </div>
            <p className="text-amber-200 text-sm">
              Estás a punto de eliminar <span className="font-bold text-amber-400">"{deleteTarget.name}"</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-red-600">
                Escribe <span className="font-bold text-red-400">eliminar producto</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="eliminar producto"
                className="bg-amber-950/60 border-2 border-red-900 focus:border-red-600 rounded-lg px-3 py-2 text-amber-100 text-sm focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleteConfirmText.trim().toLowerCase() !== "eliminar producto"}
                onClick={() => {
                  onDeleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  deleteConfirmText.trim().toLowerCase() === "eliminar producto"
                    ? "bg-red-700 hover:bg-red-600 text-white cursor-pointer"
                    : "bg-red-950/40 text-red-900 cursor-not-allowed"
                }`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}