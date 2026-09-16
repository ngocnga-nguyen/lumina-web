"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type MobileManagementSheetProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function MobileManagementSheet({
  open,
  eyebrow = "Professional workspace",
  title,
  busy = false,
  onClose,
  children,
}: MobileManagementSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-lumina-black/20 backdrop-blur-[2px] sm:items-center sm:p-5 lg:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-management-sheet-title"
        className="max-h-[92dvh] min-w-0 w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[24px] border border-lumina-border bg-lumina-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_24px_70px_rgba(17,17,17,0.12)] sm:max-w-[620px] sm:rounded-[24px] sm:p-6"
      >
        <header className="sticky top-0 z-10 -mx-1 flex items-start gap-4 bg-lumina-surface/95 px-1 pb-4 backdrop-blur-[10px]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
              {eyebrow}
            </p>
            <h2
              id="mobile-management-sheet-title"
              className="mt-1 font-serif text-[26px] font-semibold leading-tight text-lumina-text"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted transition hover:bg-lumina-surface-soft disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
