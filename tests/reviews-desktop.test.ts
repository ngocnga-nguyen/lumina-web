import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPublishedReviewSummary, getReviewReadyRequests, reviewNeedsProfessionalResponse, type ReviewWorkspaceRequest, type ReviewWorkspaceReview } from "../lib/review-workspace.ts";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const client = source("../components/ClientReviewsWorkspace.tsx");
const professional = source("../components/ProfessionalReviewsWorkspace.tsx");

test("desktop Reviews uses chronological lists and restrained desktop-only headings", () => {
  for (const page of [client, professional]) {
    assert.doesNotMatch(page, /lg:grid-cols-2|lg:text-\[44px\]/);
    assert.match(page, /text-\[28px\].*lg:text-\[32px\]/);
    assert.match(page, /order\("created_at", \{ ascending: false \}\)/);
    assert.doesNotMatch(page, /\.channel\(/);
  }
  assert.match(professional, /lg:flex lg:w-fit lg:border-0/);
  assert.match(professional, /contents lg:flex lg:flex-col/);
  assert.match(professional, /editingReviewId === review.id/);
  assert.match(client, /expandedRequestId === request.id/);
});

test("mobile presentation, inline forms and response nesting remain intact", () => {
  assert.match(client, /min-h-9 shrink-0 items-center gap-1 rounded-full bg-lumina-black px-3/);
  assert.match(client, /maxLength=\{5000\}/);
  assert.match(professional, /maxLength=\{2000\}/);
  for (const page of [client, professional]) {
    assert.match(page, /border-l-2 border-lumina-blush bg-lumina-pearl\/45 px-3 py-2.5/);
  }
  assert.match(client, /hidden lg:inline">Your review will stay linked to this Lumina appointment/);
  assert.match(client, /Retained privately while Lumina reviews the appointment exception/);
  assert.match(professional, /summary.needsResponse > 0/);
});

const request = (extra: Partial<ReviewWorkspaceRequest> = {}): ReviewWorkspaceRequest => ({
  id: "request", artist_id: "artist", client_id: "client", created_at: "2026-09-01T00:00:00Z",
  status: "accepted", client_status: "confirmed", booking_status: "booked", completion_protocol_version: 3,
  appointment_confirmed_at: "2026-09-01T00:00:00Z", scheduled_for: "2026-09-02T10:00:00Z", expected_end_at: "2026-09-02T11:00:00Z", ...extra,
});
const review = (extra: Partial<ReviewWorkspaceReview> = {}): ReviewWorkspaceReview => ({
  id: "review", artist_id: "artist", client_id: "client", request_id: "request", reviewer_name: "Client", rating: 4,
  comment: "Thoughtful service", created_at: "2026-09-03T00:00:00Z", artist_response: null, artist_response_at: null,
  moderation_status: "published", ...extra,
});
const now = new Date("2026-09-04T00:00:00Z");

test("review readiness is not completed status or notification state", () => {
  assert.equal(getReviewReadyRequests([request()], [], now).length, 1);
  assert.equal(getReviewReadyRequests([request({ booking_status: "needs_attention", appointment_exception_reason: "issue" })], [], now).length, 1);
  assert.equal(getReviewReadyRequests([request({ client_hidden: true })], [], now).length, 0);
  assert.equal(getReviewReadyRequests([request()], [], new Date("2026-09-02T10:30:00Z")).length, 0);
  for (const moderation_status of ["published", "pending", "removed"] as const) {
    assert.equal(getReviewReadyRequests([request()], [review({ moderation_status })], now).length, 0);
  }
});

test("legacy and two-party eligibility remain separate", () => {
  assert.equal(getReviewReadyRequests([request({ completion_protocol_version: 1, booking_status: "completed" })], [], now).length, 1);
  assert.equal(getReviewReadyRequests([request({ completion_protocol_version: 2, booking_status: "completed", artist_completion_response: "confirmed" })], [], now).length, 0);
  assert.equal(getReviewReadyRequests([request({ completion_protocol_version: 2, booking_status: "completed", artist_completion_response: "confirmed", client_completion_response: "confirmed" })], [], now).length, 1);
});

test("published reputation and needs-response exclude private reviews", () => {
  const items = [review(), review({ id: "answered", rating: 5, artist_response: "Thank you" }), review({ id: "pending", rating: 1, moderation_status: "pending" }), review({ id: "removed", rating: 1, moderation_status: "removed" })];
  assert.deepEqual(getPublishedReviewSummary(items), { average: 4.5, count: 2, needsResponse: 1 });
  assert.equal(items.filter(reviewNeedsProfessionalResponse).length, 1);
});
