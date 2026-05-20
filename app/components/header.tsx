import Image from "next/image";

export default function Header() {
    return (
        <header className="flex sm:flex-row flex-col sm:items-center justify-between bg-yellow-950 text-amber-50 py-4 px-5 border-b-2 border-amber-600">
            <div className="flex  items-center gap-3">
                <Image src="logo.svg" alt="Logo" width={100} height={100} loading="eager" />
                <div className="flex flex-col items-start">
                    <h1 className="text-3xl text-amber-500 leading-none">El Local del Abuelo</h1>
                    <p className="text-xs text-yellow-600">Sistema de Cobros</p>
                </div>
            </div>
            <div className="flex flex-col gap-4 mt-3 sm:mt-0">
                <h3 className="text-yellow-700 ">Agustin Bermeo</h3>
                <p className="text-yellow-700 text-xs uppercase text-right">
                    {new Date().toLocaleDateString("es-EC", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "America/Guayaquil",
                    })}
                </p>
            </div>
        </header>
    );
}