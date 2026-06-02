// app/components/cobrar/TierBadges.tsx
//
// Muestra los escalones de precio de un tamaño, resaltando el nivel activo.

import type { PriceTier } from "../../home-client";

type Props = {
  tiers: PriceTier[];
  /** Cantidad total de ese tamaño en el carrito (para determinar el nivel activo). */
  currentQty: number;
};

export default function TierBadges({ tiers, currentQty }: Props) {
  if (!tiers || tiers.length <= 1) return null;

  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sorted.map((tier, i) => {
        const isActive =
          currentQty >= tier.minQty &&
          (i === sorted.length - 1 || currentQty < sorted[i + 1].minQty);

        return (
          <span
            key={tier.minQty}
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
              isActive
                ? "bg-amber-500 text-amber-950 border-amber-400"
                : "bg-amber-900/40 text-amber-700 border-amber-800"
            }`}
          >
            {tier.minQty === 1 ? "Base" : `×${tier.minQty}`} ${tier.pricePerUnit.toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}
