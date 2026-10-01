import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { initializeProfessional } from "../lib/professional-initialization.ts";

function fixture() {
  const user = { id: "current-owner", email: "owner@example.com", email_confirmed_at: "2026-09-29",
    user_metadata: { account_type: "artist", full_name: "  Alex  ", business_name: "  Studio  ",
      id: "other-owner", is_active: true, price_start: 900, email: "forged@example.com" } };
  const state = { session: true, row: null,
    inserts: [], reads: 0, failure: false, race: false, readFailure: false };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: state.session ? { user } : null }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table) => {
      assert.equal(table, "artists");
      return {
        select: () => ({ eq: (key, id) => {
          assert.equal(key, "id"); assert.equal(id, user.id);
          return { maybeSingle: async () => {
            state.reads++;
            return { data: state.row, error: state.readFailure ? new Error("Read failed") : null };
          } };
        } }),
        insert: async (row) => {
          state.inserts.push(row);
          if (state.failure) return { error: new Error("Provisioning failed") };
          if (state.race) {
            state.row = { id: user.id, name: "Already edited", is_active: true };
            return { error: new Error("Duplicate key") };
          }
          state.row = row;
          return { error: null };
        },
      };
    },
  };
  return { user, state, client };
}

test("unconfirmed signup without a session never reads or inserts artists", async () => {
  const { user, state, client } = fixture(); state.session = false; user.email_confirmed_at = "";
  assert.equal((await initializeProfessional(client)).status, "unauthenticated");
  assert.equal(state.reads, 0); assert.equal(state.inserts.length, 0);
  const signup = readFileSync(new URL("../app/artist-signup/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(signup, /from\("artists"\)/);
  assert.match(signup, /if \(!data.session\)/);
});

test("confirmed recovery creates only the current user's inactive profile", async () => {
  const { state, client } = fixture();
  assert.equal((await initializeProfessional(client)).status, "artist");
  assert.deepEqual(state.inserts, [{ id: "current-owner", name: "Alex", business_name: "Studio",
    category: "Beauty Professional", location: "Location coming soon", price_start: 0,
    email: "owner@example.com", is_active: false }]);
});

test("retries are idempotent and preserve existing professional edits", async () => {
  const { user, state, client } = fixture();
  await initializeProfessional(client);
  state.row = { ...state.row, name: "Edited name", is_active: true };
  user.user_metadata = {};
  const before = { ...state.row };
  await initializeProfessional(client); await initializeProfessional(client);
  assert.equal(state.inserts.length, 1); assert.deepEqual(state.row, before);
});

test("existing artists with legacy metadata are returned without writes", async () => {
  const { user, state, client } = fixture(); user.user_metadata = {};
  state.row = { id: user.id, name: "Legacy", category: "Hair", is_active: true };
  const before = { ...state.row };
  assert.equal((await initializeProfessional(client)).status, "artist");
  assert.equal(state.inserts.length, 0); assert.deepEqual(state.row, before);
});

test("concurrent provisioning preserves the winning row", async () => {
  const { state, client } = fixture(); state.race = true;
  const result = await initializeProfessional(client);
  assert.equal(result.status, "artist"); assert.equal(state.row?.name, "Already edited");
  await initializeProfessional(client); assert.equal(state.inserts.length, 1);
});

test("failed provisioning can be retried without signing up again", async () => {
  const { state, client } = fixture(); state.failure = true;
  await assert.rejects(initializeProfessional(client), /Provisioning failed/);
  assert.equal(state.row, null);
  state.failure = false;
  assert.equal((await initializeProfessional(client)).status, "artist");
  await initializeProfessional(client); assert.equal(state.inserts.length, 2);
});

test("read failure does not attempt an insert", async () => {
  const { state, client } = fixture(); state.readFailure = true;
  await assert.rejects(initializeProfessional(client), /Read failed/);
  assert.equal(state.inserts.length, 0);
});

test("client signup metadata never provisions an artist", async () => {
  const { user, state, client } = fixture(); user.user_metadata.account_type = "client";
  assert.equal((await initializeProfessional(client)).status, "client");
  assert.equal(state.inserts.length, 0);
});

test("invalid metadata and unconfirmed identities fail closed", async () => {
  for (const metadata of [{ full_name: " " }, { full_name: 123 }, { full_name: "x".repeat(161) },
    { business_name: {} }, { business_name: "x".repeat(161) }]) {
    const { user, state, client } = fixture(); Object.assign(user.user_metadata, metadata);
    await assert.rejects(initializeProfessional(client), /signup details/);
    assert.equal(state.inserts.length, 0);
  }
  const { user, state, client } = fixture(); user.email_confirmed_at = "";
  await assert.rejects(initializeProfessional(client), /confirm your email/);
  assert.equal(state.inserts.length, 0);
});

test("confirmation login and direct dashboard entry share initialization and retry gates", () => {
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../components/ProfessionalDashboardShell.tsx", import.meta.url), "utf8");
  assert.equal(login.match(/await initializeProfessional\(supabase\)/g)?.length, 2);
  assert.match(login, /Retry account setup/); assert.match(login, /\[accountAttempt, router\]/);
  assert.match(shell, /await initializeProfessional\(supabase\)/);
  assert.ok(shell.indexOf("await initializeProfessional") < shell.indexOf("setAccountResolved(true)"));
  assert.match(shell, /\[accountLoadAttempt, router\]/); assert.match(shell, /Try again/);
  assert.ok(shell.indexOf("if (accountLoadError)") < shell.indexOf("<ProfessionalWorkspaceProvider"));
});

// Execute the real page handlers with isolated hooks and mocked external I/O.
// JSX stays as an inspectable tree; no browser or production account is used.
function pageHarness(path, client, pathname = "/login") {
  const values = [], dependencies = [], effects = [];
  let cursor = 0, tree;
  const routes = [], alerts = [];
  const router = { push: (url) => routes.push(url), replace: (url) => routes.push(url) };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
      return [values[index], (value) => {
        values[index] = typeof value === "function" ? value(values[index]) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) {
        dependencies[index] = deps; effects.push(effect);
      }
    },
    useMemo: (compute) => compute(),
  };
  const jsx = (type, props) => ({ type, props });
  const stub = new Proxy({ __esModule: true, default: () => null }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "useWorkspaceSidebarPreference") return () => [false, () => {}];
      if (key === "getProfessionalWorkspaceNavigation") return () => [];
      return () => ({});
    },
  });
  const exports = {};
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name === "next/navigation") return { useRouter: () => router, usePathname: () => pathname };
      if (name === "@/lib/supabase") return { supabase: { ...client, auth: { ...client.auth, onAuthStateChange: client.auth.onAuthStateChange || (() => ({ data: { subscription: { unsubscribe() {} } } })) } } };
      if (name === "@/lib/professional-initialization") return { initializeProfessional };
      return stub;
    },
    window: { location: { origin: "https://lumina.example", search: "" } },
    setTimeout, clearTimeout, URLSearchParams, alert: (message) => alerts.push(message), console: { log() {} },
  });
  const render = () => {
    cursor = 0; tree = exports.default({ children: "dashboard-content" });
    for (const effect of effects.splice(0)) effect();
    return tree;
  };
  const nodes = (node = tree) => {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children ?? null)];
  };
  const find = (predicate) => {
    const result = nodes().find(predicate); assert.ok(result, "Expected UI element"); return result;
  };
  const settle = async () => { await new Promise(setImmediate); render(); };
  const fill = (placeholder, value) => {
    find((node) => node.props?.placeholder === placeholder).props.onChange({ target: { value } });
    render();
  };
  const submit = async () => {
    find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    await settle();
  };
  render();
  return { render, find, nodes, settle, fill, submit, routes, alerts };
}

test("professional signup handler with confirmation enabled performs no artist insert", async () => {
  const { user, state, client } = fixture();
  state.session = false; user.email_confirmed_at = "";
  let signupCalls = 0;
  client.auth.signUp = async (input) => {
    signupCalls++;
    assert.equal(input.options.data.account_type, "artist");
    return { data: { user, session: null }, error: null };
  };
  const page = pageHarness("app/artist-signup/page.tsx", client);
  page.fill("Full name", "Alex"); page.fill("Professional email", user.email);
  page.fill("Password", "test-password"); await page.submit();
  assert.equal(signupCalls, 1); assert.equal(state.inserts.length, 0); assert.equal(state.reads, 0);
  assert.match(page.alerts[0], /check your email/);
  assert.deepEqual(page.routes, ["/login?redirect=%2Fdashboard%2Fonboarding"]);
});

test("confirmed login and repeated sign-in create exactly one artist", async () => {
  const { user, state, client } = fixture(); state.session = false;
  client.auth.signInWithPassword = async () => {
    state.session = true; return { data: { user, session: { user } }, error: null };
  };
  const page = pageHarness("app/login/page.tsx", client); await page.settle();
  page.fill("Email", user.email); page.fill("Password", "test-password");
  await page.submit();
  assert.deepEqual(page.routes, ["/dashboard/onboarding"]);
  await page.submit();
  assert.deepEqual(page.routes, ["/dashboard/onboarding", "/dashboard"]);
  assert.equal(state.inserts.length, 1);
});

test("direct dashboard entry provisions the missing professional before showing children", async () => {
  const { state, client } = fixture();
  const page = pageHarness("components/ProfessionalDashboardShell.tsx", client, "/dashboard");
  assert.ok(page.nodes().some((node) => node.props?.["aria-label"] === "Loading professional workspace"));
  await page.settle();
  assert.equal(state.inserts.length, 1); assert.deepEqual(page.routes, []);
  assert.ok(page.nodes().some((node) => node.props?.children === "dashboard-content"));
});

test("login provisioning failure shows a working retry without routing to browse", async () => {
  const { state, client } = fixture(); state.failure = true;
  const page = pageHarness("app/login/page.tsx", client); await page.settle();
  assert.deepEqual(page.routes, []);
  page.find((node) => node.props?.role === "alert");
  state.failure = false;
  page.find((node) => node.type === "button" && node.props.children === "Retry account setup").props.onClick();
  page.render(); await page.settle();
  assert.deepEqual(page.routes, ["/dashboard/onboarding"]);
  assert.equal(state.row.id, "current-owner");
});

test("dashboard provisioning failure hides children and exposes a working retry, never client routing", async () => {
  const { state, client } = fixture(); state.failure = true;
  const page = pageHarness("components/ProfessionalDashboardShell.tsx", client, "/dashboard");
  await page.settle(); assert.deepEqual(page.routes, []);
  assert.ok(!page.nodes().some((node) => node.props?.children === "dashboard-content"));
  state.failure = false;
  page.find((node) => node.type === "button" && node.props.children === "Try again").props.onClick();
  page.render(); await page.settle();
  assert.deepEqual(page.routes, []);
  assert.ok(page.nodes().some((node) => node.props?.children === "dashboard-content"));
});

test("ordinary client signup retains its existing profiles insert and confirmation screen", async () => {
  const { user, state, client } = fixture(); const writes = [];
  client.auth.signUp = async (input) => {
    assert.equal(input.options.data.account_type, "client");
    return { data: { user, session: null }, error: null };
  };
  client.from = (table) => ({ insert: async (rows) => {
    writes.push({ table, rows }); return { error: null };
  } });
  const page = pageHarness("app/signup/page.tsx", client);
  page.fill("Full name", "Client Name"); page.fill("Email", user.email);
  page.fill("Password", "test-password"); await page.submit();
  assert.equal(writes.length, 1); assert.equal(writes[0].table, "profiles");
  assert.equal(writes[0].rows[0].account_type, "client"); assert.equal(state.inserts.length, 0);
  assert.ok(page.nodes().some((node) => node.props?.children === "Check your email ✨"));
});


test("professional account switch drops the old readiness owner before resolving the new account", async () => {
  const { user, state, client } = fixture();
  let changed;
  client.auth.onAuthStateChange = (callback) => { changed = callback; return { data: { subscription: { unsubscribe() {} } } }; };
  const page = pageHarness("components/ProfessionalDashboardShell.tsx", client, "/dashboard");
  await page.settle();
  assert.ok(page.nodes().some(node => node.props?.userId === "current-owner"));
  user.id = "second-owner"; state.row = { id: user.id, name: "Second professional", is_active: false };
  changed("SIGNED_IN", { user }); page.render();
  assert.ok(!page.nodes().some(node => node.props?.userId === "current-owner"));
  await new Promise(resolve => setTimeout(resolve, 5)); await page.settle();
  assert.ok(page.nodes().some(node => node.props?.userId === "second-owner"));
});
