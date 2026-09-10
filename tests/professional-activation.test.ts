import assert from "node:assert/strict";
import test from "node:test";
import {
  areNonLicenseRequirementsComplete,
  getActivationCompletionPercent,
  getFirstIncompleteOnboardingStep,
  isOnboardingStepComplete,
  type ProfessionalActivationStatus,
} from "../lib/professional-activation.ts";

const readyStatus: ProfessionalActivationStatus = {
  artist_id: "artist-1",
  profile_information_ready: true,
  profile_photo_ready: true,
  bio_ready: true,
  location_ready: true,
  services_ready: true,
  portfolio_ready: true,
  availability_ready: true,
  license_status: "verified",
  license_verified: true,
  license_decision_message: null,
  activation_ready: true,
  is_active: false,
};

test("a fully ready verified professional reaches 100 percent", () => {
  assert.equal(getActivationCompletionPercent(readyStatus), 100);
  assert.equal(getFirstIncompleteOnboardingStep(readyStatus), "ready");
  assert.equal(isOnboardingStepComplete(readyStatus, "ready"), true);
});

test("pending verification prevents completion and activation readiness", () => {
  const pending: ProfessionalActivationStatus = {
    ...readyStatus,
    license_status: "pending",
    license_verified: false,
    activation_ready: false,
  };

  assert.equal(areNonLicenseRequirementsComplete(pending), true);
  assert.equal(getActivationCompletionPercent(pending), 88);
  assert.equal(getFirstIncompleteOnboardingStep(pending), "license");
});

test("onboarding returns to the earliest incomplete required step", () => {
  const incomplete: ProfessionalActivationStatus = {
    ...readyStatus,
    profile_information_ready: false,
    services_ready: false,
    activation_ready: false,
  };

  assert.equal(getFirstIncompleteOnboardingStep(incomplete), "about");
  assert.equal(isOnboardingStepComplete(incomplete, "services"), false);
});
