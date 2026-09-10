import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLIENT_NOTE_TYPES,
  getClientNotePreview,
  sortClientNotes,
  type ClientNote,
} from "../lib/client-notes.ts";

const notesPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/notes/page.tsx", import.meta.url),
  "utf8"
);
const preview = readFileSync(
  new URL("../components/ClientNotesPreview.tsx", import.meta.url),
  "utf8"
);
const editor = readFileSync(
  new URL("../components/ClientNoteEditor.tsx", import.meta.url),
  "utf8"
);

function note(id: string, pinned: boolean, updatedAt: string): ClientNote {
  return {
    id,
    artist_id: "artist",
    client_id: "client",
    request_id: null,
    note_type: "general",
    title: id,
    body: `${id} body`,
    is_pinned: pinned,
    reminder_due_on: null,
    reminder_due_time: null,
    reminder_completed_at: null,
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

test("the fixed V1 note types stay intentionally small", () => {
  assert.deepEqual(CLIENT_NOTE_TYPES, [
    "general",
    "service_note",
    "follow_up",
    "inspiration",
    "aftercare",
    "reminder",
  ]);
});

test("pinned notes lead the preview, followed by most recently updated notes", () => {
  const sorted = sortClientNotes([
    note("old", false, "2026-01-01T00:00:00Z"),
    note("recent", false, "2026-03-01T00:00:00Z"),
    note("pinned", true, "2026-02-01T00:00:00Z"),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ["pinned", "recent", "old"]);
});

test("Client Card note previews are concise and limited to three", () => {
  assert.equal(getClientNotePreview("  Line one\nLine two  "), "Line one Line two");
  assert.match(getClientNotePreview("x".repeat(180), 20), /^x{20}…$/);
  assert.match(preview, /sortClientNotes\(notes, \{ prioritizeReminders: true, now \}\)\.slice\(0, 3\)/);
  assert.match(preview, /View all notes/);
  assert.match(preview, /\?new=1/);
});

test("dedicated workspace implements create, edit, delete, and pin operations", () => {
  assert.match(notesPage, /from\("artist_client_notes"\)\.insert/);
  assert.match(notesPage, /from\("artist_client_notes"\)\.update\(payload\)/);
  assert.match(notesPage, /update\(\{ is_pinned: !note\.is_pinned \}\)/);
  assert.match(notesPage, /from\("artist_client_notes"\)\.delete\(\)/);
  assert.match(notesPage, /role="alertdialog"/);
});

test("request options are derived from historical request snapshots", () => {
  assert.match(notesPage, /formatRequestServiceSummary\(request\)/);
  assert.match(notesPage, /request_id: draft\.request_id/);
  assert.doesNotMatch(notesPage, /from\("services"\)/);
});

test("each note filter exposes its own purpose-specific creation action", () => {
  assert.match(notesPage, /action: "Add general note"/);
  assert.match(notesPage, /action: "Add service note"/);
  assert.match(notesPage, /action: "Add follow-up"/);
  assert.match(notesPage, /action: "Add inspiration"/);
  assert.match(notesPage, /action: "Add aftercare note"/);
  assert.match(notesPage, /action: "Add reminder"/);
  assert.match(notesPage, /No inspiration saved yet/);
  assert.match(notesPage, /No reminders yet/);
});

test("the global New note shortcut uses an accessible type picker", () => {
  assert.match(notesPage, /aria-haspopup="menu"/);
  assert.match(notesPage, /aria-expanded=\{typePickerOpen\}/);
  assert.match(notesPage, /role="menu"/);
  assert.match(notesPage, /CLIENT_NOTE_TYPES\.map\(\(noteType\)/);
  assert.match(notesPage, /openNewNote\(noteType\)/);
});

test("purpose-specific editors hide unrelated controls", () => {
  assert.match(editor, /draft\.note_type === "service_note"/);
  assert.match(editor, /Link to request or appointment/);
  assert.match(editor, /draft\.note_type === "reminder"/);
  assert.match(editor, /Reminder timing/);
  assert.match(editor, /draft\.note_type === "inspiration"/);
  assert.match(editor, /Reference images/);
  assert.match(editor, /initialType: ClientNoteType/);
});
