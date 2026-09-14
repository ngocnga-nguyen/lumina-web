"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export type SavedCollection = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type SavedCollectionsBarProps = {
  collections: SavedCollection[];
  activeCollectionId: string | null;
  allSavedCount: number;
  collectionCounts: Record<string, number>;
  onSelect: (collectionId: string | null) => void;
  onCreate: (name: string) => Promise<string | null>;
  onRename: (collectionId: string, name: string) => Promise<string | null>;
  onDelete: (collectionId: string) => Promise<string | null>;
  compactMobile?: boolean;
};

export default function SavedCollectionsBar({
  collections,
  activeCollectionId,
  allSavedCount,
  collectionCounts,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  compactMobile = false,
}: SavedCollectionsBarProps) {
  const activeCollection =
    collections.find((collection) => collection.id === activeCollectionId) || null;
  const [editorMode, setEditorMode] = useState<"create" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const closeEditor = () => {
    setEditorMode(null);
    setName("");
    setError("");
  };

  const selectCollection = (collectionId: string | null) => {
    closeEditor();
    onSelect(collectionId);
  };

  const submitName = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Enter a collection name.");
      return;
    }

    setSaving(true);
    setError("");
    const nextError =
      editorMode === "rename" && activeCollection
        ? await onRename(activeCollection.id, cleanName)
        : await onCreate(cleanName);
    setSaving(false);

    if (nextError) {
      setError(nextError);
      return;
    }

    closeEditor();
  };

  const deleteActiveCollection = async () => {
    if (!activeCollection) return;
    const confirmed = window.confirm(
      `Delete “${activeCollection.name}”? The professionals inside will stay saved.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    const nextError = await onDelete(activeCollection.id);
    setSaving(false);
    if (nextError) setError(nextError);
  };

  return (
    <div className={compactMobile ? "mb-4 lg:mb-8" : "mb-8"}>
      <div
        className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Saved collections"
      >
        <div className="flex min-w-max items-center gap-2">
          <button
            type="button"
            onClick={() => selectCollection(null)}
            aria-pressed={activeCollectionId === null}
            className={`rounded-full border font-medium transition ${
              compactMobile ? "min-h-9 px-3 py-1.5 text-[12px] lg:px-4 lg:py-2 lg:text-[13px]" : "px-4 py-2 text-[13px]"
            } ${
              activeCollectionId === null
                ? "border-lumina-black bg-lumina-black text-white"
                : "border-lumina-border bg-lumina-surface text-lumina-text-muted hover:border-lumina-text-muted/40 hover:bg-lumina-blush/45 hover:text-lumina-text"
            }`}
          >
            All saved <span className="ml-1 opacity-65">{allSavedCount}</span>
          </button>

          {collections.map((collection) => {
            const active = collection.id === activeCollectionId;
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => selectCollection(collection.id)}
                aria-pressed={active}
                className={`rounded-full border font-medium transition ${
                  compactMobile ? "min-h-9 px-3 py-1.5 text-[12px] lg:px-4 lg:py-2 lg:text-[13px]" : "px-4 py-2 text-[13px]"
                } ${
                  active
                    ? "border-lumina-black bg-lumina-black text-white"
                    : "border-lumina-border bg-lumina-surface text-lumina-text-muted hover:border-lumina-text-muted/40 hover:bg-lumina-blush/45 hover:text-lumina-text"
                }`}
              >
                {collection.name}
                <span className="ml-1 opacity-65">
                  {collectionCounts[collection.id] || 0}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setEditorMode("create");
              setName("");
              setError("");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface font-medium text-lumina-text transition hover:border-lumina-text-muted/40 hover:bg-lumina-blush/45 ${
              compactMobile ? "min-h-9 px-3 py-1.5 text-[12px] lg:px-4 lg:py-2 lg:text-[13px]" : "px-4 py-2 text-[13px]"
            }`}
          >
            <Plus size={14} aria-hidden="true" />
            New collection
          </button>
        </div>
      </div>

      {activeCollection && editorMode === null && (
        <div className={`mt-1 flex flex-wrap items-center text-[12px] text-lumina-text-muted ${compactMobile ? "gap-3 lg:gap-4" : "gap-4"}`}>
          <button
            type="button"
            onClick={() => {
              setEditorMode("rename");
              setName(activeCollection.name);
              setError("");
            }}
            className="inline-flex items-center gap-1.5 transition hover:text-lumina-text"
          >
            <Pencil size={13} aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            onClick={() => void deleteActiveCollection()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 transition hover:text-lumina-attention disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete collection
          </button>
        </div>
      )}

      {editorMode && (
        <div className="mt-3 flex max-w-[520px] flex-col gap-2 rounded-[18px] border border-lumina-border bg-lumina-glass p-3 backdrop-blur-md sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="saved-collection-name">
            Collection name
          </label>
          <input
            id="saved-collection-name"
            autoFocus
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitName();
              if (event.key === "Escape") closeEditor();
            }}
            placeholder="Collection name"
            className="min-w-0 flex-1 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-2.5 text-[14px] text-lumina-text outline-none placeholder:text-lumina-text-muted/70 focus:border-lumina-text-muted/55"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submitName()}
              disabled={saving}
              className="rounded-full bg-lumina-black px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : editorMode === "rename" ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeEditor}
              disabled={saving}
              aria-label="Cancel collection edit"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted transition hover:text-lumina-text disabled:opacity-50"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-lumina-attention">{error}</p>}
    </div>
  );
}
