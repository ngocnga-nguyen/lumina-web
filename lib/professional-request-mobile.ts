export type ProfessionalMobileCompletionState =
  | "scheduled"
  | "booked"
  | "review_ready"
  | "awaiting_confirmation"
  | "completion_pending"
  | "needs_attention"
  | "completed";

export type ProfessionalMobileRequestLike = {
  status?: string | null;
  client_status?: string | null;
  booking_status?: string | null;
  artist_completion_response?: string | null;
  client_completion_response?: string | null;
};

export type ProfessionalMobileRequestAction = {
  label: "Respond" | "Review changes" | "Mark completed" | "View issue";
  kind: "expand" | "complete";
};

export type ProfessionalMobileRequestStatus = {
  label:
    | "Needs attention"
    | "New request"
    | "Client requested changes"
    | "Needs your response"
    | "Confirmed"
    | "Ready to complete"
    | "Waiting for client"
    | "Completed"
    | "Declined";
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  tone: "attention" | "action" | "confirmed" | "quiet";
  action: ProfessionalMobileRequestAction | null;
  waitingDetail: string | null;
};

type ProfessionalMobileStatusOptions = {
  completionState: ProfessionalMobileCompletionState;
  professionalAction: "request" | "needs_attention" | null;
  canComplete: boolean;
};

export function getProfessionalMobileRequestStatus(
  request: ProfessionalMobileRequestLike,
  {
    completionState,
    professionalAction,
    canComplete,
  }: ProfessionalMobileStatusOptions
): ProfessionalMobileRequestStatus {
  if (
    professionalAction === "needs_attention" ||
    completionState === "needs_attention"
  ) {
    return {
      label: "Needs attention",
      priority: 1,
      tone: "attention",
      action: { label: "View issue", kind: "expand" },
      waitingDetail: null,
    };
  }

  if (!request.status || request.status === "new") {
    return {
      label: "New request",
      priority: 1,
      tone: "action",
      action: { label: "Respond", kind: "expand" },
      waitingDetail: null,
    };
  }

  if (
    request.status === "needs_changes" ||
    request.client_status === "needs_different_time" ||
    request.booking_status === "client_requested_changes"
  ) {
    return {
      label: "Client requested changes",
      priority: 2,
      tone: "action",
      action: { label: "Review changes", kind: "expand" },
      waitingDetail: null,
    };
  }

  if (canComplete) {
    return {
      label: "Ready to complete",
      priority: 4,
      tone: "action",
      action: { label: "Mark completed", kind: "complete" },
      waitingDetail: null,
    };
  }

  if (professionalAction === "request") {
    return {
      label: "Needs your response",
      priority: 1,
      tone: "action",
      action: { label: "Respond", kind: "expand" },
      waitingDetail: null,
    };
  }

  if (
    request.booking_status === "client_declined" ||
    request.status === "declined" ||
    request.client_status === "declined"
  ) {
    return {
      label: "Declined",
      priority: 6,
      tone: "quiet",
      action: null,
      waitingDetail: null,
    };
  }

  if (
    completionState === "completed" ||
    completionState === "review_ready" ||
    request.booking_status === "completed"
  ) {
    return {
      label: "Completed",
      priority: 6,
      tone: "confirmed",
      action: null,
      waitingDetail: null,
    };
  }

  if (completionState === "booked") {
    return {
      label: "Confirmed",
      priority: 3,
      tone: "confirmed",
      action: null,
      waitingDetail: null,
    };
  }

  if (
    completionState === "completion_pending" ||
    completionState === "awaiting_confirmation"
  ) {
    return {
      label: "Waiting for client",
      priority: 5,
      tone: "quiet",
      action: null,
      waitingDetail:
        "Your completion response is recorded. Waiting for the client to confirm the service.",
    };
  }

  if (request.status === "accepted") {
    return {
      label: "Waiting for client",
      priority: 5,
      tone: "quiet",
      action: null,
      waitingDetail:
        "Your proposal is ready. Waiting for the client to confirm the appointment.",
    };
  }

  return {
    label: "Waiting for client",
    priority: 5,
    tone: "quiet",
    action: null,
    waitingDetail: "Waiting for the client’s next response.",
  };
}

export function getProfessionalMobilePriorityClass(
  priority: ProfessionalMobileRequestStatus["priority"]
) {
  if (priority === 1) return "order-1";
  if (priority === 2) return "order-2";
  if (priority === 3) return "order-3";
  if (priority === 4) return "order-4";
  if (priority === 5) return "order-5";
  return "order-6";
}
