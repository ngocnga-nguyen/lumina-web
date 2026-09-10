"use client";

/* eslint-disable @next/next/no-img-element -- Private signed URLs are short-lived and cannot use a stable Next image source. */

import { Bell, CalendarDays, Check, Link2, Pencil, Pin, RotateCcw, Trash2 } from "lucide-react";
import {
  CLIENT_NOTE_REMINDER_STATUS_LABELS,
  CLIENT_NOTE_TYPE_LABELS,
  type ClientNote,
  type ClientNoteAttachment,
  formatClientNoteTimestamp,
  getClientNoteReminderStatus,
} from "@/lib/client-notes";

type ClientNoteCardProps = {
  note: ClientNote;
  attachments: ClientNoteAttachment[];
  requestLabel?: string;
  now: Date;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleReminderComplete: () => void;
};

const reminderStyles = {
  unscheduled: "border-lumina-border bg-lumina-surface-soft text-lumina-text-muted",
  upcoming: "border-lumina-glass-border bg-lumina-glass text-lumina-text",
  due_today: "border-lumina-border bg-lumina-blush/70 text-lumina-text",
  due: "border-lumina-border bg-lumina-blush/70 text-lumina-text",
  completed: "border-lumina-success/20 bg-lumina-success-soft text-lumina-success",
} as const;

function formatReminderDue(note: ClientNote) {
  if (!note.reminder_due_on) return null;
  const [year, month, day] = note.reminder_due_on.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!note.reminder_due_time) return dateLabel;
  const [hour, minute] = note.reminder_due_time.split(":").map(Number);
  date.setHours(hour, minute, 0, 0);
  return `${dateLabel} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function ClientNoteCard({ note, attachments, requestLabel, now, busy, onEdit, onDelete, onTogglePin, onToggleReminderComplete }: ClientNoteCardProps) {
  const wasEdited = note.updated_at !== note.created_at;
  const reminderStatus = getClientNoteReminderStatus(note, now);
  const reminderDue = formatReminderDue(note);
  const displayTitle = note.title.trim() || CLIENT_NOTE_TYPE_LABELS[note.note_type];

  return (
    <article className={`rounded-[20px] border p-5 md:p-6 ${note.is_pinned ? "border-lumina-glass-border bg-lumina-glass shadow-[0_12px_30px_rgba(39,36,40,0.035)] backdrop-blur-[12px]" : "border-lumina-border/65 bg-lumina-surface"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-lumina-border/70 bg-lumina-surface/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">{CLIENT_NOTE_TYPE_LABELS[note.note_type]}</span>
            {note.is_pinned && <span className="inline-flex items-center gap-1.5 rounded-full bg-lumina-blush/70 px-2.5 py-1 text-[10px] font-medium text-lumina-text"><Pin size={11} className="fill-current" aria-hidden="true" /> Pinned</span>}
            {reminderStatus && <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${reminderStyles[reminderStatus]}`}><Bell size={11} aria-hidden="true" />{CLIENT_NOTE_REMINDER_STATUS_LABELS[reminderStatus]}</span>}
          </div>
          <h3 className="mt-3 break-words text-[19px] font-semibold leading-[1.3] text-lumina-text">{displayTitle}</h3>
        </div>
        <button type="button" onClick={onTogglePin} disabled={busy} aria-label={note.is_pinned ? `Unpin ${displayTitle}` : `Pin ${displayTitle}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface/80 text-lumina-text-muted transition hover:border-lumina-text-muted hover:text-lumina-text disabled:opacity-50"><Pin size={15} className={note.is_pinned ? "fill-lumina-blush text-lumina-text" : ""} /></button>
      </div>

      {note.body.trim() && <p className="mt-4 whitespace-pre-wrap break-words text-[14px] leading-[1.72] text-lumina-text">{note.body}</p>}

      {attachments.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {attachments.map((attachment) => (
            <figure key={attachment.id} className="overflow-hidden rounded-[14px] border border-lumina-border/70 bg-lumina-surface">
              {attachment.signed_url && <img src={attachment.signed_url} alt={attachment.caption || "Private inspiration reference"} className="aspect-[4/3] w-full object-cover" />}
              {attachment.caption && <figcaption className="px-3 py-2 text-[11px] leading-[1.45] text-lumina-text-muted">{attachment.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {reminderStatus && reminderDue && <p className="mt-4 inline-flex items-center gap-2 text-[11px] text-lumina-text-muted"><CalendarDays size={13} aria-hidden="true" /> Due {reminderDue}</p>}

      {requestLabel && <p className="mt-4 inline-flex items-start gap-2 text-[11px] leading-[1.5] text-lumina-text-muted"><Link2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{requestLabel}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-lumina-border/60 pt-4">
        <p className="inline-flex items-center gap-2 text-[10px] text-lumina-text-muted"><CalendarDays size={13} aria-hidden="true" />{wasEdited ? "Edited" : "Created"} {formatClientNoteTimestamp(note.updated_at)}</p>
        <div className="flex items-center gap-2">
          {reminderStatus && <button type="button" onClick={onToggleReminderComplete} disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-3 text-[11px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft disabled:opacity-50">{reminderStatus === "completed" ? <RotateCcw size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}{reminderStatus === "completed" ? "Reopen" : "Mark complete"}</button>}
          <button type="button" onClick={onEdit} disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-3 text-[11px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft disabled:opacity-50"><Pencil size={13} aria-hidden="true" /> Edit</button>
          <button type="button" onClick={onDelete} disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-lumina-attention transition hover:bg-lumina-attention-soft disabled:opacity-50"><Trash2 size={13} aria-hidden="true" /> Delete</button>
        </div>
      </div>
    </article>
  );
}
