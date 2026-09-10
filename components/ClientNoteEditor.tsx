"use client";

/* eslint-disable @next/next/no-img-element -- This editor combines short-lived signed URLs with local blob previews. */

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  CLIENT_NOTE_ATTACHMENT_CAPTION_MAX_LENGTH,
  CLIENT_NOTE_BODY_MAX_LENGTH,
  CLIENT_NOTE_IMAGE_MAX_COUNT,
  CLIENT_NOTE_TITLE_MAX_LENGTH,
  CLIENT_NOTE_TYPES,
  CLIENT_NOTE_TYPE_LABELS,
  type ClientNote,
  type ClientNoteAttachment,
  type ClientNoteType,
  hasMeaningfulClientNoteContent,
  validateClientNoteImage,
} from "@/lib/client-notes";

export type NewClientNoteImage = {
  local_id: string;
  file: File;
  caption: string;
  preview_url: string;
};

export type ClientNoteDraft = {
  title: string;
  body: string;
  note_type: ClientNoteType;
  request_id: string | null;
  reminder_due_on: string | null;
  reminder_due_time: string | null;
  existing_attachments: Array<{ id: string; caption: string }>;
  removed_attachment_ids: string[];
  new_images: NewClientNoteImage[];
};

type RequestOption = { id: string; label: string };

type ClientNoteEditorProps = {
  note: ClientNote | null;
  initialType: ClientNoteType;
  attachments: ClientNoteAttachment[];
  requests: RequestOption[];
  saving: boolean;
  errorMessage: string;
  onSave: (draft: ClientNoteDraft) => void;
  onClose: () => void;
};

export default function ClientNoteEditor({
  note,
  initialType,
  attachments,
  requests,
  saving,
  errorMessage,
  onSave,
  onClose,
}: ClientNoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newImageUrlsRef = useRef<Set<string>>(new Set());
  const [imageError, setImageError] = useState("");
  const [draft, setDraft] = useState<ClientNoteDraft>({
    title: note?.title || "",
    body: note?.body || "",
    note_type: note?.note_type || initialType,
    request_id: note?.request_id || null,
    reminder_due_on: note?.reminder_due_on || null,
    reminder_due_time: note?.reminder_due_time?.slice(0, 5) || null,
    existing_attachments: attachments.map((attachment) => ({ id: attachment.id, caption: attachment.caption || "" })),
    removed_attachment_ids: [],
    new_images: [],
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  useEffect(() => () => {
    newImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const visibleExistingAttachments = attachments.filter((attachment) => !draft.removed_attachment_ids.includes(attachment.id));
  const imageCount = visibleExistingAttachments.length + draft.new_images.length;

  const addImages = (files: FileList | null) => {
    if (!files) return;
    setImageError("");
    const available = CLIENT_NOTE_IMAGE_MAX_COUNT - imageCount;
    if (available <= 0) {
      setImageError("An Inspiration note can include up to 4 images.");
      return;
    }
    const selected = Array.from(files);
    if (selected.length > available) {
      setImageError(`You can add ${available} more ${available === 1 ? "image" : "images"}.`);
      return;
    }
    const invalid = selected.map(validateClientNoteImage).find(Boolean);
    if (invalid) {
      setImageError(invalid);
      return;
    }
    const additions = selected.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      newImageUrlsRef.current.add(previewUrl);
      return { local_id: crypto.randomUUID(), file, caption: "", preview_url: previewUrl };
    });
    setDraft((current) => ({ ...current, new_images: [...current.new_images, ...additions] }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (localId: string) => {
    setDraft((current) => {
      const removed = current.new_images.find((image) => image.local_id === localId);
      if (removed) {
        URL.revokeObjectURL(removed.preview_url);
        newImageUrlsRef.current.delete(removed.preview_url);
      }
      return { ...current, new_images: current.new_images.filter((image) => image.local_id !== localId) };
    });
  };

  const valid = hasMeaningfulClientNoteContent({
    noteType: draft.note_type,
    title: draft.title,
    body: draft.body,
    imageCount,
    reminderDueOn: draft.reminder_due_on,
  });
  const editorLabels: Record<ClientNoteType, { title: string; bodyLabel: string; bodyPlaceholder: string }> = {
    general: { title: "general note", bodyLabel: "Note", bodyPlaceholder: "Add useful context for future visits." },
    service_note: { title: "service note", bodyLabel: "Service note", bodyPlaceholder: "Record service details, observations, or context from the appointment." },
    follow_up: { title: "follow-up", bodyLabel: "Follow-up note", bodyPlaceholder: "Record what to check in on or discuss at the next visit." },
    inspiration: { title: "inspiration", bodyLabel: "Idea or context", bodyPlaceholder: "Describe the look, reference, or idea behind these images." },
    aftercare: { title: "aftercare note", bodyLabel: "Aftercare note", bodyPlaceholder: "Record aftercare guidance or details to remember." },
    reminder: { title: "reminder", bodyLabel: "Reminder details", bodyPlaceholder: "What would you like to remember?" },
  };
  const labels = editorLabels[draft.note_type];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-lumina-black/20 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="client-note-editor-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[26px] border border-lumina-glass-border bg-lumina-glass p-5 shadow-[0_24px_70px_rgba(17,17,17,0.14)] backdrop-blur-[18px] sm:max-w-[680px] sm:rounded-[26px] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Private client note</p>
            <h2 id="client-note-editor-title" className="mt-1 text-[26px] font-semibold text-lumina-text font-serif">{note ? `Edit ${labels.title}` : `New ${labels.title}`}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close note editor" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted transition hover:text-lumina-text disabled:opacity-50"><X size={17} /></button>
        </div>

        <div className="mt-6 grid gap-5">
          {note ? <label className="grid gap-2 text-[12px] font-medium text-lumina-text">
            Note type
            <select value={draft.note_type} onChange={(event) => {
              const noteType = event.target.value as ClientNoteType;
              setDraft((current) => ({
                ...current,
                note_type: noteType,
                reminder_due_on: noteType === "reminder" ? current.reminder_due_on : null,
                reminder_due_time: noteType === "reminder" ? current.reminder_due_time : null,
              }));
            }} className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] font-normal outline-none focus:border-lumina-text-muted">
              {CLIENT_NOTE_TYPES.map((type) => <option key={type} value={type}>{CLIENT_NOTE_TYPE_LABELS[type]}</option>)}
            </select>
            {imageCount > 0 && draft.note_type !== "inspiration" && <span className="text-[11px] font-normal text-lumina-attention">Remove the Inspiration images before changing this note type.</span>}
          </label> : <div><span className="inline-flex rounded-full border border-lumina-glass-border bg-lumina-glass px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-lumina-text-muted">{CLIENT_NOTE_TYPE_LABELS[draft.note_type]}</span></div>}

          {draft.note_type === "reminder" && (
            <fieldset className="rounded-[16px] border border-lumina-border/75 bg-lumina-surface/70 p-4">
              <legend className="px-1 text-[12px] font-medium text-lumina-text">Reminder timing <span className="font-normal text-lumina-text-muted">Optional</span></legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-[12px] font-medium text-lumina-text">Due date
                  <input type="date" value={draft.reminder_due_on || ""} onChange={(event) => setDraft((current) => ({ ...current, reminder_due_on: event.target.value || null, reminder_due_time: event.target.value ? current.reminder_due_time : null }))} className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] font-normal outline-none focus:border-lumina-text-muted" />
                </label>
                <label className="grid gap-2 text-[12px] font-medium text-lumina-text">Due time
                  <input type="time" value={draft.reminder_due_time || ""} disabled={!draft.reminder_due_on} onChange={(event) => setDraft((current) => ({ ...current, reminder_due_time: event.target.value || null }))} className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] font-normal outline-none focus:border-lumina-text-muted disabled:cursor-not-allowed disabled:bg-lumina-surface-soft disabled:text-lumina-text-muted" />
                </label>
              </div>
              <p className="mt-3 text-[11px] leading-[1.5] text-lumina-text-muted">Date-only reminders will show as Due today throughout the selected day.</p>
            </fieldset>
          )}

          {(draft.note_type === "inspiration" || attachments.length > 0 || draft.new_images.length > 0) && (
            <div>
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] font-medium text-lumina-text">
                <span>Reference images</span>
                <span className="font-normal text-lumina-text-muted">Optional · up to 4</span>
              </div>
              <div className="rounded-[16px] border border-lumina-border/75 bg-lumina-surface/70 p-4">
              {imageCount > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {visibleExistingAttachments.map((attachment) => {
                    const current = draft.existing_attachments.find((item) => item.id === attachment.id);
                    return <div key={attachment.id} className="rounded-[14px] border border-lumina-border bg-lumina-surface p-2.5">
                      {attachment.signed_url && <img src={attachment.signed_url} alt={attachment.caption || "Private inspiration reference"} className="aspect-[4/3] w-full rounded-[10px] object-cover" />}
                      <div className="mt-2 flex items-start gap-2">
                        <input value={current?.caption || ""} onChange={(event) => setDraft((value) => ({ ...value, existing_attachments: value.existing_attachments.map((item) => item.id === attachment.id ? { ...item, caption: event.target.value } : item) }))} maxLength={CLIENT_NOTE_ATTACHMENT_CAPTION_MAX_LENGTH} placeholder="Optional caption" aria-label="Image caption" className="min-h-10 min-w-0 flex-1 rounded-[11px] border border-lumina-border bg-lumina-surface px-3 text-[12px] outline-none focus:border-lumina-text-muted" />
                        <button type="button" onClick={() => setDraft((currentDraft) => ({ ...currentDraft, removed_attachment_ids: [...currentDraft.removed_attachment_ids, attachment.id] }))} aria-label="Remove image" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted hover:text-lumina-attention"><X size={14} /></button>
                      </div>
                    </div>;
                  })}
                  {draft.new_images.map((image) => <div key={image.local_id} className="rounded-[14px] border border-lumina-border bg-lumina-surface p-2.5">
                    <img src={image.preview_url} alt={image.caption || "New private inspiration reference"} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
                    <div className="mt-2 flex items-start gap-2">
                      <input value={image.caption} onChange={(event) => setDraft((current) => ({ ...current, new_images: current.new_images.map((item) => item.local_id === image.local_id ? { ...item, caption: event.target.value } : item) }))} maxLength={CLIENT_NOTE_ATTACHMENT_CAPTION_MAX_LENGTH} placeholder="Optional caption" aria-label="New image caption" className="min-h-10 min-w-0 flex-1 rounded-[11px] border border-lumina-border bg-lumina-surface px-3 text-[12px] outline-none focus:border-lumina-text-muted" />
                      <button type="button" onClick={() => removeNewImage(image.local_id)} aria-label="Remove new image" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted hover:text-lumina-attention"><X size={14} /></button>
                    </div>
                  </div>)}
                </div>
              )}
              {draft.note_type === "inspiration" && imageCount < CLIENT_NOTE_IMAGE_MAX_COUNT && <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft"><ImagePlus size={15} aria-hidden="true" /> Add images<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => addImages(event.target.files)} /></label>}
              <p className="mt-3 text-[11px] leading-[1.5] text-lumina-text-muted">Private to your professional account. JPEG, PNG, or WebP; 5 MB per image.</p>
              {imageError && <p className="mt-2 text-[11px] text-lumina-attention">{imageError}</p>}
              </div>
            </div>
          )}

          <label className="grid gap-2 text-[12px] font-medium text-lumina-text">
            <span>Title <span className="font-normal text-lumina-text-muted">Optional</span></span>
            <input autoFocus value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={CLIENT_NOTE_TITLE_MAX_LENGTH} placeholder="e.g. Neutral almond set follow-up" className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] font-normal outline-none placeholder:text-lumina-text-muted/70 focus:border-lumina-text-muted" />
          </label>

          <label className="grid gap-2 text-[12px] font-medium text-lumina-text">
            <span>{labels.bodyLabel} <span className="font-normal text-lumina-text-muted">Optional</span></span>
            <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} maxLength={CLIENT_NOTE_BODY_MAX_LENGTH} rows={draft.note_type === "inspiration" ? 5 : 8} placeholder={labels.bodyPlaceholder} className="w-full resize-y rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] font-normal leading-[1.65] outline-none placeholder:text-lumina-text-muted/70 focus:border-lumina-text-muted" />
          </label>

          {draft.note_type === "service_note" && <label className="grid gap-2 text-[12px] font-medium text-lumina-text">
            Link to request or appointment <span className="font-normal text-lumina-text-muted">Optional</span>
            <select value={draft.request_id || ""} onChange={(event) => setDraft((current) => ({ ...current, request_id: event.target.value || null }))} className="min-h-12 rounded-[14px] border border-lumina-border bg-lumina-surface px-4 text-[14px] font-normal outline-none focus:border-lumina-text-muted">
              <option value="">No linked request</option>
              {requests.map((request) => <option key={request.id} value={request.id}>{request.label}</option>)}
            </select>
          </label>}
        </div>

        <p className="mt-4 text-[11px] leading-[1.55] text-lumina-text-muted">Private to your professional account. Avoid diagnoses or sensitive medical information.</p>
        {!valid && <p className="mt-2 text-[11px] leading-[1.5] text-lumina-text-muted">Add at least a title, note, image, or reminder date.</p>}
        {errorMessage && <p aria-live="polite" className="mt-3 text-[12px] text-lumina-attention">{errorMessage}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-lumina-border/70 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-full border border-lumina-border bg-lumina-surface px-5 text-[13px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => onSave({ ...draft, title: draft.title.trim(), existing_attachments: draft.existing_attachments.map((item) => ({ ...item, caption: item.caption.trim() })), new_images: draft.new_images.map((item) => ({ ...item, caption: item.caption.trim() })) })} disabled={saving || !valid || (imageCount > 0 && draft.note_type !== "inspiration")} className="min-h-11 rounded-full bg-lumina-black px-6 text-[13px] font-medium text-white transition hover:bg-lumina-text disabled:cursor-not-allowed disabled:bg-lumina-pearl disabled:text-lumina-text-muted">{saving ? "Saving..." : note ? "Save changes" : "Create note"}</button>
        </div>
      </section>
    </div>
  );
}
