import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getArtistCoverFramingStyle,
  normalizeArtistCoverFraming,
} from "../lib/artist-cover-framing.ts";
import {
  getProfileMediaExtension,
  getProfileMediaOutputType,
} from "../lib/profile-media-image.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260911150000_add_artist_cover_framing_v1.sql",
    import.meta.url
  ),
  "utf8"
);
const editor = readFileSync(
  new URL("../components/ProfessionalProfileMediaEditor.tsx", import.meta.url),
  "utf8"
);
const imageHelper = readFileSync(
  new URL("../lib/profile-media-image.ts", import.meta.url),
  "utf8"
);
const publicProfile = readFileSync(
  new URL("../app/artist/[slug]/page.tsx", import.meta.url),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../app/dashboard/page.tsx", import.meta.url),
  "utf8"
);
const profileSettings = readFileSync(
  new URL("../app/dashboard/profile/page.tsx", import.meta.url),
  "utf8"
);

test("cover framing migration adds exact defaults, ranges, and column privileges", () => {
  assert.match(migration, /cover_position_x numeric\(4,3\) not null default 0\.5/);
  assert.match(migration, /cover_position_y numeric\(4,3\) not null default 0\.5/);
  assert.match(migration, /cover_scale numeric\(3,2\) not null default 1\.0/);
  assert.match(migration, /cover_position_x between 0\.0 and 1\.0/);
  assert.match(migration, /cover_position_y between 0\.0 and 1\.0/);
  assert.match(migration, /cover_scale between 1\.0 and 1\.5/);
  assert.match(
    migration,
    /grant update \(cover_position_x, cover_position_y, cover_scale\)[\s\S]*to authenticated/
  );
  assert.doesNotMatch(migration, /disable row level security/i);
  assert.doesNotMatch(migration, /create policy/i);
});

test("cover framing normalizes invalid values and combines blur compensation", () => {
  assert.deepEqual(normalizeArtistCoverFraming(-1, 2, 7), {
    positionX: 0,
    positionY: 1,
    scale: 1.5,
  });
  assert.deepEqual(normalizeArtistCoverFraming(null, undefined, "bad"), {
    positionX: 0.5,
    positionY: 0.5,
    scale: 1,
  });
  assert.deepEqual(
    getArtistCoverFramingStyle(
      { positionX: 0.25, positionY: 0.75, scale: 1.2 },
      "soft_blur"
    ),
    {
      objectPosition: "25% 75%",
      transform: "scale(1.23)",
      transformOrigin: "center",
    }
  );
});

test("one shared editor owns cover framing and avatar crop workflows", () => {
  assert.match(editor, /mode: "cover" \| "avatar"/);
  assert.match(editor, /Drag to reposition/);
  assert.match(editor, /max=\{mode === "cover" \? 1\.5 : 3\}/);
  assert.match(editor, /cover_position_x: normalized\.positionX/);
  assert.match(editor, /cover_position_y: normalized\.positionY/);
  assert.match(editor, /cover_scale: normalized\.scale/);
  assert.match(editor, /cover_position_x: 0\.5/);
  assert.match(editor, /cover_position_y: 0\.5/);
  assert.match(editor, /cover_scale: 1/);
  assert.match(editor, /ARTIST_COVER_STYLES/);
});

test("avatar export preserves PNG alpha and source-compatible formats", () => {
  assert.equal(getProfileMediaOutputType("image/png"), "image/png");
  assert.equal(getProfileMediaOutputType("image/webp"), "image/webp");
  assert.equal(getProfileMediaOutputType("image/jpeg"), "image/jpeg");
  assert.equal(getProfileMediaExtension("image/png"), "png");
  assert.match(imageHelper, /context\.clearRect/);
  assert.doesNotMatch(imageHelper, /fillRect|fillStyle/);
  assert.match(imageHelper, /canvas\.toBlob/);
  assert.match(editor, /uploadProfileImage\(croppedFile, user\.id\)/);
});

test("owner-facing surfaces reuse the editor while public controls stay gated", () => {
  for (const source of [publicProfile, dashboard, profileSettings]) {
    assert.match(source, /ProfessionalProfileMediaEditor/);
    assert.match(source, /setMediaEditorMode\("avatar"\)/);
    assert.match(source, /setMediaEditorMode\("cover"\)/);
  }
  assert.match(publicProfile, /isOwnProfile && \(/);
  assert.match(publicProfile, /isOwnProfile && mediaEditorMode/);
  assert.match(editor, /user\.id !== artistId/);
});

test("public cover consumes persisted framing and keeps a separate mobile hero", () => {
  assert.match(publicProfile, /normalizeArtistCoverFraming\(/);
  assert.match(publicProfile, /style=\{getArtistCoverFramingStyle\(/);
  assert.match(publicProfile, /<section className="md:hidden">/);
  assert.match(publicProfile, /<StorefrontDesktopHero/);
  assert.match(publicProfile, /coverStyle=\{getArtistCoverFramingStyle\(mobileCoverFraming, mobileCoverStyle\)\}/);
});
