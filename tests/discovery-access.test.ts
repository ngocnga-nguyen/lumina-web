import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolveMarketplaceAccount } from "../lib/marketplace-access.ts";
import { emptyLookLibrary, lookStorageKey, parseLookLibrary } from "../lib/look-library-state.ts";

function fixture({ user = null, artist = null, authError = null, roleError = null }: {
  user?: { id: string; user_metadata?: { account_type?: string } } | null;
  artist?: { id: string } | null;
  authError?: { name: string } | null;
  roleError?: Error | null;
} = {}) {
  const queries: string[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: (table: string) => {
      queries.push(table);
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: artist, error: roleError }) }) }) };
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

test("guest resolution requires no role or user-data query", async () => {
  const f = fixture();
  assert.deepEqual(await resolveMarketplaceAccount(f.client), { role: "guest", id: null });
  assert.deepEqual(f.queries, []);
  assert.deepEqual(await resolveMarketplaceAccount(fixture({ authError: { name: "AuthSessionMissingError" } }).client), { role: "guest", id: null });
});
test("client and existing professional use the workspace's artist-owner check", async () => {
  assert.equal((await resolveMarketplaceAccount(fixture({ user: { id: "client" } }).client)).role, "client");
  assert.equal((await resolveMarketplaceAccount(fixture({ user: { id: "pro" }, artist: { id: "pro" } }).client)).role, "professional");
});
test("pending professional onboarding cannot receive client-only actions", async () => {
  assert.equal((await resolveMarketplaceAccount(fixture({ user: { id: "pending", user_metadata: { account_type: "artist" } } }).client)).role, "professional");
});
test("auth and role failures fail closed instead of granting client access", async () => {
  await assert.rejects(resolveMarketplaceAccount(fixture({ authError: { name: "NetworkError" } }).client));
  await assert.rejects(resolveMarketplaceAccount(fixture({ user: { id: "x" }, roleError: new Error("Unavailable") }).client));
});
test("local libraries use distinct account keys and empty libraries are independent", () => {
  assert.notEqual(lookStorageKey("client-one"), lookStorageKey("client-two"));
  const one = emptyLookLibrary(); one.saved.push("look"); one.demoArtists.push("artist");
  assert.deepEqual(emptyLookLibrary().saved, []);
  assert.deepEqual(emptyLookLibrary().demoArtists, []);
});
test("corrupt or invalid browser data cannot become library state", () => {
  for (const raw of ["broken", "null", '{"saved":[2],"folders":[],"membership":{}}', '{"saved":[],"folders":[],"membership":{"x":3}}']) {
    assert.deepEqual(parseLookLibrary(raw), emptyLookLibrary());
  }
});
test("look pins, artist bookmarks and drafts remain separate through reload", () => {
  const state = emptyLookLibrary(); state.saved.push("look-one"); state.membership["look-one"] = "Birthday look";
  state.drafts["look-one"] = "Reference notes";
  const restored = parseLookLibrary(JSON.stringify(state));
  assert.deepEqual(restored.saved, ["look-one"]);
  assert.equal(restored.demoArtists.length, 0);
  assert.equal(restored.drafts["look-one"], "Reference notes");
  restored.demoArtists.push("demo-artist");
  assert.deepEqual(restored.saved, ["look-one"]);
});


test("marketplace role resolution can share the workspace auth read without an extra getUser", async () => {
  const f = fixture({ artist: { id: "pro" } });
  f.client.auth.getUser = async () => { throw new Error("Duplicate SDK read"); };
  assert.deepEqual(await resolveMarketplaceAccount(f.client, async () => ({ id: "pro" } as User)), { role: "professional", id: "pro" });
  assert.deepEqual(f.queries, ["artists"]);
});
test("a transient shared auth failure stays failed closed; a signed-out read skips role queries", async () => {
  const f = fixture();
  await assert.rejects(resolveMarketplaceAccount(f.client, async () => { throw new Error("Lock busy"); }), /Lock busy/);
  assert.deepEqual(f.queries, []);
  assert.deepEqual(await resolveMarketplaceAccount(f.client, async () => null), { role: "guest", id: null });
  assert.deepEqual(f.queries, []);
});
