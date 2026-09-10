import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLIENT_NOTE_TYPES,
  hasMeaningfulClientNoteContent,
} from "../lib/client-notes.ts";

const notesPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/notes/page.tsx", import.meta.url),
  "utf8"
);
const flexibleContentMigration = readFileSync(
  new URL("../supabase/migrations/20260910130000_allow_flexible_client_note_content.sql", import.meta.url),
  "utf8"
);

test("every note type accepts title-only or body-only content", () => {
  for (const noteType of CLIENT_NOTE_TYPES) {
    assert.equal(hasMeaningfulClientNoteContent({ noteType, title: "A title", body: "", imageCount: 0, reminderDueOn: null }), true);
    assert.equal(hasMeaningfulClientNoteContent({ noteType, title: "", body: "Context", imageCount: 0, reminderDueOn: null }), true);
  }
});

test("Inspiration supports image-only notes while other types do not", () => {
  assert.equal(hasMeaningfulClientNoteContent({ noteType: "inspiration", title: "", body: "", imageCount: 1, reminderDueOn: null }), true);
  assert.equal(hasMeaningfulClientNoteContent({ noteType: "general", title: "", body: "", imageCount: 1, reminderDueOn: null }), false);
});

test("Reminder supports a date without requiring a time, title, or body", () => {
  assert.equal(hasMeaningfulClientNoteContent({ noteType: "reminder", title: "", body: "", imageCount: 0, reminderDueOn: "2026-09-10" }), true);
  assert.equal(hasMeaningfulClientNoteContent({ noteType: "reminder", title: "", body: "", imageCount: 0, reminderDueOn: null }), false);
});

test("completely empty notes are rejected by the editor rule", () => {
  for (const noteType of CLIENT_NOTE_TYPES) {
    assert.equal(hasMeaningfulClientNoteContent({ noteType, title: "  ", body: "\n", imageCount: 0, reminderDueOn: null }), false);
  }
});

test("the required schema relaxation preserves columns and a minimum-content guard", () => {
  assert.match(flexibleContentMigration, /drop constraint if exists artist_client_notes_body_nonempty_check/i);
  assert.match(flexibleContentMigration, /char_length\(title\) <= 120/i);
  assert.match(flexibleContentMigration, /artist_client_notes_minimum_content_check/i);
  assert.doesNotMatch(flexibleContentMigration, /drop column|alter column .* drop not null/i);
});

test("desktop picker escapes overflow and mobile uses a dedicated bottom sheet", () => {
  assert.match(notesPage, /relative z-40 mt-7 overflow-visible/);
  assert.match(notesPage, /top-full[\s\S]*w-\[320px\][\s\S]*sm:block/);
  assert.match(notesPage, /fixed inset-0 z-\[105\][\s\S]*sm:hidden/);
  assert.match(notesPage, /aria-expanded=\{typePickerOpen\}/);
});

test("Add inspiration receives the roomier action sizing", () => {
  assert.match(notesPage, /noteType === "inspiration" \? "min-h-11 gap-2\.5 px-6"/);
});

