import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { MapPin, UserRound } from "lucide-react";
import React, { type ReactNode } from "react";
import { Link } from "wouter";

export type PublicProfileSummary = {
  publicSlug: string;
  avatarUrl?: string | null;
  bio?: string | null;
  homeLocation?: string | null;
};

export function PublicProfileLink({ profile, name, children, className, ariaLabel }: { profile?: PublicProfileSummary | null; name?: string | null; children?: ReactNode; className?: string; ariaLabel?: string }) {
  const { locale } = useLocale();
  const displayName = name || "TrailConnect";
  if (!profile?.publicSlug) return <span className={className}>{children ?? displayName}</span>;
  const profileLabel = ariaLabel || (locale === "fr" ? `Voir le profil public de ${displayName}` : `View public profile of ${displayName}`);
  return <HoverCard openDelay={180} closeDelay={120}><HoverCardTrigger asChild><Link href={`/u/${profile.publicSlug}`} aria-label={profileLabel} className={cn("rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#6c9c7a]", className)}>{children ?? displayName}</Link></HoverCardTrigger><HoverCardContent align="start" className="hidden w-72 border-[#d3e4d0] bg-[#fbfdf9] p-0 shadow-[0_15px_35px_rgba(30,72,54,.16)] md:block"><div className="h-12 bg-[linear-gradient(135deg,#2a5d49,#7fa286)]" /><div className="relative px-4 pb-4"><div className="absolute -top-6 grid size-12 place-items-center overflow-hidden rounded-2xl border-4 border-[#fbfdf9] bg-[#e2efde] text-sm font-black text-[#3b7455]">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}</div><div className="pt-8"><p className="truncate text-sm font-extrabold text-[#294d3b]">{displayName}</p><p className="mt-0.5 text-[11px] font-bold text-[#638174]">@{profile.publicSlug}</p></div>{profile.homeLocation && <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#587665]"><MapPin size={13} />{profile.homeLocation}</p>}{profile.bio && <p className="mt-2 line-clamp-2 text-xs leading-relaxed font-medium text-[#667d70]">{profile.bio}</p>}<p className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-[#3d7457]"><UserRound size={14} />{locale === "fr" ? "Voir le profil public" : "View public profile"}</p></div></HoverCardContent></HoverCard>;
}
