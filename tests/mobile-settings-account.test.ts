import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const client = source("../app/account/page.tsx");
const professionalProfile = source("../app/dashboard/profile/page.tsx");
const professionalSettings = source("../app/dashboard/settings/page.tsx");
const reset = source("../app/account/reset-password/page.tsx");
const home = source("../app/page.tsx");
const sharedSheet = source("../components/MobileManagementSheet.tsx");

test("client mobile account groups identity and security without duplicating profile persistence", () => {
  assert.match(client, /Profile &amp; settings/);
  assert.match(client, /Account &amp; security/);
  assert.match(client, /MobileManagementSheet open=\{mobileSheet === "profile"\}/);
  assert.match(client, /IdentityAvatar name=\{savedName/);
  assert.match(client, /avatar_url: profileImageUrl \|\| null/);
  assert.match(client, /supabase\.auth\.updateUser\(\{\s*data:/);
  assert.match(client, /setProfileImageUrl\(""\)/);
  assert.match(client, /hidden max-w-xl[\s\S]*lg:block/);
  const mobile = client.slice(client.indexOf("<section className=\"mx-auto max-w-xl px-5 pb-10"), client.indexOf("<section className=\"mx-auto hidden max-w-xl"));
  assert.doesNotMatch(mobile, /Saved Artists|My Requests|Notifications|Preferences/);
});

test("professional mobile profile uses the existing save path and direct media editor", () => {
  for (const group of ["Identity & business", "Location & service area", "Contact & booking", "Bio & availability"]) {
    assert.match(professionalProfile, new RegExp(group));
  }
  assert.match(professionalProfile, /setMobileDraftStart\(\{ \.\.\.form \}\)/);
  assert.match(professionalProfile, /if \(mobileDraftStart\) setForm\(mobileDraftStart\)/);
  assert.match(professionalProfile, /onClick=\{\(\) => void saveProfile\(\)\}/);
  assert.match(professionalProfile, /ProfessionalProfileMediaEditor/);
  assert.match(professionalProfile, /hidden px-5 py-10[\s\S]*lg:block/);
});

test("professional settings keeps license, visibility, and account flows authoritative", () => {
  assert.match(professionalSettings, /setProfessionalProfileVisibility/);
  assert.match(professionalSettings, /submit_professional_license_verification/);
  assert.match(professionalSettings, /MobileManagementSheet open=\{mobileSheet === "verification"\}/);
  assert.match(professionalSettings, /onboardingMode \? "Submit and continue"/);
  assert.match(professionalSettings, /signOut\(\{ scope: "others" \}\)/);
  assert.match(professionalSettings, /signOut\(\{ scope: "local" \}\)/);
  assert.match(professionalSettings, /hidden max-w-2xl[\s\S]*lg:block/);
});

test("recovery accepts only an allowlisted professional marker and preserves client default", () => {
  assert.match(professionalSettings, /reset-password\?role=professional/);
  assert.match(reset, /get\("role"\) === "professional" \? "\/dashboard\/settings" : "\/account"/);
  assert.match(reset, /router\.push\(returnTo\)/);
  assert.match(home, /role === "professional" \? "\?role=professional" : ""/);
  assert.doesNotMatch(reset, /router\.push\(.*(?:get\(|searchParams)/);
  assert.match(sharedSheet, /safe-area-inset-bottom/);
  assert.match(sharedSheet, /mobileViewport\.matches \? "hidden" : previousOverflow/);
});
