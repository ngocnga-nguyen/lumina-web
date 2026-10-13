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

test("responsive Client Overview receives existing identity and relationship data", () => {
  assert.match(cardPage, /<ClientRecordOverview/);
  assert.match(cardPage, /name=\{clientName\}/);
  assert.match(cardPage, /visits=\{completedVisitCount\}/);
  assert.match(cardPage, /lastService=\{lastService/);
  assert.doesNotMatch(cardPage, /<OverviewStat/);
});

test("messaging and request actions remain limited to linked clients", () => {
  assert.match(cardPage, /messageHref=\{card.source !== "manual" && relevantRequest/);
  assert.match(cardPage, /requestsHref=\{card.source !== "manual" && relevantRequest/);
  assert.match(cardPage, /Private contact/);
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
