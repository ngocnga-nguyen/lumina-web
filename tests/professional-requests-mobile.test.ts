import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getProfessionalMobilePriorityClass,
  getProfessionalMobileRequestStatus,
} from "../lib/professional-request-mobile.ts";

const baseOptions = {
  completionState: "scheduled" as const,
  professionalAction: null,
  canComplete: false,
};

test("professional mobile labels use authoritative request and completion state", () => {
  const newRequest = getProfessionalMobileRequestStatus(
    { status: "new" },
    { ...baseOptions, professionalAction: "request" }
  );
  assert.equal(newRequest.label, "New request");
  assert.equal(newRequest.action?.label, "Respond");
  assert.equal(newRequest.priority, 1);

  const changes = getProfessionalMobileRequestStatus(
      { status: "accepted", client_status: "needs_different_time" },
      { ...baseOptions, professionalAction: "request" }
  );
  assert.equal(changes.label, "Client requested changes");
  assert.equal(changes.action?.label, "Review changes");
  assert.equal(changes.priority, 2);

  assert.equal(
    getProfessionalMobileRequestStatus(
      {
        status: "accepted",
        client_status: "confirmed",
        booking_status: "booked",
      },
      { ...baseOptions, completionState: "booked" }
    ).label,
    "Confirmed"
  );

  const proposalSent = getProfessionalMobileRequestStatus(
    { status: "accepted", client_status: "pending" },
    baseOptions
  );
  assert.equal(proposalSent.label, "Waiting for client");
  assert.match(proposalSent.waitingDetail || "", /confirm the appointment/);

  const completionWaiting = getProfessionalMobileRequestStatus(
    {
      status: "accepted",
      client_status: "confirmed",
      booking_status: "booked",
      artist_completion_response: "confirmed",
    },
    { ...baseOptions, completionState: "completion_pending" }
  );
  assert.equal(completionWaiting.label, "Waiting for client");
  assert.match(completionWaiting.waitingDetail || "", /completion response/);

  assert.equal(
    getProfessionalMobileRequestStatus(
      { status: "accepted", booking_status: "completed" },
      { ...baseOptions, completionState: "review_ready" }
    ).label,
    "Completed"
  );
  assert.equal(
    getProfessionalMobileRequestStatus(
      { status: "declined" },
      baseOptions
    ).label,
    "Declined"
  );
});

test("professional actions and priority order remain presentation-only", () => {
  const issue = getProfessionalMobileRequestStatus(
    { status: "accepted" },
    {
      ...baseOptions,
      completionState: "needs_attention",
      professionalAction: "needs_attention",
    }
  );
  assert.equal(issue.label, "Needs attention");
  assert.equal(issue.action?.label, "View issue");
  assert.equal(issue.priority, 1);

  const complete = getProfessionalMobileRequestStatus(
    { status: "accepted", client_status: "confirmed", booking_status: "booked" },
    { ...baseOptions, completionState: "awaiting_confirmation", canComplete: true }
  );
  assert.equal(complete.label, "Ready to complete");
  assert.equal(complete.action?.kind, "complete");
  assert.equal(complete.priority, 4);

  const needsResponse = getProfessionalMobileRequestStatus(
    { status: "pending" },
    { ...baseOptions, professionalAction: "request" }
  );
  assert.equal(needsResponse.label, "Needs your response");
  assert.equal(needsResponse.action?.label, "Respond");

  const waiting = getProfessionalMobileRequestStatus(
    { status: "accepted" },
    baseOptions
  );
  assert.equal(waiting.label, "Waiting for client");
  assert.match(waiting.waitingDetail || "", /proposal/);

  for (const priority of [1, 2, 3, 4, 5, 6] as const) {
    assert.equal(getProfessionalMobilePriorityClass(priority), `order-${priority}`);
  }
});

test("mobile presentation routes to the shared inbox and mounts no realtime client", () => {
  const page = readFileSync(
    new URL("../app/dashboard/requests/page.tsx", import.meta.url),
    "utf8"
  );
  const summary = readFileSync(
    new URL("../components/ProfessionalRequestMobileSummary.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /lg:order-none/);
  assert.match(page, /hidden cursor-pointer[\s\S]*lg:flex/);
  assert.match(summary, /className="lg:hidden"/);
  assert.match(summary, /\/dashboard\/messages\?request=/);
  assert.match(summary, /Message client/);
  assert.match(summary, /Archive/);
  assert.match(summary, /Restore/);
  assert.match(summary, /unreadCount > 99/);
  assert.match(summary, /status\.label === "New request"/);
  assert.match(summary, /bg-lumina-surface-soft text-lumina-text-muted/);
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
