"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, FolderPlus, Plus, X } from "lucide-react";
import type { SavedCollection } from "@/components/SavedCollectionsBar";

type SavedCollectionPickerProps = {
  artistName: string;
  collections: SavedCollection[];
  selectedCollectionIds: string[];
  onToggle: (collectionId: string, selected: boolean) => Promise<string | null>;
  onCreate: (name: string) => Promise<string | null>;
};

export default function SavedCollectionPicker({
  artistName,
  collections,
  selectedCollectionIds,
  onToggle,
  onCreate,
}: SavedCollectionPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const newCollectionInputId = useId();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busyCollectionId, setBusyCollectionId] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggleCollection = async (collectionId: string) => {
    const selected = selectedCollectionIds.includes(collectionId);
    setBusyCollectionId(collectionId);
    setError("");
    const nextError = await onToggle(collectionId, !selected);
    setBusyCollectionId(null);
    if (nextError) setError(nextError);
  };

  const createCollection = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter a collection name.");
      return;
    }

    setSavingName(true);
    setError("");
    const nextError = await onCreate(cleanName);
    setSavingName(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setName("");
    setCreating(false);
  };

  return (
    <div ref={rootRef} className="relative mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] font-medium text-lumina-text-muted transition hover:border-lumina-text-muted/40 hover:bg-lumina-blush/45 hover:text-lumina-text"
      >
        <FolderPlus size={14} aria-hidden="true" />
        {selectedCollectionIds.length > 0 ? "Organize" : "Add to collection"}
        {selectedCollectionIds.length > 0 && (
          <span className="rounded-full bg-lumina-pearl px-1.5 py-0.5 text-[10px] text-lumina-text">
            {selectedCollectionIds.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Organize ${artistName}`}
          className="absolute left-0 z-30 mt-2 w-[min(310px,calc(100vw-2.5rem))] rounded-[20px] border border-lumina-glass-border bg-lumina-glass p-3 text-lumina-text shadow-[0_12px_35px_rgba(39,36,40,0.10)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <div>
              <p className="text-[13px] font-medium">Add to collection</p>
              <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
                {artistName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close collection picker"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-pearl hover:text-lumina-text"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          {collections.length > 0 ? (
            <div className="max-h-56 space-y-1 overflow-y-auto py-1">
              {collections.map((collection) => {
                const selected = selectedCollectionIds.includes(collection.id);
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => void toggleCollection(collection.id)}
                    disabled={busyCollectionId === collection.id}
                    aria-pressed={selected}
                    className="flex w-full items-center justify-between gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] transition hover:bg-lumina-blush/45 disabled:opacity-55"
                  >
                    <span className="truncate">{collection.name}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border ${
                        selected
                          ? "border-lumina-black bg-lumina-black text-white"
                          : "border-lumina-border bg-lumina-surface"
                      }`}
                    >
                      {selected && <Check size={12} aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-3 text-[12px] leading-5 text-lumina-text-muted">
              Create a collection to organize this saved professional.
            </p>
          )}

          {creating ? (
            <div className="mt-2 border-t border-lumina-border pt-3">
              <label className="sr-only" htmlFor={newCollectionInputId}>
                New collection name
              </label>
              <input
                id={newCollectionInputId}
                autoFocus
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createCollection();
                  if (event.key === "Escape") setCreating(false);
                }}
                placeholder="Collection name"
                className="w-full rounded-[13px] border border-lumina-border bg-lumina-surface px-3 py-2.5 text-[13px] outline-none placeholder:text-lumina-text-muted/70 focus:border-lumina-text-muted/55"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void createCollection()}
                  disabled={savingName}
                  className="rounded-full bg-lumina-black px-4 py-2 text-[11px] font-medium text-white disabled:opacity-50"
                >
                  {savingName ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setName("");
                    setError("");
                  }}
                  disabled={savingName}
                  className="rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[11px] text-lumina-text-muted disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setError("");
              }}
              className="mt-2 flex w-full items-center gap-2 border-t border-lumina-border px-2 pt-3 text-left text-[12px] font-medium text-lumina-text transition hover:text-lumina-black"
            >
              <Plus size={14} aria-hidden="true" />
              New collection
            </button>
          )}

          {error && <p className="mt-2 px-2 text-[11px] text-lumina-attention">{error}</p>}
        </div>
      )}
    </div>
  );
}
