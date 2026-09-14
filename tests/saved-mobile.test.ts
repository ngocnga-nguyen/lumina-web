import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/saved/page.tsx", import.meta.url), "utf8");
const row = readFileSync(
  new URL("../components/SavedArtistMobileRow.tsx", import.meta.url),
  "utf8"
);
const compare = readFileSync(
  new URL("../components/SavedCompareMobile.tsx", import.meta.url),
  "utf8"
);
const saveButton = readFileSync(
  new URL("../components/SaveArtistButton.tsx", import.meta.url),
  "utf8"
);
const publicArtistImage = readFileSync(
  new URL("../components/PublicArtistImage.tsx", import.meta.url),
  "utf8"
);

test("Saved keeps mobile and desktop presentations separated at lg", () => {
  assert.match(page, /className="lg:hidden"/);
  assert.match(page, /className="hidden lg:block"/);
  assert.match(page, /SavedCompareMobile/);
  assert.match(page, /Search saved professionals/);
  assert.match(page, /Select to compare/);
  assert.match(page, /Compare \{selectedCompareIds\.length\}/);
  assert.match(page, /from\("portfolio_images"\)/);
});

test("mobile saved rows are dense, selectable, and keep direct profile navigation", () => {
  assert.match(row, /grid-cols-\[96px_minmax\(0,1fr\)\]/);
  assert.match(row, /role=\{selectionMode \? "checkbox" : "link"\}/);
  assert.match(row, /router\.push\(`\/artist\/\$\{artist\.id\}`\)/);
  assert.match(row, /onLongPressSelect/);
  assert.match(row, /}, 550\)/);
  assert.match(row, /Math\.hypot\(horizontalMovement, verticalMovement\) > 12/);
  assert.match(row, /isInteractiveTarget\(event\.target\)/);
  assert.match(row, /selectionMode && selected/);
  assert.match(row, /bg-lumina-blush\/50/);
  assert.match(row, /ring-lumina-attention\/20/);
  assert.match(row, /bg-lumina-black text-white/);
  assert.match(row, /SaveArtistButton/);
  assert.match(row, /compactGlass/);
  assert.match(row, /From \$\{artist\.price_start\}/);
  assert.match(saveButton, /h-10 w-10/);
  assert.match(saveButton, /h-7 w-7/);
  assert.match(saveButton, /size=\{13\}/);
  assert.match(publicArtistImage, /profileSource \|\| portfolioSource/);
  assert.match(publicArtistImage, /onError=\{tryFallback\}/);
  assert.match(publicArtistImage, /image\?\.complete/);
  assert.match(publicArtistImage, /image\.naturalWidth > 0/);
  assert.match(publicArtistImage, /imageLoaded \? "opacity-100" : "opacity-0"/);
});

test("mobile comparison uses two columns and a snap rail for three", () => {
  assert.match(compare, /threeArtists/);
  assert.match(compare, /grid grid-cols-2 gap-3/);
  assert.match(compare, /snap-x snap-mandatory/);
  assert.match(compare, /Back to Saved/);
  assert.match(compare, /View profile/);
  assert.match(compare, /artist\.services\.slice\(0, 3\)/);
  assert.match(compare, /bg-\[rgba\(255,255,255,0\.78\)\]/);
  assert.match(compare, /backdrop-blur-md/);
  assert.match(compare, /border-lumina-border\/45/);
});
