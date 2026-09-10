import assert from "node:assert/strict";
import test from "node:test";

import {
  getClientWorkspaceActionCounts,
  getProfessionalRequestAction,
  getProfessionalWorkspaceActionCounts,
} from "../lib/request-completion.ts";

const now = new Date("2026-09-06T18:00:00.000Z");

const reviewReadyRequest = {
  id: "review-ready",
  completion_protocol_version: 3,
  status: "accepted",
  client_status: "confirmed",
  booking_status: "booked",
  appointment_confirmed_at: "2026-09-05T15:00:00.000Z",
  scheduled_for: "2026-09-06T15:00:00.000Z",
  expected_end_at: "2026-09-06T16:00:00.000Z",
};

test("client counts separate request actions from review-ready appointments", () => {
  const counts = getClientWorkspaceActionCounts(
    [
      {
        id: "proposal",
        completion_protocol_version: 3,
        status: "accepted",
        client_status: "pending",
        booking_status: "pending",
        proposed_date: "2026-09-08",
        proposed_time: "14:00",
        proposed_price: 100,
        scheduled_for: "2026-09-08T19:00:00.000Z",
        expected_end_at: "2026-09-08T20:00:00.000Z",
      },
      reviewReadyRequest,
      {
        ...reviewReadyRequest,
        id: "issue",
        booking_status: "needs_attention",
        appointment_exception_reason: "issue",
        artist_completion_response: "disputed",
        client_completion_response: null,
      },
    ],
    new Set(),
    now
  );

  assert.deepEqual(counts, {
    requests: 2,
    reviews: 1,
    requestIssues: 1,
  });
});

test("a submitted review removes its appointment from the Reviews count", () => {
  assert.deepEqual(
    getClientWorkspaceActionCounts(
      [reviewReadyRequest],
      new Set([reviewReadyRequest.id]),
      now
    ),
    { requests: 0, reviews: 0, requestIssues: 0 }
  );
});

test("one client request is counted only once when Needs attention takes priority", () => {
  const issue = {
    ...reviewReadyRequest,
    id: "single-issue",
    status: "new",
    booking_status: "needs_attention",
    appointment_exception_reason: "issue" as const,
    artist_completion_response: "disputed" as const,
    client_completion_response: null,
  };

  assert.deepEqual(
    getClientWorkspaceActionCounts([issue], new Set(), now),
    { requests: 1, reviews: 0, requestIssues: 1 }
  );
});

test("professional Requests count only genuinely actionable requests", () => {
  const counts = getProfessionalWorkspaceActionCounts(
    [
      { id: "new", status: "new" },
      {
        id: "new-time",
        status: "accepted",
        client_status: "needs_different_time",
        booking_status: "client_requested_changes",
      },
      {
        ...reviewReadyRequest,
        id: "attention",
        booking_status: "needs_attention",
        appointment_exception_reason: "issue",
      },
      {
        id: "waiting-on-client",
        status: "accepted",
        client_status: "pending",
        booking_status: "pending",
      },
      {
        ...reviewReadyRequest,
        id: "clean-booked",
        expected_end_at: "2026-09-07T16:00:00.000Z",
      },
      { id: "completed", status: "accepted", booking_status: "completed" },
      { id: "declined", status: "declined" },
    ],
    now
  );

  assert.deepEqual(counts, { requests: 3, requestIssues: 1 });
});

test("legacy two-sided completion counts when the professional must respond", () => {
  const request = {
    id: "legacy-completion",
    completion_protocol_version: 2,
    status: "accepted",
    client_status: "confirmed",
    booking_status: "booked",
    scheduled_for: "2026-09-06T16:00:00.000Z",
    client_completion_response: "confirmed" as const,
    artist_completion_response: null,
  };

  assert.equal(getProfessionalRequestAction(request, now), "request");
});
