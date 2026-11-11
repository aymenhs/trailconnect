export type PackingContext = {
  startsAt: Date;
  distanceKm: number;
  elevationGain: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
};

export type PackingSuggestion = {
  id: string;
  label: string;
  category: "essential" | "safety" | "comfort" | "food";
};

export function getDynamicPackingSuggestions(context: PackingContext, locale: "fr" | "en"): PackingSuggestion[] {
  const isFrench = locale === "fr";
  const month = context.startsAt.getMonth();
  const winter = month <= 2 || month >= 10;
  const longOrSteep = context.distanceKm >= 12 || context.elevationGain >= 800;
  const advanced = context.difficulty === "advanced" || context.difficulty === "expert";
  const items: PackingSuggestion[] = isFrench
    ? [
      { id: "water", label: "Eau adaptée à la sortie", category: "essential" },
      { id: "charged-phone", label: "Téléphone chargé", category: "safety" },
      { id: "footwear", label: "Chaussures adaptées au terrain", category: "comfort" },
    ]
    : [
      { id: "water", label: "Water suited to the outing", category: "essential" },
      { id: "charged-phone", label: "Charged phone", category: "safety" },
      { id: "footwear", label: "Footwear suited to the terrain", category: "comfort" },
    ];
  if (winter) items.push(isFrench ? { id: "warm-layer", label: "Couche chaude et gants selon les conditions", category: "comfort" } : { id: "warm-layer", label: "Warm layer and gloves for the conditions", category: "comfort" });
  else items.push(isFrench ? { id: "sun-protection", label: "Protection solaire selon l’exposition", category: "comfort" } : { id: "sun-protection", label: "Sun protection for the exposure", category: "comfort" });
  if (longOrSteep) items.push(isFrench ? { id: "snack", label: "Collation selon votre durée d’effort", category: "food" } : { id: "snack", label: "Snack suited to your effort duration", category: "food" });
  if (advanced) items.push(isFrench ? { id: "weather-layer", label: "Couche adaptée aux changements de conditions", category: "safety" } : { id: "weather-layer", label: "Layer suited to changing conditions", category: "safety" });
  return items;
}

export function getDynamicPackingChecklist(context: PackingContext, locale: "fr" | "en") {
  return getDynamicPackingSuggestions(context, locale).map(item => item.label);
}
