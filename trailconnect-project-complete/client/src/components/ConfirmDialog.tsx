import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocale } from "@/contexts/LocaleContext";
import React, { useCallback, useState } from "react";

type ConfirmRequest = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Paints the confirm button as destructive. */
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Replaces `window.confirm` for actions that need a check before running.
 *
 * The native dialog cannot be styled, ignores the interface language (it
 * follows the browser's), is not reachable the same way by assistive tech and
 * blocks the main thread. It was being used for irreversible things —
 * cancelling an outing, deleting an account — which is exactly where a clear,
 * translated dialog matters most.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirm = useCallback(
    (next: ConfirmRequest) => setRequest(next),
    []
  );
  const dialog = (
    <ConfirmDialog request={request} onClose={() => setRequest(null)} />
  );
  return { confirm, dialog };
}

function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const fr = locale === "fr";

  return (
    <AlertDialog
      open={Boolean(request)}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.body ? (
            <AlertDialogDescription>{request.body}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">
            {request?.cancelLabel ?? (fr ? "Annuler" : "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={`min-h-11 ${request?.destructive ? "bg-[#8b5548] hover:bg-[#7a4a3e]" : ""}`}
            onClick={() => {
              request?.onConfirm();
              onClose();
            }}
          >
            {request?.confirmLabel ?? (fr ? "Confirmer" : "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
