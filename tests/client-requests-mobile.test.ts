import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getClientMobilePriorityClass,
  getClientMobileRequestStatus,
} from "../lib/client-request-mobile.ts";

test("mobile labels and priorities derive from existing request state", () => {
  assert.deepEqual(
    getClientMobileRequestStatus({ status: "new" }, null, "scheduled"),
    {
      label: "Waiting for artist",
      priority: 4,
      tone: "quiet",
      action: null,
    }
  );

  assert.equal(
    getClientMobileRequestStatus(
      {
        status: "accepted",
        client_status: "needs_different_time",
        booking_status: "client_requested_changes",
      },
      null,
      "scheduled"
    ).label,
    "Different time requested"
  );

  assert.equal(
    getClientMobileRequestStatus(
      { status: "accepted", client_status: null, booking_status: null },
      null,
      "scheduled"
    ).label,
    "Proposal received"
  );

  const confirmed = getClientMobileRequestStatus(
    {
      status: "accepted",
      client_status: "confirmed",
      booking_status: "booked",
    },
    null,
    "booked"
  );
  assert.equal(confirmed.label, "Confirmed");
  assert.equal(confirmed.priority, 2);

  assert.equal(
    getClientMobileRequestStatus(
      {
        status: "declined",
        client_status: "declined",
        booking_status: "client_declined",
      },
      null,
      "scheduled"
    ).label,
    "Declined"
  );
});

test("actionable and completed states retain authoritative action semantics", () => {
  const needsResponse = getClientMobileRequestStatus(
    {
      status: "accepted",
      client_status: null,
      booking_status: null,
    },
    {
      key: "confirm_appointment",
      label: "Awaiting your confirmation",
      cta: "Confirm appointment",
    },
    "scheduled"
  );
  assert.equal(needsResponse.label, "Needs your response");
  assert.equal(needsResponse.action?.key, "confirm_appointment");
  assert.equal(needsResponse.priority, 1);

  assert.equal(
    getClientMobileRequestStatus(
      { status: "accepted", client_status: "confirmed", booking_status: "booked" },
      {
        key: "completion_confirmation",
        label: "Completion pending",
        cta: "Confirm service",
      },
      "awaiting_confirmation"
    ).label,
    "Confirm service"
  );

  assert.equal(
    getClientMobileRequestStatus(
      { status: "accepted", client_status: "confirmed", booking_status: "needs_attention" },
      {
        key: "needs_attention",
        label: "Needs attention",
        cta: "View issue",
      },
      "needs_attention"
    ).label,
    "Needs attention"
  );

  const reviewReady = getClientMobileRequestStatus(
    {
      status: "accepted",
      client_status: "confirmed",
      booking_status: "completed",
    },
    {
      key: "review_ready",
      label: "Review ready",
      cta: "Leave review",
    },
    "completed"
  );
  assert.equal(reviewReady.label, "Review ready");
  assert.equal(reviewReady.action?.key, "review_ready");

  const completed = getClientMobileRequestStatus(
    {
      status: "accepted",
      client_status: "confirmed",
      booking_status: "completed",
    },
    null,
    "completed"
  );
  assert.equal(completed.label, "Completed");
  assert.equal(completed.priority, 5);

  assert.equal(
    getClientMobileRequestStatus(
      { status: "accepted", client_status: "confirmed", booking_status: "booked" },
      null,
      "completion_pending"
    ).label,
    "Completion pending"
  );
});

test("priority classes preserve the approved mobile-only ordering", () => {
  assert.equal(getClientMobilePriorityClass(1), "order-1");
  assert.equal(getClientMobilePriorityClass(2), "order-2");
  assert.equal(getClientMobilePriorityClass(3), "order-3");
  assert.equal(getClientMobilePriorityClass(4), "order-4");
  assert.equal(getClientMobilePriorityClass(5), "order-5");
});

test("mobile presentation stays isolated and reuses existing messaging", () => {
  const page = readFileSync(
    new URL("../app/my-requests/page.tsx", import.meta.url),
    "utf8"
  );
  const summary = readFileSync(
    new URL("../components/ClientRequestMobileSummary.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /lg:order-none/);
  assert.match(page, /hidden cursor-pointer[\s\S]*lg:flex/);
  assert.match(summary, /className="lg:hidden"/);
  assert.match(summary, /Message artist/);
  assert.match(page, /await markMessagesRead\(request\.id\)/);
  assert.match(page, /setOpenHistoryId\(request\.id\)/);
  assert.match(summary, /Archive/);
  assert.match(summary, /Restore/);
  assert.match(page, /placeholder="Search requests"/);
  assert.match(page, /\["active", "history", "archived"\]/);
  assert.match(page, /Needs action/);
  assert.match(page, /requestView === "active"[\s\S]*Active request filters/);
  assert.match(page, /requestView === "history"[\s\S]*Request history filters/);
  assert.match(page, /\["all", "completed", "declined"\]/);
  assert.match(page, /matchesRequestLifecycleView/);
  assert.match(page, /matchesRequestSearch/);
  assert.doesNotMatch(summary, /supabase|\.channel\(/);
});
