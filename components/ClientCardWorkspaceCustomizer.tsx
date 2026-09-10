"use client";

import { useEffect } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import {
  type ClientCardSectionId,
  type ClientCardWorkspacePreferences,
  OPTIONAL_CLIENT_CARD_SECTIONS,
  PRIMARY_CLIENT_CARD_SECTIONS,
  SUPPORTING_CLIENT_CARD_SECTIONS,
} from "@/lib/client-card-workspace";

const labels: Record<ClientCardSectionId, string> = {
  service_history: "Service History",
  results: "Results / Photos",
  consultation: "Consultation",
  notes: "Notes",
  preferences: "Service preferences",
};

type Props = {
  preferences: ClientCardWorkspacePreferences;
  saving: boolean;
  message: string;
  onMove: (section: ClientCardSectionId, direction: -1 | 1) => void;
  onToggleVisibility: (section: ClientCardSectionId) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function ClientCardWorkspaceCustomizer({
  preferences,
  saving,
  message,
  onMove,
  onToggleVisibility,
  onReset,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const renderGroup = (
    title: string,
    copy: string,
    sectionIds: readonly ClientCardSectionId[]
  ) => {
    const ordered = preferences.order.filter((section) => sectionIds.includes(section));
    return (
      <section>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lumina-text">{title}</h3>
        <p className="mt-1 text-[11px] leading-[1.5] text-lumina-text-muted">{copy}</p>
        <ul className="mt-3 space-y-2">
          {ordered.map((section, index) => {
            const hidden = preferences.hidden.includes(section);
            const optional = OPTIONAL_CLIENT_CARD_SECTIONS.includes(section);
            return (
              <li key={section} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-lumina-border bg-lumina-surface px-3 py-2.5">
                <span className={`mr-auto text-[13px] font-medium ${hidden ? "text-lumina-text-muted" : "text-lumina-text"}`}>{labels[section]}</span>
                <button type="button" disabled={saving || index === 0} onClick={() => onMove(section, -1)} aria-label={`Move ${labels[section]} up`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:opacity-35"><ArrowUp size={14} /></button>
                <button type="button" disabled={saving || index === ordered.length - 1} onClick={() => onMove(section, 1)} aria-label={`Move ${labels[section]} down`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:opacity-35"><ArrowDown size={14} /></button>
                {optional ? (
                  <button type="button" disabled={saving} onClick={() => onToggleVisibility(section)} aria-label={`${hidden ? "Show" : "Hide"} ${labels[section]}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border px-3 text-[11px] text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:opacity-50">{hidden ? <Eye size={14} /> : <EyeOff size={14} />}{hidden ? "Show" : "Hide"}</button>
                ) : (
                  <span className="px-2 text-[10px] text-lumina-text-muted">Always shown</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-lumina-black/20 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="customize-client-workspace-title" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[26px] border border-lumina-glass-border bg-lumina-glass p-5 shadow-[0_24px_70px_rgba(17,17,17,0.14)] backdrop-blur-[18px] sm:max-w-[620px] sm:rounded-[26px] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Client Card</p>
            <h2 id="customize-client-workspace-title" className="mt-1 text-[24px] font-semibold text-lumina-text font-serif">Customize workspace</h2>
            <p className="mt-2 text-[12px] leading-[1.55] text-lumina-text-muted">Choose what appears and arrange sections in the order that helps you work.</p>
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label="Close workspace customization" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted transition hover:text-lumina-text"><X size={17} /></button>
        </div>

        <div className="mt-6 space-y-6">
          {renderGroup("Appointments and work", "Your client history, consultation context, and linked results.", PRIMARY_CLIENT_CARD_SECTIONS)}
          {renderGroup("Private details", "Your private notes and service preferences.", SUPPORTING_CLIENT_CARD_SECTIONS)}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-lumina-border pt-5">
          <button type="button" onClick={onReset} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft disabled:opacity-50"><RotateCcw size={14} /> Reset to default</button>
          <div className="flex items-center gap-3">
            <p aria-live="polite" className={`text-[11px] ${message.includes("couldn't") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{message}</p>
            <button type="button" onClick={onClose} className="min-h-10 rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white transition hover:bg-lumina-text">Done</button>
          </div>
        </div>
      </section>
    </div>
  );
}
