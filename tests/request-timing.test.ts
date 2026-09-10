import assert from "node:assert/strict";
import test from "node:test";

import {
  bookingLiteReviewTimeHasPassed,
  canConfirmBookingLiteAppointment,
  createExpectedEndAt,
  getBookingLiteReviewReadyAt,
  getClientRequestActionState,
  getCompletionState,
  getNextRequestStateTransitionAt,
} from "../lib/request-completion.ts";
import {
  formatDurationMinutes,
  getRequestServices,
  getSuggestedRequestDurationMinutes,
} from "../lib/request-services.ts";

const scheduledFor = "2026-09-05T19:00:00.000Z";
const expectedEndAt = "2026-09-05T20:30:00.000Z";

const bookingLiteRequest = {
  completion_protocol_version: 3,
  status: "accepted",
  client_status: "confirmed",
  booking_status: "booked",
  appointment_confirmed_at: "2026-09-04T16:00:00.000Z",
  scheduled_for: scheduledFor,
  expected_end_at: expectedEndAt,
};

test("V3 remains booked at the appointment start and before expected end", () => {
  assert.equal(
    getCompletionState(bookingLiteRequest, new Date(scheduledFor)),
    "booked"
  );
  assert.equal(
    bookingLiteReviewTimeHasPassed(
      bookingLiteRequest,
      new Date("2026-09-05T20:29:59.999Z")
    ),
    false
  );
  assert.equal(
    getClientRequestActionState(
      bookingLiteRequest,
      false,
      new Date("2026-09-05T20:29:59.999Z")
    ),
    null
  );
});

test("V3 becomes review ready exactly at the expected service end", () => {
  const now = new Date(expectedEndAt);

  assert.equal(getCompletionState(bookingLiteRequest, now), "review_ready");
  assert.deepEqual(getClientRequestActionState(bookingLiteRequest, false, now), {
    key: "review_ready",
    label: "Review ready",
    cta: "Leave review",
  });
  assert.equal(bookingLiteRequest.booking_status, "booked");
});

test("a Booking Lite exception remains Needs attention after expected end", () => {
  assert.equal(
    getCompletionState(
      {
        ...bookingLiteRequest,
        booking_status: "needs_attention",
        appointment_exception_reason: "issue",
        artist_completion_response: "disputed",
      },
      new Date(expectedEndAt)
    ),
    "needs_attention"
  );
});

test("existing V3 appointments without an end use the twelve-hour fallback", () => {
  const legacyV3 = { ...bookingLiteRequest, expected_end_at: null };

  assert.equal(
    getBookingLiteReviewReadyAt(legacyV3)?.toISOString(),
    "2026-09-06T07:00:00.000Z"
  );
  assert.equal(
    bookingLiteReviewTimeHasPassed(
      legacyV3,
      new Date("2026-09-06T06:59:59.999Z")
    ),
    false
  );
  assert.equal(
    bookingLiteReviewTimeHasPassed(
      legacyV3,
      new Date("2026-09-06T07:00:00.000Z")
    ),
    true
  );
});

test("V2 completion timing continues to use the appointment start", () => {
  const v2Request = {
    completion_protocol_version: 2,
    status: "accepted",
    client_status: "confirmed",
    booking_status: "booked",
    scheduled_for: scheduledFor,
  };

  assert.equal(
    getCompletionState(v2Request, new Date(scheduledFor)),
    "awaiting_confirmation"
  );
});

test("new V3 confirmation requires an explicit valid expected end", () => {
  const unconfirmed = {
    completion_protocol_version: 3,
    status: "accepted",
    client_status: "pending",
    booking_status: "pending",
    proposed_date: "2026-09-05",
    proposed_time: "14:00",
    proposed_price: 100,
    scheduled_for: scheduledFor,
  };

  assert.equal(
    canConfirmBookingLiteAppointment(
      unconfirmed,
      new Date("2026-09-05T18:00:00.000Z")
    ),
    false
  );
  assert.equal(
    canConfirmBookingLiteAppointment(
      { ...unconfirmed, expected_end_at: expectedEndAt },
      new Date("2026-09-05T18:00:00.000Z")
    ),
    true
  );
});

test("the next live transition targets expected end instead of start", () => {
  assert.equal(
    getNextRequestStateTransitionAt(
      bookingLiteRequest,
      new Date("2026-09-05T19:15:00.000Z")
    )?.toISOString(),
    expectedEndAt
  );
});

test("expected end creation enforces the 24-hour bound", () => {
  assert.equal(createExpectedEndAt(scheduledFor, 90), expectedEndAt);
  assert.equal(createExpectedEndAt(scheduledFor, 24 * 60 + 1), null);
});

test("structured duration snapshots sum only when every service is reliable", () => {
  const completeSnapshot = {
    requested_services: [
      {
        service_id: "service-1",
        service_name: "Gel Manicure",
        listed_price: 35,
        listed_duration_minutes: 60,
      },
      {
        service_id: "service-2",
        service_name: "Nail Art",
        listed_price: 20,
        listed_duration_minutes: 30,
      },
    ],
  };

  assert.equal(getSuggestedRequestDurationMinutes(completeSnapshot), 90);
  assert.equal(formatDurationMinutes(90), "1 hr 30 min");

  const ambiguousSnapshot = {
    requested_services: [
      ...completeSnapshot.requested_services,
      {
        service_id: "service-3",
        service_name: "Removal",
        listed_price: 15,
      },
    ],
  };

  assert.equal(getSuggestedRequestDurationMinutes(ambiguousSnapshot), null);
  assert.equal(
    getRequestServices(ambiguousSnapshot)[2].listed_duration_minutes,
    null
  );
});
