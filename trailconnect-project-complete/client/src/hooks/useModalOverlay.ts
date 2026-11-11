import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Turns a full-screen overlay into a real modal dialog.
 *
 * The overlays were plain `<div className="fixed inset-0">`: to a screen reader
 * they were not announced as modal, the focus stayed free to wander into the
 * content behind them, and on mobile the page underneath scrolled along with
 * the panel.
 *
 * Returns a ref to put on the panel. Spread `dialogProps` on it for the
 * semantics. `onClose` is wired to Escape.
 */
export function useModalOverlay<T extends HTMLElement>(options: {
  onClose: () => void;
  label: string;
  /** Set false to leave the page scrollable behind (rarely wanted). */
  lockScroll?: boolean;
}) {
  const { onClose, label, lockScroll = true } = options;
  const containerRef = useRef<T>(null);

  // Restore focus to whatever opened the overlay when it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const first = container?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    if (!lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lockScroll]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(element => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Keep Tab inside the dialog instead of walking into the page behind it.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return {
    containerRef,
    dialogProps: {
      role: "dialog" as const,
      "aria-modal": true,
      "aria-label": label,
    },
  };
}
