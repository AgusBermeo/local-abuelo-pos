// app/components/inventario/index.tsx

"use client";

import { useState } from "react";
import type { Product } from "./types";
import type { StockEntryLog } from "../../home-client";

import ProductCard        from "./ProductCard";
import AddProductModal    from "./AddProductModal";
import EditProductModal   from "./EditProductModal";
import DeleteProductModal from "./DeleteProductModal";
import StockEntryModal    from "./StockEntryModal";

type Props = {
  products: Product[];
  onAddProduct?:    (p: Product) => void;
  onDeleteProduct?: (id: number) => void;
  onEditProduct?:   (p: Product) => void;
  onLogStockEntry?: (entries: Omit<StockEntryLog, "id" | "date">[]) => void;
  readOnly?: boolean;
};

export default function Inventario({
  products,
  onAddProduct,
  onDeleteProduct,
  onEditProduct,
  onLogStockEntry,
  readOnly = false,
}: Props) {
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [editTarget,     setEditTarget]     = useState<Product | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Product | null>(null);

  const handleStockEntry = (
    deltas: Array<{ productId: number; key: string; delta: number }>,
  ) => {
    if (!onEditProduct) return;

    const byProduct: Record<number, Array<{ key: string; delta: number }>> = {};
    for (const d of deltas) {
      if (!byProduct[d.productId]) byProduct[d.productId] = [];
      byProduct[d.productId].push({ key: d.key, delta: d.delta });
    }

    for (const [pidStr, entries] of Object.entries(byProduct)) {
      const productId = Number(pidStr);
      const product   = products.find((p) => p.id === productId);
      if (!product) continue;

      if (product.category === "Comida") {
        const newVariantStock = { ...(product.variantStock ?? {}) };
        for (const { key, delta } of entries) {
          newVariantStock[key] = (newVariantStock[key] ?? 0) + delta;
        }
        onEditProduct({ ...product, variantStock: newVariantStock });
      } else if (product.category === "Bebida" && product.drinkSizes) {
        const newDrinkSizes = product.drinkSizes.map((ds) => {
          const entry = entries.find((e) => e.key === ds.key);
          if (!entry) return ds;
          return { ...ds, stock: ds.stock + entry.delta };
        });
        onEditProduct({ ...product, drinkSizes: newDrinkSizes });
      }
    }
  };

  return (
    <div className="w-full flex flex-col max-w-4xl mx-auto gap-4">

      {readOnly && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800 rounded-lg px-4 py-3">
          <span className="text-base leading-none">👁️</span>
          <p className="text-xs text-amber-700 uppercase tracking-widest font-bold">
            Modo solo lectura — no puedes modificar el inventario
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <p className="text-yellow-700 text-xs">
            {readOnly
              ? "Lista de productos disponibles"
              : "Agrega, edita o elimina productos"}
          </p>

          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              {onEditProduct && (
                <button
                  onClick={() => setShowStockEntry(true)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors"
                >
                  <span className="text-sm leading-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                  </span>
                  Ingresar inventario
                </button>
              )}
              {onAddProduct && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase transition-colors"
                >
                  + Agregar producto
                </button>
              )}
            </div>
          )}
        </div>

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
                onEdit={!readOnly && onEditProduct ? (p) => setEditTarget(p) : undefined}
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

      {showAddModal && !readOnly && onAddProduct && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdd={(p) => { onAddProduct(p); setShowAddModal(false); }}
        />
      )}

      {editTarget && !readOnly && onEditProduct && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onEdit={(p) => { onEditProduct(p); setEditTarget(null); }}
        />
      )}

      {deleteTarget && !readOnly && onDeleteProduct && (
        <DeleteProductModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(id) => { onDeleteProduct(id); setDeleteTarget(null); }}
        />
      )}

      {showStockEntry && !readOnly && onEditProduct && (
        <StockEntryModal
          products={products}
          onClose={() => setShowStockEntry(false)}
          onConfirm={handleStockEntry}
          onLogEntry={onLogStockEntry ?? (() => {})}
        />
      )}
    </div>
  );
}