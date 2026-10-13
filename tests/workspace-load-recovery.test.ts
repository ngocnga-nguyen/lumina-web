/* eslint-disable @typescript-eslint/no-explicit-any -- The hook harness runs the actual pages with controlled asynchronous Auth/database responses. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthApiError, AuthSessionMissingError, NavigatorLockAcquireTimeoutError, type User } from "@supabase/supabase-js";
import ts from "typescript";
import { loadWorkspaceUser } from "../lib/workspace-load-recovery.ts";

const require = createRequire(import.meta.url);
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const clientsPath = "app/dashboard/clients/page.tsx";
const user = (id = "owner") => ({ id } as User);
const signedIn = (id = "owner") => ({ data: { user: user(id) }, error: null });
const deferred = <T,>() => {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function fixture(path = clientsPath) {
  const slots: any[] = [], effects = new Map<number, { deps?: any[]; cleanup?: () => void }>();
  const listeners = { window: new Map<string, Set<() => void>>(), document: new Map<string, Set<() => void>>() };
  let cursor = 0, mounted = true, root: any, authCalls = 0, staleWrites = 0;
  let clientId = "card";
  const redirects: string[] = [], failures: unknown[] = [], queries: string[] = [];
  const pendingEffects: Array<() => void> = [];
  let getUser: () => Promise<any> = async () => signedIn();
  let queryError: unknown = null, queryThrow: Error | null = null;
  const tableRows = new Map<string, unknown[]>();
  const react = {
    useState(initial: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (next: any) => {
        if (!mounted) { staleWrites++; return; }
        slots[i] = typeof next === "function" ? next(slots[i]) : next;
      }];
    },
    useRef(initial: any) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useMemo(fn: () => any) { cursor++; return fn(); },
    useCallback(fn: any) { cursor++; return fn; },
    useEffect(fn: () => any, deps?: any[]) {
      const i = cursor++, old = effects.get(i);
      if (old && deps && old.deps?.length === deps.length && deps.every((dep, j) => Object.is(dep, old.deps![j]))) return;
      pendingEffects.push(() => { old?.cleanup?.(); effects.set(i, { deps, cleanup: fn() }); });
    },
  };
  const eventTarget = (where: "window" | "document") => ({
    addEventListener(name: string, fn: () => void) {
      if (!listeners[where].has(name)) listeners[where].set(name, new Set());
      listeners[where].get(name)!.add(fn);
    },
    removeEventListener(name: string, fn: () => void) { listeners[where].get(name)?.delete(fn); },
  });
  const win: any = { ...eventTarget("window"), location: { search: "", hash: "" },
    setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}, matchMedia: () => ({ matches: false }) };
  const doc: any = { ...eventTarget("document"), visibilityState: "visible" };
  const router = { replace: (url: string) => redirects.push(url), push: (url: string) => redirects.push(url) };
  const card = { id: "card", client_id: null, source: "manual", manual_name: "Recovered Client", created_at: "2026-01-01", archived_at: null };
  const supabase = {
    auth: { getUser: () => { authCalls++; return getUser(); } },
    from(table: string) {
      queries.push(table);
      const result = () => {
        if (queryThrow) throw queryThrow;
        return { data: tableRows.get(table) || (table === "artist_client_cards" ? [card] : []), error: queryError };
      };
      const q: any = { select: () => q, eq: () => q, not: () => q, order: () => q, or: () => q, in: () => q,
        maybeSingle: async () => ({ data: table === "artist_client_cards" ? card : { name: "Owner" }, error: queryError }),
        then: (yes: any, no: any) => Promise.resolve().then(result).then(yes, no) };
      return q;
    },
    channel: () => { const c: any = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => {},
  };
  const cache = new Map<string, any>();
  function load(file: string): any {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const compiled = ts.transpileModule(source(file), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function("require", "exports", "window", "document", "console", compiled)((id: string) => {
      if (id === "react") return react;
      if (id.endsWith(".module.css")) return { default: {} };
      // Settings now delegates its recovery surface to this pure presentation component.
      if (id === "@/components/ProfessionalSettingsOverview") return load("components/ProfessionalSettingsOverview.tsx");
      if (id === "next/navigation") return { useRouter: () => router, useParams: () => ({ clientId }) };
      if (id === "next/link") return { default: (props: any) => createElement("a", { href: props.href }, props.children) };
      if (id === "@/lib/supabase") return { supabase };
      if (id === "@/components/ProfessionalReadinessProvider") return { useProfessionalReadiness: () => ({ status: null, verification: null, refresh: async () => {} }) };
      if (id === "@/lib/use-professional-action-target") return { useProfessionalActionTarget: () => {} };
      if (id.startsWith("@/components/") && id !== "@/components/WorkspaceLoadError") return { default: () => null };
      if (id.startsWith("@/")) {
        const relative = id.slice(2);
        const extension = existsSync(new URL(`../${relative}.ts`, import.meta.url)) ? ".ts" : ".tsx";
        return load(relative + extension);
      }
      return require(id);
    }, exports, win, doc, { ...console, error: (...args: unknown[]) => failures.push(args) });
    return exports;
  }
  const Page = load(path).default;
  const render = () => {
    cursor = 0; root = Page(); pendingEffects.splice(0).forEach((effect) => effect()); return root;
  };
  const settle = async () => {
    await new Promise((done) => setImmediate(done)); render();
    await new Promise((done) => setImmediate(done)); render();
  };
  function retry(node: any = root): (() => void) | undefined {
    if (!node || typeof node !== "object") return undefined;
    if (node.props?.onRetry) return node.props.onRetry;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = retry(child); if (found) return found;
    }
  }
  return {
    render, settle, redirects, failures, queries,
    html: () => renderToStaticMarkup(root),
    retry: () => { const action = retry(); assert.ok(action, "the failed page exposes Retry"); action(); render(); },
    auth: (next: typeof getUser) => { getUser = next; },
    rows: (table: string, rows: unknown[]) => { tableRows.set(table, rows); },
    navigateClient: (id: string) => { clientId = id; render(); },
    failQuery: (error: unknown, thrown = false) => { if (thrown) queryThrow = error as Error; else queryError = error; },
    event: (name: "focus" | "visibilitychange", visible = true) => {
      doc.visibilityState = visible ? "visible" : "hidden";
      [...(listeners[name === "focus" ? "window" : "document"].get(name) || [])].forEach((fn) => fn());
    },
    unmount: () => { mounted = false; for (const effect of effects.values()) effect.cleanup?.(); },
    get authCalls() { return authCalls; }, get staleWrites() { return staleWrites; },
  };
}

test("Clients catches a thrown Auth lock error, exits loading, and renders a recoverable error", async () => {
  const f = fixture(); f.auth(async () => { throw new NavigatorLockAcquireTimeoutError("Auth lock was stolen"); });
  f.render(); await f.settle();
  assert.doesNotMatch(f.html(), /Loading clients/); assert.match(f.html(), /role="alert"/);
  assert.match(f.html(), /Clients couldn’t be loaded/); assert.match(f.html(), />Retry</);
  assert.equal(f.failures.length, 1); assert.deepEqual(f.redirects, []); assert.deepEqual(f.queries, []);
  f.unmount();
});

test("Retry performs a fresh authoritative read and clears the error on success", async () => {
  const f = fixture(); f.auth(async () => { throw new Error("temporarily offline"); });
  f.render(); await f.settle(); f.auth(async () => signedIn()); f.retry(); await f.settle();
  assert.match(f.html(), /Recovered Client/); assert.doesNotMatch(f.html(), /Loading clients|role="alert"/);
  assert.equal(f.authCalls, 2); assert.ok(f.queries.includes("artist_client_cards")); f.unmount();
});

test("a stale failed Auth read cannot overwrite a later successful focus read", async () => {
  const old = deferred<any>(), f = fixture(); f.auth(() => old.promise); f.render();
  f.auth(async () => signedIn()); f.event("focus"); await f.settle();
  old.reject(new Error("late failure")); await f.settle();
  assert.match(f.html(), /Recovered Client/); assert.doesNotMatch(f.html(), /Loading clients|role="alert"/);
  assert.equal(f.failures.length, 0); f.unmount();
});

test("a stale success cannot overwrite the latest failed read's recoverable state", async () => {
  const old = deferred<any>(), f = fixture(); f.auth(() => old.promise); f.render();
  f.auth(async () => { throw new Error("latest failed"); }); f.event("focus"); await f.settle();
  old.resolve(signedIn()); await f.settle();
  assert.match(f.html(), /role="alert"/); assert.doesNotMatch(f.html(), /Loading clients|Recovered Client/); f.unmount();
});

for (const event of ["focus", "visibilitychange"] as const) {
  test(`Clients recovers after ${event} without a manual refresh`, async () => {
    const f = fixture(); f.auth(async () => { throw new Error("temporary Auth failure"); });
    f.render(); await f.settle(); f.auth(async () => signedIn());
    f.event(event); await f.settle(); assert.match(f.html(), /Recovered Client/);
    assert.doesNotMatch(f.html(), /Loading clients|role="alert"/); f.unmount();
  });
}

test("hidden-tab events do not fetch; concurrent focus/visibility loads remain authoritative", async () => {
  const a = deferred<any>(), b = deferred<any>(), f = fixture();
  f.render(); await f.settle(); const before = f.authCalls;
  f.event("visibilitychange", false); assert.equal(f.authCalls, before);
  f.auth(() => a.promise); f.event("focus"); f.auth(() => b.promise); f.event("visibilitychange");
  b.resolve(signedIn()); await f.settle(); a.reject(new Error("older failure")); await f.settle();
  assert.match(f.html(), /Recovered Client/); assert.doesNotMatch(f.html(), /role="alert"|Loading clients/); f.unmount();
});

test("navigation unmount/account replacement invalidates pending old-account work", async () => {
  const old = deferred<any>(), f = fixture(); f.auth(() => old.promise); f.render(); f.unmount();
  const next = fixture(); next.auth(async () => signedIn("new-owner")); next.render(); await next.settle();
  old.resolve(signedIn("old-owner")); await new Promise((done) => setImmediate(done));
  assert.equal(f.staleWrites, 0); assert.deepEqual(f.queries, []); assert.deepEqual(f.redirects, []);
  assert.match(next.html(), /Recovered Client/); next.unmount();
});

test("navigation after a transient failed mount loads Clients normally", async () => {
  const old = fixture(); old.auth(async () => { throw new Error("transient"); });
  old.render(); await old.settle(); old.unmount();
  const next = fixture(); next.render(); await next.settle();
  assert.match(next.html(), /Recovered Client/); assert.doesNotMatch(next.html(), /role="alert"|Loading clients/); next.unmount();
});

for (const [name, response] of [
  ["signed out", { data: { user: null }, error: null }],
  ["missing session", { data: { user: null }, error: new AuthSessionMissingError() }],
  ["expired/invalid session", { data: { user: null }, error: new AuthApiError("Expired", 401, "bad_jwt") }],
] as const) {
  test(`${name} follows the existing login redirect and settles loading`, async () => {
    const f = fixture(); f.auth(async () => response); f.render(); await f.settle();
    assert.deepEqual(f.redirects, ["/login"]); assert.doesNotMatch(f.html(), /Loading clients/);
    assert.deepEqual(f.queries, []); f.unmount();
  });
}

test("returned transient Auth error is recoverable, not an incorrect signed-out redirect", async () => {
  const f = fixture(); f.auth(async () => ({ data: { user: null }, error: new AuthApiError("Unavailable", 503, "unexpected_failure") }));
  f.render(); await f.settle(); assert.match(f.html(), /role="alert"/); assert.deepEqual(f.redirects, []); f.unmount();
});

for (const thrown of [true, false]) {
  test(`${thrown ? "thrown" : "returned"} database failure settles Clients with Retry`, async () => {
    const f = fixture(); f.failQuery(new Error("Database unavailable"), thrown); f.render(); await f.settle();
    assert.match(f.html(), /role="alert"/); assert.match(f.html(), />Retry</); assert.doesNotMatch(f.html(), /Loading clients/); f.unmount();
  });
}

for (const [name, path, spinner] of [
  ["client card", "app/dashboard/clients/[clientId]/page.tsx", "Loading client record"],
  ["Notes", "app/dashboard/clients/[clientId]/notes/page.tsx", "Loading notes"],
  ["Settings", "app/dashboard/settings/page.tsx", "Loading settings"],
]) {
  test(`${name} contains the same thrown Auth failure and renders Retry`, async () => {
    const f = fixture(path); f.auth(async () => { throw new Error("Auth lock failure"); });
    f.render(); await f.settle(); assert.doesNotMatch(f.html(), new RegExp(spinner));
    assert.match(f.html(), /role="alert"/); assert.match(f.html(), />Retry</);
    assert.equal(f.failures.length, 1); assert.deepEqual(f.redirects, []); f.unmount();
  });
  test(`${name} Retry can complete a fresh initial load`, async () => {
    const f = fixture(path); f.auth(async () => { throw new Error("transient Auth failure"); });
    f.render(); await f.settle(); f.auth(async () => signedIn()); f.retry(); await f.settle();
    assert.doesNotMatch(f.html(), new RegExp(spinner)); assert.doesNotMatch(f.html(), /role="alert"/);
    assert.equal(f.authCalls, 2); assert.ok(f.queries.length > 0); f.unmount();
  });
  test(`${name} ignores an Auth result after navigation/account unmount`, async () => {
    const pending = deferred<any>(), f = fixture(path); f.auth(() => pending.promise);
    f.render(); f.unmount(); pending.resolve({ data: { user: null }, error: new AuthSessionMissingError() });
    await new Promise((done) => setImmediate(done));
    assert.equal(f.staleWrites, 0); assert.deepEqual(f.redirects, []); assert.deepEqual(f.queries, []);
  });
}

test("only genuine ended-session errors become signed-out; thrown locks remain upstream failures", async () => {
  assert.equal(await loadWorkspaceUser(async () => { throw new AuthSessionMissingError(); }), null);
  for (const code of ["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"] as const) {
    assert.equal(await loadWorkspaceUser(async () => ({ data: { user: null }, error: new AuthApiError("Ended", 400, code) })), null);
  }
  await assert.rejects(loadWorkspaceUser(async () => { throw new Error("Lock stolen"); }), /Lock stolen/);
});

test("a failed Notes route load hides previous client context and still exposes Retry", async () => {
  const f = fixture("app/dashboard/clients/[clientId]/notes/page.tsx");
  f.rows("artist_client_notes", [{ id: "note", artist_id: "owner", client_card_id: "card", note_type: "general",
    title: "Confirmed context", body: "Private context", is_pinned: false, created_at: "2026-01-01", updated_at: "2026-01-01" }]);
  f.render(); await f.settle(); assert.doesNotMatch(f.html(), /role="alert"/);
  f.auth(async () => { throw new NavigatorLockAcquireTimeoutError("Lock stolen on navigation"); });
  f.navigateClient("another-card"); await f.settle();
  assert.match(f.html(), /role="alert"/); assert.match(f.html(), />Retry</);
  assert.doesNotMatch(f.html(), /Loading notes|Private notes workspace/);
  f.unmount();
});
