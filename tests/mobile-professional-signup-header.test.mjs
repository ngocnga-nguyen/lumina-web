import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const page = read("app/join-as-artist/page.tsx");
const header = page.slice(page.indexOf("<header"), page.indexOf("</header>"));

test("only phone-only header class overrides differ from the approved page", () => {
  const withoutPhoneOverrides = page.replace(/ max-sm:[^\s"]+/g, "");
  assert.equal(hash(withoutPhoneOverrides), "a3197a71b7de19486ff48ca5f5e129b0b63cff88bcb3695913aca96d25e2b2c3");
  assert.doesNotMatch(page.slice(page.indexOf("</header>")), /max-sm:/);
});

test("phone header separates identity and actions without changing desktop grid", () => {
  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(header, /max-sm:flex max-sm:h-16 max-sm:justify-between max-sm:px-4/);
  assert.match(header, /sm:w-\[132px\] max-sm:w-\[100px\]/);
  assert.match(header, /max-sm:gap-3 max-sm:text-\[13px\] max-sm:whitespace-nowrap/);
});

test("Browse and Login retain routes, readable labels and comfortable targets", () => {
  assert.match(header, /href="\/browse"[^>]*max-sm:min-h-11 max-sm:min-w-11/);
  assert.match(header, /href="\/login"[^>]*max-sm:h-10/);
  assert.match(header, /aria-label="Lumina home"/);
  assert.match(header, />\s*Browse\s*<\/Link>/);
  assert.match(header, />\s*Login\s*<\/Link>/);
});

test("professional signup and login remain reachable from the landing page", () => {
  assert.match(page, /href="\/artist-signup"/);
  assert.match(page, /href="\/login"/);
});
