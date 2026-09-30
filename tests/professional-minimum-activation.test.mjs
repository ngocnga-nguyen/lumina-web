import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getActivationRequirements, getProfessionalActivationLabel, getFirstIncompleteOnboardingStep, isOnboardingStepComplete, professionalOnboardingSteps } from "../lib/professional-activation.ts";
const base = { artist_id: "fixture", name_ready: true, category_ready: true, profile_information_ready: true, location_ready: true, services_ready: true, license_verified: true, license_status: "verified", activation_ready: true, is_active: false, profile_photo_ready: false, bio_ready: false, portfolio_ready: false, availability_ready: false };
const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");
test("minimum-only setup has exactly five marketplace requirements and optional content is absent", () => {
  assert.equal(getActivationRequirements(base).length,5);
  assert.ok(getActivationRequirements(base).every(x=>x.complete));
  assert.equal(getProfessionalActivationLabel(base),"Ready to go live");
  assert.equal(isOnboardingStepComplete(base,"about"),true);
  assert.equal(getFirstIncompleteOnboardingStep(base),"ready");
  assert.deepEqual(professionalOnboardingSteps.map(x=>x.id),["about","location","services","license","ready"]);
});
for(const [key,id] of [["name_ready","name"],["category_ready","category"],["location_ready","location"],["services_ready","services"],["license_verified","license"]]) {
 test(`${key} generates its own explicit blocker`,()=>{
  const status={...base,[key]:false,activation_ready:false};
  assert.deepEqual(getActivationRequirements(status).filter(x=>!x.complete).map(x=>x.id),[id]);
 });
}
test("confirmation is not an ongoing profile blocker, including legacy status responses",()=>{
 const status={...base,account_ready:false,is_active:true};
 assert.ok(getActivationRequirements(status).every(item=>item.complete));
 assert.equal(isOnboardingStepComplete(status,"about"),true);
 assert.equal(getProfessionalActivationLabel(status),"Live");
 assert.equal(getProfessionalActivationLabel({...status,is_active:false}),"Ready to go live");
});
test("pending, correction, ready, live, and manually hidden remain distinct",()=>{
 assert.equal(getProfessionalActivationLabel({...base,license_verified:false,license_status:"pending",activation_ready:false}),"Verification pending");
 assert.equal(getProfessionalActivationLabel({...base,license_verified:false,license_status:"rejected",activation_ready:false}),"Needs correction");
 assert.equal(getProfessionalActivationLabel({...base,is_active:true}),"Live");
 assert.equal(getProfessionalActivationLabel({...base,activation_hidden_by_owner:true}),"Hidden");
 assert.equal(getProfessionalActivationLabel({...base,category_ready:false,activation_ready:false}),"Setup needed");
});
test("dashboard, onboarding, and Settings use one shared blocker panel, never a readiness percentage",()=>{
 for(const path of ["app/dashboard/page.tsx","components/ProfessionalDashboardDesktopHome.tsx","app/dashboard/onboarding/page.tsx","app/dashboard/settings/page.tsx"]) {
  const source=read(path);assert.match(source,/<ProfessionalActivationPanel/);assert.doesNotMatch(source,/% activation ready|% complete|getActivationCompletionPercent/);
 }
 const panel=read("components/ProfessionalActivationPanel.tsx");assert.match(panel,/status.activation_ready && !status.is_active && onActivate/);
 assert.match(read("app/dashboard/settings/page.tsx"),/hide your public profile until verification is approved and you explicitly choose Go live again/);
});
test("photo fallbacks and empty bio never fabricate identity or description",()=>{
 assert.match(read("components/ArtistCard.tsx"),/<PublicArtistImage/);
 assert.doesNotMatch(read("components/ArtistCard.tsx"),/Profile Image|Coming soon/);
 assert.match(read("components/PublicArtistImage.tsx"),/artistName.charAt\(0\)/);
 const storefront=read("app/artist/[slug]/page.tsx");assert.doesNotMatch(storefront,/serving clients in/);
 assert.match(storefront,/profileBio && <div/);
 assert.match(read("components/StorefrontDesktopHero.tsx"),/props.bio\?\.trim\(\) &&/);
 for(const path of ["components/SavedArtistMobileRow.tsx","components/SavedCompareMobile.tsx"])assert.match(read(path),/PublicArtistImage/);
 assert.match(read("components/RequestInbox.tsx"),/IdentityAvatar/);
 assert.match(read("components/ClientReviewsWorkspace.tsx"),/charAt\(0\)/);
});
