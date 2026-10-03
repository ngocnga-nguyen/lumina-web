/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic transpiled-module mocks intentionally model only the exercised runtime surface. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { createRefreshGeneration, mutateAndRefresh } from "../lib/authoritative-refresh.ts";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const nodeRequire = createRequire(import.meta.url);
function load(path: string, mocks: Record<string, unknown> = {}, browser?: unknown, doc?: unknown): any {
  const exports = {};
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", "window", "document", code)((id: string) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`, mocks, browser, doc);
    return nodeRequire(id);
  }, exports, browser, doc);
  return exports;
}
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
for (const operation of ["create", "edit", "complete", "reopen", "reschedule"]) {
  test(`an older fetch cannot overwrite ${operation}, including reads attempted during the write`, async () => {
    const gate = createRefreshGeneration();
    const old = deferred<string>();
    let state = "before";
    const oldTicket = gate.beginRead();
    const oldRead = old.promise.then((value) => { if (gate.isCurrent(oldTicket)) state = value; });
    const write = deferred<void>();
    const mutation = mutateAndRefresh(gate, () => write.promise, async () => {
      const ticket = gate.beginRead();
      if (gate.isCurrent(ticket)) state = operation;
    });
    assert.equal(gate.beginRead(), null);
    write.resolve(); await mutation;
    old.resolve("stale"); await oldRead;
    assert.equal(state, operation);
  });
}
test("overlapping mutations suppress reads until the last write settles", async () => {
  const gate = createRefreshGeneration();
  const a = gate.beginMutation(), b = gate.beginMutation();
  a(); a(); assert.equal(gate.beginRead(), null);
  b(); assert.equal(gate.isCurrent(gate.beginRead()), true);
  const ticket = gate.beginRead(); gate.invalidate(); assert.equal(gate.isCurrent(ticket), false);
});
test("Notes wires every mutation into the same generation and has one reconnect data subscription", () => {
  const page = source("app/dashboard/clients/[clientId]/notes/page.tsx");
  assert.equal((page.match(/return mutateAndRefresh\(refreshGenerationRef.current/g) || []).length, 4);
  assert.equal((page.match(/\.channel\(/g) || []).length, 1);
  assert.match(page, /status === "SUBSCRIBED"/);
  assert.match(page, /generation\.isCurrent\(attempt\)/);
  assert.match(page, /addEventListener\("focus", refresh\)/);
  assert.match(page, /addEventListener\("visibilitychange", refresh\)/);
});

test("Today shared hook reloads the actual database state after completion conflict without a second subscription", async () => {
  const states: any[] = [], effects: Array<() => (() => void)> = [];
  let notes = [{ id: "reminder", client_card_id: "card" }];
  let reloads = 0, subscriptions = 0, removed = 0;
  let reconnect: (status: string) => void = () => {};
  const react = {
    useState(initial: any) { const i = states.push(initial) - 1; return [initial, (next: any) => { states[i] = typeof next === "function" ? next(states[i]) : next; }]; },
    useRef: (current: unknown) => ({ current }), useCallback: (cb: unknown) => cb,
    useEffect: (effect: any) => effects.push(effect),
  };
  const channel = { on: () => channel, subscribe: (cb: typeof reconnect) => { subscriptions++; reconnect = cb; } };
  const hook = load("lib/use-professional-tasks.ts", {
    react,
    "@/lib/supabase": { supabase: {
      from(table: string) {
        const query: any = { select: () => query, eq: () => query, is: () => query, order: () => query,
          range: async () => { if (table === "artist_client_notes") reloads++; return { data: table === "artist_client_notes" ? [...notes] : [], error: null }; } };
        return query;
      }, channel: () => channel, removeChannel: () => { removed++; },
    } },
    "@/lib/client-identity-query": { loadRelatedClientIdentities: () => { throw new Error("No linked identities in this fixture"); } },
    "@/lib/realtime-channel": { createRealtimeChannelTopic: (name: string) => name },
  }, { setInterval: () => 1, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
  { visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {} });
  const feed = hook.useProfessionalTasks("owner");
  const cleanup = effects.map((effect) => effect());
  await new Promise((done) => setImmediate(done));
  assert.equal(states[0].snapshot.reminders.length, 1);
  notes = []; // A concurrent session completed the reminder.
  await assert.rejects(feed.mutate(async () => { throw new Error("conflict"); }), /conflict/);
  assert.equal(states[0].snapshot.reminders.length, 0);
  assert.equal(reloads, 2); assert.equal(subscriptions, 1);
  reconnect("SUBSCRIBED"); await new Promise((done) => setImmediate(done));
  assert.equal(reloads, 3);
  cleanup.forEach((close) => close()); assert.equal(removed, 1);
});

test("Today completion component uses the shared mutation boundary on zero-row conflict", async () => {
  let completion: Promise<unknown> | undefined;
  let refreshed = 0;
  const gate = createRefreshGeneration();
  const chain: any = { update: () => chain, eq: () => chain, is: () => chain, select: async () => ({ data: [], error: null }) };
  const component = load("components/ProfessionalToday.tsx", {
    react: { useState: (initial: any) => [typeof initial === "function" ? initial() : initial, () => {}], useEffect: () => {} },
    "@/components/ProfessionalTodayView": { default: () => null },
    "@/lib/supabase": { supabase: { from: () => chain } },
    "@/lib/use-professional-tasks": { useProfessionalTasks: () => ({ snapshot: { reminders: [], appointments: [] }, error: null, refresh: async () => {},
      mutate: (write: () => Promise<void>) => completion = mutateAndRefresh(gate, write, async () => { refreshed++; }),
    }) },
  });
  const root = component.default({ artistId: "owner" });
  const view = root.props.children.props.children[0];
  view.props.onComplete({ id: "note", updated_at: "old" });
  await assert.rejects(completion!, /changed or could not be completed/);
  assert.equal(refreshed, 1);
});

test("Today renders existing lifecycle labels using a controlled clock", () => {
  const view = load("components/ProfessionalTodayView.tsx");
  const now = new Date("2026-10-02T17:00:00Z");
  const base = { client_name: "Client", service_requested: "Service", status: "accepted", client_status: "confirmed", booking_status: "booked", scheduled_for: "2026-10-02T10:00:00Z" };
  const html = renderToStaticMarkup(createElement(view.default, { snapshot: { reminders: [], appointments: [
    { ...base, id: "old" },
    { ...base, id: "new", completion_protocol_version: 3, appointment_confirmed_at: "2026-10-01T00:00:00Z", expected_end_at: "2026-10-02T11:00:00Z" },
    { ...base, id: "future", scheduled_for: "2026-10-02T22:00:00Z" },
  ] }, now, timeZone: "UTC", busy: null, error: null, onComplete: () => {} }));
  assert.match(html, /Awaiting confirmation/); assert.match(html, /Review ready/); assert.match(html, /Scheduled/);
  assert.doesNotMatch(html, / · Confirmed/);
});

test("feature-disabled professional notifications retain event metadata and exact or explicit fallback routing", async () => {
  const queried: string[] = [], filters: unknown[] = [];
  let note: unknown = { id: "note", client_card_id: "manual-card" };
  const hook = load("lib/use-professional-notifications.ts", {
    react: { useState: (initial: unknown) => [initial, () => {}], useRef: (current: unknown) => ({ current }), useEffect: () => {}, useCallback: (cb: unknown) => cb },
    "@/lib/professional-reminders-config": { PROFESSIONAL_REMINDERS_ENABLED: false },
    "@/lib/client-notifications": {}, "@/lib/client-identity-query": {}, "@/lib/client-identity": {},
    "@/lib/supabase": { supabase: { from(table: string) { queried.push(table); const q: any = { select: () => q, eq: (key: string, value: unknown) => { filters.push([key, value]); return q; }, maybeSingle: async () => ({ data: note, error: null }) }; return q; } } },
  });
  const feed = hook.useProfessionalNotifications("owner");
  const notification = { id: "event", request_id: null, title: "Text may change", reminder_id: "note", event_type: "professional_reminder_due" };
  assert.equal(await feed.resolveDestination(notification), "/dashboard/clients/manual-card/notes?edit=note");
  assert.ok(filters.some((item) => JSON.stringify(item) === '["artist_id","owner"]'));
  note = null;
  assert.equal(await feed.resolveDestination(notification), "/dashboard?reminder=unavailable");
  assert.equal(await feed.resolveDestination({ ...notification, reminder_id: null }), "/dashboard?reminder=unavailable");
  assert.equal(await feed.resolveDestination({ id: "legacy", request_id: null, title: "Reminder due" }), "/dashboard/requests");
  assert.deepEqual(queried, ["artist_client_notes", "artist_client_notes"]);
  assert.match(source("lib/use-professional-notifications.ts"), /\.select\("\*"\)/);
  assert.doesNotMatch(source("lib/use-professional-notifications.ts"), /PROFESSIONAL_REMINDERS_ENABLED/);
  assert.match(source("app/dashboard/page.tsx"), /<ReminderNotificationNotice \/>/);
  assert.doesNotMatch(source("components/ReminderNotificationNotice.tsx"), /PROFESSIONAL_REMINDERS_ENABLED/);
});

test("unapplied SQL draft declares the reviewed security and index contracts", () => {
  const sql = source("supabase/migrations/20261002190000_professional_reminders_v1.sql");
  assert.match(sql, /prepare_professional_reminder_v1\(\)\s*returns trigger language plpgsql security invoker/);
  assert.match(sql, /new\.id is distinct from old\.id/);
  assert.match(sql, /add column event_type text/);
  assert.doesNotMatch(sql, /new\.title = 'Reminder due'/);
  assert.match(sql, /inserted_id public\.notifications\.id%TYPE/);
  assert.match(sql, /where note_type = 'reminder' and reminder_alert_armed\s*and reminder_completed_at is null and reminder_due_at is not null/);
  assert.doesNotMatch(sql, /create policy|cron\.schedule|update public\.artist_client_notes/i);
  assert.match(sql, /reminder_schedule_version bigint not null default 0/);
  assert.match(sql, /reminder_alert_armed boolean not null default false/);
});

test("reminder feature flag defaults off and accepts only the explicit true value", () => {
  const code = ts.transpileModule(source("lib/professional-reminders-config.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const value of [undefined, "false", "TRUE", "1", "true"]) {
    const exports: Record<string, unknown> = {};
    new Function("process", "exports", code)({ env: { NEXT_PUBLIC_PROFESSIONAL_REMINDERS_ENABLED: value } }, exports);
    assert.equal(exports.PROFESSIONAL_REMINDERS_ENABLED, value === "true");
  }
});

test("flag-off Notes query excludes unapplied schema columns", () => {
  const declaration = source("app/dashboard/clients/[clientId]/notes/page.tsx").match(/^const NOTE_SELECT = (.+);$/m);
  assert.ok(declaration);
  const select = new Function("PROFESSIONAL_REMINDERS_ENABLED", `return ${declaration[1]}`);
  assert.doesNotMatch(select(false), /reminder_timezone|reminder_due_at|reminder_schedule_version|reminder_alert_armed/);
  assert.match(select(false), /reminder_due_on, reminder_due_time, reminder_completed_at/);
  assert.match(select(true), /reminder_timezone, reminder_due_at, reminder_schedule_version, reminder_alert_armed/);
});

test("flag-off Reminder editor keeps legacy date/time controls without alert promises", () => {
  const editor = load("components/ClientNoteEditor.tsx", { "@/lib/professional-reminders-config": { PROFESSIONAL_REMINDERS_ENABLED: false } });
  const html = renderToStaticMarkup(createElement(editor.default, {
    note: null, initialType: "reminder", attachments: [], requests: [], saving: false,
    errorMessage: "", onSave: () => {}, onClose: () => {},
  }));
  assert.match(html, /type="date"/); assert.match(html, /type="time"/);
  assert.match(html, /reminder-timing-label/); assert.match(html, /Date-only reminders/);
  assert.doesNotMatch(html, /Timezone|one in-app alert|schedule one/);
});
