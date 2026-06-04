// app/components/cobrar/SaveOrderModal.tsx
//
// Modal para nombrar y guardar el carrito actual como pedido guardado.

import { useState } from "react";

type Props = {
  /** Si se pasa, es una actualización de un pedido ya guardado */
  existingName?: string;
  onClose: () => void;
  onConfirm: (name: string, note?: string) => void;
};

const inputCls =
  "w-full bg-amber-950/70 border-2 border-amber-800/70 focus:border-amber-500 rounded-xl px-4 py-2.5 text-amber-100 text-sm placeholder:text-amber-800 focus:outline-none transition-colors";

export default function SaveOrderModal({ existingName, onClose, onConfirm }: Props) {
  const [name, setName] = useState(existingName ?? "");
  const [note, setNote] = useState("");

  const isUpdate = existingName !== undefined;

  const handleSubmit = () => {
    onConfirm(name.trim(), note.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-amber-950 border-2 border-amber-600 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">

        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-700 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xl">{isUpdate ? "✏️" : "💾"}</span>
          <div>
            <h2 className="text-amber-400 font-bold text-base uppercase tracking-widest leading-tight">
              {isUpdate ? "Actualizar pedido" : "Guardar pedido"}
            </h2>
            <p className="text-[10px] text-amber-700 uppercase tracking-widest">
              {isUpdate ? "Sobreescribe el borrador actual" : "Guarda el carrito como borrador"}
            </p>
          </div>
        </div>

        {/* Nombre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-yellow-700 font-semibold">
            Nombre del pedido
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='ej: Mesa 3, Pedido Juan…'
            className={inputCls}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Nota opcional */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest text-yellow-700 font-semibold">
            Nota <span className="text-amber-800 normal-case">(opcional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sin picante, sin cebolla…"
            className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-amber-800 text-amber-700 hover:border-amber-600 hover:text-amber-500 rounded-xl text-sm font-bold cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            {isUpdate ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}