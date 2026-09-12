import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getArtistCoverImageClass,
  getArtistCoverOverlayClass,
  normalizeArtistCoverStyle,
} from "../lib/artist-cover-style.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260911120000_add_artist_cover_image_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const policyFixMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260911130000_fix_artist_cover_image_storage_policy.sql",
    import.meta.url
  ),
  "utf8"
);
const coverStyleMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260911140000_add_artist_cover_style_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const coverStyleHelper = readFileSync(
  new URL("../lib/artist-cover-style.ts", import.meta.url),
  "utf8"
);
const coverEditor = readFileSync(
  new URL("../components/ProfessionalProfileMediaEditor.tsx", import.meta.url),
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
    policyFixMigration,
    /for insert\s+to authenticated\s+with check[\s\S]*bucket_id = 'artist-cover-images'/
  );
  assert.match(
    policyFixMigration,
    /array_length\(storage\.foldername\(name\), 1\) = 1/
  );
  assert.doesNotMatch(
    policyFixMigration,
    /array_length\(storage\.foldername\(name\), 1\) = 2/
  );
  assert.match(
    policyFixMigration,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/
  );
  assert.match(
    policyFixMigration,
    /exists \([\s\S]*from public\.artists artist[\s\S]*artist\.id = \(select auth\.uid\(\)\)/
  );
  assert.match(policyFixMigration, /for select\s+to authenticated\s+using/);
  assert.match(policyFixMigration, /for delete\s+to authenticated\s+using/);
  assert.doesNotMatch(
    policyFixMigration,
    /for (insert|delete)\s+to anon/i
  );
  assert.doesNotMatch(policyFixMigration, /disable row level security/i);
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

test("cover style migration uses a safe natural default and an exact allowlist", () => {
  assert.match(
    coverStyleMigration,
    /add column if not exists cover_style text not null default 'natural'/
  );
  assert.match(
    coverStyleMigration,
    /cover_style in \('natural', 'soft_blur', 'softened'\)/
  );
  assert.match(
    coverStyleMigration,
    /grant select \(cover_style\) on table public\.artists to anon, authenticated/
  );
  assert.match(
    coverStyleMigration,
    /grant update \(cover_style\) on table public\.artists to authenticated/
  );
  assert.doesNotMatch(coverStyleMigration, /disable row level security/i);
  assert.doesNotMatch(coverStyleMigration, /professional_activation_row_ready/);
  assert.doesNotMatch(coverStyleMigration, /set\s+is_active/i);
});

test("cover style rendering is centralized and rejects unknown presentation values", () => {
  assert.match(coverStyleHelper, /value: "natural"/);
  assert.match(coverStyleHelper, /value: "soft_blur"/);
  assert.match(coverStyleHelper, /value: "softened"/);
  assert.match(coverStyleHelper, /: "natural";/);
  assert.match(coverStyleHelper, /object-cover blur-\[2px\]/);
  assert.match(coverStyleHelper, /saturate-\[0\.82\].*contrast-\[0\.9\]/s);
  assert.match(coverStyleHelper, /bg-lumina-pearl\/20/);
  assert.equal(normalizeArtistCoverStyle("unexpected"), "natural");
  assert.equal(normalizeArtistCoverStyle(null), "natural");
  assert.match(getArtistCoverImageClass("soft_blur"), /blur-\[2px\]/);
  assert.match(getArtistCoverImageClass("softened"), /saturate-\[0\.82\]/);
  assert.equal(getArtistCoverOverlayClass("natural"), null);
  assert.match(
    getArtistCoverOverlayClass("softened") || "",
    /bg-lumina-pearl\/20/
  );
});

test("professional cover editing validates and persists owner-prefixed randomized uploads", () => {
  assert.match(coverEditor, /COVER_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(coverEditor, /\["image\/jpeg", "jpg"\]/);
  assert.match(coverEditor, /\["image\/png", "png"\]/);
  assert.match(coverEditor, /\["image\/webp", "webp"\]/);
  assert.match(coverEditor, /crypto\.randomUUID/);
  assert.match(coverEditor, /`\$\{ownerId\}\/\$\{crypto\.randomUUID\(\)\}\.\$\{extension\}`/);
  assert.match(coverEditor, /cover_image_url: nextUrl/);
  assert.match(coverEditor, /cover_image_url: null/);
  assert.match(coverEditor, /getOwnedStoragePath\(imageUrl, COVER_BUCKET, user\.id\)/);
});

test("professional settings keeps cover and profile photo editing separate", () => {
  assert.match(profileEditor, /ProfessionalProfileMediaEditor/);
  assert.match(profileEditor, /cover_image_url: data\.cover_image_url \|\| ""/);
  assert.match(
    profileEditor,
    /cover_style: normalizeArtistCoverStyle\(data\.cover_style\)/
  );
  assert.match(profileEditor, /profile_image_url: data\.profile_image_url \|\| ""/);
  assert.match(profileEditor, /cover_image_url: form\.cover_image_url \|\| null/);
  assert.match(profileEditor, /cover_style: form\.cover_style/);
  assert.match(coverEditor, /Appearance/);
  assert.match(coverEditor, /mode === "cover"/);
  assert.match(coverEditor, /mode === "avatar"/);
});

test("public mobile cover uses the approved fallback order and owner-gated edit controls", () => {
  assert.match(
    publicProfile,
    /artist\.cover_image_url \|\|\s+portfolioPhotos\[0\]\?\.image_url \|\|\s+artist\.profile_image_url \|\|\s+null/
  );
  assert.match(publicProfile, /src=\{mobileCoverImage\}/);
  assert.match(publicProfile, /normalizeArtistCoverStyle\(artist\.cover_style\)/);
  assert.match(publicProfile, /className=\{mobileCoverImageClass\}/);
  assert.match(publicProfile, /backdrop-blur-\[12px\]/);
  assert.match(publicProfile, /isOwnProfile && mediaEditorMode/);
  assert.match(publicProfile, /ProfessionalProfileMediaEditor/);
  assert.match(coverEditor, /Only the profile owner can edit this media/);
  assert.doesNotMatch(publicProfile, /bg-gradient-to-t/);
});

test("mobile avatar keeps real images opaque with a transparent backing and a light fallback", () => {
  assert.match(
    publicProfile,
    /artist\.profile_image_url \? "bg-transparent" : "bg-lumina-pearl"/
  );
  assert.match(publicProfile, /border border-lumina-surface\/65/);
  assert.doesNotMatch(publicProfile, /border-2 border-lumina-surface\/90/);
  assert.match(
    publicProfile,
    /src=\{artist\.profile_image_url\}[\s\S]*className="h-full w-full object-cover"/
  );
  assert.match(profileEditor, /setMediaEditorMode\("avatar"\)/);
  assert.match(coverEditor, /createCroppedProfileImage/);
});
