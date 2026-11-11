import { ExternalLink, Save, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type OrganizerProfileEditorProps = {
  locale: "fr" | "en";
  publicSlug?: string | null;
  isPublic: boolean;
};

export default function OrganizerProfileEditor({ locale, publicSlug, isPublic }: OrganizerProfileEditorProps) {
  const guideQuery = trpc.hiking.marketplace.guide.mine.useQuery();
  const updateGuide = trpc.hiking.marketplace.guide.update.useMutation({
    onSuccess: () => {
      guideQuery.refetch();
      toast.success(locale === "fr" ? "Profil organisateur enregistré." : "Organizer profile saved.");
    },
    onError: () => toast.error(locale === "fr" ? "Le profil organisateur n’a pas pu être enregistré." : "The organizer profile could not be saved."),
  });
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [regions, setRegions] = useState("");
  const [languages, setLanguages] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    const guide = guideQuery.data;
    if (!guide) return;
    setHeadline(guide.headline || "");
    setBio(guide.bio || "");
    setRegions(guide.serviceRegions || "");
    setLanguages(guide.languages || "");
    setExperience(guide.certifications || "");
  }, [guideQuery.data]);

  const t = locale === "fr"
    ? {
      title: "Profil organisateur", eyebrow: "À partager publiquement", intro: "Présentez votre façon d’organiser et les terrains que vous connaissez. Ces renseignements restent déclaratifs.",
      headline: "Accroche", bio: "Approche et expérience", regions: "Régions ou terrains", languages: "Langues proposées", experience: "Formations ou repères d’expérience", save: "Enregistrer", view: "Voir la page publique", private: "Rendez votre profil public et choisissez un identifiant pour partager cette page.",
      note: "Les informations saisies ici sont déclarées par l’organisateur. Elles ne constituent ni une certification automatique, ni une promesse d’encadrement ou de sécurité.",
    }
    : {
      title: "Organizer profile", eyebrow: "Public sharing", intro: "Describe how you organize outings and the terrain you know. These details remain self-declared.",
      headline: "Headline", bio: "Approach and experience", regions: "Regions or terrain", languages: "Languages offered", experience: "Training or experience notes", save: "Save", view: "View public page", private: "Make your profile public and choose a handle to share this page.",
      note: "Information entered here is self-declared by the organizer. It is neither an automatic certification nor a promise of supervision or safety.",
    };

  const normalized = (value: string) => value.trim() || undefined;
  return (
    <section aria-label={t.title} className="mt-5 rounded-[1.6rem] bg-[#f2f8ef] p-5 ring-1 ring-[#dbe9d8]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#1f4d3d] text-[#f6ce72]"><Sparkles size={18} aria-hidden="true" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#6e8c7b]">{t.eyebrow}</p><h2 className="mt-0.5 text-base font-extrabold text-[#214736]">{t.title}</h2><p className="mt-1 max-w-xl text-sm leading-relaxed text-[#60796b]">{t.intro}</p></div></div>
        {isPublic && publicSlug && <Link href={`/organizers/${publicSlug}`} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-[#35634d] shadow-sm ring-1 ring-[#dce9d8]"><ExternalLink size={14} />{t.view}</Link>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-extrabold text-[#587468]"><span>{t.headline}</span><input aria-label={t.headline} maxLength={180} value={headline} onChange={event => setHeadline(event.target.value)} placeholder={locale === "fr" ? "Randonnées de groupe, préparées avec soin" : "Carefully prepared group hikes"} className="min-h-11 rounded-xl border border-[#d6e5d2] bg-white px-3 text-sm font-semibold text-[#355b48] outline-none focus:ring-2 focus:ring-[#7ba889]" /></label>
        <label className="grid gap-1.5 text-xs font-extrabold text-[#587468]"><span>{t.regions}</span><input aria-label={t.regions} maxLength={360} value={regions} onChange={event => setRegions(event.target.value)} placeholder={locale === "fr" ? "Laurentides, Charlevoix, Adirondacks" : "Laurentians, Charlevoix, Adirondacks"} className="min-h-11 rounded-xl border border-[#d6e5d2] bg-white px-3 text-sm font-semibold text-[#355b48] outline-none focus:ring-2 focus:ring-[#7ba889]" /></label>
        <label className="grid gap-1.5 text-xs font-extrabold text-[#587468]"><span>{t.languages}</span><input aria-label={t.languages} maxLength={180} value={languages} onChange={event => setLanguages(event.target.value)} placeholder={locale === "fr" ? "Français, anglais" : "French, English"} className="min-h-11 rounded-xl border border-[#d6e5d2] bg-white px-3 text-sm font-semibold text-[#355b48] outline-none focus:ring-2 focus:ring-[#7ba889]" /></label>
        <label className="grid gap-1.5 text-xs font-extrabold text-[#587468]"><span>{t.experience}</span><input aria-label={t.experience} maxLength={1024} value={experience} onChange={event => setExperience(event.target.value)} placeholder={locale === "fr" ? "À partager uniquement si vous le souhaitez" : "Share only what you choose"} className="min-h-11 rounded-xl border border-[#d6e5d2] bg-white px-3 text-sm font-semibold text-[#355b48] outline-none focus:ring-2 focus:ring-[#7ba889]" /></label>
        <label className="sm:col-span-2 grid gap-1.5 text-xs font-extrabold text-[#587468]"><span>{t.bio}</span><textarea aria-label={t.bio} maxLength={2000} rows={4} value={bio} onChange={event => setBio(event.target.value)} placeholder={locale === "fr" ? "Expliquez votre manière de préparer une sortie, sans conseil de sécurité prescriptif." : "Explain how you prepare an outing without giving prescriptive safety advice."} className="rounded-xl border border-[#d6e5d2] bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-[#355b48] outline-none focus:ring-2 focus:ring-[#7ba889]" /></label>
      </div>
      <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-[#60796b]">{t.note}</p>
      {(!isPublic || !publicSlug) && <p className="mt-3 text-xs font-bold leading-relaxed text-[#8a6b32]">{t.private}</p>}
      <button type="button" disabled={updateGuide.isPending} onClick={() => updateGuide.mutate({ headline: normalized(headline), bio: normalized(bio), serviceRegions: normalized(regions), languages: normalized(languages), certifications: normalized(experience) })} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#214c3a] px-4 text-sm font-extrabold text-white transition-transform duration-150 active:scale-[.97] disabled:opacity-55"><Save size={16} />{t.save}</button>
    </section>
  );
}
