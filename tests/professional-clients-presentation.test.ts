import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientsPage = readFileSync(
  new URL("../app/dashboard/clients/page.tsx", import.meta.url),
  "utf8"
);

test("desktop client rows scroll below a sticky dark-glass header", () => {
  assert.match(clientsPage, /max-h-\[65dvh\][\s\S]*overflow-y-auto/);
  assert.match(clientsPage, /sticky top-0 z-10/);
  assert.match(clientsPage, /bg-lumina-black\/85/);
  assert.match(clientsPage, /text-lumina-pearl/);
  assert.match(clientsPage, /backdrop-blur-\[12px\]/);
});

test("desktop table and compact card list use separate responsive presentations", () => {
  assert.match(clientsPage, /hidden overflow-hidden rounded-\[24px\][\s\S]*xl:block/);
  assert.match(clientsPage, /sm:grid-cols-2/);
  assert.match(clientsPage, /xl:hidden/);
  assert.match(clientsPage, /ClientCardDetail label="Last service"/);
  assert.match(clientsPage, /ClientCardDetail label="Completed visits"/);
});

test("both presentations preserve the existing Client Card destination", () => {
  const links = clientsPage.match(/href=\{`\/dashboard\/clients\/\$\{client\.clientId\}`\}/g) || [];
  assert.equal(links.length, 2);
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
