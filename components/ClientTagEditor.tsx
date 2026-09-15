"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addClientCardTag, CLIENT_CARD_TAG_MAX_LENGTH } from "@/lib/client-card-workspace";

type ClientTagEditorProps = {
  tags: string[];
  saving: boolean;
  onChange: (tags: string[]) => Promise<boolean>;
  instanceId?: string;
};

export default function ClientTagEditor({ tags, saving, onChange, instanceId = "client-tags" }: ClientTagEditorProps) {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  const addTag = async () => {
    const next = addClientCardTag(tags, draft);
    if (next.error) {
      setMessage(next.error);
      return;
    }
    setMessage("");
    if (await onChange(next.tags)) setDraft("");
  };

  return (
    <section aria-labelledby={`${instanceId}-title`} className="mt-4 border-y border-lumina-border/65 px-1 py-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id={`${instanceId}-title`} className="text-[15px] font-semibold text-lumina-text">
            Client tags
          </h2>
          <p className="mt-0.5 max-w-[620px] text-[11px] leading-[1.5] text-lumina-text-muted">
            Private labels for service preferences or workflow organization. Do not use them for diagnoses or sensitive medical information.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:max-w-[340px]">
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addTag();
              }
            }}
            maxLength={CLIENT_CARD_TAG_MAX_LENGTH}
            placeholder="Add a client tag"
            aria-label="New client tag"
            className="min-w-0 flex-1 rounded-full border border-lumina-border bg-lumina-surface px-4 py-2.5 text-[13px] text-lumina-text outline-none placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted"
          />
          <button
            type="button"
            onClick={() => void addTag()}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text transition hover:bg-lumina-black hover:text-white disabled:opacity-50"
            aria-label="Add client tag"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag.toLocaleLowerCase()} className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface/90 py-1.5 pl-3 pr-2 text-[12px] text-lumina-text">
              {tag}
              <button
                type="button"
                onClick={() => void onChange(tags.filter((item) => item !== tag))}
                disabled={saving}
                className="rounded-full p-0.5 text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text focus-visible:outline-2 focus-visible:outline-lumina-text"
                aria-label={`Remove ${tag} tag`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {message && <p aria-live="polite" className="mt-2 text-[11px] text-lumina-attention">{message}</p>}
    </section>
  );
}
