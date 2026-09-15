export const CLIENT_NOTE_TYPES = [
  "general",
  "service_note",
  "follow_up",
  "inspiration",
  "aftercare",
  "reminder",
] as const;

export type ClientNoteType = (typeof CLIENT_NOTE_TYPES)[number];

export type ClientNote = {
  id: string;
  artist_id: string;
  client_id: string | null;
  client_card_id?: string;
  request_id: string | null;
  note_type: ClientNoteType;
  title: string;
  body: string;
  is_pinned: boolean;
  reminder_due_on: string | null;
  reminder_due_time: string | null;
  reminder_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientNoteAttachment = {
  id: string;
  note_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  signed_url?: string;
};

export type ClientNoteReminderStatus = "unscheduled" | "upcoming" | "due_today" | "due" | "completed";

export const CLIENT_NOTE_TYPE_LABELS: Record<ClientNoteType, string> = {
  general: "General",
  service_note: "Service note",
  follow_up: "Follow-up",
  inspiration: "Inspiration / idea",
  aftercare: "Aftercare",
  reminder: "Reminder",
};

export const CLIENT_NOTE_TITLE_MAX_LENGTH = 120;
export const CLIENT_NOTE_BODY_MAX_LENGTH = 20000;
export const CLIENT_NOTE_IMAGE_BUCKET = "client-note-images";
export const CLIENT_NOTE_IMAGE_MAX_COUNT = 4;
export const CLIENT_NOTE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CLIENT_NOTE_IMAGE_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
export const CLIENT_NOTE_ATTACHMENT_CAPTION_MAX_LENGTH = 200;

export const CLIENT_NOTE_REMINDER_STATUS_LABELS: Record<ClientNoteReminderStatus, string> = {
  unscheduled: "Unscheduled",
  upcoming: "Upcoming",
  due_today: "Due today",
  due: "Due",
  completed: "Completed",
};

export function isClientNoteType(value: unknown): value is ClientNoteType {
  return typeof value === "string" && CLIENT_NOTE_TYPES.includes(value as ClientNoteType);
}

export function hasMeaningfulClientNoteContent(input: {
  noteType: ClientNoteType;
  title: string;
  body: string;
  imageCount: number;
  reminderDueOn: string | null;
}) {
  return Boolean(
    input.title.trim()
    || input.body.trim()
    || (input.noteType === "inspiration" && input.imageCount > 0)
    || (input.noteType === "reminder" && input.reminderDueOn)
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getClientNoteReminderStatus(note: ClientNote, now = new Date()): ClientNoteReminderStatus | null {
  if (note.note_type !== "reminder") return null;
  if (note.reminder_completed_at) return "completed";
  if (!note.reminder_due_on) return "unscheduled";

  const today = localDateKey(now);
  if (!note.reminder_due_time) {
    if (note.reminder_due_on < today) return "due";
    if (note.reminder_due_on === today) return "due_today";
    return "upcoming";
  }

  const [year, month, day] = note.reminder_due_on.split("-").map(Number);
  const [hour, minute, second = 0] = note.reminder_due_time.split(":").map(Number);
  const dueAt = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(dueAt.getTime())) return "unscheduled";
  return dueAt.getTime() <= now.getTime() ? "due" : "upcoming";
}

export function getClientNoteReminderTransition(note: ClientNote, now = new Date()) {
  if (note.note_type !== "reminder" || note.reminder_completed_at || !note.reminder_due_on) return null;
  const [year, month, day] = note.reminder_due_on.split("-").map(Number);
  const [hour, minute, second = 0] = note.reminder_due_time?.split(":").map(Number) || [0, 0, 0];
  const transition = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(transition.getTime()) || transition.getTime() <= now.getTime() ? null : transition;
}

function reminderPreviewRank(note: ClientNote, now: Date) {
  const status = getClientNoteReminderStatus(note, now);
  if (status === "due" || status === "due_today") return 0;
  if (status === "upcoming") return 1;
  return 2;
}

function reminderDueTimestamp(note: ClientNote) {
  if (!note.reminder_due_on) return Number.POSITIVE_INFINITY;
  const [year, month, day] = note.reminder_due_on.split("-").map(Number);
  const [hour, minute, second = 0] = note.reminder_due_time?.split(":").map(Number) || [0, 0, 0];
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

export function sortClientNotes(notes: ClientNote[], options: { prioritizeReminders?: boolean; now?: Date } = {}) {
  const now = options.now || new Date();
  return [...notes].sort((first, second) => {
    if (first.is_pinned !== second.is_pinned) return first.is_pinned ? -1 : 1;
    if (options.prioritizeReminders && !first.is_pinned && !second.is_pinned) {
      const firstRank = reminderPreviewRank(first, now);
      const secondRank = reminderPreviewRank(second, now);
      if (firstRank !== secondRank) return firstRank - secondRank;
      if (firstRank < 2) {
        const dueDifference = reminderDueTimestamp(first) - reminderDueTimestamp(second);
        if (dueDifference !== 0) return dueDifference;
      }
    }
    return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
  });
}

export function validateClientNoteImage(file: File) {
  if (!CLIENT_NOTE_IMAGE_ACCEPT.includes(file.type as (typeof CLIENT_NOTE_IMAGE_ACCEPT)[number])) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > CLIENT_NOTE_IMAGE_MAX_BYTES) return "Each image must be 5 MB or smaller.";
  return null;
}

export function getClientNoteImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function getClientNotePreview(body: string, maxLength = 150) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function formatClientNoteTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
