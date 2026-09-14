export type CompletionResponse = "confirmed" | "disputed";
export type AppointmentExceptionReason =
  | "client_cancelled"
  | "no_show"
  | "did_not_take_place"
  | "issue";

export type CompletionState =
  | "scheduled"
  | "booked"
  | "review_ready"
  | "awaiting_confirmation"
  | "completion_pending"
  | "needs_attention"
  | "completed";

export type ClientRequestActionState = {
  key:
    | "review_proposal"
    | "confirm_appointment"
    | "completion_confirmation"
    | "review_ready"
    | "needs_attention";
  label: string;
  cta: string;
};

export type CompletionRequestLike = {
  status?: string | null;
  client_status?: string | null;
  booking_status?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  proposed_price?: number | null;
  scheduled_for?: string | null;
  expected_end_at?: string | null;
  completion_protocol_version?: number | null;
  appointment_confirmed_at?: string | null;
  appointment_exception_reason?: AppointmentExceptionReason | null;
  artist_completion_response?: CompletionResponse | null;
  client_completion_response?: CompletionResponse | null;
};

export const BOOKING_LITE_FALLBACK_DURATION_MINUTES = 12 * 60;
export const MAX_APPOINTMENT_DURATION_MINUTES = 24 * 60;

export function createScheduledFor(
  proposedDate: string | null | undefined,
  proposedTime: string | null | undefined
) {
  if (!proposedDate || !proposedTime) return null;

  const scheduled = new Date(`${proposedDate}T${proposedTime}`);

  return Number.isNaN(scheduled.getTime()) ? null : scheduled.toISOString();
}

export function createExpectedEndAt(
  scheduledFor: string | null | undefined,
  durationMinutes: number | null | undefined
) {
  if (
    !scheduledFor ||
    !durationMinutes ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > MAX_APPOINTMENT_DURATION_MINUTES
  ) {
    return null;
  }

  const scheduled = new Date(scheduledFor);
  if (Number.isNaN(scheduled.getTime())) return null;

  return new Date(scheduled.getTime() + durationMinutes * 60_000).toISOString();
}

export function getAppointmentDurationMinutes(
  request: Pick<CompletionRequestLike, "scheduled_for" | "expected_end_at">
) {
  if (!request.scheduled_for || !request.expected_end_at) return null;

  const scheduled = new Date(request.scheduled_for);
  const expectedEnd = new Date(request.expected_end_at);
  const duration = expectedEnd.getTime() - scheduled.getTime();

  if (
    Number.isNaN(scheduled.getTime()) ||
    Number.isNaN(expectedEnd.getTime()) ||
    duration <= 0 ||
    duration > MAX_APPOINTMENT_DURATION_MINUTES * 60_000
  ) {
    return null;
  }

  return Math.round(duration / 60_000);
}

export function getBookingLiteReviewReadyAt(
  request: CompletionRequestLike
) {
  if (request.completion_protocol_version !== 3 || !request.scheduled_for) {
    return null;
  }

  const scheduled = new Date(request.scheduled_for);
  if (Number.isNaN(scheduled.getTime())) return null;

  if (request.expected_end_at) {
    const expectedEnd = new Date(request.expected_end_at);
    const duration = expectedEnd.getTime() - scheduled.getTime();

    if (
      !Number.isNaN(expectedEnd.getTime()) &&
      duration > 0 &&
      duration <= MAX_APPOINTMENT_DURATION_MINUTES * 60_000
    ) {
      return expectedEnd;
    }
  }

  return new Date(
    scheduled.getTime() + BOOKING_LITE_FALLBACK_DURATION_MINUTES * 60_000
  );
}

export function bookingLiteReviewTimeHasPassed(
  request: CompletionRequestLike,
  now = new Date()
) {
  const reviewReadyAt = getBookingLiteReviewReadyAt(request);
  return !!reviewReadyAt && reviewReadyAt.getTime() <= now.getTime();
}

export function getNextRequestStateTransitionAt(
  request: CompletionRequestLike,
  now = new Date()
) {
  if (request.completion_protocol_version === 3 && request.appointment_confirmed_at) {
    const reviewReadyAt = getBookingLiteReviewReadyAt(request);
    if (reviewReadyAt && reviewReadyAt.getTime() > now.getTime()) {
      return reviewReadyAt;
    }
  }

  if (request.scheduled_for) {
    const scheduled = new Date(request.scheduled_for);
    if (!Number.isNaN(scheduled.getTime()) && scheduled.getTime() > now.getTime()) {
      return scheduled;
    }
  }

  return null;
}

export function appointmentTimeHasPassed(
  request: CompletionRequestLike,
  now = new Date()
) {
  if (request.scheduled_for) {
    const scheduled = new Date(request.scheduled_for);
    return !Number.isNaN(scheduled.getTime()) && scheduled.getTime() <= now.getTime();
  }

  // Existing unfinished requests predate scheduled_for and do not carry a
  // trustworthy timezone. Match the database's conservative fallback: wait
  // until the proposed calendar date has fully passed.
  if (request.proposed_date) {
    return request.proposed_date.slice(0, 10) < now.toISOString().slice(0, 10);
  }

  return false;
}

export function getCompletionState(
  request: CompletionRequestLike,
  now = new Date()
): CompletionState {
  if (request.booking_status === "completed") return "completed";

  if (
    request.completion_protocol_version === 3 &&
    (request.booking_status === "needs_attention" ||
      request.appointment_exception_reason ||
      request.artist_completion_response === "disputed")
  ) {
    return "needs_attention";
  }

  if (
    request.completion_protocol_version === 3 &&
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    request.booking_status === "booked" &&
    request.appointment_confirmed_at
  ) {
    return bookingLiteReviewTimeHasPassed(request, now)
      ? "review_ready"
      : "booked";
  }

  if (
    request.artist_completion_response === "disputed" ||
    request.client_completion_response === "disputed"
  ) {
    return "needs_attention";
  }

  if (
    request.artist_completion_response === "confirmed" ||
    request.client_completion_response === "confirmed"
  ) {
    return "completion_pending";
  }

  if (
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    request.booking_status === "booked" &&
    appointmentTimeHasPassed(request, now)
  ) {
    return "awaiting_confirmation";
  }

  return "scheduled";
}

export function getCompletionStateLabel(state: CompletionState) {
  if (state === "booked") return "Appointment confirmed";
  if (state === "review_ready") return "Review ready";
  if (state === "awaiting_confirmation") return "Awaiting confirmation";
  if (state === "completion_pending") return "Completion pending";
  if (state === "needs_attention") return "Needs attention";
  if (state === "completed") return "Completed";
  return "Scheduled";
}

export function canSubmitCompletionResponse(
  request: CompletionRequestLike,
  participant: "artist" | "client",
  now = new Date()
) {
  if (
    request.completion_protocol_version === 3 ||
    request.status !== "accepted" ||
    request.client_status !== "confirmed" ||
    request.booking_status !== "booked" ||
    !appointmentTimeHasPassed(request, now) ||
    request.artist_completion_response === "disputed" ||
    request.client_completion_response === "disputed"
  ) {
    return false;
  }

  return participant === "artist"
    ? !request.artist_completion_response
    : !request.client_completion_response;
}

export function canConfirmBookingLiteAppointment(
  request: CompletionRequestLike,
  now = new Date()
) {
  if (request.completion_protocol_version !== 3) return false;

  const scheduled = request.scheduled_for ? new Date(request.scheduled_for) : null;
  const expectedEnd = request.expected_end_at
    ? new Date(request.expected_end_at)
    : null;
  return (
    request.status === "accepted" &&
    request.client_status !== "confirmed" &&
    request.booking_status !== "completed" &&
    !!request.proposed_date &&
    !!request.proposed_time &&
    request.proposed_price != null &&
    !!scheduled &&
    !Number.isNaN(scheduled.getTime()) &&
    scheduled.getTime() > now.getTime() &&
    !!expectedEnd &&
    !Number.isNaN(expectedEnd.getTime()) &&
    expectedEnd.getTime() > scheduled.getTime() &&
    expectedEnd.getTime() - scheduled.getTime() <=
      MAX_APPOINTMENT_DURATION_MINUTES * 60_000
  );
}

export function canLeaveBookingLiteReview(
  request: CompletionRequestLike,
  now = new Date()
) {
  return (
    request.completion_protocol_version === 3 &&
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    !!request.appointment_confirmed_at &&
    !!request.scheduled_for &&
    bookingLiteReviewTimeHasPassed(request, now) &&
    (request.booking_status === "booked" ||
      request.booking_status === "completed" ||
      request.booking_status === "needs_attention")
  );
}

export function getClientRequestActionState(
  request: CompletionRequestLike,
  hasReviewed = false,
  now = new Date()
): ClientRequestActionState | null {
  const completionState = getCompletionState(request, now);

  if (
    completionState === "needs_attention" &&
    request.completion_protocol_version === 3 &&
    !request.client_completion_response
  ) {
    return {
      key: "needs_attention",
      label: "Needs attention",
      cta: "View issue",
    };
  }

  if (
    !hasReviewed &&
    (canLeaveBookingLiteReview(request, now) ||
      isReviewEligibleCompletion(request, now))
  ) {
    return {
      key: "review_ready",
      label: "Review ready",
      cta: "Leave review",
    };
  }

  if (canSubmitCompletionResponse(request, "client", now)) {
    return {
      key: "completion_confirmation",
      label: "Completion pending",
      cta: "Confirm service",
    };
  }

  if (canConfirmBookingLiteAppointment(request, now)) {
    return {
      key: "confirm_appointment",
      label: "Awaiting your confirmation",
      cta: "Confirm appointment",
    };
  }

  const hasUnansweredProposal =
    (request.status === "accepted" || request.status === "needs_changes") &&
    request.client_status !== "confirmed" &&
    request.client_status !== "declined" &&
    request.booking_status !== "completed" &&
    request.booking_status !== "client_declined";

  if (hasUnansweredProposal) {
    return {
      key: "review_proposal",
      label: "Proposal received",
      cta: "Review proposal",
    };
  }

  return null;
}

export function getAppointmentExceptionLabel(
  reason: AppointmentExceptionReason | null | undefined
) {
  if (reason === "client_cancelled") return "Client cancelled";
  if (reason === "no_show") return "No-show";
  if (reason === "did_not_take_place") return "Appointment did not take place";
  if (reason === "issue") return "Issue reported";
  return null;
}

export function isReviewEligibleCompletion(
  request: CompletionRequestLike,
  now = new Date()
) {
  if (request.booking_status !== "completed") return false;

  // Null is treated as legacy in the UI only so deployed code keeps rendering
  // safely during the short interval before the migration is applied.
  if (
    request.completion_protocol_version == null ||
    request.completion_protocol_version === 1
  ) {
    return true;
  }

  if (request.completion_protocol_version === 3) {
    return (
      request.client_completion_response === "confirmed" &&
      !!request.appointment_confirmed_at &&
      bookingLiteReviewTimeHasPassed(request, now)
    );
  }

  return (
    request.completion_protocol_version === 2 &&
    request.artist_completion_response === "confirmed" &&
    request.client_completion_response === "confirmed"
  );
}

export type WorkspaceActionRequest = CompletionRequestLike & {
  id: string;
};

export function isTerminalRequestState(request: CompletionRequestLike) {
  return isCompletedRequestState(request) || isDeclinedRequestState(request);
}

export function isCompletedRequestState(request: CompletionRequestLike) {
  return request.booking_status === "completed";
}

export function isDeclinedRequestState(request: CompletionRequestLike) {
  if (isCompletedRequestState(request)) return false;

  return (
    request.booking_status === "client_declined" ||
    request.status === "declined" ||
    request.client_status === "declined"
  );
}

export function isActiveRequestState(request: CompletionRequestLike) {
  return !isTerminalRequestState(request);
}

export function isConfirmedUpcomingRequest(
  request: CompletionRequestLike,
  now = new Date()
) {
  return (
    isActiveRequestState(request) &&
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    request.booking_status === "booked" &&
    !appointmentTimeHasPassed(request, now)
  );
}

export function canMarkBookingLiteCompleted(
  request: CompletionRequestLike,
  now = new Date()
) {
  return (
    request.completion_protocol_version === 3 &&
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    request.booking_status === "booked" &&
    !request.appointment_exception_reason &&
    appointmentTimeHasPassed(request, now)
  );
}

export type ClientWorkspaceActionCounts = {
  requests: number;
  reviews: number;
  requestIssues: number;
};

export type ProfessionalWorkspaceActionCounts = {
  requests: number;
  requestIssues: number;
};

export function getClientWorkspaceActionCounts(
  requests: WorkspaceActionRequest[],
  reviewedRequestIds: ReadonlySet<string>,
  now = new Date()
): ClientWorkspaceActionCounts {
  let requestCount = 0;
  let reviewCount = 0;
  let requestIssues = 0;

  requests.forEach((request) => {
    const action = getClientRequestActionState(
      request,
      reviewedRequestIds.has(request.id),
      now
    );

    if (!action) return;
    if (action.key === "review_ready") {
      reviewCount += 1;
      return;
    }

    requestCount += 1;
    if (action.key === "needs_attention") requestIssues += 1;
  });

  return {
    requests: requestCount,
    reviews: reviewCount,
    requestIssues,
  };
}

export function getProfessionalRequestAction(
  request: WorkspaceActionRequest,
  now = new Date()
): "request" | "needs_attention" | null {
  if (getCompletionState(request, now) === "needs_attention") {
    return "needs_attention";
  }

  if (isTerminalRequestState(request)) {
    return null;
  }

  if (canSubmitCompletionResponse(request, "artist", now)) {
    return "request";
  }

  if (!request.status || request.status === "new") {
    return "request";
  }

  if (
    request.status === "needs_changes" ||
    request.client_status === "needs_different_time" ||
    request.booking_status === "client_requested_changes"
  ) {
    return "request";
  }

  return null;
}

export function getProfessionalWorkspaceActionCounts(
  requests: WorkspaceActionRequest[],
  now = new Date()
): ProfessionalWorkspaceActionCounts {
  let requestCount = 0;
  let requestIssues = 0;

  requests.forEach((request) => {
    const action = getProfessionalRequestAction(request, now);
    if (!action) return;

    requestCount += 1;
    if (action === "needs_attention") requestIssues += 1;
  });

  return { requests: requestCount, requestIssues };
}
