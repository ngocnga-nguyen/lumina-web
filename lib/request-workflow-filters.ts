import {
  canMarkBookingLiteCompleted,
  getClientRequestActionState,
  getProfessionalRequestAction,
  isActiveRequestState,
  isCompletedRequestState,
  isConfirmedUpcomingRequest,
  isDeclinedRequestState,
  type CompletionRequestLike,
} from "@/lib/request-completion";

export type RequestLifecycleView = "active" | "history" | "archived";
export type ActiveRequestFilter = "all" | "needs_action" | "waiting" | "confirmed";
export type HistoryRequestFilter = "all" | "completed" | "declined";
export type RequestWorkflowRole = "client" | "artist";

export type RequestWorkflowLike = CompletionRequestLike & {
  id: string;
};

type WorkflowOptions = {
  role: RequestWorkflowRole;
  hasReviewed?: boolean;
  now?: Date;
};

export function matchesRequestLifecycleView(
  request: RequestWorkflowLike,
  view: RequestLifecycleView,
  archived: boolean
) {
  if (view === "archived") return archived;
  if (archived) return false;
  if (view === "history") return !isActiveRequestState(request);
  return isActiveRequestState(request);
}

export function requestNeedsAction(
  request: RequestWorkflowLike,
  { role, hasReviewed = false, now = new Date() }: WorkflowOptions
) {
  if (!isActiveRequestState(request)) return false;

  if (role === "client") {
    return !!getClientRequestActionState(request, hasReviewed, now);
  }

  return (
    !!getProfessionalRequestAction(request, now) ||
    canMarkBookingLiteCompleted(request, now)
  );
}

export function matchesActiveRequestFilter(
  request: RequestWorkflowLike,
  filter: ActiveRequestFilter,
  options: WorkflowOptions
) {
  if (!isActiveRequestState(request)) return false;
  if (filter === "all") return true;
  if (filter === "needs_action") return requestNeedsAction(request, options);
  if (filter === "confirmed") {
    return isConfirmedUpcomingRequest(request, options.now);
  }

  return (
    !requestNeedsAction(request, options) &&
    !isConfirmedUpcomingRequest(request, options.now)
  );
}

export function matchesHistoryRequestFilter(
  request: RequestWorkflowLike,
  filter: HistoryRequestFilter
) {
  if (filter === "completed") return isCompletedRequestState(request);
  if (filter === "declined") return isDeclinedRequestState(request);
  return isCompletedRequestState(request) || isDeclinedRequestState(request);
}

export function normalizeRequestSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesRequestSearch(
  query: string,
  values: Array<string | null | undefined>
) {
  const normalizedQuery = normalizeRequestSearchValue(query);
  if (!normalizedQuery) return true;

  return values.some((value) =>
    normalizeRequestSearchValue(value || "").includes(normalizedQuery)
  );
}
