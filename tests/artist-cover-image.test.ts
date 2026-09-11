import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260911120000_add_artist_cover_image_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const coverEditor = readFileSync(
  new URL("../components/ProfessionalCoverImageEditor.tsx", import.meta.url),
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

test("cover migration adds a nullable public field without changing activation or existing rows", () => {
  assert.match(
    migration,
    /add column if not exists cover_image_url text null/
  );
  assert.match(migration, /artists_cover_image_url_check/);
  assert.doesNotMatch(migration, /\nupdate public\.artists/i);
  assert.doesNotMatch(migration, /professional_activation_row_ready/);
  assert.doesNotMatch(migration, /set\s+is_active/i);
});

test("cover migration creates a constrained public bucket", () => {
  assert.match(migration, /'artist-cover-images'/);
  assert.match(migration, /true,\s+5242880/s);
  assert.match(
    migration,
    /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/
  );
});

test("storage writes are restricted to an authenticated professional owner folder", () => {
  assert.match(
    migration,
    /for insert\s+to authenticated\s+with check[\s\S]*bucket_id = 'artist-cover-images'/
  );
  assert.match(
    migration,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/
  );
  assert.match(
    migration,
    /exists \([\s\S]*from public\.artists artist[\s\S]*artist\.id = \(select auth\.uid\(\)\)/
  );
  assert.match(migration, /for delete\s+to authenticated\s+using/);
  assert.doesNotMatch(migration, /for (insert|delete)\s+to anon/i);
  assert.doesNotMatch(migration, /disable row level security/i);
});

test("the new artist column follows the existing column-privilege model", () => {
  assert.match(
    migration,
    /grant select \(cover_image_url\) on table public\.artists to anon, authenticated/
  );
  assert.match(
    migration,
    /grant update \(cover_image_url\) on table public\.artists to authenticated/
  );
});

test("professional cover editing validates and persists owner-prefixed randomized uploads", () => {
  assert.match(coverEditor, /COVER_IMAGE_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(coverEditor, /\["image\/jpeg", "jpg"\]/);
  assert.match(coverEditor, /\["image\/png", "png"\]/);
  assert.match(coverEditor, /\["image\/webp", "webp"\]/);
  assert.match(coverEditor, /crypto\.randomUUID/);
  assert.match(coverEditor, /uploadedPath = `\$\{user\.id\}\/\$\{randomName\}/);
  assert.match(coverEditor, /update\(\{ cover_image_url: nextCoverUrl \}\)/);
  assert.match(coverEditor, /update\(\{ cover_image_url: null \}\)/);
  assert.match(coverEditor, /removeStoredCover\(previousCoverUrl, user\.id\)/);
});

test("professional settings keeps cover and profile photo editing separate", () => {
  assert.match(profileEditor, /ProfessionalCoverImageEditor/);
  assert.match(profileEditor, /cover_image_url: data\.cover_image_url \|\| ""/);
  assert.match(profileEditor, /profile_image_url: data\.profile_image_url \|\| ""/);
  assert.match(profileEditor, /cover_image_url: form\.cover_image_url \|\| null/);
});

test("public mobile cover uses the approved fallback order and no public edit control", () => {
  assert.match(
    publicProfile,
    /artist\.cover_image_url \|\|\s+portfolioPhotos\[0\]\?\.image_url \|\|\s+artist\.profile_image_url \|\|\s+null/
  );
  assert.match(publicProfile, /src=\{mobileCoverImage\}/);
  assert.match(publicProfile, /backdrop-blur-\[12px\]/);
  assert.doesNotMatch(publicProfile, /ProfessionalCoverImageEditor/);
  assert.doesNotMatch(publicProfile, /bg-gradient-to-t/);
});
