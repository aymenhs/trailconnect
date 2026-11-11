import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "fr" | "en";

const copy = {
  fr: {
    nav: { discover: "Découvrir", explore: "Explorer", marketplace: "Matching", create: "Créer", community: "Communauté", profile: "Profil", account: "Compte", admin: "Administration" },
    common: { seeAll: "Voir tout", people: "personnes", join: "Participer", joined: "Inscrit", viewRoute: "Voir le parcours", today: "Aujourd’hui", tomorrow: "Demain", login: "Se connecter", close: "Fermer" },
    home: { greeting: "Bonjour, aventurier", heroTitle: "Trouve ta prochaine\naventure.", heroSubtitle: "Des sorties locales, des gens qui avancent dans la même direction.", explore: "Explorer autour de moi", upcoming: "À venir près de toi", adventures: "Aventures de la communauté", weather: "Conditions idéales", weatherDetail: "14° · ciel dégagé · vent faible" },
    explore: { title: "Explorer les sorties", subtitle: "Filtre par lieu, niveau ou date.", search: "Rechercher un sommet, une ville…", filters: "Filtres", map: "Carte", list: "Liste", all: "Toutes", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" },
    event: { hostedBy: "Organisé par", route: "Parcours", logistics: "Logistique", checklist: "À prévoir", chat: "Discussion du groupe", participants: "participants", meeting: "Rendez-vous", date: "Date", difficulty: "Niveau", distance: "Distance", elevation: "Dénivelé +", duration: "Durée estimée", places: "places", carpool: "Covoiturage disponible", safety: "Sécurité", safetyText: "Préviens un proche et vérifie les conditions avant le départ.", full: "Complet" },
    create: { title: "Créer une sortie", subtitle: "Les bons détails font une sortie sereine.", basics: "Les essentiels", titleLabel: "Titre de la sortie", placeLabel: "Lieu de rendez-vous", dateLabel: "Date et heure", details: "Détails du parcours", distanceLabel: "Distance (km)", elevationLabel: "Dénivelé positif (m)", levelLabel: "Niveau requis", capacityLabel: "Nombre de places", descriptionLabel: "Décris l’aventure", publish: "Publier la sortie", saved: "Votre sortie est prête à être publiée." },
    profile: { title: "Mon profil", level: "Niveau intermédiaire", stats: { outings: "sorties", kilometers: "kilomètres", elevation: "m D+" }, badges: "Badges récents", activity: "Mon activité", manage: "Gérer mes sorties" },
    community: { title: "Communauté", subtitle: "Partage des conseils, des photos et l’envie d’aller plus loin.", post: "Partager une aventure", chatTitle: "Groupe · Lac Noir", message: "Écrire un message…" },
  },
  en: {
    nav: { discover: "Discover", explore: "Explore", marketplace: "Matching", create: "Create", community: "Community", profile: "Profile", account: "Account", admin: "Administration" },
    common: { seeAll: "See all", people: "people", join: "Join", joined: "Going", viewRoute: "View route", today: "Today", tomorrow: "Tomorrow", login: "Log in", close: "Close" },
    home: { greeting: "Hello, adventurer", heroTitle: "Find your next\nadventure.", heroSubtitle: "Local outings, people moving in the same direction.", explore: "Explore nearby", upcoming: "Coming up near you", adventures: "Community adventures", weather: "Ideal conditions", weatherDetail: "14° · clear skies · light wind" },
    explore: { title: "Explore outings", subtitle: "Filter by place, level or date.", search: "Search a summit, a town…", filters: "Filters", map: "Map", list: "List", all: "All", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    event: { hostedBy: "Hosted by", route: "Route", logistics: "Logistics", checklist: "Bring along", chat: "Group chat", participants: "participants", meeting: "Meeting point", date: "Date", difficulty: "Level", distance: "Distance", elevation: "Elevation gain", duration: "Est. duration", places: "spaces", carpool: "Carpool available", safety: "Safety", safetyText: "Tell someone your plans and check the conditions before departure.", full: "Full" },
    create: { title: "Create an outing", subtitle: "The right details make a smooth outing.", basics: "The essentials", titleLabel: "Outing title", placeLabel: "Meeting point", dateLabel: "Date and time", details: "Route details", distanceLabel: "Distance (km)", elevationLabel: "Elevation gain (m)", levelLabel: "Required level", capacityLabel: "Number of spaces", descriptionLabel: "Describe the adventure", publish: "Publish outing", saved: "Your outing is ready to publish." },
    profile: { title: "My profile", level: "Intermediate level", stats: { outings: "outings", kilometers: "kilometers", elevation: "m climbed" }, badges: "Recent badges", activity: "My activity", manage: "Manage my outings" },
    community: { title: "Community", subtitle: "Share tips, photos and the desire to go farther.", post: "Share an adventure", chatTitle: "Group · Black Lake", message: "Write a message…" },
  },
} as const;

type Copy = (typeof copy)[Locale];

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  copy: Copy;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function initialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "fr" || requested === "en") return requested;
  const saved = window.localStorage.getItem("trailconnect-locale");
  return saved === "en" ? "en" : "fr";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale: (nextLocale: Locale) => {
      window.localStorage.setItem("trailconnect-locale", nextLocale);
      setLocale(nextLocale);
    },
    toggleLocale: () => {
      const nextLocale = locale === "fr" ? "en" : "fr";
      window.localStorage.setItem("trailconnect-locale", nextLocale);
      setLocale(nextLocale);
    },
    copy: copy[locale],
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
