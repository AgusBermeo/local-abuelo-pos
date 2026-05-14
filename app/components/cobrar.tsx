"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number | { grande: number, normal: number, bocadito: number };
  stock?: number | { grande: number, normal: number, bocadito: number };
  category: string;
  size: string | { grande: string, normal: string, bocadito: string };
  relleno?: { carne: string, pollo: string } | null;
}

export default function Cobrar(props: { foodProducts: Product[], drinkProducts: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedRelleno, setSelectedRelleno] = useState<Record<number, string>>({});
  const [selectedSize, setSelectedSize] = useState<Record<number, string>>({}); 
  const [currentOrder, setCurrentOrder] = useState<Product[]>([]);
  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
            <button className="bg-amber-800 hover:bg-amber-700 active:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Todas</button>
            <button className="bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Comida</button>
            <button className="bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Bebidas</button>
        </div>
      </div>
      <h3 className="uppercase text-amber-500 font-bold text-sm">Comida</h3>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {/* Foods */}
        {props.foodProducts.map((product) => (
          <div key={product.id} className="relative bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
            <h2 className="font-bold text-sm max-w-[90%] mb-2">{product.name}</h2>
            <div className={`flex flex-col mb-2 ${product.relleno ? "gap-2" : ""}`}>
              <div className="flex items-center gap-2">
                  {Object.entries(product.relleno || {}).map(([key, value]) => (
                      <button key={key} onClick={() => setSelectedRelleno(prev => ({ ...prev, [product.id]: key }))} className={`py-1 px-2 ${selectedRelleno[product.id] === key ? "bg-amber-800" : ""} text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer`}>{value}</button>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                  {typeof product.size === 'object' ? ( 
                      Object.entries(product.size).map(([key, value]) => (
                          <button key={key} onClick={() => setSelectedSize(prev => ({ ...prev, [product.id]: key }))} className={`py-1 px-2 ${selectedSize[product.id] === key ? "bg-amber-800" : ""} text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer`}>{value}</button>
                      ))
                  ) : (
                      <button className="text-xs font-bold">{product.size}</button>
                  )}
              </div>

            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    {typeof product.price === 'object' ? (
                        <p className="font-bold text-amber-500"> ${selectedSize[product.id] ? (product.price[selectedSize[product.id] as keyof typeof product.price]).toFixed(2) : '0.00'} </p>
                    ) : (
                        <p className="font-bold text-amber-500">${product.price}</p>
                    )}
                </div>
                {/* Add button to current order */}
                <div className="flex gap-2">
                    {/* remove button if count is greater than 0 */}
                    <button
                    onClick={() => {}}
                    className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                    >-
                    </button>
                    <button
                    onClick={() => {}}
                    className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                    >+
                    </button>
                </div>
            </div>
            <div className="absolute top-1.5 right-1.5 bg-amber-500 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</div>
          </div>
        ))}
        
    </div>
    <h3 className="uppercase text-amber-500 font-bold text-sm">Bebidas</h3>
    <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-2.5">
        {/* Drinks */}
        {props.drinkProducts.map((product) => (
          <div key={product.id} className="relative bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
            <h2 className="font-bold text-sm max-w-[90%] mb-2">{product.name}</h2>
            <div className={`flex flex-col mb-2 ${product.relleno ? "gap-2" : ""}`}>
              <div className="flex items-center gap-2">
                  {Object.entries(product.relleno || {}).map(([key, value]) => (
                      <button key={key} onClick={() => setSelectedRelleno(prev => ({ ...prev, [product.id]: key }))} className={`py-1 px-2 ${selectedRelleno[product.id] === key ? "bg-amber-800" : ""} text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer`}>{value}</button>
                  ))}
              </div>
              <div className="flex items-center gap-2">
                  {typeof product.size === 'object' ? ( 
                      Object.entries(product.size).map(([key, value]) => (
                          <button key={key} onClick={() => setSelectedSize(prev => ({ ...prev, [product.id]: key }))} className={`py-1 px-2 ${selectedSize[product.id] === key ? "bg-amber-800" : ""} text-xs border border-amber-800 rounded-lg font-bold hover:bg-amber-800 cursor-pointer`}>{value}</button>
                      ))
                  ) : (
                      <button className="text-xs font-bold">{product.size}</button>
                  )}
              </div>

            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    {typeof product.price === 'object' ? (
                        <p className="font-bold text-amber-500"> ${selectedSize[product.id] ? (product.price[selectedSize[product.id] as keyof typeof product.price]).toFixed(2) : '0.00'} </p>
                    ) : (
                        <p className="font-bold text-amber-500">${product.price}</p>
                    )}
                </div>
                {/* Add button to current order */}
                <div className="flex gap-2">
                    {/* remove button if count is greater than 0 */}
                    <button
                    onClick={() => {}}
                    className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                    >-
                    </button>
                    <button
                    onClick={() => {}}
                    className="w-8 h-8 bg-amber-800 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                    >+
                    </button>
                </div>
            </div>
            <div className="absolute top-1.5 right-1.5 bg-amber-500 text-amber-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</div>
          </div>
        ))}
        
    </div>

      {/* Cart */ }
  <div className="bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
    <h2 className="uppercase text-amber-500 font-bold text-sm mb-2">Pedido Actual</h2>
    <div className="flex items-center gap-2 py-2 border-b border-yellow-800">
      <span className="flex-1 text-xs">Empanada de Carne</span>
      <div className="flex items-center gap-2">
        <button className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">-</button>
        <p className="text-sm font-bold w-4 text-center">2</p>
        <button className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">+</button>
      </div>
      <p className="text-sm font-bold text-amber-500">$3.50</p>
      <button className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
    </div>
    <div className="flex items-center gap-2 py-2 border-b border-yellow-800">
      <span className="flex-1 text-xs">Empanada de Pollo</span>
      <div className="flex items-center gap-2">
        <button className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">-</button>
        <p className="text-sm font-bold w-4 text-center">2</p>
        <button className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-800 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer">+</button>
      </div>
      <p className="text-sm font-bold text-amber-500">$3.50</p>
      <button className="w-7 h-7 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1 cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
    </div>
    <div className="mt-4 flex justify-between items-center">
      <h3 className="font-bold">TOTAL</h3>
      <h3 className="font-bold text-xl text-amber-500">$7.00</h3>
    </div>
  </div>
    </div >
  );
}  