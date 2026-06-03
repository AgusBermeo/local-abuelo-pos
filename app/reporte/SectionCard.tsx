// app/reporte/SectionCard.tsx
//
// Wrapper de sección con título y borde amber.

export default function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-amber-900/30 border-2 border-amber-800 rounded-xl p-4 flex flex-col gap-4">
      <h3 className="text-xs uppercase tracking-widest text-yellow-700 font-bold">{title}</h3>
      {children}
    </div>
  );
}
