import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260909140000_add_client_notes_workspace_v1.sql", import.meta.url),
  "utf8"
);

test("Client Notes uses forced RLS and grants no anonymous access", () => {
  assert.match(migration, /alter table public\.artist_client_notes force row level security/i);
  assert.match(migration, /revoke all on table public\.artist_client_notes from anon/i);
  assert.doesNotMatch(migration, /grant\s+.*artist_client_notes.*\s+to\s+(anon|public)/i);
});

test("every Client Notes policy is scoped to the owning professional", () => {
  assert.match(migration, /Professionals can read their own Client Notes[\s\S]*auth\.uid\(\)\) = artist_id/i);
  assert.match(migration, /Professionals can create their own Client Notes[\s\S]*auth\.uid\(\)\) = artist_id/i);
  assert.match(migration, /Professionals can update their own Client Notes[\s\S]*auth\.uid\(\)\) = artist_id/i);
  assert.match(migration, /Professionals can delete their own Client Notes[\s\S]*auth\.uid\(\)\) = artist_id/i);
  assert.match(migration, /request\.artist_id = artist_client_notes\.artist_id/i);
  assert.match(migration, /request\.client_id = artist_client_notes\.client_id/i);
});

test("ownership is immutable and request links must match the same relationship", () => {
  assert.match(migration, /Client Note ownership cannot be changed/i);
  assert.match(migration, /request\.id = new\.request_id/i);
  assert.match(migration, /request\.artist_id = new\.artist_id/i);
  assert.match(migration, /request\.client_id = new\.client_id/i);
});

test("legacy private notes are copied exactly and idempotently", () => {
  assert.match(migration, /md5\(card\.artist_id::text.*legacy-private-notes.*\)::uuid/is);
  assert.match(migration, /card\.private_notes,/i);
  assert.match(migration, /where btrim\(card\.private_notes\) <> ''/i);
  assert.match(migration, /on conflict \(id\) do nothing/i);
  assert.doesNotMatch(migration, /set\s+private_notes\s*=/i);
});
