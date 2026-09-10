"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RequestConversationPanel from "@/components/RequestConversationPanel";
import {
  filterRequestConversations,
  getLatestRequestConversationUpdate,
  getRequestConversationPreview,
  getRequestConversationStateLabel,
  getRequestConversationTimestamp,
  getRequestConversationUnreadCount,
  isRequestConversationArchived,
  type RequestConversationFilter,
  type RequestConversationRole,
} from "@/lib/request-conversations";
import { getRequestServiceNames } from "@/lib/request-services";
import { useRequestInbox } from "@/lib/use-request-inbox";

type RequestInboxProps = {
  role: RequestConversationRole;
};

const filters: Array<{ value: RequestConversationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function formatInboxTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      });
}

export default function RequestInbox({ role }: RequestInboxProps) {
  const inbox = useRequestInbox(role);
  const inboxLoading = inbox.loading;
  const inboxRequests = inbox.requests;
  const selectedRequestId = inbox.selectedRequestId;
  const openInboxConversation = inbox.openConversation;
  const setSelectedRequestId = inbox.setSelectedRequestId;
  const [filter, setFilter] = useState<RequestConversationFilter>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const visibleRequests = useMemo(
    () =>
      filterRequestConversations(
        inbox.requests,
        inbox.updatesByRequestId,
        role,
        filter
      ),
    [filter, inbox.requests, inbox.updatesByRequestId, role]
  );
  const selectedRequest = inbox.requests.find(
    (request) => request.id === inbox.selectedRequestId
  );

  useEffect(() => {
    if (!inboxLoading && inboxRequests.length > 0) {
      const requestId = new URLSearchParams(window.location.search).get("request");
      if (requestId && inboxRequests.some((request) => request.id === requestId)) {
        openInboxConversation(requestId);
      }
    }
  }, [inboxLoading, inboxRequests, openInboxConversation]);

  useEffect(() => {
    if (
      selectedRequestId &&
      !visibleRequests.some((request) => request.id === selectedRequestId)
    ) {
      const frame = window.requestAnimationFrame(() => {
        setSelectedRequestId(null);
        setSelectedImage(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [selectedRequestId, setSelectedRequestId, visibleRequests]);

  const openConversation = (requestId: string) => {
    setActionError(null);
    setSelectedImage(null);
    inbox.openConversation(requestId);
  };

  const closeConversation = () => {
    setSelectedImage(null);
    inbox.setSelectedRequestId(null);
  };

  const handleSend = async () => {
    if (!selectedRequest) return;
    setActionError(null);

    try {
      await inbox.sendMessage(
        selectedRequest.id,
        drafts[selectedRequest.id] || "",
        selectedImage
      );
      setDrafts((current) => ({ ...current, [selectedRequest.id]: "" }));
      setSelectedImage(null);
    } catch (sendError) {
      setActionError(
        sendError instanceof Error
          ? sendError.message
          : "Your message could not be sent. Please try again."
      );
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    setActionError(null);
    try {
      await inbox.removeMessage(messageId);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "This message could not be deleted. Please try again."
      );
    }
  };

  const roleLabel = role === "client" ? "professional" : "client";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-lumina-bg px-4 py-7 text-lumina-text md:px-8 md:py-9">
      <div className="mx-auto max-w-[1480px]">
        <header className={inbox.selectedRequestId ? "hidden lg:block" : "block"}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
            Request conversations
          </p>
          <h1
            className="mt-2 text-[36px] font-semibold leading-tight md:text-[44px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Messages
          </h1>
          <p className="mt-3 max-w-[620px] text-[14px] leading-[1.6] text-lumina-text-muted">
            Every conversation stays connected to its original request, services,
            and appointment history.
          </p>
        </header>

        <div
          className={`mt-6 flex gap-2 overflow-x-auto pb-1 ${
            inbox.selectedRequestId ? "hidden lg:flex" : "flex"
          }`}
          aria-label="Conversation filters"
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-[12px] font-medium transition ${
                filter === item.value
                  ? "border-lumina-text bg-lumina-text text-white"
                  : "border-lumina-border bg-lumina-surface text-lumina-text hover:bg-lumina-surface-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(inbox.error || actionError) && (
          <div className="mt-4 rounded-[16px] border border-lumina-attention/25 bg-lumina-attention-soft px-4 py-3 text-[13px] text-lumina-text">
            {actionError || "Messages could not be loaded. Please refresh and try again."}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-[24px] border border-lumina-border bg-lumina-surface shadow-[0_12px_36px_rgba(39,36,40,0.04)] lg:grid lg:h-[min(720px,calc(100vh-240px))] lg:min-h-[560px] lg:grid-cols-[minmax(300px,370px)_minmax(0,1fr)]">
          <aside
            className={`min-h-[420px] border-lumina-border bg-lumina-surface lg:min-h-0 lg:border-r ${
              selectedRequest ? "hidden lg:block" : "block"
            }`}
            aria-label="Conversations"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-lumina-border px-4 py-3 text-[12px] text-lumina-text-muted">
                {visibleRequests.length} conversation{visibleRequests.length === 1 ? "" : "s"}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {inbox.loading ? (
                  <div className="px-5 py-10 text-center text-[13px] text-lumina-text-muted">
                    Loading conversations…
                  </div>
                ) : visibleRequests.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <MessageCircle
                      size={24}
                      strokeWidth={1.5}
                      className="mx-auto text-lumina-text-muted"
                    />
                    <p className="mt-4 text-[14px] font-medium text-lumina-text">
                      {filter === "unread"
                        ? "No unread conversations"
                        : filter === "archived"
                        ? "No archived conversations"
                        : filter === "active"
                        ? "No active conversations"
                        : "No request conversations yet"}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
                      Conversations appear here when a Lumina request exists.
                    </p>
                  </div>
                ) : (
                  visibleRequests.map((request) => {
                    const updates = inbox.updatesByRequestId[request.id] || [];
                    const latestUpdate = getLatestRequestConversationUpdate(updates);
                    const unread = getRequestConversationUnreadCount(updates, role);
                    const selected = request.id === inbox.selectedRequestId;
                    const services = getRequestServiceNames(request);
                    const timestamp = getRequestConversationTimestamp(request, updates);
                    const initials = request.participant_name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => openConversation(request.id)}
                        className={`flex w-full gap-3 border-b border-lumina-border/70 px-4 py-4 text-left transition last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text ${
                          selected
                            ? "bg-lumina-surface-soft"
                            : unread > 0
                            ? "bg-lumina-blush/35 hover:bg-lumina-blush/50"
                            : "bg-lumina-surface hover:bg-lumina-surface-soft/70"
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[11px] font-semibold text-lumina-text">
                          {request.participant_image_url ? (
                            <img
                              src={request.participant_image_url}
                              alt={request.participant_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials || "L"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`truncate text-[14px] ${unread > 0 ? "font-semibold" : "font-medium"}`}>
                              {request.participant_name}
                            </p>
                            <span className="shrink-0 text-[10px] text-lumina-text-muted">
                              {formatInboxTimestamp(timestamp)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
                            {services.length > 0
                              ? services.join(" · ")
                              : "Service request"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <p className={`min-w-0 flex-1 truncate text-[12px] ${unread > 0 ? "font-medium text-lumina-text" : "text-lumina-text-muted"}`}>
                              {getRequestConversationPreview(latestUpdate)}
                            </p>
                            {unread > 0 && (
                              <span
                                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lumina-black px-1.5 text-[10px] font-semibold text-white"
                                aria-label={`${unread} unread update${unread === 1 ? "" : "s"}`}
                              >
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                          <span className="mt-2 inline-flex rounded-full border border-lumina-border bg-lumina-surface px-2 py-0.5 text-[10px] text-lumina-text-muted">
                            {getRequestConversationStateLabel(request, role)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <div
            className={`${selectedRequest ? "block" : "hidden lg:block"} min-h-[560px] lg:min-h-0`}
          >
            {selectedRequest ? (
              <RequestConversationPanel
                context={{
                  requestId: selectedRequest.id,
                  participantName: selectedRequest.participant_name,
                  participantImageUrl: selectedRequest.participant_image_url,
                  participantSubtitle: selectedRequest.participant_subtitle,
                  services: getRequestServiceNames(selectedRequest),
                  requestDate: selectedRequest.created_at,
                  stateLabel: getRequestConversationStateLabel(selectedRequest, role),
                  relatedRequestHref: `${
                    role === "client" ? "/my-requests" : "/dashboard/requests"
                  }?${
                    isRequestConversationArchived(selectedRequest, role)
                      ? "view=archived&"
                      : ""
                  }request=${selectedRequest.id}`,
                }}
                updates={inbox.updatesByRequestId[selectedRequest.id] || []}
                currentUserType={role}
                draft={drafts[selectedRequest.id] || ""}
                selectedImage={selectedImage}
                onDraftChange={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [selectedRequest.id]: value,
                  }))
                }
                onImageChange={setSelectedImage}
                onSend={handleSend}
                onDeleteMessage={handleDelete}
                onBack={closeConversation}
              />
            ) : (
              <div className="flex h-full min-h-[560px] items-center justify-center bg-lumina-bg-soft px-8 text-center">
                <div className="max-w-[320px]">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-lumina-border bg-lumina-glass text-lumina-text-muted backdrop-blur">
                    <MessageCircle size={21} strokeWidth={1.55} />
                  </span>
                  <p className="mt-4 text-[15px] font-medium text-lumina-text">
                    Select a conversation
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-lumina-text-muted">
                    Choose a request to view its history and message the {roleLabel}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
