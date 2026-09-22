import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cardPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/page.tsx", import.meta.url),
  "utf8"
);
const cardSection = readFileSync(
  new URL("../components/ClientCardSection.tsx", import.meta.url),
  "utf8"
);

test("desktop Client Card prioritizes identity and one relationship summary", () => {
  const desktop = cardPage.split('<div className="hidden lg:block">')[1];
  assert.ok(desktop);
  assert.match(desktop, /Lumina client/);
  assert.match(desktop, /Added manually/);
  assert.match(desktop, /Next appointment/);
  assert.match(desktop, /Most recent service/);
  assert.doesNotMatch(desktop, /<OverviewStat/);
});

test("desktop messaging and request actions remain limited to linked clients", () => {
  const desktop = cardPage.split('<div className="hidden lg:block">')[1];
  assert.ok(desktop);
  assert.match(desktop, /card\?\.source !== "manual" && relevantRequest/);
  assert.match(desktop, /href=\{messageHref\}/);
  assert.match(desktop, /href=\{requestWorkspaceHref\}/);
  assert.match(desktop, /Private contact/);
});

test("desktop modules retain persisted order, visibility, and collapse with lighter surfaces", () => {
  assert.match(cardPage, /workspacePreferences\.order\.filter/);
  assert.match(cardPage, /workspacePreferences\.hidden\.includes/);
  assert.match(cardPage, /workspacePreferences\.collapsed\.includes/);
  assert.match(cardPage, /primarySections\.map\(\(section\) => renderSection\(section\)\)/);
  assert.match(cardPage, /supportingSections\.map\(\(section\) => renderSection\(section\)\)/);
  assert.match(cardSection, /border-b border-lumina-border\/70 bg-lumina-surface/);
  assert.match(cardSection, /variant === "mobile"/);
});
