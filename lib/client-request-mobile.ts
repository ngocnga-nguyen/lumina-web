export type ClientMobileActionState = {
  key:
    | "review_proposal"
    | "confirm_appointment"
    | "completion_confirmation"
    | "review_ready"
    | "needs_attention";
  label: string;
  cta: string;
};

export type ClientMobileCompletionState =
  | "scheduled"
  | "booked"
  | "review_ready"
  | "awaiting_confirmation"
  | "completion_pending"
  | "needs_attention"
  | "completed";

export type ClientMobileRequestLike = {
  status?: string | null;
  client_status?: string | null;
  booking_status?: string | null;
};

export type ClientMobileRequestStatus = {
  label:
    | "Needs attention"
    | "Needs your response"
    | "Proposal received"
    | "Confirm service"
    | "Review ready"
    | "Confirmed"
    | "Different time requested"
    | "Waiting for artist"
    | "Completion pending"
    | "Completed"
    | "Declined";
  priority: 1 | 2 | 3 | 4 | 5;
  tone: "attention" | "action" | "review" | "confirmed" | "quiet";
  action: ClientMobileActionState | null;
};

export function getClientMobileRequestStatus(
  request: ClientMobileRequestLike,
  action: ClientMobileActionState | null,
  completionState: ClientMobileCompletionState
): ClientMobileRequestStatus {
  if (
    request.client_status === "needs_different_time" ||
    request.booking_status === "client_requested_changes"
  ) {
    return {
      label: "Different time requested",
      priority: 3,
      tone: "quiet",
      action: null,
    };
  }

  if (action?.key === "needs_attention") {
    return { label: "Needs attention", priority: 1, tone: "attention", action };
  }

  if (action?.key === "confirm_appointment") {
    return { label: "Needs your response", priority: 1, tone: "action", action };
  }

  if (action?.key === "completion_confirmation") {
    return { label: "Confirm service", priority: 1, tone: "action", action };
  }

  if (action?.key === "review_ready") {
    return { label: "Review ready", priority: 1, tone: "review", action };
  }

  if (action?.key === "review_proposal") {
    return { label: "Proposal received", priority: 1, tone: "action", action };
  }

  if (completionState === "needs_attention") {
    return {
      label: "Needs attention",
      priority: 1,
      tone: "attention",
      action: null,
    };
  }

  if (completionState === "booked") {
    return {
      label: "Confirmed",
      priority: 2,
      tone: "confirmed",
      action: null,
    };
  }

  if (
    completionState === "completion_pending" ||
    completionState === "awaiting_confirmation"
  ) {
    return {
      label: "Completion pending",
      priority: 5,
      tone: "quiet",
      action: null,
    };
  }

  if (completionState === "completed") {
    return {
      label: "Completed",
      priority: 5,
      tone: "confirmed",
      action: null,
    };
  }

  if (
    request.booking_status === "client_declined" ||
    request.status === "declined" ||
    request.client_status === "declined"
  ) {
    return {
      label: "Declined",
      priority: 5,
      tone: "quiet",
      action: null,
    };
  }

  if (request.status === "accepted" || request.status === "needs_changes") {
    return {
      label: "Proposal received",
      priority: 3,
      tone: "action",
      action: null,
    };
  }

  return {
    label: "Waiting for artist",
    priority: 4,
    tone: "quiet",
    action: null,
  };
}

export function getClientMobilePriorityClass(
  priority: ClientMobileRequestStatus["priority"]
) {
  if (priority === 1) return "order-1";
  if (priority === 2) return "order-2";
  if (priority === 3) return "order-3";
  if (priority === 4) return "order-4";
  return "order-5";
}
