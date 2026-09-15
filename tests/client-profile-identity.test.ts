import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getClientIdentityInitials,
  normalizeClientAvatarUrl,
  resolveClientIdentity,
} from "../lib/client-identity.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260915120000_add_client_profile_avatar_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const accountPage = readFileSync(
  new URL("../app/account/page.tsx", import.meta.url),
  "utf8"
);
const clientsPage = readFileSync(
  new URL("../app/dashboard/clients/page.tsx", import.meta.url),
  "utf8"
);
const clientCard = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/page.tsx", import.meta.url),
  "utf8"
);
const requestsPage = readFileSync(
  new URL("../app/dashboard/requests/page.tsx", import.meta.url),
  "utf8"
);
const inboxHook = readFileSync(
  new URL("../lib/use-request-inbox.ts", import.meta.url),
  "utf8"
);
const avatar = readFileSync(
  new URL("../components/IdentityAvatar.tsx", import.meta.url),
  "utf8"
);
const identityQuery = readFileSync(
  new URL("../lib/client-identity-query.ts", import.meta.url),
  "utf8"
);
const professionalReviews = readFileSync(
  new URL("../components/ProfessionalReviewsWorkspace.tsx", import.meta.url),
  "utf8"
);

test("migration adds a nullable canonical avatar while preserving profiles RLS", () => {
  assert.match(migration, /add column if not exists avatar_url text null/);
  assert.match(migration, /public\.profiles must exist with row level security enabled/);
  assert.match(migration, /to_regclass\('auth\.users'\)/);
  assert.match(migration, /grant select \(avatar_url\).*authenticated/);
  assert.match(migration, /grant insert \(avatar_url\), update \(avatar_url\).*authenticated/);
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update)[^;]*\bto\s+(?:anon|public)\b/i
  );
  assert.doesNotMatch(migration, /disable row level security/i);
  assert.doesNotMatch(migration, /create policy|alter policy/i);
});

test("related professional reads return only basic identity for an existing request relationship", () => {
  assert.match(migration, /get_related_client_identities/);
  assert.match(migration, /returns table \(\s*id uuid,\s*full_name text,\s*avatar_url text/s);
  assert.match(migration, /request\.client_id = profile\.id/);
  assert.match(migration, /request\.artist_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /revoke all on function .* from public/);
  assert.match(migration, /grant execute on function .* to authenticated/);
  assert.match(identityQuery, /supabase\.rpc/);
  assert.match(identityQuery, /get_related_client_identities/);
});

test("backfill copies only matching non-artist public profile-image URLs", () => {
  assert.match(migration, /auth_user\.id = profile\.id/);
  assert.match(migration, /profile\.avatar_url is null/);
  assert.match(migration, /not exists[\s\S]*from public\.artists/);
  assert.match(migration, /storage\/v1\/object\/public\/profile-images/);
  assert.doesNotMatch(migration, /update public\.client_requests/i);
  assert.doesNotMatch(migration, /artist_client_(?:cards|notes)/i);
});

test("client account keeps canonical profile identity and Auth metadata synchronized", () => {
  assert.match(accountPage, /select\("full_name, avatar_url"\)/);
  assert.match(accountPage, /avatar_url: profileImageUrl \|\| null/);
  assert.match(accountPage, /supabase\.auth\.updateUser/);
  assert.match(accountPage, /setProfileImageUrl\(""\)/);
  assert.match(accountPage, /avatar_url: savedProfileImageUrl \|\| null/);
});

test("shared identity resolution prefers current profile data and validates avatars", () => {
  const resolved = resolveClientIdentity(
    "client-1",
    {
      id: "client-1",
      full_name: "Current Client",
      avatar_url: "https://example.com/current.png",
    },
    "Historical Name"
  );
  assert.equal(resolved.name, "Current Client");
  assert.equal(resolved.avatarUrl, "https://example.com/current.png");
  assert.equal(
    resolveClientIdentity("client-1", null, "Historical Name").name,
    "Historical Name"
  );
  assert.equal(normalizeClientAvatarUrl("javascript:alert(1)"), null);
  assert.equal(normalizeClientAvatarUrl("not a url"), null);
  assert.equal(getClientIdentityInitials("Mina Rose"), "MR");
});

test("professional identity surfaces load the canonical profile avatar", () => {
  for (const source of [clientsPage, clientCard, requestsPage, inboxHook]) {
    assert.match(source, /loadRelatedClientIdentities/);
  }
  assert.match(clientsPage, /visibilitychange/);
  assert.match(clientCard, /visibilitychange/);
  assert.match(requestsPage, /visibilitychange/);
  assert.match(inboxHook, /visibilitychange/);
});

test("failed avatar URLs remain hidden behind an initials fallback", () => {
  assert.match(avatar, /opacity-0/);
  assert.match(avatar, /onError/);
  assert.match(avatar, /getClientIdentityInitials/);
});

test("professional reviews keep immutable reviewer snapshots and do not add avatars", () => {
  assert.match(professionalReviews, /review\.reviewer_name/);
  assert.doesNotMatch(professionalReviews, /avatar_url|IdentityAvatar/);
});
