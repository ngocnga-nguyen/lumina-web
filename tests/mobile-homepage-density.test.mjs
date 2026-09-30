import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const home = read("app/page.tsx");
const css = read("app/homepage.module.css");

test("homepage Auth, public query, ordering and search logic are byte-for-byte unchanged", () => {
  const logic = home.slice(home.indexOf("export default function"), home.indexOf("  return (\n    <main"));
  assert.equal(hash(logic), "8f34b26df30730bc65addddb8fd1eca59d8d1e04f0ce154ad423f708025cea47");
});

test("all density styles are phone-only with no tablet/desktop overrides", () => {
  const nodes = postcss.parse(css).nodes.filter(node => node.type !== "comment");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "atrule");
  assert.equal(nodes[0].name, "media");
  assert.equal(nodes[0].params, "(max-width: 639px)");
  assert.match(home, /styles\.mobileHome/);
});

test("single and multiple homepage cards opt in; skeleton matches the taller 4:3 image", () => {
  assert.equal((home.match(/styles\.discoveryCard\}/g) || []).length, 2);
  assert.match(css, /\.discoveryCard > div:first-child,\s*\.discoverySkeleton \{ height: auto; aspect-ratio: 4 \/ 3; \}/);
  assert.match(css, /\.filters > a \{[^}]*min-height: 44px/);
  assert.doesNotMatch(css, /display:\s*none|pointer-events|\.discoveryCard[^}]*button/);
});

test("shared cards, Save, Search, and login remain untouched", () => {
  const expected = {
    "components/ArtistCard.tsx": "91b3e03ef783d20b0a9af3a0a58b03cc1450e692935685e4762c62a9b96a3d15",
    "components/SaveArtistButton.tsx": "0d3cb0fca49669e3c815506c20fa80f2c3843e58097df11c56531a8232737615",
    "components/SearchBar.tsx": "e6af811e63d1c790e72babd24d0d920842acb0c666821185850678f6ccb1be84",
    "app/login/page.tsx": "dffa36e5c587113476171a8c48adf6b2a7866dcc242a57564d01fbf43dcbcf56",
  };
  for (const [path, value] of Object.entries(expected)) assert.equal(hash(read(path)), value, path);
  for (const href of ["/browse?panel=category", "/browse?panel=price", "/browse?nearby=1", "/browse/map", "/browse?panel=filters"]) assert.ok(home.includes(`href="${href}"`));
});

test("phone discovery uses a 250px native rail without duplicating professionals", () => {
  assert.match(css, /\.discovery \.discoveryCards \{[^}]*display: flex;[^}]*gap: 14px;[^}]*overflow-x: auto;[^}]*scroll-snap-type: x proximity;/);
  assert.match(css, /\.discovery \.discoveryCards > \* \{[^}]*width: 250px;[^}]*max-width: calc\(100vw - 40px\);[^}]*flex-shrink: 0;/);
  assert.match(home, /artists\.length === 1/);
  assert.equal((home.match(/artist=\{artists\[0\]\}/g) || []).length, 1);
  assert.match(home, /artists\.slice\(0, 8\)\.map\(\(artist\) =>/);
  assert.doesNotMatch(home, /concat\(artists|\.\.\.artists|carouselArrow|scrollBy\(/);
});
