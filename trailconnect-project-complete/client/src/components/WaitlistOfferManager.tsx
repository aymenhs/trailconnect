import { UsersRound } from "lucide-react";
import { useState } from "react";

type Participant = {
  id: number;
  userId: number;
  name?: string | null;
  status: string;
  waitlistPosition?: number | null;
  waitlistOffer?: { status: string; expiresAt: Date | string | null } | null;
};

export default function WaitlistOfferManager({ locale, eventId, participants, pending, onOffer }: { locale: "fr" | "en"; eventId: number; participants: Participant[]; pending: boolean; onOffer: (participantId: number, responseWindowHours: number) => void }) {
  const fr = locale === "fr";
  const [hours, setHours] = useState(6);
  const queue = participants.filter(participant => participant.status === "waitlist");
  if (!queue.length) return null;

  return <section aria-label={fr ? "Liste d’attente opérationnelle" : "Operational waitlist"} data-event-id={eventId} className="mt-7 overflow-hidden rounded-[1.45rem] border border-[#d7e3ef] bg-[#f7faff]">
    <header className="flex items-start gap-3 border-b border-[#e1eaf2] px-4 py-3.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e5eef9] text-[#416a9c]"><UsersRound size={17} /></span><div><h3 className="text-sm font-extrabold text-[#304f75]">{fr ? "Liste d’attente opérationnelle" : "Operational waitlist"}</h3><p className="mt-0.5 text-[11px] leading-relaxed font-semibold text-[#71869e]">{fr ? "La place reste à confirmer par la personne invitée." : "The invited person still needs to confirm the spot."}</p></div></header>
    <div className="p-4"><label className="block text-[11px] font-extrabold text-[#526f8f]">{fr ? "Délai de réponse" : "Response window"}<select value={String(hours)} onChange={event => setHours(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdeec] bg-white px-3 text-sm font-bold text-[#365b83]"><option value="2">2 h</option><option value="6">6 h</option><option value="12">12 h</option><option value="24">24 h</option></select></label><div className="mt-3 space-y-2">{queue.map(participant => { const active = participant.waitlistOffer?.status === "pending"; return <div key={participant.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#dce7f1] bg-white p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-[#3a5d7e]">{participant.name || "TrailConnect"} <span className="text-[#7890a6]">· #{participant.waitlistPosition ?? "—"}</span></p><p className="mt-0.5 text-[10px] font-semibold text-[#748a9f]">{active ? (fr ? "Offre en attente de réponse" : "Offer awaiting a reply") : (fr ? "Aucune offre active" : "No active offer")}</p></div>{active ? <span className="rounded-full bg-[#edf4ff] px-2.5 py-1.5 text-[10px] font-extrabold text-[#4b6f99]">{fr ? "En attente" : "Awaiting"}</span> : <button type="button" disabled={pending} onClick={() => onOffer(participant.userId, hours)} className="min-h-11 rounded-xl bg-[#315c8c] px-3 text-xs font-extrabold text-white disabled:opacity-50">{fr ? "Proposer la place" : "Offer spot"}</button>}</div>; })}</div></div>
  </section>;
}
