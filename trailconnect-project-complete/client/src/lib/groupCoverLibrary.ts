export type GroupCoverLibraryItem = {
  id: string;
  url: string;
  label: { fr: string; en: string };
  category: { fr: string; en: string };
};

export const GROUP_COVER_LIBRARY: GroupCoverLibraryItem[] = [
  { id: "mountain-river", url: "/media/mountain-river.webp", label: { fr: "Rivière de montagne", en: "Mountain river" }, category: { fr: "Paysage", en: "Landscape" } },
  { id: "alpine-lake", url: "/media/alpine-lake.webp", label: { fr: "Lac alpin", en: "Alpine lake" }, category: { fr: "Lac", en: "Lake" } },
  { id: "blue-lake", url: "/media/blue-lake.webp", label: { fr: "Lac des sommets", en: "Peak lake" }, category: { fr: "Lac", en: "Lake" } },
  { id: "trail-hikers", url: "/media/trail-hikers.webp", label: { fr: "Marcheurs sur le sentier", en: "Hikers on trail" }, category: { fr: "Groupe", en: "Group" } },
  { id: "forest-group", url: "/media/forest-group.webp", label: { fr: "Groupe en forêt", en: "Group in forest" }, category: { fr: "Groupe", en: "Group" } },
  { id: "mountain-trail", url: "/media/mountain-trail.webp", label: { fr: "Sentier de montagne", en: "Mountain trail" }, category: { fr: "Sentier", en: "Trail" } },
];
