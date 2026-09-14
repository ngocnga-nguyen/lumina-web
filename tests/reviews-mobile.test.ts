import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const client = readSource("../components/ClientReviewsWorkspace.tsx");
const professional = readSource(
  "../components/ProfessionalReviewsWorkspace.tsx"
);
const actions = readSource("../lib/review-actions.ts");
const helpers = readSource("../lib/review-workspace.ts");
const navigation = readSource("../lib/workspace-navigation.ts");
const publicProfile = readSource("../app/artist/[slug]/page.tsx");
const completionMigration = readSource(
  "../supabase/migrations/20260904120000_add_appointment_completion_integrity_v1.sql"
);
const reviewMigration = readSource(
  "../supabase/migrations/20260905160000_add_review_reporting_moderation_v1.sql"
);

test("workspace navigation uses dedicated client and professional Reviews routes", () => {
  assert.match(navigation, /href: "\/client\/reviews"/);
  assert.match(navigation, /href: "\/dashboard\/reviews"/);
});

test("client Reviews separates persisted attention from review eligibility", () => {
  assert.match(client, /getReviewReadyRequests\(requests, reviews\)/);
  assert.match(client, /notification\.title === "Appointment Completed"/);
  assert.match(client, /acknowledgeNotifications\(\{ requestId, kind: "action" \}\)/);
  assert.match(client, /notificationIds: unreadReviewNotificationIds/);
  assert.match(client, /Review ready/);
  assert.match(client, /Past reviews/);
  assert.match(client, /submitVerifiedReview/);
  assert.doesNotMatch(client, /from\("reviews"\)\.insert/);
  assert.doesNotMatch(client, /\.channel\(/);
});

test("professional Reviews derives response-needed state from published responses", () => {
  assert.match(professional, /\.eq\("moderation_status", "published"\)/);
  assert.match(professional, /reviewNeedsProfessionalResponse/);
  assert.match(professional, /All/);
  assert.match(professional, /Needs response/);
  assert.match(professional, /setProfessionalReviewResponse/);
  assert.match(professional, /ReviewReportDialog/);
  assert.equal(professional.match(/Report review/g)?.length, 1);
  assert.doesNotMatch(professional, /\.channel\(/);
});

test("public profile and workspaces share the authoritative review RPC actions", () => {
  assert.match(actions, /submit_booking_lite_review/);
  assert.match(actions, /set_artist_review_response/);
  assert.match(publicProfile, /submitVerifiedReview/);
  assert.match(publicProfile, /setProfessionalReviewResponse/);
  assert.doesNotMatch(
    publicProfile,
    /supabase\.rpc\("submit_booking_lite_review"/
  );
  assert.doesNotMatch(
    publicProfile,
    /supabase\.rpc\("set_artist_review_response"/
  );
});

test("review readiness and integrity remain backed by existing helpers and database protections", () => {
  assert.match(helpers, /canLeaveBookingLiteReview\(request, now\)/);
  assert.match(helpers, /isReviewEligibleCompletion\(request, now\)/);
  assert.match(completionMigration, /reviews_one_per_request_idx/);
  assert.match(reviewMigration, /Only the reviewed professional may respond/);
  assert.match(reviewMigration, /Reviews are preserved for integrity and cannot be deleted/);
  assert.match(reviewMigration, /Review identity and submitted content are immutable/);
});
