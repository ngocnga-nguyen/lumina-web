import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientsPage = readFileSync(
  new URL("../app/dashboard/clients/page.tsx", import.meta.url),
  "utf8"
);

test("desktop client rows use one restrained responsive relationship list", () => {
  assert.match(clientsPage, /max-h-\[70dvh\][\s\S]*overflow-y-auto/);
  assert.match(clientsPage, /sticky top-0 z-10/);
  assert.match(clientsPage, /bg-lumina-surface\/95/);
  assert.doesNotMatch(clientsPage, /bg-lumina-black\/85/);
});

test("client identity and useful relationship context outrank visit counts", () => {
  assert.match(clientsPage, /<ClientIdentity client=\{client\} \/>/);
  assert.match(clientsPage, /<ClientRelationship client=\{client\} \/>/);
  assert.match(clientsPage, /<ClientHistory client=\{client\} \/>/);
  assert.match(clientsPage, /Upcoming appointment/);
  assert.match(clientsPage, /Most recent service/);
  assert.match(clientsPage, /Latest request/);
  assert.match(clientsPage, /client\.totalCompletedVisits === 0/);
});

test("desktop presentation preserves the existing Client Card destination", () => {
  const links = clientsPage.match(/href=\{`\/dashboard\/clients\/\$\{client\.clientId\}`\}/g) || [];
  assert.equal(links.length, 1);
  assert.doesNotMatch(clientsPage, /visibleClients\.slice/);
});

test("list controls and restrained row menus are outside the historical data model", () => {
  assert.match(clientsPage, /ProfessionalClientListControls/);
  assert.match(clientsPage, /ProfessionalClientRowMenu/);
  assert.match(clientsPage, /\.update\(\{ archived_at: archivedAt \}\)[\s\S]*\.eq\("id", clientId\)/);
  assert.match(clientsPage, /source: "manual"/);
  assert.match(clientsPage, /archived_at: archivedAt/);
  assert.doesNotMatch(clientsPage, /Delete client/);
});
