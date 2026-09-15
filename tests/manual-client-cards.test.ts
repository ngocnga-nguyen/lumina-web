import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  findPossibleManualClientMatches,
  normalizeManualClientEmail,
  normalizeManualClientPhone,
  validateManualClientDraft,
} from "../lib/artist-client-records.ts";
const migration = readFileSync(
  new URL("../supabase/migrations/20260915130000_add_manual_client_cards_v1.sql", import.meta.url),
  "utf8"
);
const clientCardPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/page.tsx", import.meta.url),
  "utf8"
);
const notesPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/notes/page.tsx", import.meta.url),
  "utf8"
);
const clientListModule = readFileSync(
  new URL("../lib/professional-client-list.ts", import.meta.url),
  "utf8"
);

type MatchClient = Parameters<typeof findPossibleManualClientMatches>[0][number];

function summary(overrides: Partial<MatchClient> = {}): MatchClient {
  return {
    clientId: "card-1",
    linkedClientId: null,
    source: "manual",
    manualPhone: "+1 (918) 555-0100",
    manualEmail: "client@example.com",
    name: "Alex Client",
    profileImageUrl: null,
    lastService: null,
    lastVisit: null,
    lastVisitTimestamp: null,
    completedVisitTimestamps: [],
    nextAppointment: null,
    nextAppointmentTime: null,
    nextAppointmentTimestamp: null,
    nextAppointmentService: null,
    newestRequestTimestamp: 1,
    newestRequestService: null,
    serviceNames: [],
    totalCompletedVisits: 0,
    archivedAt: null,
    ...overrides,
  };
}

test("manual client validation and duplicate signals are normalized without merging", () => {
  assert.equal(normalizeManualClientPhone("+1 (918) 555-0100"), "19185550100");
  assert.equal(normalizeManualClientEmail(" Client@Example.COM "), "client@example.com");
  assert.match(validateManualClientDraft({ name: "", phone: "", email: "" }) || "", /name/i);

  const matches = findPossibleManualClientMatches(
    [summary(), summary({ clientId: "card-2", name: "Different", manualEmail: null, manualPhone: null })],
    { name: "alex client", phone: "918-555-0100", email: "CLIENT@example.com" }
  );
  assert.deepEqual(matches.map((client) => client.clientId), ["card-1"]);
});

test("manual cards and service entries join the existing Clients summary model", () => {
  assert.match(clientListModule, /clientId: card\.id/);
  assert.match(clientListModule, /linkedClientId/);
  assert.match(clientListModule, /manualServicesByCard/);
  assert.match(clientListModule, /totalCompletedVisits: completedRequests\.length \+ manualServices\.length/);
  assert.match(clientListModule, /name: card\.manual_name/);
});

test("migration preserves existing card data while introducing a stable relationship id", () => {
  assert.match(migration, /add column if not exists id uuid/i);
  assert.match(migration, /update public\.artist_client_cards set id = gen_random_uuid\(\) where id is null/i);
  assert.match(migration, /insert into public\.artist_client_cards \(artist_id, client_id, source\)[\s\S]*select distinct request\.artist_id, request\.client_id/i);
  assert.match(migration, /add constraint artist_client_cards_pkey primary key \(id\)/i);
  assert.match(migration, /create unique index if not exists artist_client_cards_linked_client_key[\s\S]*where client_id is not null/i);
  assert.match(migration, /insert into public\.artist_client_cards \(artist_id, client_id, source\)/i);
  assert.doesNotMatch(migration, /update public\.artist_client_cards set (?:tags|preferences|workspace_preferences)/i);
});

test("manual provenance and contact identity cannot be silently linked or rewritten", () => {
  assert.match(migration, /new\.source is distinct from old\.source/i);
  assert.match(migration, /new\.client_id is distinct from old\.client_id/i);
  assert.match(migration, /Manual clients cannot be linked automatically/i);
  assert.doesNotMatch(migration, /update\s+public\.profiles/i);
  assert.doesNotMatch(migration, /auth\.users/i);
});

test("manual Client Cards, service history, result links, and notes stay owner scoped", () => {
  assert.match(migration, /force row level security[\s\S]*artist_client_service_entries/i);
  assert.match(migration, /force row level security[\s\S]*artist_client_result_links/i);
  assert.match(migration, /card\.artist_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /can_manage_artist_client_card\(client_card_id\)/i);
  assert.match(migration, /image\.artist_id = card\.artist_id/i);
  assert.match(migration, /card\.source = 'manual'/i);
  assert.match(migration, /revoke all on table public\.artist_client_service_entries from anon/i);
  assert.match(migration, /revoke all on table public\.artist_client_result_links from anon/i);
  assert.doesNotMatch(migration, /grant\s+.*(?:artist_client_service_entries|artist_client_result_links).*\s+to\s+(?:anon|public)/i);
});

test("notes use the stable card id while legacy routes and attachment paths remain compatible", () => {
  assert.match(migration, /add column if not exists client_card_id uuid/i);
  assert.match(migration, /set client_card_id = card\.id/i);
  assert.match(migration, /legacy_prefix/i);
  assert.match(clientCardPage, /\.or\(`id\.eq\.\$\{clientId\},client_id\.eq\.\$\{clientId\}`\)/);
  assert.match(notesPage, /\.or\(`id\.eq\.\$\{clientId\},client_id\.eq\.\$\{clientId\}`\)/);
  assert.match(notesPage, /client_card_id: clientCardId/);
  assert.match(notesPage, /\$\{artistId\}\/\$\{clientCardId\}\/\$\{noteId\}/);
});

test("manual service history cannot create request or verified-review state", () => {
  const serviceTableBlock = migration.match(/create table public\.artist_client_service_entries[\s\S]*?comment on table public\.artist_client_service_entries/)?.[0] || "";
  assert.doesNotMatch(serviceTableBlock, /request_id|review/i);
  assert.doesNotMatch(migration, /insert into public\.(client_requests|reviews)/i);
});
