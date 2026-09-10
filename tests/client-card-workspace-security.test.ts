import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const baseMigration = readFileSync(
  new URL("../supabase/migrations/20260902_add_client_cards_v1.sql", import.meta.url),
  "utf8"
);
const workspaceMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260909120000_add_client_card_workspace_v2.sql",
    import.meta.url
  ),
  "utf8"
);
const identityFixMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260909130000_fix_client_card_client_identity_fk.sql",
    import.meta.url
  ),
  "utf8"
);

test("Client Card RLS remains forced and scoped to the owning professional", () => {
  assert.match(baseMigration, /force row level security/i);
  assert.match(baseMigration, /(?:select\s+)?auth\.uid\(\)\) = artist_id/i);
  assert.match(baseMigration, /request\.artist_id = artist_client_cards\.artist_id/i);
  assert.match(baseMigration, /request\.client_id = artist_client_cards\.client_id/i);
  assert.match(baseMigration, /revoke all on table public\.artist_client_cards from anon/i);
});

test("V2 does not add a public policy or broaden grants", () => {
  assert.doesNotMatch(workspaceMigration, /create\s+policy/i);
  assert.doesNotMatch(workspaceMigration, /grant\s+.*\s+to\s+(anon|public)/i);
  assert.match(workspaceMigration, /Client Card ownership cannot be changed/i);
});

test("database validation enforces tag and workspace bounds", () => {
  assert.match(workspaceMigration, /at most 20 tags/i);
  assert.match(workspaceMigration, /48 characters or fewer/i);
  assert.match(workspaceMigration, /unique, ignoring case/i);
  assert.match(workspaceMigration, /Only optional Client Card sections may be hidden/i);
  assert.match(workspaceMigration, /workspace preference version/i);
});

test("Client Card identity references auth users without weakening relationship security", () => {
  assert.match(identityFixMigration, /references auth\.users\(id\)/i);
  assert.match(identityFixMigration, /on delete cascade/i);
  assert.doesNotMatch(identityFixMigration, /create\s+policy|drop\s+policy/i);
  assert.doesNotMatch(identityFixMigration, /delete\s+from\s+public\.artist_client_cards/i);
  assert.doesNotMatch(identityFixMigration, /disable\s+row\s+level\s+security/i);
});
