type Product = {
  id: number;
  name: string;
  price: number | { grande: number, normal: number, bocadito: number };
  category: string;
  size: string | { grande: string, normal: string, bocadito: string };
  relleno?: { carne: string, pollo: string } | null;
}

export default function Inventario(props: { products: Product[] }) {

    const deleteProduct = (id: number) => {
        console.log("Product deleted " + id);
        
    }

    return (
        <div className="w-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center pb-3">
                <p className="text-yellow-700 text-xs">Edita o elimina un producto</p>
                <button className="bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Agregar producto</button>
            </div>
            <div className="flex flex-col gap-2.5">
                {/* Add filter by category */}
                <div className="flex gap-2">
                    {/* show all categories */}
                    <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Todas</button>
                    <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Comida</button>
                    <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-md cursor-pointer uppercase">Bebidas</button>
                </div>

                {props.products.map((product) => (
                    <div key={product.id} className="flex flex-col bg-amber-900/30 border-2 border-amber-800 rounded-lg p-4">
                        <div className="relative flex gap-2 justify-between">
                            <h2 className="font-bold text-sm max-w-[90%] mb-1.5">{product.name}</h2>
                            <div className="absolute top-0 right-0 flex gap-2">
                                <button className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold p-1.5 cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                    </svg>
                                </button>
                                <button onClick={() => deleteProduct(product.id)} className="w-8 h-8 flex items-center justify-center rounded-md bg-red-800 hover:bg-red-700 text-white text-xs font-bold p-1.5 cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs mb-1 uppercase text-gray-200">{product.relleno ? Object.values(product.relleno).join(", ") : ""}</p>
                        <div className="flex gap-4">
                            {typeof product.price === 'object' ? Object.entries(product.price).map(([size, price]) => (
                                <div key={size} className="flex flex-col gap-1">
                                    <h3 className="text-[10px] text-yellow-700 uppercase">{size}: </h3>
                                    <p className="font-bold text-amber-500">${ (price as number).toFixed(2) }</p>
                                </div>
                            )) : (
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[10px] text-yellow-700 uppercase">Precio: </h3>
                                    <p className="font-bold text-amber-500">${ (product.price as number).toFixed(2) }</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
    )
}