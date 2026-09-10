import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyProfessionalClientControls,
  buildProfessionalClientSummaries,
  type ProfessionalClientRequest,
} from "../lib/professional-client-list.ts";

const now = new Date("2026-09-15T12:00:00.000Z");

function request(
  overrides: Partial<ProfessionalClientRequest> &
    Pick<ProfessionalClientRequest, "id" | "client_id">
): ProfessionalClientRequest {
  return {
    client_name: null,
    service_requested: null,
    preferred_date: null,
    preferred_time: null,
    proposed_date: null,
    proposed_time: null,
    scheduled_for: null,
    booking_status: "pending",
    completed_at: null,
    created_at: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

const summaries = buildProfessionalClientSummaries(
  [
    request({
      id: "a-1",
      client_id: "a",
      client_name: "Ava",
      service_requested: "Gel manicure",
      scheduled_for: "2026-09-08T15:00:00.000Z",
      booking_status: "completed",
      completed_at: "2026-09-08T17:00:00.000Z",
    }),
    request({
      id: "a-2",
      client_id: "a",
      client_name: "Ava",
      service_requested: "Nail art",
      scheduled_for: "2026-07-03T15:00:00.000Z",
      booking_status: "completed",
      completed_at: "2026-07-03T17:00:00.000Z",
    }),
    request({
      id: "a-3",
      client_id: "a",
      client_name: "Ava",
      service_requested: "Removal",
      scheduled_for: "2026-09-20T16:00:00.000Z",
      proposed_time: "11:00",
      booking_status: "booked",
    }),
    request({
      id: "b-1",
      client_id: "b",
      client_name: "Bella",
      service_requested: "Silk press",
      scheduled_for: "2026-01-10T14:00:00.000Z",
      booking_status: "completed",
      completed_at: "2026-01-10T16:00:00.000Z",
    }),
    request({
      id: "c-1",
      client_id: "c",
      client_name: "Cara",
      service_requested: "Consultation",
      proposed_date: "2026-09-22",
      proposed_time: "2:00 PM",
      booking_status: "booked",
    }),
    request({
      id: "d-1",
      client_id: "d",
      client_name: "Drew",
      service_requested: "Brow shaping",
      scheduled_for: "2026-08-01T14:00:00.000Z",
      booking_status: "completed",
      completed_at: "2026-08-01T15:00:00.000Z",
    }),
  ],
  [],
  [{ client_id: "d", archived_at: "2026-09-10T10:00:00.000Z" }],
  now
);

function names(
  sort: Parameters<typeof applyProfessionalClientControls>[1]["sort"],
  filter: Parameters<typeof applyProfessionalClientControls>[1]["filter"] = "all"
) {
  return applyProfessionalClientControls(summaries, {
    view: "active",
    searchQuery: "",
    filter,
    sort,
    now,
  }).map((client) => client.name);
}

test("all five client sorts use historical visit data and stable fallbacks", () => {
  assert.deepEqual(names("most-recent"), ["Ava", "Bella", "Cara"]);
  assert.deepEqual(names("oldest"), ["Bella", "Ava", "Cara"]);
  assert.deepEqual(names("name-asc"), ["Ava", "Bella", "Cara"]);
  assert.deepEqual(names("name-desc"), ["Cara", "Bella", "Ava"]);
  assert.deepEqual(names("most-visits"), ["Ava", "Bella", "Cara"]);
});

test("all appointment and historical visit filters derive from request history", () => {
  assert.deepEqual(names("name-asc", "all"), ["Ava", "Bella", "Cara"]);
  assert.deepEqual(names("name-asc", "upcoming"), ["Ava", "Cara"]);
  assert.deepEqual(names("name-asc", "no-upcoming"), ["Bella"]);
  assert.deepEqual(names("name-asc", "visited-month"), ["Ava"]);
  assert.deepEqual(names("name-asc", "visited-year"), ["Ava", "Bella"]);
});

test("search, archive view, filter, and sort compose without changing source data", () => {
  const sourceSnapshot = structuredClone(summaries);
  const active = applyProfessionalClientControls(summaries, {
    view: "active",
    searchQuery: "av",
    filter: "upcoming",
    sort: "most-visits",
    now,
  });
  const archived = applyProfessionalClientControls(summaries, {
    view: "archived",
    searchQuery: "dre",
    filter: "visited-year",
    sort: "oldest",
    now,
  });

  assert.deepEqual(active.map((client) => client.name), ["Ava"]);
  assert.deepEqual(archived.map((client) => client.name), ["Drew"]);
  assert.deepEqual(summaries, sourceSnapshot);
});

test("scheduled_for takes precedence over proposal and completion timestamps", () => {
  const ava = summaries.find((client) => client.clientId === "a");
  assert.equal(ava?.lastVisit, "2026-09-08T15:00:00.000Z");
  assert.equal(ava?.nextAppointment, "2026-09-20T16:00:00.000Z");
});

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260910140000_add_professional_client_archiving_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const baseClientCardMigration = readFileSync(
  new URL("../supabase/migrations/20260902_add_client_cards_v1.sql", import.meta.url),
  "utf8"
);

test("archive state remains on the forced-RLS professional Client Card", () => {
  assert.match(migration, /add column if not exists archived_at timestamptz/i);
  assert.match(baseClientCardMigration, /force row level security/i);
  assert.match(baseClientCardMigration, /auth\.uid\(\)\) = artist_id/i);
  assert.doesNotMatch(migration, /create\s+policy|disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(migration, /grant\s+.*\s+to\s+(anon|public)/i);
});

test("only a genuinely new request restores the exact archived relationship", () => {
  assert.match(
    migration,
    /create trigger restore_archived_client_card_on_new_request_trigger\s+after insert on public\.client_requests/i
  );
  assert.doesNotMatch(
    migration,
    /restore_archived_client_card_on_new_request_trigger\s+after[^;]*update/i
  );
  assert.match(migration, /set archived_at = null/i);
  assert.match(migration, /card\.artist_id = new\.artist_id/i);
  assert.match(migration, /card\.client_id = new\.client_id/i);
  assert.match(migration, /and card\.archived_at is not null/i);
  assert.doesNotMatch(migration, /set\s+(private_notes|preferences|tags|workspace_preferences)/i);
});

