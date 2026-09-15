"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import {
  findPossibleManualClientMatches,
  type ManualClientDraft,
  validateManualClientDraft,
} from "@/lib/artist-client-records";
import type { ProfessionalClientSummary } from "@/lib/professional-client-list";

type Props = {
  open: boolean;
  clients: ProfessionalClientSummary[];
  saving: boolean;
  errorMessage: string;
  onClose: () => void;
  onOpenExisting: (cardId: string) => void;
  onCreate: (draft: ManualClientDraft) => Promise<void>;
};

const EMPTY_DRAFT: ManualClientDraft = { name: "", phone: "", email: "" };

export default function AddProfessionalClientDialog({
  open,
  clients,
  saving,
  errorMessage,
  onClose,
  onOpenExisting,
  onCreate,
}: Props) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [validationMessage, setValidationMessage] = useState("");
  const [showMatches, setShowMatches] = useState(false);
  const matches = useMemo(
    () => findPossibleManualClientMatches(clients, draft),
    [clients, draft]
  );

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  const submit = async (allowPossibleDuplicate: boolean) => {
    const validation = validateManualClientDraft(draft);
    if (validation) {
      setValidationMessage(validation);
      return;
    }
    setValidationMessage("");
    if (!allowPossibleDuplicate && matches.length > 0) {
      setShowMatches(true);
      return;
    }
    await onCreate(draft);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-lumina-black/20 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-lumina-border bg-lumina-surface p-5 shadow-[0_24px_70px_rgba(17,17,17,0.12)] sm:max-w-[520px] sm:rounded-[24px] sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
              Professional workspace
            </p>
            <h2 id="add-client-title" className="mt-1 font-serif text-[27px] font-semibold">
              Add client
            </h2>
            <p className="mt-2 text-[12px] leading-[1.55] text-lumina-text-muted">
              Add an off-platform client without creating a Lumina account for them.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close Add client"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted"
          >
            <X size={16} />
          </button>
        </div>

        {showMatches ? (
          <div className="mt-6">
            <h3 className="text-[15px] font-semibold">Possible existing client</h3>
            <p className="mt-1 text-[12px] leading-[1.55] text-lumina-text-muted">
              This looks similar to a client already in your workspace. Nothing will be merged automatically.
            </p>
            <div className="mt-4 divide-y divide-lumina-border/60 border-y border-lumina-border/60">
              {matches.map((client) => (
                <button
                  key={client.clientId}
                  type="button"
                  onClick={() => onOpenExisting(client.clientId)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-[13px] font-medium"
                >
                  <span>{client.name}</span>
                  <span className="text-[11px] font-normal text-lumina-text-muted">Open existing</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void submit(true)}
                disabled={saving}
                className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add anyway"}
              </button>
              <button
                type="button"
                onClick={() => setShowMatches(false)}
                disabled={saving}
                className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px] font-medium"
              >
                Back
              </button>
              <button type="button" onClick={onClose} disabled={saving} className="min-h-11 px-3 text-[12px] text-lumina-text-muted">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-[12px] font-medium">
                Name
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  maxLength={120}
                  className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] outline-none focus:border-lumina-text-muted"
                />
              </label>
              <label className="grid gap-2 text-[12px] font-medium">
                Phone <span className="font-normal text-lumina-text-muted">Optional</span>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  maxLength={40}
                  className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] outline-none focus:border-lumina-text-muted"
                />
              </label>
              <label className="grid gap-2 text-[12px] font-medium">
                Email <span className="font-normal text-lumina-text-muted">Optional</span>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  maxLength={254}
                  className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] outline-none focus:border-lumina-text-muted"
                />
              </label>
            </div>
            {(validationMessage || errorMessage) && (
              <p role="alert" className="mt-4 text-[12px] text-lumina-attention">
                {validationMessage || errorMessage}
              </p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void submit(false)}
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white disabled:opacity-50"
              >
                <UserPlus size={15} /> {saving ? "Adding..." : "Add client"}
              </button>
              <button type="button" onClick={onClose} disabled={saving} className="min-h-11 px-3 text-[12px] text-lumina-text-muted">
                Cancel
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
