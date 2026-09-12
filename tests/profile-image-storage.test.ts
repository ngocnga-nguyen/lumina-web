import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createProfileImagePath,
  getProfileImageValidationError,
  PROFILE_IMAGE_MAX_BYTES,
} from "../lib/profile-image-storage.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260911160000_harden_profile_image_storage_v1.sql",
    import.meta.url
  ),
  "utf8"
);

const accountPage = readFileSync(
  new URL("../app/account/page.tsx", import.meta.url),
  "utf8"
);
const dashboardPage = readFileSync(
  new URL("../app/dashboard/page.tsx", import.meta.url),
  "utf8"
);
const profilePage = readFileSync(
  new URL("../app/dashboard/profile/page.tsx", import.meta.url),
  "utf8"
);

test("profile image bucket remains public with strict MIME and size limits", () => {
  assert.match(migration, /'profile-images'/);
  assert.match(migration, /true,\s+5242880/s);
  assert.match(
    migration,
    /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/
  );
  assert.match(migration, /for select\s+to public/s);
});

test("unsafe live bucket-only write policies are replaced", () => {
  for (const name of [
    "Anyone can upload profile images",
    "Anyone can view profile images",
    "Artists can update profile images",
    "Artists can delete profile images",
  ]) {
    assert.match(migration, new RegExp(`drop policy if exists "${name}"`));
  }

  assert.doesNotMatch(migration, /for (insert|update|delete)\s+to (public|anon)/i);
});

test("new profile image writes require exactly the authenticated owner folder", () => {
  assert.match(
    migration,
    /for insert\s+to authenticated\s+with check[\s\S]*bucket_id = 'profile-images'/
  );
  assert.match(
    migration,
    /cardinality\(storage\.foldername\(name\)\) = 1/
  );
  assert.match(
    migration,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/
  );
  assert.match(migration, /for update\s+to authenticated\s+using[\s\S]*with check/);
  assert.match(migration, /for delete\s+to authenticated\s+using/);
});

test("legacy root objects remain readable and only owner-prefixed legacy deletion is allowed", () => {
  assert.match(migration, /cardinality\(storage\.foldername\(name\)\) = 0/);
  assert.match(
    migration,
    /name like \(select auth\.uid\(\)\)::text \|\| '-%'/
  );
  const insertPolicy = migration.match(
    /create policy "Users can upload their own profile images"[\s\S]*?;\n\n/
  )?.[0];
  assert.ok(insertPolicy);
  assert.doesNotMatch(
    insertPolicy,
    /cardinality\(storage\.foldername\(name\)\) = 0/
  );
  assert.doesNotMatch(migration, /update storage\.objects|delete from storage\.objects/i);
});

test("profile image validation matches bucket restrictions", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(
      getProfileImageValidationError({ type, size: PROFILE_IMAGE_MAX_BYTES }),
      null
    );
  }

  assert.match(
    getProfileImageValidationError({ type: "image/gif", size: 10 }) || "",
    /JPEG, PNG, or WebP/
  );
  assert.match(
    getProfileImageValidationError({
      type: "image/png",
      size: PROFILE_IMAGE_MAX_BYTES + 1,
    }) || "",
    /smaller than 5 MB/
  );
});

test("new profile image paths are randomized and owner-folder scoped", () => {
  const ownerId = "8fca7a3d-ce39-4924-a9be-c8eaada772f9";
  const first = createProfileImagePath(ownerId, "image/png");
  const second = createProfileImagePath(ownerId, "image/png");

  assert.match(first, new RegExp(`^${ownerId}/[^/]+\\.png$`));
  assert.notEqual(first, second);
  assert.match(createProfileImagePath(ownerId, "image/jpeg"), /\.jpg$/);
  assert.match(createProfileImagePath(ownerId, "image/webp"), /\.webp$/);
  assert.throws(
    () => createProfileImagePath(ownerId, "image/gif"),
    /Unsupported profile image type/
  );
});

test("every active profile image uploader uses the shared hardened path", () => {
  for (const source of [accountPage, dashboardPage, profilePage]) {
    assert.match(source, /uploadProfileImageToStorage\(file, user\.id\)/);
    assert.doesNotMatch(source, /`\$\{user\.id\}-\$\{Date\.now\(\)\}/);
  }
});
