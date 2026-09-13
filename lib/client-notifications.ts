import { supabase } from "@/lib/supabase";

export const CLIENT_NOTIFICATION_READ_STATE_EVENT =
  "lumina:client-notification-read-state-changed";

export type ClientNotification = {
  id: string;
  user_id: string;
  request_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean | null;
  created_at: string;
};

export type ClientNotificationRequest = {
  id: string;
  artist_id: string;
  artist_name: string | null;
  artist_image_url: string | null;
};

export type ClientNotificationReadKind = "all" | "action" | "message";

const CLIENT_ACTION_NOTIFICATION_TITLES = [
  "New Proposal",
  "Proposal Updated",
  "Completion Confirmation Needed",
  "Completion Needs Attention",
  "Appointment Needs Attention",
  "Appointment Completed",
] as const;

export function isClientActionNotification(
  notification: Pick<ClientNotification, "title">
) {
  return CLIENT_ACTION_NOTIFICATION_TITLES.includes(
    notification.title as (typeof CLIENT_ACTION_NOTIFICATION_TITLES)[number]
  );
}

export function getClientNotificationDestination(
  notification: ClientNotification,
  request?: ClientNotificationRequest
) {
  if (!notification.request_id) return "/client";

  if (notification.title === "New Message") {
    return `/client/messages?request=${notification.request_id}`;
  }

  if (notification.title === "Appointment Completed" && request?.artist_id) {
    return `/artist/${request.artist_id}?tab=reviews&request=${notification.request_id}`;
  }

  return `/my-requests?request=${notification.request_id}`;
}

export async function markClientNotificationsRead({
  notificationId,
  requestId,
  kind = "all",
}: {
  notificationId?: string;
  requestId?: string;
  kind?: ClientNotificationReadKind;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) return { data: null, error: authError };
  if (!user) {
    return {
      data: null,
      error: new Error("A signed-in client is required to read notifications."),
    };
  }

  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .or("is_read.eq.false,is_read.is.null");

  if (notificationId) query = query.eq("id", notificationId);
  if (requestId) query = query.eq("request_id", requestId);
  if (kind === "message") query = query.eq("title", "New Message");
  if (kind === "action") {
    query = query.in("title", [...CLIENT_ACTION_NOTIFICATION_TITLES]);
  }

  const result = await query.select("id");

  if (!result.error && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CLIENT_NOTIFICATION_READ_STATE_EVENT, {
        detail: {
          notificationIds: (result.data || []).map((item) => item.id),
          requestId,
          kind,
        },
      })
    );
  }

  return result;
}
