"use client";

import RequestConversationPanel from "@/components/RequestConversationPanel";
import {
  getRequestConversationStateLabel,
  type RequestConversationRecord,
  type RequestConversationUpdate,
} from "@/lib/request-conversations";
import { getRequestServiceNames } from "@/lib/request-services";

type ClientRequest = {
  id: string;
  artist_name: string | null;
  artist_image_url: string | null;
  artist_category: string | null;
  status: string | null;
  client_status: string | null;
  booking_status?: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  scheduled_for?: string | null;
  expected_end_at?: string | null;
  completion_protocol_version?: number | null;
  appointment_confirmed_at?: string | null;
  appointment_exception_reason?:
    | "client_cancelled"
    | "no_show"
    | "did_not_take_place"
    | "issue"
    | null;
  artist_completion_response?: "confirmed" | "disputed" | null;
  client_completion_response?: "confirmed" | "disputed" | null;
  image_url: string | null;
  service_requested: string | null;
  requested_services?: unknown;
  created_at?: string;
};

type ChatModalProps = {
  request: ClientRequest;
  updates: RequestConversationUpdate[];
  draft: string;
  onDraftChange: (value: string) => void;
  selectedImage: File | null;
  onImageChange: (file: File | null) => void;
  onSend: () => void | Promise<void>;
  onClose: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onRequestDifferentTime?: () => void;
  currentUserType?: "client" | "artist";
  onDeleteMessage: (messageId: string) => void | Promise<void>;
};

export default function ChatModal({
  request,
  updates,
  draft,
  onDraftChange,
  onSend,
  selectedImage,
  onImageChange,
  onDeleteMessage,
  currentUserType = "client",
  onClose,
}: ChatModalProps) {
  const participantName = request.artist_name || "Lumina participant";
  const participantSubtitle =
    request.artist_category ||
    (currentUserType === "client" ? "Beauty professional" : "Client");
  const normalizedRequest: RequestConversationRecord = {
    ...request,
    client_id: "",
    artist_id: "",
    client_name: null,
    created_at: request.created_at || new Date().toISOString(),
    client_hidden: false,
    artist_hidden: false,
    participant_name: participantName,
    participant_image_url: request.artist_image_url,
    participant_subtitle: participantSubtitle,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-3 py-4 md:px-4">
      <div className="h-[min(88vh,820px)] w-full max-w-[680px] overflow-hidden rounded-[28px] border border-lumina-border bg-lumina-surface shadow-2xl md:rounded-[32px]">
        <RequestConversationPanel
          context={{
            requestId: request.id,
            participantName,
            participantImageUrl: request.artist_image_url,
            participantSubtitle,
            services: getRequestServiceNames(request),
            requestDate: request.created_at,
            stateLabel: getRequestConversationStateLabel(
              normalizedRequest,
              currentUserType
            ),
            relatedRequestHref:
              currentUserType === "client"
                ? `/my-requests?request=${request.id}`
                : `/dashboard/requests?request=${request.id}`,
          }}
          updates={updates}
          currentUserType={currentUserType}
          draft={draft}
          selectedImage={selectedImage}
          onDraftChange={onDraftChange}
          onImageChange={onImageChange}
          onSend={onSend}
          onDeleteMessage={onDeleteMessage}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
