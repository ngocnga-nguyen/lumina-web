import {
  getCompletionState,
  getCompletionStateLabel,
  isTerminalRequestState,
  type CompletionRequestLike,
} from "@/lib/request-completion";
import {
  getIncomingUnreadMessageCount,
  isIncomingUnreadMessage,
} from "@/lib/message-unread";
import { supabase } from "@/lib/supabase";

export const REQUEST_MESSAGE_READ_STATE_EVENT =
  "lumina:request-message-read-state-changed";

export type RequestConversationRole = "client" | "artist";
export type RequestConversationFilter = "all" | "unread" | "active" | "archived";

export type RequestConversationUpdate = {
  id: string;
  request_id: string;
  sender_type: string;
  message: string | null;
  status: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  expected_end_at: string | null;
  image_url: string | null;
  created_at: string;
  is_read_by_client: boolean | null;
  is_read_by_artist: boolean | null;
  is_deleted: boolean | null;
};

export type RequestConversationRecord = CompletionRequestLike & {
  id: string;
  client_id: string;
  artist_id: string;
  client_name: string | null;
  artist_name: string | null;
  artist_image_url: string | null;
  artist_category: string | null;
  service_requested: string | null;
  requested_services?: unknown;
  created_at: string;
  client_hidden: boolean | null;
  artist_hidden: boolean | null;
  participant_name: string;
  participant_image_url: string | null;
  participant_subtitle: string;
};

export function getRequestConversationUnreadCount(
  updates: RequestConversationUpdate[],
  role: RequestConversationRole
) {
  return getIncomingUnreadMessageCount(updates, role);
}

export function markConversationUpdatesRead(
  updates: RequestConversationUpdate[],
  role: RequestConversationRole
) {
  const readColumn =
    role === "client" ? "is_read_by_client" : "is_read_by_artist";

  return updates.map((update) =>
    !isIncomingUnreadMessage(update, role)
      ? update
      : {
          ...update,
          [readColumn]: true,
        }
  );
}

export async function markRequestConversationRead(
  requestId: string,
  role: RequestConversationRole
) {
  const readColumn =
    role === "client" ? "is_read_by_client" : "is_read_by_artist";

  const result = await supabase
    .from("request_updates")
    .update({ [readColumn]: true })
    .eq("request_id", requestId)
    .neq("sender_type", role)
    .eq(readColumn, false)
    .or("is_deleted.eq.false,is_deleted.is.null")
    .select("id");

  if (!result.error && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(REQUEST_MESSAGE_READ_STATE_EVENT, {
        detail: {
          requestId,
          role,
          markedReadCount: result.data?.length || 0,
        },
      })
    );
  }

  return result;
}

export function getLatestRequestConversationUpdate(
  updates: RequestConversationUpdate[]
) {
  return [...updates]
    .reverse()
    .find((update) => !update.is_deleted) || null;
}

export function getRequestConversationPreview(
  update: RequestConversationUpdate | null
) {
  if (!update) return "No messages yet";

  const message = update.message?.trim();
  if (message) return message;
  if (update.image_url) return "Image shared";
  if (
    update.proposed_date ||
    update.proposed_time ||
    update.proposed_price != null ||
    update.status === "accepted" ||
    update.status === "needs_changes"
  ) {
    return "Proposal update";
  }

  return "Request update";
}

export function getRequestConversationTimestamp(
  request: Pick<RequestConversationRecord, "created_at">,
  updates: RequestConversationUpdate[]
) {
  return getLatestRequestConversationUpdate(updates)?.created_at || request.created_at;
}

export function isRequestConversationArchived(
  request: Pick<RequestConversationRecord, "client_hidden" | "artist_hidden">,
  role: RequestConversationRole
) {
  return role === "client" ? !!request.client_hidden : !!request.artist_hidden;
}

export function isRequestConversationActive(
  request: RequestConversationRecord
) {
  return !isTerminalRequestState(request);
}

export function getRequestConversationStateLabel(
  request: RequestConversationRecord,
  role: RequestConversationRole,
  now = new Date()
) {
  const completionState = getCompletionState(request, now);
  if (completionState !== "scheduled") {
    return getCompletionStateLabel(completionState);
  }

  if (isTerminalRequestState(request)) return "Declined";

  if (
    request.status === "needs_changes" ||
    request.client_status === "needs_different_time" ||
    request.booking_status === "client_requested_changes"
  ) {
    return "Changes requested";
  }

  if (request.status === "accepted") {
    return role === "client" ? "Proposal received" : "Proposal sent";
  }

  return role === "client" ? "Waiting for professional" : "New request";
}

export function filterRequestConversations(
  requests: RequestConversationRecord[],
  updatesByRequestId: Record<string, RequestConversationUpdate[]>,
  role: RequestConversationRole,
  filter: RequestConversationFilter
) {
  return requests
    .filter((request) => {
      const archived = isRequestConversationArchived(request, role);
      if (filter === "archived") return archived;
      if (archived) return false;
      if (filter === "unread") {
        return (
          getRequestConversationUnreadCount(
            updatesByRequestId[request.id] || [],
            role
          ) > 0
        );
      }
      if (filter === "active") return isRequestConversationActive(request);
      return true;
    })
    .sort((first, second) => {
      const firstTime = new Date(
        getRequestConversationTimestamp(
          first,
          updatesByRequestId[first.id] || []
        )
      ).getTime();
      const secondTime = new Date(
        getRequestConversationTimestamp(
          second,
          updatesByRequestId[second.id] || []
        )
      ).getTime();

      return secondTime - firstTime;
    });
}
