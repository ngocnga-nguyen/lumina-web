/* eslint-disable @typescript-eslint/no-explicit-any -- Execute the actual route with controlled asynchronous reads and React lifecycle. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { AuthSessionMissingError, NavigatorLockAcquireTimeoutError, type User } from "@supabase/supabase-js";
import { createInFlightRead, createSessionReadInvalidator, withReadDeadline } from "../lib/in-flight-load.ts";
import { loadWorkspaceUser } from "../lib/workspace-load-recovery.ts";

const require = createRequire(import.meta.url);
const source = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const signedIn = () => ({ data: { user: { id: "existing-client" } as User }, error: null });

function fixture() {
  const slots: any[] = [], effects = new Map<number, { deps?: any[]; cleanup?: () => void }>();
  const scheduled: Array<() => void> = [], events = new Map<string, Set<() => void>>();
  const redirects: string[] = [], handlers: Array<{ filter: any; fn: any }> = [];
  let cursor = 0, root: any, mounted = true, staleWrites = 0, authCalls = 0, subscriptions = 0, removals = 0;
  let getUser: () => Promise<any> = async () => { await new Promise(done => setTimeout(done, 4)); return signedIn(); };
  let query: () => Promise<any> = async () => ({ data: [], error: null });
  const router = { replace: (url: string) => redirects.push(url), push: () => {} };
  const params = new URLSearchParams();
  const react = {
    ...require("react"),
    useState(initial: any) {
      const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (next: any) => { if (!mounted) { staleWrites++; return; } slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
    },
    useRef(initial: any) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useMemo(fn: any) { cursor++; return fn(); },
    useCallback(fn: any, deps: any[]) {
      const i = cursor++, old = slots[i];
      if (old && deps.every((x, j) => Object.is(x, old.deps[j]))) return old.fn;
      slots[i] = { fn, deps }; return fn;
    },
    useEffect(fn: any, deps?: any[]) {
      const i = cursor++, old = effects.get(i);
      if (old && deps && old.deps?.length === deps.length && deps.every((x, j) => Object.is(x, old.deps![j]))) return;
      scheduled.push(() => { old?.cleanup?.(); effects.set(i, { deps, cleanup: fn() }); });
    },
  };
  const eventTarget = {
    addEventListener(name: string, fn: () => void) { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(fn); },
    removeEventListener(name: string, fn: () => void) { events.get(name)?.delete(fn); },
  };
  const win = { ...eventTarget, location: { search: "" }, setTimeout, clearTimeout,
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {} };
  const doc = { ...eventTarget, visibilityState: "visible" };
  const sharedUser = createInFlightRead(() => loadWorkspaceUser(() => { authCalls++; return getUser(); }));
  const supabase = {
    auth: { getUser: () => { authCalls++; return getUser(); } },
    from() {
      const q: any = { select: () => q, eq: () => q, not: () => q, order: () => q, in: () => q, abortSignal: () => q,
        then: (yes: any, no: any) => Promise.resolve().then(query).then(yes, no) };
      return q;
    },
    channel: () => { const c: any = { on: (_: string, filter: any, fn: any) => { handlers.push({ filter, fn }); return c; }, subscribe: () => { subscriptions++; return c; } }; return c; },
    removeChannel: () => { removals++; },
  };
  const cache = new Map<string, any>();
  function load(file: string): any {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const text = source(file) + (file === "app/my-requests/page.tsx" ? "\nexport { MyRequestsContent };" : "");
    const compiled = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function("require", "exports", "window", "document", compiled)((id: string) => {
      if (id === "react") return react;
      if (id === "next/navigation") return { useRouter: () => router, useSearchParams: () => params };
      if (id === "next/link") return { default: ({ children, ...props }: any) => createElement("a", props, children) };
      if (id === "@/lib/supabase") return { supabase };
      if (id === "@/lib/client-workspace-user") return { loadClientWorkspaceUser: sharedUser };
      if (id === "@/lib/in-flight-load") return { withReadDeadline: (fn: any, controller: AbortController) => withReadDeadline(fn, controller, 30) };
      if (id === "@/lib/use-client-onboarding") return { useClientOnboarding: () => ({ ready: false, isClient: false }) };
      if (id === "@/lib/use-viewed-client-conversation") return { useViewedClientConversation: () => {} };
      if (id === "@/lib/consultation-snapshot") return { createConsultationSignedUrls: async () => [] };
      if (id === "@/components/ClientWorkspaceContext") return { useClientWorkspace: () => ({ notifications: [], acknowledgeNotifications: () => {} }), hasUnreadClientActionNotification: () => false };
      if (id.startsWith("@/components/") && id !== "@/components/WorkspaceLoadError") return { default: () => null };
      if (id.startsWith("@/")) {
        const stem = id.slice(2), path = [stem+".ts", stem+".tsx"].find(p => existsSync(new URL(`../${p}`, import.meta.url)));
        if (path) return load(path);
      }
      return require(id);
    }, exports, win, doc);
    return exports;
  }
  const Page = load("app/my-requests/page.tsx").MyRequestsContent;
  const render = () => { cursor = 0; root = Page(); while (scheduled.length) scheduled.shift()!(); return root; };
  const find = (node: any, predicate: (n: any) => boolean): any => {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
  };
  return {
    render, redirects, handlers,
    html: () => renderToStaticMarkup(render()),
    auth: (fn: typeof getUser) => { getUser = fn; }, query: (fn: typeof query) => { query = fn; },
    settle: async () => { for (let i=0;i<8;i++) await new Promise(done => setTimeout(done, 2)); },
    retry: () => { find(root, n => !!n.props?.onRetry).props.onRetry(); },
    event: (name: string) => { for (const fn of [...events.get(name) || []]) fn(); },
    unmount: () => { mounted = false; for (const e of effects.values()) e.cleanup?.(); },
    get authCalls() { return authCalls; }, get staleWrites() { return staleWrites; },
    get subscriptions() { return subscriptions; }, get removals() { return removals; },
  };
}

test("concurrent consumers share an authoritative read, then forget settled account data", async () => {
  const pending = deferred<string>(); let calls = 0;
  const read = createInFlightRead(() => { calls++; return calls === 1 ? pending.promise : Promise.resolve("next-account"); });
  const first = read(); assert.equal(first, read()); await Promise.resolve(); assert.equal(calls, 1);
  pending.resolve("first-account"); assert.equal(await first, "first-account");
  assert.equal(await read(), "next-account"); assert.equal(calls, 2);
});
test("a rejected shared read clears for retry", async () => {
  let calls = 0; const read = createInFlightRead(async () => { if (++calls === 1) throw new Error("lock"); return "recovered"; });
  await assert.rejects(read(), /lock/); assert.equal(await read(), "recovered");
});
test("My Requests shares loader and realtime auth and retains all three subscriptions", async () => {
  const f = fixture(); f.render(); await f.settle();
  assert.match(f.html(), /No active requests/); assert.equal(f.authCalls, 1); assert.equal(f.subscriptions, 1);
  assert.deepEqual(f.handlers.map(x => [x.filter.event,x.filter.table]), [["INSERT","reviews"],["INSERT","request_updates"],["UPDATE","client_requests"]]);
  f.unmount(); assert.equal(f.removals, 1);
});
test("a thrown auth lock exits loading, offers Retry and recovers", async () => {
  const f = fixture(); f.auth(async () => { throw new NavigatorLockAcquireTimeoutError("Lock stolen"); });
  f.render(); await f.settle(); assert.match(f.html(), /Requests couldn’t be loaded|Requests couldn&#x27;t be loaded/); assert.doesNotMatch(f.html(), /Loading requests/);
  f.auth(async () => signedIn()); f.retry(); await f.settle(); assert.match(f.html(), /No active requests/); assert.deepEqual(f.redirects, []); f.unmount();
});
for (const event of ["online", "focus", "visibilitychange"]) {
  test(`transient auth failure recovers on ${event} and reconnects realtime once`, async () => {
    const f = fixture(); f.auth(async () => { await new Promise(done => setTimeout(done, 4)); throw new Error("temporary auth/session failure"); }); f.render(); await f.settle(); f.html();
    f.auth(async () => signedIn()); f.event(event); f.event(event); await f.settle();
    assert.match(f.html(), /No active requests/); assert.equal(f.subscriptions, 1); assert.equal(f.authCalls, 2); f.unmount();
  });
}
test("a hung data read exits loading at its deadline and allows a fresh retry", async () => {
  const f = fixture(); f.query(() => new Promise(() => {})); f.render(); await new Promise(done => setTimeout(done, 45));
  assert.match(f.html(), /role="alert"/); assert.doesNotMatch(f.html(), /Loading requests/);
  f.query(async () => ({ data: [], error: null })); f.retry(); await f.settle(); assert.match(f.html(), /No active requests/); f.unmount();
});
test("an unmounted read cannot publish late data or a loading/error state", async () => {
  const f = fixture(), pending = deferred<any>(); f.auth(() => pending.promise); f.render(); await Promise.resolve(); f.unmount();
  pending.resolve(signedIn()); await f.settle(); assert.equal(f.staleWrites, 0); assert.equal(f.subscriptions, 0); assert.deepEqual(f.redirects, []);
});
test("an ended session follows the existing sign-in flow instead of showing empty requests", async () => {
  const f = fixture(); f.auth(async () => ({ data: { user: null }, error: new AuthSessionMissingError() })); f.render(); await f.settle();
  assert.deepEqual(f.redirects, ["/login?redirect=%2Fmy-requests"]); assert.doesNotMatch(f.html(), /Loading requests/); f.unmount();
});


test("session invalidation keeps a late old-account response separate from the new read", async () => {
  const old = deferred<string>(), next = deferred<string>(); let calls = 0;
  const read = createInFlightRead(() => ++calls === 1 ? old.promise : next.promise);
  const first = read(); await Promise.resolve(); read.invalidate();
  const second = read(); await Promise.resolve(); old.resolve("old-account"); await first;
  assert.equal(read(), second); next.resolve("new-account"); assert.equal(await second, "new-account");
});
test("an already cancelled read never starts its underlying work", async () => {
  const controller = new AbortController(); controller.abort(new Error("navigation")); let started = false;
  await assert.rejects(withReadDeadline(async () => { started = true; }, controller), /navigation/);
  assert.equal(started, false);
});


test("repeated SIGNED_IN and token refresh for the same account preserve a shared pending read", () => {
  let invalidations = 0; const changed = createSessionReadInvalidator(() => { invalidations++; });
  changed("INITIAL_SESSION", "client"); changed("SIGNED_IN", "client"); changed("TOKEN_REFRESHED", "client");
  assert.equal(invalidations, 0);
});
test("logout, account replacement and updated user data invalidate pending verification", () => {
  let invalidations = 0; const changed = createSessionReadInvalidator(() => { invalidations++; });
  changed("INITIAL_SESSION", "client"); changed("SIGNED_OUT", null); changed("SIGNED_IN", "professional"); changed("USER_UPDATED", "professional");
  assert.equal(invalidations, 3);
});
