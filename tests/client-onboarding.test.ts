import assert from "node:assert/strict";
import test from "node:test";
import {
  dismissClientTip,
  dismissClientWelcome,
  parseClientOnboardingState,
  shouldShowClientWelcome,
} from "../lib/client-onboarding.ts";

test("a brand-new client is eligible for the optional welcome", () => {
  assert.equal(
    shouldShowClientWelcome({
      ready: true,
      isClient: true,
      welcomeDismissed: false,
      requestCount: 0,
      savedCount: 0,
    }),
    true
  );
});

test("dismissed, active, and professional accounts do not auto-open onboarding", () => {
  const base = {
    ready: true,
    isClient: true,
    welcomeDismissed: false,
    requestCount: 0,
    savedCount: 0,
  };

  assert.equal(
    shouldShowClientWelcome({ ...base, welcomeDismissed: true }),
    false
  );
  assert.equal(shouldShowClientWelcome({ ...base, requestCount: 1 }), false);
  assert.equal(shouldShowClientWelcome({ ...base, savedCount: 1 }), false);
  assert.equal(shouldShowClientWelcome({ ...base, isClient: false }), false);
});

test("welcome and contextual dismissals remain versioned and deduplicated", () => {
  const initial = parseClientOnboardingState(null);
  const dismissedWelcome = dismissClientWelcome(
    initial,
    "2026-09-06T12:00:00.000Z"
  );
  const dismissedTip = dismissClientTip(dismissedWelcome, "saved_compare");
  const duplicateTip = dismissClientTip(dismissedTip, "saved_compare");

  assert.equal(
    dismissedWelcome.welcome_dismissed_at,
    "2026-09-06T12:00:00.000Z"
  );
  assert.deepEqual(duplicateTip.dismissed_tips, ["saved_compare"]);
});
