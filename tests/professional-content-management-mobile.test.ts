import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const servicesPage = readFileSync(
  new URL("../app/dashboard/services/page.tsx", import.meta.url),
  "utf8"
);
const portfolioPage = readFileSync(
  new URL("../app/dashboard/portfolio/page.tsx", import.meta.url),
  "utf8"
);
const mobileSheet = readFileSync(
  new URL("../components/MobileManagementSheet.tsx", import.meta.url),
  "utf8"
);

test("shared mobile editor is safe-area aware, internally scrollable, and tablet centered", () => {
  assert.match(mobileSheet, /max-h-\[92dvh\]/);
  assert.match(mobileSheet, /overflow-x-hidden/);
  assert.match(mobileSheet, /overflow-y-auto/);
  assert.match(mobileSheet, /env\(safe-area-inset-bottom\)/);
  assert.match(mobileSheet, /sm:items-center/);
  assert.match(mobileSheet, /sm:max-w-\[620px\]/);
  assert.match(mobileSheet, /lg:hidden/);
  assert.match(mobileSheet, /document\.body\.style\.overflow = "hidden"/);
});

test("mobile Services uses a compact launcher, dense rows, and selected-only editing", () => {
  assert.match(servicesPage, /View public profile/);
  assert.match(servicesPage, /Add service/);
  assert.match(servicesPage, /whitespace-nowrap/);
  assert.match(servicesPage, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(servicesPage, /From \$\{service\.price\}/);
  assert.match(servicesPage, /Clock3/);
  assert.match(servicesPage, /line-clamp-2/);
  assert.match(servicesPage, /More actions for \$\{service\.service_name\}/);
  assert.match(servicesPage, /setMobileEditorOpen\(true\)/);
  assert.match(servicesPage, /MobileManagementSheet/);
  assert.match(servicesPage, /hidden grid-cols-1 gap-10 lg:grid/);
});

test("mobile Portfolio and Results split the same authoritative entry model", () => {
  assert.match(portfolioPage, /role="tablist"/);
  assert.match(portfolioPage, /Portfolio/);
  assert.match(portfolioPage, /Results/);
  assert.match(portfolioPage, /item\.entry_type === "single_photo"/);
  assert.match(portfolioPage, /item\.entry_type === "before_after"/);
  assert.match(portfolioPage, /grid grid-cols-2 gap-3 sm:grid-cols-3/);
  assert.match(portfolioPage, /grid min-w-0 grid-cols-2/);
  assert.match(portfolioPage, /whitespace-nowrap/);
  assert.match(portfolioPage, /Before/);
  assert.match(portfolioPage, /After/);
  assert.match(portfolioPage, /Completed service/);
  assert.match(portfolioPage, /selectedEntryId === item\.id/);
  assert.match(portfolioPage, /MobileManagementSheet/);
});

test("upload, linkage, and visibility mutations remain on existing tables and storage", () => {
  assert.match(portfolioPage, /\.from\("portfolio"\)/);
  assert.match(portfolioPage, /createCroppedImage/);
  assert.match(portfolioPage, /\.from\("portfolio_images"\)/);
  assert.match(portfolioPage, /request_id: entryType === "before_after"/);
  assert.match(portfolioPage, /\.eq\("booking_status", "completed"\)/);
  assert.match(portfolioPage, /\.delete\(\)\.eq\("id", id\)/);
  assert.doesNotMatch(portfolioPage, /reorder|visibility_status/);
});

test("desktop content-management layouts remain separate at lg", () => {
  assert.match(servicesPage, /hidden grid-cols-1 gap-10 lg:grid/);
  assert.match(portfolioPage, /hidden grid-cols-1 gap-10 lg:grid/);
  assert.match(servicesPage, />\s*Manage services\s*</);
  assert.match(portfolioPage, />\s*Results\s*</);
});
