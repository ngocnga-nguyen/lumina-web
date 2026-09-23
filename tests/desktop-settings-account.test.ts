import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const expected = {
  "app/account/page.tsx": {
    "logic": "a162797eccbf614de96e5f4558ea6f94e3aabcdf61aa7fd0c26d8463461e5ae6",
    "mobile": "995b2641b645f573f7dfc4c764664f210f7f369e8a862c083873cb91401cd869"
  },
  "app/dashboard/profile/page.tsx": {
    "logic": "6e0ee295c3294a26ba3ad149e78222c31199b80fcf66d1eea0426a8a78363fc6",
    "mobile": "828bbef5916355ee5b53d57eff607d0228a0d0a14fda90462997a5030eae34c8"
  },
  "app/dashboard/settings/page.tsx": {
    "logic": "7e1f45859e124da5900c7836246065bfdb18ff32ea93ed3ce2d40228c89eeade",
    "mobile": "8d3bc9b7dbe102a81ec414365adb0bc12cf9b67aea46fc30a326b273590261c5"
  }
};
test("account/profile mutations, validation, auth and loading flow remain identical", () => {
  for (const [path, fingerprints] of Object.entries(expected)) {
    const source = read(path);
    const logic = source.slice(source.indexOf("export default function"), source.indexOf("\n  return (\n")).replace(/  const sectionTitleClass =\n    "[^\n]+";\n\n/, "");
    assert.equal(hash(logic), fingerprints.logic, path);
  }
});
test("approved mobile settings markup remains byte-for-byte identical", () => {
  for (const [path, fingerprints] of Object.entries(expected)) {
    const source = read(path);
    const mobile = source.slice(source.indexOf('      <section'), source.indexOf('      <section className="mx-auto hidden'));
    assert.equal(hash(mobile), fingerprints.mobile, path);
  }
});
test("shared media, storage, activation, reset and public profile behavior are untouched", () => {
  const unchanged = {
  "components/ProfessionalProfileMediaEditor.tsx": "d6cd4395cbc7d874287a31054ec350b9f77ca114859019c663be2a48e214586c",
  "components/MobileManagementSheet.tsx": "e8c91d6a4461dc077e5be69c0858d33fe899974ae8c5852ac7b7dee4b81ec59c",
  "app/account/reset-password/page.tsx": "4ec8d17189d3ed81d0b46577a6770a79a800ef0bc466e5313b4295b125e2ef2c",
  "app/artist/[slug]/page.tsx": "b6b6d733a86e72ed59699d36b1ba99f3eeeb945a0a8f2e3223053de4b541bd22",
  "lib/professional-activation.ts": "90bf2c4f220d7bff70c457bbf05d094e1a8ab8b15aaeba20affb39286e8c2e5e",
  "lib/professional-activation-client.ts": "15d8096029f361097a478bb104be5aac834cf1491cd37de1d05ff4c49e5e8285",
  "lib/profile-image-upload.ts": "50fe92788283fcf11d9a5fb95b7d5b50c2a709f9785892b9ac8d4e72c61873f1",
  "lib/profile-image-storage.ts": "1e192be1d8079622fac2a47f885f4e7eb0ea606db862ef3bd9f72c3507fe53c2",
  "lib/profile-media-image.ts": "58913b37dc903f9ffd54f200836ef6b3a220d5651b48c2ab6097695b917a7683"
};
  for (const [path, expectedHash] of Object.entries(unchanged)) assert.equal(hash(read(path)), expectedHash, path);
});
test("desktop profile separates immediate media saves from ordinary profile edits", () => {
  const source = read("app/dashboard/profile/page.tsx");
  const desktop = source.slice(source.indexOf('      <section className="mx-auto hidden'));
  for (const title of ["Identity & business", "Location & service area", "Contact & booking", "Bio & availability"]) assert.ok(desktop.includes('title="' + title + '"'));
  assert.match(desktop, /Cover and photo edits save separately/);
  assert.match(desktop, /Profile field edits apply when you save changes/);
  assert.match(desktop, /onClick={saveProfile}/);
  assert.doesNotMatch(desktop, /Remove photo/);
});
test("desktop settings keeps protected visibility and deliberate existing license editor", () => {
  const source = read("app/dashboard/settings/page.tsx");
  const desktop = source.slice(source.indexOf('      <section className="mx-auto hidden'));
  assert.ok(desktop.indexOf("Public profile visibility") < desktop.indexOf("Account &amp; security"));
  assert.ok(desktop.includes('<details key={verification?.submitted_at'));
  assert.match(desktop, /License details are separate from your public professional name/);
  assert.match(desktop, /submitLicenseVerification()/);
  assert.ok(desktop.includes('!isVisible && !activationStatus?.activation_ready'));
});
test("client desktop retains focused profile, security and quieter existing shortcuts", () => {
  const source = read("app/account/page.tsx");
  const desktop = source.slice(source.indexOf('      <section className="mx-auto hidden'));
  for (const label of ["Desktop client profile", "Desktop account and security", "Account shortcuts"]) assert.ok(desktop.includes(label));
  assert.ok(desktop.includes('href="/saved"'));
  assert.ok(desktop.includes('href="/my-requests"'));
  assert.match(desktop, /signOutOtherDevices()/);
  assert.match(desktop, /saveProfile()/);
  assert.doesNotMatch(desktop, /Notifications|Subscription|Delete account/);
});
test("temporary preview routes are absent", () => {
  for (const path of ["app/dashboard/local-preview/profile-baseline/page.tsx", "app/dashboard/local-preview/settings-baseline/page.tsx", "app/local-preview/account-baseline/page.tsx"]) assert.equal(existsSync(new URL("../" + path, import.meta.url)), false);
});
