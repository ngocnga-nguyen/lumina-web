import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("app/artist/[slug]/page.tsx");
const hero = read("components/StorefrontDesktopHero.tsx");
const css = read("app/artist/[slug]/storefront.module.css");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

test("Storefront data, access, requests, reviews and derived state match the Step 8.8A baseline (blank bio is omitted)", () => {
  const logic = source.slice(source.indexOf("type Artist ="), source.indexOf("  return (\n    <main data-lumina-public-page"));
  assert.equal(hash(logic), "747ebe1c36dd89b72f0bb42687961cad4d427582ce86507b2f417897c46915b6");
});

test("mobile hero matches Step 8.8A with blank bio omitted", () => {
  const mobile = source.slice(source.indexOf('      <section className="md:hidden">'), source.indexOf('      <section className="px-4 pb-10'));
  assert.equal(hash(mobile), "f81a0131aec5c1aee0a910f579b7b2d60f5e386b67c9fd312caa9ce9d4a87651");
  assert.match(hero, /hidden md:block/);
  assert.match(css, /@media \(min-width: 768px\)/);
  assert.doesNotMatch(css, /:global|@media \(max-width/);
});

test("lightbox, request modal, media editor and reporting retain the exact baseline", () => {
  assert.equal(hash(source.slice(source.indexOf("      {selectedPortfolioImage && ("))), "199a8e5f6a622de5225e419ac51008c49a9aa94ba8f64a05e51848e2cf6b25c1");
});

test("shared services, media and review markup only gains desktop styling hooks", () => {
  const shared = source.slice(source.indexOf('        <section data-storefront-content'), source.indexOf('      {selectedPortfolioImage && ('))
    .replace(' data-storefront-content', '')
    .replace('                        data-storefront-service\n', '')
    .replace(' data-storefront-results', '')
    .replace(' data-storefront-reviews', '')
    .replace(' data-storefront-response', '');
  assert.equal(hash(shared), "a13dd930d65ae82c907ece2491b6bb2227f188f4f461c22912a63810400cbb88");
});

test("desktop consumes existing cover, framing and Save authority without a second data flow", () => {
  assert.match(source, /coverImage=\{mobileCoverImage\}/);
  assert.match(source, /coverStyle=\{getArtistCoverFramingStyle\(mobileCoverFraming, mobileCoverStyle\)\}/);
  assert.match(source, /saveControl=\{<SaveArtistButton/);
  assert.match(source, /isOwner=\{isOwnProfile\}/);
  assert.doesNotMatch(hero, /supabase|useEffect|\.fetch\(|\.from\(|\.rpc\(|\.channel\(/);
  assert.match(hero, /props.isOwner &&/);
});

test("desktop trust remains factual and secondary rather than an equal-weight tile wall", () => {
  assert.match(hero, /Provided by the professional/);
  assert.match(hero, /Added by professional/);
  assert.match(hero, /props.licenseVerified/);
  assert.match(hero, /props.reviewCount > 0/);
  assert.match(hero, /hidden=\{!props.detailsExpanded\}/);
  assert.doesNotMatch(hero, /Profile Details|repeat_client|trust score|response rate|calendar|Compare/);
  assert.match(hero, /aria-controls="profile-availability-details"/);
});

test("temporary baseline route is removed before handoff", () => {
  assert.equal(existsSync(new URL("../app/storefront-baseline/[slug]/page.tsx", import.meta.url)), false);
});
