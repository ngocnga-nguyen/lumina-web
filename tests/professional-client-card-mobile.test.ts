import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listPage = readFileSync(
  new URL("../app/dashboard/clients/page.tsx", import.meta.url),
  "utf8"
);
const mobileList = readFileSync(
  new URL("../components/ProfessionalClientsMobileList.tsx", import.meta.url),
  "utf8"
);
const cardPage = readFileSync(
  new URL("../app/dashboard/clients/[clientId]/page.tsx", import.meta.url),
  "utf8"
);

test("mobile Clients uses initials-only relationship rows and service-aware search", () => {
  assert.match(listPage, /requested_services/);
  assert.match(listPage, /ProfessionalClientsMobileList/);
  assert.match(listPage, /orderProfessionalClientsForMobile/);
  assert.match(mobileList, /getInitials\(client\.name\)/);
  assert.match(mobileList, /nextAppointmentService/);
  assert.match(mobileList, /newestRequestService/);
  assert.match(mobileList, /lg:hidden/);
  assert.doesNotMatch(mobileList, /profileImageUrl/);
});

test("mobile Client Card preserves workspace ordering and professional-only modules", () => {
  assert.match(cardPage, /workspacePreferences\.order\.filter/);
  assert.match(cardPage, /workspacePreferences\.hidden\.includes/);
  assert.match(cardPage, /MOBILE_SECTION_LABELS/);
  assert.match(cardPage, /Private notes/);
  assert.match(cardPage, /Service preferences/);
  assert.match(cardPage, /Results \/ Photos/);
  assert.match(cardPage, /Consultation/);
  assert.match(cardPage, /lg:hidden/);
  assert.match(cardPage, /hidden lg:block/);
});

test("mobile Client Card links into shared Requests and Messages workspaces", () => {
  assert.match(cardPage, /`\/dashboard\/messages\?request=\$\{relevantRequest\.id\}`/);
  assert.match(cardPage, /`\/dashboard\/requests\?request=\$\{relevantRequest\.id\}`/);
  assert.doesNotMatch(cardPage, /request_updates/);
});
