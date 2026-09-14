import assert from "node:assert/strict";
import test from "node:test";

import {
  isActiveRequestState,
  isCompletedRequestState,
  isConfirmedUpcomingRequest,
  isDeclinedRequestState,
} from "../lib/request-completion.ts";
import {
  matchesActiveRequestFilter,
  matchesHistoryRequestFilter,
  matchesRequestLifecycleView,
  matchesRequestSearch,
} from "../lib/request-workflow-filters.ts";

const now = new Date("2026-09-13T12:00:00.000Z");

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: "request",
    status: "new",
    client_status: "pending",
    booking_status: "pending",
    ...overrides,
  };
}

test("active, completed, and declined share one authoritative lifecycle", () => {
  const active = request();
  const completed = request({ booking_status: "completed" });
  const declined = request({ booking_status: "client_declined" });

  assert.equal(isActiveRequestState(active), true);
  assert.equal(isCompletedRequestState(completed), true);
  assert.equal(isDeclinedRequestState(declined), true);
  assert.equal(isActiveRequestState(completed), false);
  assert.equal(isActiveRequestState(declined), false);

  assert.equal(matchesRequestLifecycleView(active, "active", false), true);
  assert.equal(matchesRequestLifecycleView(completed, "history", false), true);
  assert.equal(matchesRequestLifecycleView(declined, "history", false), true);
  assert.equal(matchesRequestLifecycleView(active, "archived", true), true);
  assert.equal(matchesRequestLifecycleView(completed, "history", true), false);
});

test("history never treats declined or review-ready requests as completed", () => {
  const completed = request({ booking_status: "completed" });
  const declined = request({ status: "declined" });
  const reviewReady = request({
    status: "accepted",
    client_status: "confirmed",
    booking_status: "booked",
    completion_protocol_version: 3,
    appointment_confirmed_at: "2026-09-10T12:00:00.000Z",
    scheduled_for: "2026-09-10T12:00:00.000Z",
    expected_end_at: "2026-09-10T13:00:00.000Z",
  });

  assert.equal(matchesHistoryRequestFilter(completed, "completed"), true);
  assert.equal(matchesHistoryRequestFilter(declined, "completed"), false);
  assert.equal(matchesHistoryRequestFilter(declined, "declined"), true);
  assert.equal(matchesRequestLifecycleView(reviewReady, "active", false), true);
});

test("active facets use role-specific action semantics", () => {
  const newRequest = request();
  const confirmed = request({
    status: "accepted",
    client_status: "confirmed",
    booking_status: "booked",
    scheduled_for: "2026-09-14T12:00:00.000Z",
  });
  const waitingForClient = request({
    status: "accepted",
    client_status: "pending",
    booking_status: "pending",
  });

  assert.equal(
    matchesActiveRequestFilter(newRequest, "needs_action", {
      role: "artist",
      now,
    }),
    true
  );
  assert.equal(
    matchesActiveRequestFilter(newRequest, "waiting", { role: "client", now }),
    true
  );
  assert.equal(isConfirmedUpcomingRequest(confirmed, now), true);
  assert.equal(
    matchesActiveRequestFilter(confirmed, "confirmed", { role: "client", now }),
    true
  );
  assert.equal(
    matchesActiveRequestFilter(waitingForClient, "waiting", {
      role: "artist",
      now,
    }),
    true
  );
});

test("request search is normalized and matches any loaded summary field", () => {
  assert.equal(
    matchesRequestSearch("vianne nails", [
      "Hong Pham",
      "Vianne Nails and Spa",
      "Gel manicure",
    ]),
    true
  );
  assert.equal(matchesRequestSearch("manicure", ["Gel manicure"]), true);
  assert.equal(matchesRequestSearch("facial", ["Gel manicure"]), false);
  assert.equal(matchesRequestSearch("", []), true);
});

test("search composes with every request lifecycle and workflow filter", () => {
  const activeNeedsAction = request({ id: "active", client_name: "Ariana Cole" });
  const confirmed = request({
    id: "confirmed",
    status: "accepted",
    client_status: "confirmed",
    booking_status: "booked",
    scheduled_for: "2026-09-14T12:00:00.000Z",
  });
  const completed = request({ id: "completed", booking_status: "completed" });
  const declined = request({ id: "declined", status: "declined" });

  assert.equal(matchesRequestLifecycleView(activeNeedsAction, "active", false), true);
  assert.equal(
    matchesActiveRequestFilter(activeNeedsAction, "needs_action", {
      role: "artist",
      now,
    }) && matchesRequestSearch("ariana", ["Ariana Cole"]),
    true
  );
  assert.equal(
    matchesActiveRequestFilter(confirmed, "confirmed", { role: "client", now }) &&
      matchesRequestSearch("gel", ["Gel manicure"]),
    true
  );
  assert.equal(
    matchesHistoryRequestFilter(completed, "completed") &&
      matchesRequestSearch("hong", ["Hong Pham"]),
    true
  );
  assert.equal(
    matchesHistoryRequestFilter(declined, "declined") &&
      matchesRequestSearch("lashes", ["Classic lashes"]),
    true
  );
  assert.equal(matchesRequestLifecycleView(activeNeedsAction, "archived", true), true);
  assert.equal(matchesRequestSearch("ariana", ["Ariana Cole"]), true);
});
