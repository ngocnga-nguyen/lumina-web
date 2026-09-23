import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const services = read("../app/dashboard/services/page.tsx");
const media = read("../app/dashboard/portfolio/page.tsx");
const desktop = (source: string) => source.slice(source.indexOf('        <div className="mt-7 hidden lg:block">'));

test("desktop Services uses rows and an intentional editor, without invented service states", () => {
  const view = desktop(services);
  assert.match(view, /mobileEditorOpen &&/);
  assert.match(view, /\{serviceForm\}/);
  assert.match(view, /services\.map\(\(service\)/);
  assert.match(view, /divide-y divide-lumina-border/);
  assert.match(view, /service\.duration &&/);
  assert.match(view, /service\.description &&/);
  assert.doesNotMatch(view, /grid-cols-\[420px|Service cards|service\.category|service\.is_active/);
  assert.match(view, /editService\(service\)/);
  assert.match(view, /deleteService\(service\.id\)/);
});

test("desktop separates Portfolio from Results and shares existing editing for both types", () => {
  const view = desktop(media);
  assert.match(view, /Desktop portfolio workspace view/);
  assert.match(view, /portfolioEntries\.map/);
  assert.match(view, /resultEntries\.map/);
  assert.match(view, /grid-cols-2 gap-x-5 gap-y-7 xl:grid-cols-3/);
  assert.match(view, /grid-cols-1 gap-x-6 gap-y-8 xl:grid-cols-2/);
  const photos = view.slice(view.indexOf("portfolioEntries.map"), view.indexOf("resultEntries.map"));
  assert.match(photos, /onClick=\{\(\) => startEditingEntry\(item\)\}/);
  assert.match(photos, /deletePortfolioImage\(item.id\)/);
  assert.match(view.slice(view.indexOf("resultEntries.map")), /startEditingEntry\(item\)/);
  assert.match(view, /item.request_id &&.*Linked to completed service/);
  assert.doesNotMatch(view, /Verified|client_name|client_email/);
});

test("focused desktop media form fixes the chosen entry type and reuses existing fields", () => {
  const view = desktop(media);
  assert.match(view, /mobileEditorOpen &&/);
  assert.match(view, /startAddingEntry\(mobileView\)/);
  assert.match(view, /renderEntryForm\(false, true\)/);
  assert.match(view, /max-h-\[65dvh\] overflow-y-auto/);
  assert.match(view, /onClick=\{closeMobileEditor\}/);
  assert.match(view, /entryType === "before_after" \? "Edit Result" : "Edit Portfolio item"/);
  assert.match(media, /!editingResult && !mobile && !fixedEntryType/);
  assert.match(media, /renderEntryForm\(true\)/);
});

test("queries, mutations, crop, validation, ordering and onboarding match the approved baseline", () => {
  // Fingerprints deliberately cover only the existing data/handler region, not presentation.
  const digest = (source: string, marker: string) => createHash("sha256").update(source.slice(0, source.indexOf(marker))).digest("hex");
  assert.equal(digest(services, "  const serviceForm ="), "a02fbf5cd01257cf6b181f4729dadeb345a4d27d7b35adc55a6c0e076563e23f");
  assert.equal(digest(media, "  const renderEntryForm ="), "c0996e316a6e7fc93bc4c002fe385813073c647716f7a556fe1126009e3ed05a");
  assert.doesNotMatch(services + media, /\.channel\(/);
  assert.doesNotMatch(media, /storage[\s\S]*?\.remove\(/);
});

test("Portfolio editing populates existing values and returns the saved record without a second mutation", () => {
  const editor = media.slice(media.indexOf("  const startEditingEntry ="), media.indexOf("  const uploadBlob ="));
  for (const field of ["entry_type", "caption", "service_name", "result_date"]) {
    assert.ok(editor.includes(`result.${field}`));
  }
  assert.match(editor, /setMobileEditorOpen\(true\)/);
  const save = media.slice(media.indexOf("  const savePortfolioEntry ="), media.indexOf("  const deletePortfolioImage ="));
  assert.equal((save.match(/\.update\(/g) || []).length, 1);
  assert.match(save, /\.eq\("id", editingResult.id\)/);
  assert.match(save, /\.eq\("artist_id", artistId\)/);
  assert.match(save, /current.map\(\(item\) => \(item.id === data.id \? data : item\)\)/);
  assert.match(save, /resetForm\(\);\s*setMobileEditorOpen\(false\);\s*setSelectedEntryId\(null\)/);
});

test("completed-result associations remain constrained and do not promote evidence", () => {
  const migration = read("../supabase/migrations/20260902_add_client_cards_v1.sql");
  assert.match(migration, /request\.artist_id = new\.artist_id/);
  assert.match(migration, /request\.booking_status = 'completed'/);
  assert.match(migration, /on delete set null/);
  assert.match(migration, /set request_id = null/);
  assert.match(media, /evidence_level:\s*editingResult\?\.evidence_level \|\| \("professional_submitted" as const\)/);
  const privateLinks = read("../supabase/migrations/20260915130000_add_manual_client_cards_v1.sql");
  assert.match(privateLinks, /image.artist_id = card.artist_id/);
  assert.match(privateLinks, /can_manage_artist_client_card\(client_card_id\)/);
});
