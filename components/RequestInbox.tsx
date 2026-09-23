"use client";

import { MessageCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RequestConversationPanel from "@/components/RequestConversationPanel";
import IdentityAvatar from "@/components/IdentityAvatar";
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

function shouldShowConversationState(stateLabel: string) {
  return stateLabel !== "Scheduled";
}

export default function RequestInbox({ role }: RequestInboxProps) {
  const inbox = useRequestInbox(role);
  const inboxLoading = inbox.loading;
  const inboxRequests = inbox.requests;
  const selectedRequestId = inbox.selectedRequestId;
  const openInboxConversation = inbox.openConversation;
  const setSelectedRequestId = inbox.setSelectedRequestId;
  const [filter, setFilter] = useState<RequestConversationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const visibleRequests = useMemo(
    () =>
      filterRequestConversations(
        inbox.requests,
        inbox.updatesByRequestId,
        role,
        filter,
        searchQuery
      ),
    [filter, inbox.requests, inbox.updatesByRequestId, role, searchQuery]
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

  // Both responsive placements share the same controls and filter state.
  const inboxControls = (
    <>
      <div
          className={`relative mt-4 md:mt-5 lg:mt-0 ${
            inbox.selectedRequestId ? "hidden lg:block" : "block"
          }`}
        >
          <Search
            size={16}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lumina-text-muted"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="min-h-11 w-full rounded-full border border-lumina-border bg-lumina-surface py-2.5 pl-10 pr-4 text-[13px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted focus:border-lumina-text lg:min-h-10 lg:text-[12px]"
          />
        </div>

        <div
          className={`mt-3 flex gap-2 overflow-x-auto pb-1 lg:mt-2.5 lg:gap-1 lg:pb-0 ${
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
              className={`min-h-10 shrink-0 rounded-full border px-3.5 text-[12px] font-medium transition md:px-4 lg:min-h-8 lg:px-2.5 lg:text-[11px] ${
                filter === item.value
                  ? "border-lumina-text bg-lumina-text text-white"
                  : "border-lumina-border bg-lumina-surface text-lumina-text hover:bg-lumina-surface-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
    </>
  );

  return (
    <div
      className={`bg-lumina-bg text-lumina-text ${
        selectedRequest
          ? "h-[calc(100dvh-68px)] overflow-hidden p-0 lg:h-auto lg:min-h-[calc(100vh-68px)] lg:overflow-visible lg:px-8 lg:py-6"
          : "min-h-[calc(100vh-68px)] px-4 py-5 md:px-8 md:py-7 lg:py-6"
      }`}
    >
      <div
        className={`mx-auto max-w-[1480px] ${
          selectedRequest ? "h-full lg:h-auto" : ""
        }`}
      >
        <header className={inbox.selectedRequestId ? "hidden lg:block" : "block"}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
            Request conversations
          </p>
          <h1
            className="mt-1.5 text-[32px] font-semibold leading-[1.08] md:mt-2 md:text-[40px] lg:mt-1 lg:text-[32px] xl:text-[34px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Messages
          </h1>
          <p className="mt-2 max-w-[620px] text-[13px] leading-[1.55] text-lumina-text-muted md:mt-3 md:text-[14px] md:leading-[1.6] lg:mt-1.5 lg:text-[12px]">
            Every conversation stays connected to its original request, services,
            and appointment history.
          </p>
        </header>

        <div className="lg:hidden">{inboxControls}</div>

        {(inbox.error || actionError) && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-lumina-attention/25 bg-lumina-attention-soft px-4 py-3 text-[13px] text-lumina-text ${
              selectedRequest
                ? "fixed inset-x-3 top-[80px] z-50 lg:static lg:mt-4"
                : "mt-4"
            }`}
          >
            <span>{actionError || "Messages could not be loaded."}</span>
            {!actionError && (
              <button
                type="button"
                onClick={() => void inbox.refresh()}
                className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-4 font-medium"
              >
                Try again
              </button>
            )}
          </div>
        )}

        <div
          className={`overflow-hidden bg-lumina-surface ${
            selectedRequest
              ? "h-full rounded-none border-0 shadow-none lg:mt-5 lg:h-[calc(100dvh-230px)] lg:min-h-[440px] lg:max-h-[840px] lg:rounded-[18px] lg:border lg:border-lumina-border/70 lg:shadow-none"
              : "mt-4 rounded-[20px] border border-lumina-border shadow-[0_8px_28px_rgba(39,36,40,0.035)] lg:mt-5 lg:h-[calc(100dvh-230px)] lg:min-h-[440px] lg:max-h-[840px] lg:rounded-[18px] lg:border-lumina-border/70 lg:shadow-none"
          } lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]`}
        >
          <aside
            className={`min-h-[360px] border-lumina-border bg-lumina-surface lg:min-h-0 lg:min-w-0 lg:border-r lg:border-lumina-border/70 ${
              selectedRequest ? "hidden lg:block" : "block"
            }`}
            aria-label="Conversations"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="hidden shrink-0 px-4 pb-3 pt-4 lg:block">{inboxControls}</div>
              <div className="border-b border-lumina-border px-3.5 py-2.5 text-[11px] text-lumina-text-muted md:px-4 md:py-3 md:text-[12px] lg:border-lumina-border/60 lg:py-2 lg:text-[10px]">
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
                      {searchQuery.trim()
                        ? "No matching conversations"
                        : filter === "unread"
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
                    const stateLabel = getRequestConversationStateLabel(request, role);
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => openConversation(request.id)}
                        className={`flex w-full gap-3 border-b border-lumina-border/65 px-3.5 py-3 text-left transition last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text md:px-4 md:py-4 lg:gap-2.5 lg:border-lumina-border/45 lg:py-3 ${
                          selected
                            ? "bg-lumina-surface-soft"
                            : unread > 0
                            ? "bg-lumina-blush/35 hover:bg-lumina-blush/50"
                            : "bg-lumina-surface hover:bg-lumina-surface-soft/70"
                        }`}
                      >
                        <IdentityAvatar
                          name={request.participant_name}
                          imageUrl={request.participant_image_url}
                          className="flex h-10 w-10 shrink-0 rounded-full bg-lumina-pearl text-[11px] font-semibold text-lumina-text md:h-11 md:w-11 lg:h-10 lg:w-10"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:items-center lg:gap-2">
                            <p className={`truncate text-[14px] ${unread > 0 ? "font-semibold" : "font-medium"}`}>
                              {request.participant_name}
                            </p>
                            {unread > 0 && (
                              <span
                                className="hidden h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lumina-black px-1.5 text-[10px] font-semibold text-white lg:inline-flex"
                                aria-label={`${unread} unread update${unread === 1 ? "" : "s"}`}
                              >
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                            </div>
                            <span className="shrink-0 text-[10px] text-lumina-text-muted">
                              {formatInboxTimestamp(timestamp)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
                            {services.length > 0
                              ? services.join(" · ")
                              : "Service request"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <p className={`min-w-0 flex-1 truncate text-[12px] ${unread > 0 ? "font-medium text-lumina-text" : "text-lumina-text-muted"}`}>
                              {getRequestConversationPreview(latestUpdate)}
                            </p>
                            {unread > 0 && (
                              <span
                                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lumina-black px-1.5 text-[10px] font-semibold text-white lg:hidden"
                                aria-label={`${unread} unread update${unread === 1 ? "" : "s"}`}
                              >
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                          <span
                            className={`mt-1.5 rounded-full border border-lumina-border/80 bg-lumina-surface px-2 py-0.5 text-[10px] text-lumina-text-muted lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${
                              shouldShowConversationState(stateLabel)
                                ? "inline-flex"
                                : "hidden lg:inline-flex"
                            }`}
                          >
                            {stateLabel}
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
            className={`${
              selectedRequest ? "block h-full" : "hidden lg:block"
            } min-h-0 min-w-0 lg:h-auto`}
          >
            {selectedRequest ? (
              <RequestConversationPanel
                presentation="inbox"
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
              <div className="flex h-full min-h-[560px] lg:min-h-0 items-center justify-center bg-lumina-bg-soft px-8 text-center">
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
