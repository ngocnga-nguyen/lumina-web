"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Pin, Plus } from "lucide-react";
import {
  CLIENT_NOTE_REMINDER_STATUS_LABELS,
  CLIENT_NOTE_TYPE_LABELS,
  type ClientNote,
  getClientNotePreview,
  getClientNoteReminderStatus,
  getClientNoteReminderTransition,
  sortClientNotes,
} from "@/lib/client-notes";

type ClientNotesPreviewProps = {
  clientId: string;
  notes: ClientNote[];
};

export default function ClientNotesPreview({ clientId, notes }: ClientNotesPreviewProps) {
  const [now, setNow] = useState(() => new Date());
  const previewNotes = sortClientNotes(notes, { prioritizeReminders: true, now }).slice(0, 3);
  const notesHref = `/dashboard/clients/${clientId}/notes`;

  useEffect(() => {
    const refreshNow = () => setNow(new Date());
    const handleVisibility = () => { if (document.visibilityState === "visible") refreshNow(); };
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", handleVisibility);
    const current = new Date();
    const nextTransition = notes
      .map((note) => getClientNoteReminderTransition(note, current)?.getTime() || Number.POSITIVE_INFINITY)
      .reduce((nearest, value) => Math.min(nearest, value), Number.POSITIVE_INFINITY);
    const timeout = Number.isFinite(nextTransition)
      ? window.setTimeout(refreshNow, Math.min(Math.max(nextTransition - current.getTime() + 250, 250), 2_147_000_000))
      : null;
    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [notes, now]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-lumina-text-muted">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${notesHref}?new=1`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
            <Plus size={14} aria-hidden="true" /> Add note
          </Link>
          <Link href={notesHref} className="inline-flex min-h-10 items-center rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white transition hover:bg-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
            View all notes
          </Link>
        </div>
      </div>

      {previewNotes.length > 0 ? (
        <div className="mt-4 divide-y divide-lumina-border/60 border-y border-lumina-border/60">
          {previewNotes.map((note) => {
            const reminderStatus = getClientNoteReminderStatus(note, now);
            return (
              <Link key={note.id} href={`${notesHref}?edit=${note.id}`} className="block py-3.5 transition hover:bg-lumina-surface-soft/55 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-lumina-text-muted">
                    {CLIENT_NOTE_TYPE_LABELS[note.note_type]}
                  </p>{reminderStatus && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${reminderStatus === "completed" ? "border-lumina-success/20 bg-lumina-success-soft text-lumina-success" : reminderStatus === "due" || reminderStatus === "due_today" ? "border-lumina-border bg-lumina-blush/70 text-lumina-text" : reminderStatus === "upcoming" ? "border-lumina-glass-border bg-lumina-glass text-lumina-text" : "border-lumina-border bg-lumina-surface-soft text-lumina-text-muted"}`}><Bell size={9} aria-hidden="true" />{CLIENT_NOTE_REMINDER_STATUS_LABELS[reminderStatus]}</span>}</div>
                  <h3 className="mt-1 truncate text-[14px] font-medium text-lumina-text">{note.title.trim() || CLIENT_NOTE_TYPE_LABELS[note.note_type]}</h3>
                </div>
                {note.is_pinned && <Pin size={13} className="mt-0.5 shrink-0 fill-lumina-blush text-lumina-text-muted" aria-label="Pinned" />}
              </div>
              {note.body.trim() && <p className="mt-1.5 text-[12px] leading-[1.55] text-lumina-text-muted">{getClientNotePreview(note.body, 120)}</p>}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-[13px] leading-[1.6] text-lumina-text-muted">
          Add private service notes, follow-up details, or ideas for this client.
        </p>
      )}
    </div>
  );
}
