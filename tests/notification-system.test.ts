import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { confirmNotificationRead, preserveNotificationSnapshot, registerViewedClientConversation, shouldAcknowledgeViewedMessage } from "../lib/notification-reconciliation.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function moduleWithMocks(path: string, dependencies: Record<string, unknown> = {}, browser?: unknown) {
  const exports: Record<string, (...args: unknown[]) => { error: { message: string } | null } & Record<string, unknown>> = {};
  const compiled = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  new Function("require", "exports", "window", compiled.outputText)((id: string) => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`);
    return dependencies[id];
  }, exports, browser);
  return exports;
}

function notificationStore() {
  const rows = [
    { id: "one", user_id: "client", request_id: "request", title: "New Message", is_read: false },
    { id: "two", user_id: "client", request_id: "request", title: "Appointment Completed", is_read: false },
    { id: "other", user_id: "artist", request_id: "request", title: "New Message", is_read: false },
  ];
  let fail = false;
  let updates = 0;
  const events: unknown[] = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: "client" } }, error: null }) },
    from(table: string) {
      assert.equal(table, "notifications");
      const filters: Array<(row: typeof rows[number]) => boolean> = [];
      const query = {
        update(values: unknown) { assert.deepEqual(values, { is_read: true }); updates++; return query; },
        eq(key: keyof typeof rows[number], value: unknown) { filters.push((row) => row[key] === value); return query; },
        in(key: keyof typeof rows[number], values: unknown[]) { filters.push((row) => values.includes(row[key])); return query; },
        or(value: string) { assert.equal(value, "is_read.eq.false,is_read.is.null"); filters.push((row) => !row.is_read); return query; },
        async select(fields: string) {
          assert.equal(fields, "id");
          if (fail) return { data: null, error: { message: "Database denied update" } };
          const selected = rows.filter((row) => filters.every((filter) => filter(row)));
          selected.forEach((row) => { row.is_read = true; });
          return { data: selected.map(({ id }) => ({ id })), error: null };
        },
      };
      return query;
    },
  };
  const helper = moduleWithMocks("lib/client-notifications.ts", { "@/lib/supabase": { supabase } }, {
    dispatchEvent: (event: unknown) => events.push(event),
  });
  return { rows, events, helper, fail: () => { fail = true; }, updates: () => updates };
}

test("Mark all as read persists only selected current-user unread rows, retaining history", async () => {
  const store = notificationStore();
  const result = await store.helper.markNotificationsRead({ notificationIds: ["one", "two", "other"] });
  assert.equal(result.error, null);
  assert.deepEqual(store.rows.map((row) => row.is_read), [true, true, false]);
  assert.equal(store.rows.length, 3);
  assert.equal(store.events.length, 1);
  // A fresh read sees the same persisted state, not a local cleared array.
  assert.equal(store.rows.filter((row) => row.user_id === "client" && !row.is_read).length, 0);
  assert.deepEqual(await store.helper.markNotificationsRead({ notificationIds: [] }), { data: [], error: null });
  assert.equal(store.updates(), 1);
});

test("failed or thrown read writes reload authority and never broadcast a successful acknowledgement", async () => {
  const store = notificationStore(); store.fail();
  let reloads = 0;
  const result = await confirmNotificationRead(async () => store.helper.markNotificationsRead({ notificationId: "one" }), async () => { reloads++; });
  assert.equal(result.error?.message, "Database denied update");
  assert.equal(reloads, 1);
  assert.equal(store.rows[0].is_read, false);
  assert.equal(store.events.length, 0);
  const thrown = await confirmNotificationRead(async () => { throw new Error("Offline"); }, async () => { reloads++; });
  assert.equal(thrown.error?.message, "Offline"); assert.equal(reloads, 2);
});

test("late notifications acknowledge only a visible current-user New Message conversation", async () => {
  const store = notificationStore();
  const close = registerViewedClientConversation("client", "request");
  try {
    // Message read completes first; its separate notification then arrives.
    assert.equal(shouldAcknowledgeViewedMessage(store.rows[0], "client", true), true);
    assert.equal(shouldAcknowledgeViewedMessage(store.rows[1], "client", true), false);
    assert.equal(shouldAcknowledgeViewedMessage(store.rows[2], "client", true), false);
    assert.equal(shouldAcknowledgeViewedMessage(store.rows[0], "client", false), false);
    assert.equal(shouldAcknowledgeViewedMessage({ ...store.rows[0], request_id: "elsewhere" }, "client", true), false);
    await store.helper.markNotificationsRead({ notificationIds: ["one"], kind: "message" });
    assert.deepEqual(store.rows.map((row) => row.is_read), [true, false, false]);
  } finally { close(); }
  assert.equal(shouldAcknowledgeViewedMessage({ ...store.rows[0], is_read: false }, "client", true), false);
});

test("professional notification destinations use the authoritative lifecycle and participant archive view", () => {
  const completion = moduleWithMocks("lib/request-completion.ts");
  const helpers = moduleWithMocks("lib/professional-notifications.ts", { "@/lib/request-completion": completion });
  const notification = { id: "event", request_id: "request", title: "Appointment Confirmed" };
  for (const [state, view] of [
    [{ booking_status: "booked" }, "active"],
    [{ booking_status: "completed" }, "history"],
    [{ status: "declined" }, "history"],
    [{ booking_status: "booked", artist_hidden: true }, "archived"],
    [{ booking_status: "completed", artist_hidden: true }, "archived"],
  ] as const) {
    const path = helpers.getProfessionalNotificationDestination(notification, state) as unknown as string;
    assert.equal(new URL(path, "https://local.test").searchParams.get("view"), view);
  }
  assert.equal(helpers.getProfessionalNotificationDestination(notification), null);
  assert.match(helpers.getProfessionalNotificationDestination({ ...notification, title: "New Message" }, {}) as unknown as string, /chat=1/);
});

test("both bells preserve counts and one professional notification subscription owns all pages", () => {
  const shell = source("components/ProfessionalDashboardShell.tsx");
  const hook = source("lib/use-professional-notifications.ts");
  const client = source("lib/use-client-notifications.ts");
  const requests = source("app/dashboard/requests/page.tsx");
  assert.match(shell, /useProfessionalNotifications\(professional\?\.id\)/);
  assert.match(shell, /<WorkspaceNotificationCenter/);
  assert.match(shell, /count: actionCounts\.requests/);
  assert.match(shell, /count: messageUnreadCount/);
  assert.doesNotMatch(requests, /table: "notifications"|setNotifications|showNotifications/);
  assert.match(hook, /event: "\*"[\s\S]*table: "notifications"/);
  for (const content of [client, hook]) {
    assert.match(content, /status === "SUBSCRIBED"/);
    assert.doesNotMatch(content, /from\("notifications"\)[^;]*\.delete\(/);
    assert.match(content, /confirmNotificationRead/);
  }
  assert.match(client, /shouldAcknowledgeViewedMessage/);
  assert.match(client, /CLIENT_CONVERSATION_VIEW_EVENT/);
  assert.match(source("lib/use-request-inbox.ts"), /useViewedClientConversation/);
  assert.match(source("app/my-requests/page.tsx"), /acknowledgeNotificationsRef\.current\(\{ requestId: update\.request_id, kind: "message" \}\)/);
  assert.match(requests, /setActiveFilter\("all"\)/);
  assert.match(requests, /setHistoryFilter\("all"\)/);
  assert.match(requests, /setSearchQuery\(""\)/);
});

test("dropdown keeps failures visible and does not navigate before confirmation", () => {
  const center = source("components/ClientNotificationCenter.tsx");
  assert.match(center, /Mark all as read/);
  assert.doesNotMatch(center, /Clear all/);
  assert.match(center, /if \(result\.error\) throw new Error/);
  assert.ok(center.indexOf("await onAcknowledge") < center.indexOf("router.push(destination)"));
  assert.match(center, /notification\.is_read[\s\S]*text-lumina-text-muted/);
});

test("professional listener reloads INSERT, UPDATE, DELETE and reconnect from persisted rows", async () => {
  const states: unknown[] = [];
  const effects: Array<() => void | (() => void)> = [];
  const timers: Array<() => void> = [];
  let onChange = () => {};
  let onStatus: (status: string) => void = () => {};
  let subscriptions = 0;
  let removed = 0;
  let rows = [{ id: "one", request_id: null, user_id: "artist", is_read: false }];
  const listeners = new Map<string, () => void>();
  const channel = {
    on(_event: string, spec: { event: string; table: string; filter: string }, callback: () => void) {
      assert.equal(spec.event, "*"); assert.equal(spec.table, "notifications");
      assert.equal(spec.filter, "user_id=eq.artist"); onChange = callback; return channel;
    },
    subscribe(callback: (status: string) => void) { subscriptions++; onStatus = callback; },
  };
  const fakeReact = {
    useState(initial: unknown) {
      const index = states.push(initial) - 1;
      return [initial, (next: unknown) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      }];
    },
    useRef: (current: unknown) => ({ current }),
    useCallback: (callback: unknown) => callback,
    useEffect: (effect: () => void | (() => void)) => effects.push(effect),
  };
  const query = {
    select: () => query, eq: () => query,
    order: async () => ({ data: rows.map((row) => ({ ...row })), error: null }),
  };
  const hook = moduleWithMocks("lib/use-professional-notifications.ts", {
    react: fakeReact,
    "@/lib/supabase": { supabase: { from: () => query, channel: () => channel, removeChannel: () => { removed++; } } },
    "@/lib/client-notifications": { CLIENT_NOTIFICATION_READ_STATE_EVENT: "read", markNotificationsRead: () => {} },
    "@/lib/notification-reconciliation": { confirmNotificationRead, preserveNotificationSnapshot },
    "@/lib/realtime-channel": { createRealtimeChannelTopic: (name: string) => name },
    "@/lib/client-identity-query": {}, "@/lib/client-identity": {}, "@/lib/professional-notifications": {},
  }, {
    setTimeout: (callback: () => void) => { timers.push(callback); return 1; }, clearTimeout: () => {},
    addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: () => {},
  });
  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {},
  } });
  try {
    hook.useProfessionalNotifications("artist");
    const cleanup = effects.map((effect) => effect());
    const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
    const count = () => (states[0] as Array<{ is_read: boolean }>).filter((row) => !row.is_read).length;
    timers.forEach((callback) => callback()); await flush(); assert.equal(count(), 1);
    rows.push({ id: "two", request_id: null, user_id: "artist", is_read: false });
    onChange(); await flush(); assert.equal(count(), 2);
    rows[0].is_read = true; onChange(); await flush(); assert.equal(count(), 1);
    rows = rows.filter((row) => row.id !== "two"); onChange(); await flush(); assert.equal(count(), 0);
    rows[0].is_read = false; onStatus("SUBSCRIBED"); await flush(); assert.equal(count(), 1);
    assert.equal(subscriptions, 1);
    cleanup.forEach((close) => close?.()); assert.equal(removed, 1);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("unchanged authoritative reloads do not repeatedly retrigger Reviews acknowledgement after a failure", () => {
  const current = [{ id: "review-ready", is_read: false }];
  assert.equal(preserveNotificationSnapshot(current, [{ ...current[0] }]), current);
  assert.notEqual(preserveNotificationSnapshot(current, [{ ...current[0], is_read: true }]), current);
  assert.notEqual(preserveNotificationSnapshot(current, []), current);
});

for (const viewport of [375, 390, 430]) {
  test(`notification popup containment contract at ${viewport}px`, () => {
    const center = source("components/ClientNotificationCenter.tsx");
    assert.match(center, /fixed right-3 top-16/);
    assert.match(center, /w-\[min\(320px,calc\(100vw-24px\)\)\]/);
    assert.match(center, /sm:absolute sm:right-0 sm:top-12/);
    const width = Math.min(320, viewport - 24);
    const right = viewport - 12;
    assert.ok(right - width >= 12);
    assert.ok(right <= viewport - 12);
  });
}
