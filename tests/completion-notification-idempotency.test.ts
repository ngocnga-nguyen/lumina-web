import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260929150000_guard_completion_notifications_v1.sql");

test("completion notification guard atomically scopes uniqueness to request and recipient", () => {
  assert.match(migration, /primary key \(request_id, user_id\)/);
  assert.match(migration, /new\.title is distinct from 'Appointment Completed'/);
  assert.match(migration, /values \(new\.request_id, new\.user_id\)\s+on conflict \(request_id, user_id\) do nothing/);
  assert.match(migration, /if not found then\s+return null/);
  assert.match(migration, /before insert on public\.notifications/);
  assert.doesNotMatch(migration, /create trigger[\s\S]*before update/i);
});

test("migration seeds existing event keys without deleting history or changing read/lifecycle state", () => {
  assert.match(migration, /lock table public\.notifications in share row exclusive mode/);
  assert.match(migration, /select distinct request_id, user_id\s+from public\.notifications/);
  assert.ok(migration.indexOf("lock table") < migration.indexOf("select distinct"));
  assert.ok(migration.indexOf("select distinct") < migration.indexOf("create trigger"));
  assert.doesNotMatch(migration, /\b(delete from|update|truncate|alter table) public\.(notifications|client_requests|reviews)\b/i);
  assert.doesNotMatch(migration, /\bis_read\b|create policy|record_booking_lite_artist_outcome|protect_request_completion/);
  assert.match(migration, /^begin;[\s\S]*commit;\s*$/);
});

test("idempotency ledger is private with a hardened trigger, not a new client read authority", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.appointment_completed_notification_keys from public, anon, authenticated/);
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /revoke all on function public\.guard_appointment_completed_notification_v1\(\) from public, anon, authenticated/);
  assert.doesNotMatch(migration, /\bgrant\b/i);
});

test("existing completion writers remain recipient-specific and are covered by the database guard", () => {
  const professional = read("app/dashboard/requests/page.tsx");
  const client = read("app/my-requests/page.tsx");
  assert.match(professional, /user_id: request\.client_id,[\s\S]*?"Appointment Completed"/);
  assert.match(client, /user_id: request\.artist_id,[\s\S]*?"Appointment Completed"/);
  assert.match(professional, /Your professional marked the service complete\. You can now share your experience\./);
  assert.match(client, /Both you and your client confirmed the service\. The appointment is complete\./);
});
