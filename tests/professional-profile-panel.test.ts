import assert from "node:assert/strict";
import test from "node:test";

import {
  getProfessionalProfilePanelMode,
  shouldShowProfessionalProfilePanel,
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

test("incomplete profiles always use the full, non-dismissible state", () => {
  const incomplete = { ...readyStatus, services_ready: false, activation_ready: false };
  assert.equal(getProfessionalProfilePanelMode(incomplete), "incomplete");
  assert.equal(shouldShowProfessionalProfilePanel(incomplete, true), true);
});

test("verification pending is compact but cannot be dismissed", () => {
  const pending = {
    ...readyStatus,
    license_status: "pending" as const,
    license_verified: false,
    activation_ready: false,
  };
  assert.equal(getProfessionalProfilePanelMode(pending), "verification_pending");
  assert.equal(shouldShowProfessionalProfilePanel(pending, true), true);
});

test("pending verification with another missing requirement stays full", () => {
  const pendingAndIncomplete = {
    ...readyStatus,
    services_ready: false,
    license_status: "pending" as const,
    license_verified: false,
    activation_ready: false,
  };
  assert.equal(getProfessionalProfilePanelMode(pendingAndIncomplete), "incomplete");
});

test("ready-to-activate profiles use the compact ready strip", () => {
  assert.equal(getProfessionalProfilePanelMode(readyStatus), "ready");
  assert.equal(shouldShowProfessionalProfilePanel(readyStatus, true), true);
});

test("only a healthy active profile can keep the panel dismissed", () => {
  const active = { ...readyStatus, is_active: true };
  assert.equal(getProfessionalProfilePanelMode(active), "active");
  assert.equal(shouldShowProfessionalProfilePanel(active, true), false);

  const readinessLost = {
    ...active,
    portfolio_ready: false,
    activation_ready: false,
    is_active: false,
  };
  assert.equal(getProfessionalProfilePanelMode(readinessLost), "incomplete");
  assert.equal(shouldShowProfessionalProfilePanel(readinessLost, true), true);
});
