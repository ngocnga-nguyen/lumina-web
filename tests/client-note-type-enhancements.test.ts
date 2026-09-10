import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getClientNoteReminderStatus,
  sortClientNotes,
  type ClientNote,
} from "../lib/client-notes.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/20260910120000_add_note_type_enhancements_v1.sql", import.meta.url),
  "utf8"
);
const notesPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/notes/page.tsx", import.meta.url),
  "utf8"
);

function note(overrides: Partial<ClientNote> = {}): ClientNote {
  return {
    id: overrides.id || "note",
    artist_id: "artist",
    client_id: "client",
    request_id: null,
    note_type: "reminder",
    title: "Reminder",
    body: "Reminder body",
    is_pinned: false,
    reminder_due_on: null,
    reminder_due_time: null,
    reminder_completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

test("Reminder status is derived without a stored status column", () => {
  const now = new Date(2026, 8, 9, 12, 0, 0);
  assert.equal(getClientNoteReminderStatus(note(), now), "unscheduled");
  assert.equal(getClientNoteReminderStatus(note({ reminder_due_on: "2026-09-09" }), now), "due_today");
  assert.equal(getClientNoteReminderStatus(note({ reminder_due_on: "2026-09-09", reminder_due_time: "13:00" }), now), "upcoming");
  assert.equal(getClientNoteReminderStatus(note({ reminder_due_on: "2026-09-09", reminder_due_time: "11:00" }), now), "due");
  assert.equal(getClientNoteReminderStatus(note({ reminder_due_on: "2026-09-10", reminder_completed_at: "2026-09-08T12:00:00Z" }), now), "completed");
  assert.doesNotMatch(migration, /reminder_status\s+text/i);
});

test("Client Card preview order is pinned, actionable reminder, upcoming reminder, then recent", () => {
  const now = new Date(2026, 8, 9, 12, 0, 0);
  const sorted = sortClientNotes([
    note({ id: "recent", note_type: "general", updated_at: "2026-09-09T18:00:00Z" }),
    note({ id: "upcoming", reminder_due_on: "2026-09-10" }),
    note({ id: "due", reminder_due_on: "2026-09-08" }),
    note({ id: "pinned", is_pinned: true }),
  ], { prioritizeReminders: true, now });
  assert.deepEqual(sorted.map((item) => item.id), ["pinned", "due", "upcoming", "recent"]);
});

test("private image metadata is forced-RLS and limited to four Inspiration slots", () => {
  assert.match(migration, /create table if not exists public\.artist_client_note_attachments/i);
  assert.match(migration, /sort_order between 0 and 3/i);
  assert.match(migration, /unique \(note_id, sort_order\)/i);
  assert.match(migration, /Only Inspiration notes may own image attachments/i);
  assert.match(migration, /alter table public\.artist_client_note_attachments force row level security/i);
  assert.match(migration, /revoke all on table public\.artist_client_note_attachments from anon/i);
  assert.doesNotMatch(migration, /grant\s+.*artist_client_note_attachments.*\s+to\s+(anon|public)/i);
});

test("private bucket enforces image types, size, owner prefix, and registered metadata", () => {
  assert.match(migration, /'client-note-images'[\s\S]*false,[\s\S]*5242880/is);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.match(migration, /Professionals can upload registered Client Note images[\s\S]*foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/i);
  assert.match(migration, /attachment\.storage_path = name[\s\S]*can_manage_artist_client_note\(attachment\.note_id\)/i);
  assert.doesNotMatch(migration, /getPublicUrl/i);
});

test("upload flow registers metadata before the private object and uses signed URLs", () => {
  const metadataInsert = notesPage.indexOf('.from("artist_client_note_attachments")\n          .insert');
  const storageUpload = notesPage.indexOf(".upload(storagePath, image.file");
  assert.ok(metadataInsert >= 0 && storageUpload > metadataInsert);
  assert.match(notesPage, /attachSignedClientNoteImageUrls/);
  assert.match(notesPage, /reminder_completed_at: note\.reminder_completed_at \? null : new Date\(\)\.toISOString\(\)/);
});

