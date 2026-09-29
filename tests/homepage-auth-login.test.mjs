import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const quietConsole = { error() {}, log() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));

// Execute the actual page closures, not a second implementation of their logic.
function closure(source, match, scope) {
  const file = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (match(node, file)) expression = node;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(expression, "page closure exists");
  const js = ts.transpile(`const run = ${expression.getText(file)};`, { target: ts.ScriptTarget.ES2020 });
  return new Function(...Object.keys(scope), `${js}; return run;`)(...Object.values(scope));
}

function effect(source, marker, scope) {
  return closure(source, node => ts.isArrowFunction(node)
    && ts.isCallExpression(node.parent) && node.parent.expression.getText() === "useEffect"
    && node.getText().includes(marker), scope)();
}

function handler(name, scope) {
  return closure(login, node => ts.isArrowFunction(node)
    && ts.isVariableDeclaration(node.parent) && node.parent.name.getText() === name, scope);
}

function accountScope(supabase) {
  const state = { user: null, profile: null, menu: true };
  return {
    state, supabase, console: quietConsole,
    accountIdentity: { current: { userId: null, version: 0 } },
    setUser: user => { state.user = user; },
    setArtistProfile: profile => { state.profile = profile; },
    setAccountMenuOpen: menu => { state.menu = menu; },
  };
}

function loginScope(supabase, redirect = null) {
  const state = { loading: false, alerts: [], destinations: [] };
  return {
    state, supabase, console: quietConsole,
    email: "diagnostic@example.test", password: "not-a-real-password",
    setLoading: value => { state.loading = value; },
    alert: message => state.alerts.push(message),
    getSafeRedirect: () => redirect,
    router: { push: destination => state.destinations.push(destination) },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("Auth callback is synchronous; sign-out and cleanup invalidate late profile loads", async () => {
  let callback;
  let unsubscribed = false;
  const pending = deferred();
  const query = { select() { return this; }, eq() { return this; }, maybeSingle() { return pending.promise; } };
  const scope = accountScope({
    auth: { onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; } },
    from: () => query,
  });
  const cleanup = effect(home, "onAuthStateChange", scope);
  assert.equal(callback("INITIAL_SESSION", { user: { id: "old" } }), undefined);
  assert.equal(scope.state.user.id, "old");
  const profileCleanup = effect(home, "const loadProfile", { ...scope, user: scope.state.user });
  callback("SIGNED_OUT", null);
  assert.equal(scope.state.user, null);
  assert.equal(scope.state.profile, null);
  assert.equal(scope.state.menu, false);
  // Even before React runs effect cleanup, a stale profile must not reappear.
  pending.resolve({ data: { id: "old", name: "Old profile" }, error: null });
  await tick();
  assert.equal(scope.state.profile, null);
  profileCleanup();
  cleanup();
  callback("SIGNED_IN", { user: { id: "late" } });
  assert.equal(scope.state.user, null);
  assert.equal(unsubscribed, true);
});

test("older account queries cannot overwrite a newer signed-in identity", async () => {
  let callback;
  const old = deferred();
  const scope = accountScope({
    auth: { onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; } },
    from() { return { select() { return this; }, eq(_field, id) { this.id = id; return this; }, maybeSingle() { return this.id === "old" ? old.promise : Promise.resolve({ data: { id: "new" }, error: null }); } }; },
  });
  const cleanup = effect(home, "onAuthStateChange", scope);
  callback("SIGNED_IN", { user: { id: "old" } });
  const oldCleanup = effect(home, "const loadProfile", { ...scope, user: scope.state.user });
  callback("SIGNED_IN", { user: { id: "new" } });
  const newCleanup = effect(home, "const loadProfile", { ...scope, user: scope.state.user });
  await tick();
  old.resolve({ data: { id: "old" }, error: null });
  await tick();
  assert.equal(scope.state.profile.id, "new");
  oldCleanup(); newCleanup(); cleanup();
});

const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "diagnostic@example.test", app_metadata: {}, user_metadata: {} };
const session = { access_token: "synthetic-not-real", refresh_token: "synthetic-not-real", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };

for (const recovery of ["anonymous", "renewed", "rejected"]) {
  for (const role of ["client", "professional"]) {
    test(`${recovery}: homepage settles and Homepage → Login navigates as ${role} without refresh`, { timeout: 4000 }, async () => {
      const storageKey = `test-${recovery}-${role}`;
      const store = new Map(recovery === "anonymous" ? [] : [[storageKey, JSON.stringify({ ...session, expires_at: 1 })]]);
      const requests = [];
      const client = createClient("https://diagnostic.supabase.co", "not-a-real-key", {
        auth: { storageKey, detectSessionInUrl: false, storage: {
          getItem: key => store.get(key) ?? null,
          setItem: (key, value) => store.set(key, value),
          removeItem: key => store.delete(key),
        } },
        global: { fetch: async input => {
          const url = new URL(String(input));
          requests.push(url);
          const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
          if (url.pathname.endsWith("/token")) {
            await new Promise(resolve => setTimeout(resolve, 20));
            if (url.searchParams.get("grant_type") === "refresh_token" && recovery === "rejected") return json({ code: "refresh_token_not_found", message: "Synthetic expired refresh" }, 400);
            return json(session);
          }
          if (url.pathname.endsWith("/user")) return json(user);
          if (url.searchParams.get("select") === "id") return json(role === "professional" ? [{ id: user.id }] : []);
          return json([{ id: "public-professional", name: "Public professional" }]);
        } },
      });
      const scope = accountScope(client);
      const stopAccount = effect(home, "onAuthStateChange", scope);
      let artists, loading = true;
      const settled = deferred();
      const stopArtists = effect(home, "const loadArtists", {
        supabase: client, console: quietConsole,
        setArtists: value => { artists = value; },
        setArtistsLoading: value => { loading = value; settled.resolve(); },
      });
      try {
        await settled.promise;
        assert.equal(loading, false);
        assert.equal(artists[0].id, "public-professional");
        const query = requests.find(url => url.pathname.endsWith("/artists"));
        assert.equal(query.searchParams.get("select"), "id,name,business_name,category,location,price_start,profile_image_url");
        assert.equal(query.searchParams.get("is_active"), "eq.true");
        assert.equal(query.searchParams.get("order"), "created_at.desc");
        stopAccount(); stopArtists();
        const loginState = loginScope(client);
        loginState.router.push = destination => {
          assert.ok(JSON.parse(store.get(storageKey)).access_token, "session persisted before navigation");
          loginState.state.destinations.push(destination);
        };
        await handler("handleLogin", loginState)();
        assert.deepEqual(loginState.state.destinations, [role === "professional" ? "/dashboard" : "/browse"]);
        assert.equal(loginState.state.loading, false);
      } finally {
        stopAccount(); stopArtists(); await client.auth.stopAutoRefresh();
      }
    });
  }
}

for (const failure of ["invalid-credentials", "role-error", "role-throws", "auth-throws"]) {
  test(`${failure} releases login loading without navigating`, async () => {
    const scope = loginScope({
      auth: { async signInWithPassword() {
        if (failure === "auth-throws") throw new Error("network failure");
        return failure === "invalid-credentials" ? { data: {}, error: { message: "Invalid login credentials" } } : { data: { user }, error: null };
      } },
      from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() {
        if (failure === "role-throws") throw new Error("network failure");
        return { data: null, error: { message: "role denied" } };
      } }; },
    });
    await handler("handleLogin", scope)();
    assert.equal(scope.state.loading, false);
    assert.deepEqual(scope.state.destinations, []);
    assert.equal(scope.state.alerts.length, 1);
    if (failure === "invalid-credentials") assert.equal(scope.state.alerts[0], "Invalid login credentials");
  });
}

test("existing-session lookup cannot navigate after login page cleanup", async () => {
  const pending = deferred();
  const scope = loginScope({ auth: { getSession: () => pending.promise } });
  const cleanup = effect(login, "const checkSession", scope);
  cleanup();
  pending.resolve({ data: { session }, error: null });
  await tick();
  assert.deepEqual(scope.state.destinations, []);
});

test("public loader settles on empty/error and does not write after unmount", async () => {
  for (const outcome of ["empty", "error", "unmounted"]) {
    const pending = deferred();
    const query = { select() { return this; }, eq() { return this; }, order: () => pending.promise };
    const writes = [];
    const cleanup = effect(home, "const loadArtists", {
      supabase: { from: () => query }, console: quietConsole,
      setArtists: value => writes.push(value), setArtistsLoading: value => writes.push(value),
    });
    if (outcome === "unmounted") cleanup();
    pending.resolve({ data: [], error: outcome === "error" ? new Error("unavailable") : null });
    await tick();
    assert.deepEqual(writes, outcome === "unmounted" ? [] : [[], false]);
    cleanup();
  }
});

test("redirect validation is unchanged and no reload was introduced", () => {
  for (const [search, expected] of [["?redirect=/dashboard/requests", "/dashboard/requests"], ["?redirect=https://example.test", null], ["?redirect=//example.test", null], ["", null]]) {
    assert.equal(handler("getSafeRedirect", { window: { location: { search } }, URLSearchParams })(), expected);
  }
  const submit = login.slice(login.indexOf("const handleLogin"), login.indexOf("  return ("));
  assert.doesNotMatch(submit, /router\.refresh|location\.(reload|href|assign|replace)/);
  assert.doesNotMatch(home, /location\.reload/);
});
