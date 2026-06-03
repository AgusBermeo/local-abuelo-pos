// app/components/inventario/index.tsx
//
// Orquestador del módulo Inventario.
// Contiene únicamente estado de modales y callbacks de mutación.
// El renderizado está delegado a los subcomponentes de esta carpeta.

"use client";

import { useState } from "react";

import type { Product } from "./types";

import ProductCard        from "./ProductCard";
import AddProductModal    from "./AddProductModal";
import EditProductModal   from "./EditProductModal";
import DeleteProductModal from "./DeleteProductModal";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  products: Product[];
  onAddProduct?:    (p: Product) => void;
  onDeleteProduct?: (id: number) => void;
  onEditProduct?:   (p: Product) => void;
  readOnly?: boolean;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function Inventario({
  products,
  onAddProduct,
  onDeleteProduct,
  onEditProduct,
  readOnly = false,
}: Props) {
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editTarget,    setEditTarget]    = useState<Product | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Product | null>(null);

  return (
    <div className="w-full flex flex-col max-w-4xl mx-auto gap-4">

      {/* Aviso solo lectura */}
      {readOnly && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800 rounded-lg px-4 py-3">
          <span className="text-base leading-none">👁️</span>
          <p className="text-xs text-amber-700 uppercase tracking-widest font-bold">
            Modo solo lectura — no puedes modificar el inventario
          </p>
        </div>
      )}

      {/* Encabezado + botón agregar */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-yellow-700 text-xs">
            {readOnly
              ? "Lista de productos disponibles"
              : "Agrega, edita o elimina productos"}
          </p>
          {!readOnly && onAddProduct && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors"
            >
              + Agregar producto
            </button>
          )}
        </div>

        {/* Lista de productos */}
        <div className="flex flex-col gap-2.5">
          {products.length === 0 ? (
            <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-6 text-center text-amber-700 text-sm">
              {readOnly
                ? "No hay productos disponibles."
                : "No hay productos. Agrega uno con el botón de arriba."}
            </div>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                readOnly={readOnly}
                onEdit={
                  !readOnly && onEditProduct
                    ? (p) => setEditTarget(p)
                    : undefined
                }
                onDelete={
                  !readOnly && onDeleteProduct
                    ? (id) => setDeleteTarget(products.find((p) => p.id === id) ?? null)
                    : undefined
                }
              />
            ))
          )}
        </div>
      </div>

      {/* ── Modales ── */}

      {showAddModal && !readOnly && onAddProduct && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdd={(p) => {
            onAddProduct(p);
            setShowAddModal(false);
          }}
        />
      )}

      {editTarget && !readOnly && onEditProduct && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onEdit={(p) => {
            onEditProduct(p);
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && !readOnly && onDeleteProduct && (
        <DeleteProductModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(id) => {
            onDeleteProduct(id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
