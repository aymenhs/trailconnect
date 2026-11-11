import { Crosshair, RotateCcw } from "lucide-react";
import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { ResponsiveCoverImage, getCoverObjectPosition } from "@/components/ResponsiveCoverImage";

type CoverFocalPointPickerProps = {
  src: string;
  focalX?: number | null;
  focalY?: number | null;
  onChange: (focalX: number, focalY: number) => void;
  onReset?: () => void;
  disabled?: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function CoverFocalPointPicker({ src, focalX, focalY, onChange, onReset, disabled = false }: CoverFocalPointPickerProps) {
  const { locale } = useLocale();
  const hasFocus = typeof focalX === "number" && typeof focalY === "number";
  const x = hasFocus ? focalX : 50;
  const y = hasFocus ? focalY : 50;
  const t = locale === "fr"
    ? { title: "Point d’intérêt de la photo", help: "Touchez l’élément à garder visible dans les formats serrés. Optionnel : sans choix, le recadrage reste centré.", selected: "Point focal défini", centered: "Recadrage centré", reset: "Recentrer automatiquement", label: "Choisir le point d’intérêt de la photo" }
    : { title: "Photo focal point", help: "Tap the item that should stay visible in tighter formats. Optional: without a choice, the crop stays centered.", selected: "Focal point set", centered: "Centered crop", reset: "Return to automatic center", label: "Choose the photo focal point" };
  const choose = (target: HTMLButtonElement, clientX: number, clientY: number) => {
    const bounds = target.getBoundingClientRect();
    onChange(clamp(((clientX - bounds.left) / bounds.width) * 100), clamp(((clientY - bounds.top) / bounds.height) * 100));
  };
  const move = (horizontal: number, vertical: number) => onChange(clamp(x + horizontal), clamp(y + vertical));

  return <section className="mt-4 rounded-2xl border border-[#cfe0ca] bg-[#f7fbf4] p-3 sm:p-4"><div className="flex items-start gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e5f1e1] text-[#3a7758]"><Crosshair size={17} /></span><div className="min-w-0"><h3 className="text-sm font-extrabold text-[#2d5944]">{t.title}</h3><p className="mt-1 text-xs leading-relaxed text-[#6d8778]">{t.help}</p></div></div><button type="button" disabled={disabled} aria-label={t.label} onClick={event => choose(event.currentTarget, event.clientX, event.clientY)} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-5, 0); } if (event.key === "ArrowRight") { event.preventDefault(); move(5, 0); } if (event.key === "ArrowUp") { event.preventDefault(); move(0, -5); } if (event.key === "ArrowDown") { event.preventDefault(); move(0, 5); } if (event.key === "Home") { event.preventDefault(); onChange(50, 50); } }} className="relative mt-3 block h-40 w-full overflow-hidden rounded-xl bg-[#365d4b] text-left shadow-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#2d7353] disabled:cursor-wait disabled:opacity-70"><ResponsiveCoverImage src={src} alt="" sizes="(min-width: 640px) 560px, 100vw" focalX={x} focalY={y} className="size-full object-cover opacity-85" /><span aria-hidden="true" className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#214e3d]/50 shadow-[0_0_0_3px_rgba(27,69,53,.55)]" style={{ left: `${x}%`, top: `${y}%` }}><span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></span></button><div className="mt-3 flex items-center justify-between gap-3"><p aria-live="polite" className="text-[11px] font-bold text-[#527465]">{hasFocus ? `${t.selected} · ${x}% / ${y}%` : t.centered}</p>{hasFocus && onReset && <button type="button" onClick={onReset} disabled={disabled} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-[#46735a] ring-1 ring-[#cfe0ca] disabled:opacity-60"><RotateCcw size={14} />{t.reset}</button>}</div><p className="mt-2 text-[10px] font-semibold text-[#82978b]">{locale === "fr" ? `Aperçu : position ${getCoverObjectPosition(x, y)}.` : `Preview: ${getCoverObjectPosition(x, y)}.`}</p></section>;
}
