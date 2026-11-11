import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { FriendRequestComposer } from "@/components/FriendRequestComposer";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import React from "react";

export default function PublicProfilePage() {
  const { locale } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/u/:slug");
  const publicSlug = params?.slug || "";
  const profileQuery = trpc.hiking.social.profileBySlug.useQuery({ publicSlug }, { enabled: Boolean(publicSlug) });
  const friendships = trpc.hiking.social.friendships.list.useQuery(undefined, { enabled: isAuthenticated });
  const profile = profileQuery.data;
  const t = locale === "fr" ? { back: "Retour à TrailConnect", notFound: "Ce profil public n’est pas disponible.", friend: "Ajouter à mes amis", login: "Connectez-vous pour envoyer une demande d’ami", pending: "Demande en attente", friends: "Vous êtes amis", trusted: "Profil public TrailConnect", message: "Écrire un message", messageLogin: "Connectez-vous pour écrire à ce membre" } : { back: "Back to TrailConnect", notFound: "This public profile is unavailable.", friend: "Add as a friend", login: "Log in to send a friend request", pending: "Request pending", friends: "You are friends", trusted: "TrailConnect public profile", message: "Write a message", messageLogin: "Log in to write to this member" };
  if (profileQuery.isLoading) return <main className="mx-auto max-w-xl p-6 text-sm font-bold text-[#607b6c]">TrailConnect…</main>;
  if (!profile) return <main className="mx-auto max-w-xl p-6"><Link href="/" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3f7459]"><ArrowLeft size={14} />{t.back}</Link><section className="mt-6 rounded-[1.7rem] border border-[#dce9d8] bg-white p-6"><h1 className="text-xl font-extrabold text-[#254938]">{t.notFound}</h1></section></main>;
  const friendship = friendships.data?.find(item => item.userId === profile.userId);
  const isOwnProfile = user?.id === profile.userId;
  return <main className="mx-auto min-h-screen max-w-xl bg-[#f7faf5] px-5 pb-10 pt-6"><Link href="/" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3f7459]"><ArrowLeft size={14} />{t.back}</Link><section className="mt-5 overflow-hidden rounded-[1.8rem] bg-[#224c3d] text-white shadow-[0_18px_36px_rgba(27,67,52,.18)]"><div className="h-32 bg-[radial-gradient(circle_at_72%_26%,rgba(248,205,119,.5),transparent_18%),linear-gradient(135deg,#295b49,#143a2e)]">{profile.coverImageUrl && <img src={profile.coverImageUrl} alt="" className="size-full object-cover" />}</div><div className="relative px-5 pb-6"><div className="absolute -top-10 left-5 grid size-20 place-items-center overflow-hidden rounded-[1.5rem] border-4 border-[#224c3d] bg-[#dcebd7] text-2xl font-black text-[#34634c]">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-full object-cover" /> : (profile.name || "T").slice(0, 1).toUpperCase()}</div><p className="pt-14 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#b9d4b5]">{t.trusted}</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-.06em]">{profile.name || "TrailConnect"}</h1><p className="mt-1 text-sm font-semibold text-[#d3e5cf]">@{profile.publicSlug}</p>{profile.homeLocation && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#d3e5cf]"><MapPin size={14} />{profile.homeLocation}</p>}{profile.bio && <p className="mt-3 text-sm leading-relaxed text-[#edf6e9]">{profile.bio}</p>}<div className="mt-5 flex items-center gap-2"><ShieldCheck size={16} className="text-[#f4c970]" /><p className="text-xs font-bold text-[#dcebd7]">{profile.phoneVerificationStatus === "verified" ? (locale === "fr" ? "Téléphone confirmé" : "Phone confirmed") : (locale === "fr" ? "Repères de profil" : "Profile signals")}</p></div></div></section><div className="mt-5 flex flex-wrap gap-2">{!isOwnProfile && profile.canReceiveMessages && (isAuthenticated ? <Link href={`/?view=community&tab=messages&recipient=${profile.userId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#244d3d] px-4 text-xs font-extrabold text-white"><MessageCircle size={15} />{t.message}</Link> : <button onClick={startLogin} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#244d3d] px-4 text-xs font-extrabold text-white"><MessageCircle size={15} />{t.messageLogin}</button>)}{!isOwnProfile && <FriendRequestComposer locale={locale} publicSlug={publicSlug} name={profile.name || "TrailConnect"} status={friendship?.status} />}</div></main>;
}
