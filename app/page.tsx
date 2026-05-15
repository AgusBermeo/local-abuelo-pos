"use client";

import Header from "./components/header";
import Tabs from "./components/tabs"
import Cobrar from "./components/cobrar";
import Ventas from "./components/ventas";
import Inventario from "./components/inventario";

import { useState } from "react";

const INITIAL_PRODUCTS = [
  { id: 1, name: "Empanada", price: { grande: 1.75, normal: 1.5, bocadito: 0.6 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito"}, relleno: {carne: "Carne", pollo: "Pollo"}},
  { id: 2, name: "Bandeja de 5 empanadas", price: { grande: 5.25, normal: 4.5, bocadito: 3 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito"}, relleno: {carne: "Carne", pollo: "Pollo"}},
  { id: 3, name: "Bandeja de 10 empanadas", price: { grande: 8.5, normal: 7, bocadito: 5.5 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito"}, relleno: {carne: "Carne", pollo: "Pollo"}},
  { id: 4, name: "Bandeja de 20 empanadas", price: { grande: 16, normal: 14, bocadito: 10 }, category: "Comida", size: { grande: "Grande", normal: "Normal", bocadito: "Bocadito"}, relleno: {carne: "Carne", pollo: "Pollo"}},
  { id: 5, name: "Café Pasado", price: 1.25, category: "Bebida", size: "Taza"},
  { id: 6, name: "Aromática", price: 1.25, category: "Bebida", size: "Taza"},
  { id: 7, name: "Gaseosa", price: 1.5, category: "Bebida", size: "500ml"},
  { id: 8, name: "Agua sin gas", price: 1, category: "Bebida", size: "500ml"},
  { id: 9, name: "Agua con gas", price: 1.25, category: "Bebida", size: "300ml"},
  { id: 10, name: "Infusión de frutas deshidratadas", price: 2.5, category: "Bebida", size: "Taza"},
  { id: 11, name: "Cerveza Pilsener", price: 2.5, category: "Bebida", size: "350ml"},
]

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type Sale = {
  id: number;
  date: Date;
  items: OrderItem[];
  total: number;
};

export default function Home() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [activeTab, setActiveTab] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);

  const addSale = (items: OrderItem[], total: number) => {
    const newSale: Sale = {
      id: Date.now(),
      date: new Date(),
      items,
      total,
    };
    setSales((prev) => [newSale, ...prev]);
  };

  const deleteSale = (id: number) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const addProduct = (product: (typeof INITIAL_PRODUCTS)[number]) => {
    setProducts((prev) => [...prev, product]);
  };
 
  const deleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const foodProducts = products.filter((product) => product.category === "Comida");
  const drinkProducts = products.filter((product) => product.category === "Bebida");

  const TABS = [
    {
      label: "🛒 Cobrar",
      content: <Cobrar foodProducts={foodProducts} drinkProducts={drinkProducts} onSaleComplete={addSale} />,
    },
    {
      label: "📋 Ventas",
      content: <Ventas sales={sales} onDelete={deleteSale} />,
    },
    {
      label: "📦 Inventario",
      content: <Inventario products={products} onAddProduct={addProduct} onDeleteProduct={deleteProduct} />,
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-dvh bg-amber-950/60 font-sans">
      <Header />
      <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex justify-center w-full px-6 pt-6 pb-4">
        {TABS[activeTab].content}
      </div>
    </div>
  );
}