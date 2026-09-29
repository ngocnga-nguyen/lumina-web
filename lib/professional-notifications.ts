import { isActiveRequestState, type CompletionRequestLike } from "@/lib/request-completion";

export function getProfessionalNotificationView(request: CompletionRequestLike & { artist_hidden?: boolean | null }) {
  if (request.artist_hidden) return "archived";
  return isActiveRequestState(request) ? "active" : "history";
}

export function getProfessionalNotificationDestination(
  notification: { id: string; request_id: string | null; title: string },
  request?: CompletionRequestLike & { artist_hidden?: boolean | null },
) {
  if (!notification.request_id) return "/dashboard/requests";
  if (!request) return null;
  const params = new URLSearchParams({ request: notification.request_id,
    view: getProfessionalNotificationView(request), notification: notification.id });
  if (notification.title === "New Message") params.set("chat", "1");
  return `/dashboard/requests?${params}`;
}
