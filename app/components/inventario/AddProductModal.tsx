// app/components/inventario/AddProductModal.tsx
//
// Modal para agregar un nuevo producto.

import { useState } from "react";
import type { Product, ProductForm } from "./types";
import { EMPTY_FORM, validate, formToProduct } from "./helpers";
import { Backdrop, CloseBtn } from "./ui";
import ProductFormFields from "./ProductFormFields";

type Props = {
  onClose: () => void;
  onAdd: (product: Product) => void;
};

export default function AddProductModal({ onClose, onAdd }: Props) {
  const [form,   setForm]   = useState<ProductForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  const handleAdd = () => {
    if (!validate(form, setErrors)) return;
    onAdd(formToProduct(form, Date.now()));
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={handleClose} />
      <div className="relative bg-amber-950 border-2 border-amber-700 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <CloseBtn onClick={handleClose} />
        <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest">
          Nuevo Producto
        </h2>

        <ProductFormFields form={form} setForm={setForm} errors={errors} />

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleClose}
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
  );
}
