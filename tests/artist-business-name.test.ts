import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260910150000_add_artist_business_name_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const signupPage = readFileSync(
  new URL("../app/artist-signup/page.tsx", import.meta.url),
  "utf8"
);
const profileEditor = readFileSync(
  new URL("../app/dashboard/profile/page.tsx", import.meta.url),
  "utf8"
);
const publicProfile = readFileSync(
  new URL("../app/artist/[slug]/page.tsx", import.meta.url),
  "utf8"
);
const artistCard = readFileSync(
  new URL("../components/ArtistCard.tsx", import.meta.url),
  "utf8"
);

test("the migration adds a nullable constrained public business name without rewriting existing rows", () => {
  assert.match(migration, /add column if not exists business_name text null/);
  assert.match(migration, /artists_business_name_check/);
  assert.match(
    migration,
    /business_name is null\s+or char_length\(btrim\(business_name\)\) between 1 and 160/
  );
  assert.doesNotMatch(migration, /\nupdate public\.artists/i);
  assert.doesNotMatch(migration, /professional_license_verifications/);
  assert.doesNotMatch(migration, /auth\.users/);
});

test("column privileges preserve the existing owner-RLS model", () => {
  assert.match(
    migration,
    /grant update \(business_name\) on table public\.artists to authenticated/
  );
  assert.match(
    migration,
    /grant insert \(business_name\) on table public\.artists to authenticated/
  );
  assert.doesNotMatch(migration, /disable row level security/i);
});

test("professional signup stores the two explicit identity fields independently", () => {
  assert.match(signupPage, /name: professionalName/);
  assert.match(signupPage, /business_name: publicBusinessName/);
  assert.doesNotMatch(signupPage, /displayName/);
  assert.doesNotMatch(signupPage, /\$\{.*\}\s*\(\$\{/);
});

test("profile settings no longer infer or recombine a business name", () => {
  assert.match(profileEditor, /name: savedName/);
  assert.match(profileEditor, /business_name: data\.business_name \|\| ""/);
  assert.match(profileEditor, /name: cleanName/);
  assert.match(profileEditor, /business_name: cleanBusinessName \|\| null/);
  assert.doesNotMatch(profileEditor, /businessMatch/);
  assert.doesNotMatch(profileEditor, /const publicName/);
});

test("public identity surfaces render business name only when explicitly present", () => {
  assert.match(publicProfile, /artist\.business_name &&/);
  assert.match(artistCard, /artist\.business_name &&/);
  assert.match(publicProfile, /averageRating\.toFixed\(1\)/);
  assert.match(publicProfile, /mobileServiceChips/);
  assert.doesNotMatch(publicProfile, /repeat_client_rate[^?]*%/);
});
