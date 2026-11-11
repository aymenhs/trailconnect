import { CoverFocalPointPicker } from "@/components/CoverFocalPointPicker";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CoverFocalPointManager({ eventId }: { eventId: number }) {
  const { locale } = useLocale();
  const utils = trpc.useUtils();
  const detail = trpc.hiking.events.detail.useQuery({ eventId });
  const event = detail.data;
  const update = trpc.hiking.events.updateCoverFocalPoint.useMutation({
    onSuccess: () => {
      utils.hiking.events.detail.invalidate({ eventId });
      utils.hiking.events.list.invalidate();
      utils.hiking.events.mine.invalidate();
      utils.hiking.events.search.invalidate();
      toast.success(locale === "fr" ? "Point d’intérêt de la photo mis à jour." : "Photo focal point updated.");
    },
    onError: error => toast.error(error.message),
  });

  if (!event?.coverImageUrl) return null;
  return <CoverFocalPointPicker src={event.coverImageUrl} focalX={event.coverImageFocalX} focalY={event.coverImageFocalY} disabled={update.isPending} onChange={(focalX, focalY) => update.mutate({ eventId, focalX, focalY })} onReset={() => update.mutate({ eventId, focalX: null, focalY: null })} />;
}
