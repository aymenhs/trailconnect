import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { LogOut } from "lucide-react";
import React from "react";
import { toast } from "sonner";

type LeaveOutingButtonProps = {
  eventId: number;
  /** `pending` phrases the action as taking an application back. */
  participationStatus?: "going" | "pending" | "waitlist";
  /** Refresh the caller's lists once the withdrawal lands. */
  onLeft?: () => void;
  className?: string;
};

/**
 * Lets a participant withdraw from an outing, or take a pending application
 * back. Joining used to be one-way: only the organizer could cancel someone's
 * participation, so a person who could no longer come stayed on the list and
 * the organizer counted a place that would never be used.
 *
 * The confirmation is a real dialog rather than `window.confirm` so it is
 * translated, styled and reachable by keyboard and screen reader.
 */
export function LeaveOutingButton({
  eventId,
  participationStatus = "going",
  onLeft,
  className = "",
}: LeaveOutingButtonProps) {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const pending = participationStatus === "pending";

  const leave = trpc.hiking.events.leave.useMutation({
    onSuccess: result => {
      toast.success(
        pending
          ? fr
            ? "Votre demande a été retirée."
            : "Your request has been withdrawn."
          : result.freedConfirmedPlace
            ? fr
              ? "Vous vous êtes retiré. Votre place est rendue au groupe."
              : "You have withdrawn. Your place is back with the group."
            : fr
              ? "Vous vous êtes retiré de cette sortie."
              : "You have withdrawn from this outing."
      );
      onLeft?.();
    },
    onError: error => toast.error(error.message),
  });

  const copy = fr
    ? {
        trigger: pending ? "Retirer ma demande" : "Me retirer",
        title: pending
          ? "Retirer votre demande de participation ?"
          : "Vous retirer de cette sortie ?",
        body: pending
          ? "Votre demande ne sera plus soumise à l’organisateur. Vous pourrez en envoyer une nouvelle tant que la sortie n’est pas complète."
          : "Votre place est rendue au groupe et l’organisateur en est informé. Vos réservations de covoiturage sur cette sortie sont annulées. Vous pourrez vous réinscrire s’il reste de la place.",
        cancel: "Annuler",
        confirm: pending ? "Retirer la demande" : "Me retirer",
        pendingLabel: "Retrait en cours…",
      }
    : {
        trigger: pending ? "Withdraw request" : "Leave outing",
        title: pending
          ? "Withdraw your participation request?"
          : "Withdraw from this outing?",
        body: pending
          ? "Your request will no longer be waiting on the organizer. You can send a new one while the outing still has room."
          : "Your place goes back to the group and the organizer is notified. Your carpool reservations for this outing are cancelled. You can sign up again if a place remains.",
        cancel: "Cancel",
        confirm: pending ? "Withdraw request" : "Leave outing",
        pendingLabel: "Withdrawing…",
      };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={leave.isPending}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#e0cfc9] bg-white px-3 text-[11px] font-extrabold text-[#8b5548] transition hover:bg-[#fdf7f5] disabled:opacity-60 ${className}`}
        >
          <LogOut size={14} aria-hidden="true" />
          {leave.isPending ? copy.pendingLabel : copy.trigger}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            {copy.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11 bg-[#8b5548] hover:bg-[#7a4a3e]"
            onClick={() => leave.mutate({ eventId })}
          >
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
