"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { Bell, MessageCircle, Sparkles, CalendarDays, Clock, Search } from "lucide-react";
import ChatModal from "@/components/ChatModal";
import ConsultationSnapshot from "@/components/ConsultationSnapshot";
import IdentityAvatar from "@/components/IdentityAvatar";
import ProfessionalRequestMobileSummary from "@/components/ProfessionalRequestMobileSummary";
import {
  resolveClientIdentity,
  type ClientIdentityProfile,
} from "@/lib/client-identity";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";
import {
  formatDurationMinutes,
  getRequestServiceNames,
  getSuggestedRequestDurationMinutes,
} from "@/lib/request-services";
import { createConsultationSignedUrls } from "@/lib/consultation-snapshot";
import {
  appointmentTimeHasPassed,
  canMarkBookingLiteCompleted,
  canSubmitCompletionResponse,
  createExpectedEndAt,
  createScheduledFor,
  getAppointmentDurationMinutes,
  getAppointmentExceptionLabel,
  getCompletionState,
  getCompletionStateLabel,
  getProfessionalRequestAction,
  isConfirmedUpcomingRequest,
  type AppointmentExceptionReason,
  type CompletionResponse,
} from "@/lib/request-completion";
import {
  getLatestRequestConversationUpdate,
  getRequestConversationPreview,
  getRequestConversationUnreadCount,
  markConversationUpdatesRead,
  markRequestConversationRead,
} from "@/lib/request-conversations";
import {
  getProfessionalMobilePriorityClass,
  getProfessionalMobileRequestStatus,
} from "@/lib/professional-request-mobile";
import {
  matchesActiveRequestFilter,
  matchesHistoryRequestFilter,
  matchesRequestLifecycleView,
  matchesRequestSearch,
  type ActiveRequestFilter,
  type HistoryRequestFilter,
  type RequestLifecycleView,
} from "@/lib/request-workflow-filters";

type ClientRequest = {
  id: string;
  client_name: string;
  client_contact: string;
  service_requested: string | null;
  requested_services?: unknown;
  consultation_snapshot?: unknown;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  created_at: string;
  status: string | null;
  artist_response: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  image_url: string | null;
  client_confirmed: boolean | null;
  client_status: string | null;
booking_status: string | null;
scheduled_for: string | null;
expected_end_at: string | null;
completion_protocol_version: number | null;
appointment_confirmed_at: string | null;
appointment_exception_reason: AppointmentExceptionReason | null;
appointment_exception_note: string | null;
client_exception_note: string | null;
artist_completion_response: CompletionResponse | null;
artist_completion_responded_at: string | null;
client_completion_response: CompletionResponse | null;
client_completion_responded_at: string | null;
artist_hidden: boolean | null;
client_id: string;
client_response_note: string | null;
client_image_url?: string | null;
};
type RequestUpdate = {
  id: string;
  request_id: string;
  sender_type: string;
  message: string | null;
  status: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  expected_end_at: string | null;
  is_read_by_client: boolean | null;
  is_read_by_artist: boolean | null;
  image_url: string | null;
is_deleted: boolean | null;
  created_at: string;
};

type Notification = {
  id: string;
  user_id: string;
  request_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean | null;
  created_at: string;
};

function formatMobileRequestSchedule(
  scheduledFor: string | null,
  date: string | null,
  time: string | null
) {
  if (scheduledFor) {
    const scheduled = new Date(scheduledFor);
    if (!Number.isNaN(scheduled.getTime())) {
      return scheduled.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  if (!date && !time) return null;
  const parsedDate = date ? new Date(`${date.slice(0, 10)}T00:00:00`) : null;
  const dateLabel =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : date;
  const parsedTime = time ? new Date(`2000-01-01T${time}`) : null;
  const timeLabel =
    parsedTime && !Number.isNaN(parsedTime.getTime())
      ? parsedTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : time;

  return [dateLabel, timeLabel].filter(Boolean).join(" · ");
}

export default function DashboardRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [proposedDates, setProposedDates] = useState<Record<string, string>>({});
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({});
  const [proposedPrices, setProposedPrices] = useState<Record<string, string>>({});
  const [proposedDurations, setProposedDurations] = useState<Record<string, string>>({});
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [chatRequest, setChatRequest] = useState<ClientRequest | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [requestView, setRequestView] = useState<RequestLifecycleView>("active");
  const [activeFilter, setActiveFilter] = useState<ActiveRequestFilter>("all");
  const [historyFilter, setHistoryFilter] = useState<HistoryRequestFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const showingArchived = requestView === "archived";
  const [updates, setUpdates] = useState<Record<string, RequestUpdate[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [consultationImageUrls, setConsultationImageUrls] = useState<
    Record<string, string[]>
  >({});
  const requestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const openChatRequestIdRef = useRef<string | null>(null);
  const showingArchivedRef = useRef(false);
  const handledDeepLinkRef = useRef<string | null>(null);
  const routeActiveRef = useRef(true);
  const requestLoadSequenceRef = useRef(0);

  useEffect(() => {
    routeActiveRef.current = true;
    return () => {
      routeActiveRef.current = false;
      requestLoadSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") !== "archived") return;
    const frame = window.requestAnimationFrame(() => setRequestView("archived"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const requestId = new URLSearchParams(window.location.search).get("request");
    if (!requestId || handledDeepLinkRef.current === requestId) return;
    const linkedRequest = requests.find((request) => request.id === requestId);
    if (!linkedRequest) return;

    handledDeepLinkRef.current = requestId;
    const frame = requestAnimationFrame(() => {
      if (
        requestView !== "archived" &&
        !matchesRequestLifecycleView(linkedRequest, "active", false)
      ) {
        setRequestView("history");
      }
      setExpandedRequestId(requestId);
      setHighlightedRequestId(requestId);
      requestRefs.current[requestId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestView, requests]);

  const fetchRequests = useCallback(async () => {
    const sequence = ++requestLoadSequenceRef.current;
    const canCommit = () =>
      routeActiveRef.current && sequence === requestLoadSequenceRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!canCommit()) return;
    if (!user) return;
const { data: notificationData } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

if (!canCommit()) return;
setNotifications(notificationData || []);

    const { data, error } = await supabase
      .from("client_requests")
      .select("*")
      .eq("artist_id", user.id)
      .eq("artist_hidden", showingArchived)
      .order("created_at", { ascending: false });

    if (!canCommit()) return;
    if (error) {
      console.log(error);
      return;
    }

    const clientIds = [
      ...new Set((data || []).map((request) => request.client_id)),
    ];
    const { data: clientProfiles } = await loadRelatedClientIdentities(clientIds);
    if (!canCommit()) return;
    const clientProfileMap = new Map(
      ((clientProfiles || []) as ClientIdentityProfile[]).map((profile) => [profile.id, profile])
    );
    const requestsWithProfiles = (data || []).map((request) => {
      const profile = clientProfileMap.get(request.client_id);
      const identity = resolveClientIdentity(
        request.client_id,
        profile,
        request.client_name
      );

      return {
        ...request,
        client_name: identity.name,
        client_image_url: identity.avatarUrl,
      };
    });

    setRequests(requestsWithProfiles);
    const consultationEntries = await Promise.all(
      requestsWithProfiles.map(async (request) => [
        request.id,
        await createConsultationSignedUrls(request.consultation_snapshot),
      ] as const)
    );
    if (!canCommit()) return;
    setConsultationImageUrls(Object.fromEntries(consultationEntries));
    const { data: updateData } = await supabase
  .from("request_updates")
  .select("*")
  .order("created_at", { ascending: true });

if (!canCommit()) return;
const updateMap: Record<string, RequestUpdate[]> = {};

(updateData || []).forEach((update) => {
  if (!updateMap[update.request_id]) {
    updateMap[update.request_id] = [];
  }

  updateMap[update.request_id].push(update);
});

setUpdates(updateMap);

    const responseMap: Record<string, string> = {};
    const dateMap: Record<string, string> = {};
    const timeMap: Record<string, string> = {};
    const priceMap: Record<string, string> = {};
    const durationMap: Record<string, string> = {};

    requestsWithProfiles.forEach((request) => {
      responseMap[request.id] = request.artist_response || "";
      dateMap[request.id] = request.proposed_date || "";
      timeMap[request.id] = request.proposed_time || "";
      priceMap[request.id] = request.proposed_price?.toString() || "";
      durationMap[request.id] = (
        getAppointmentDurationMinutes(request) ??
        getSuggestedRequestDurationMinutes(request) ??
        ""
      ).toString();
    });

    setResponses(responseMap);
    setProposedDates(dateMap);
    setProposedTimes(timeMap);
    setProposedPrices(priceMap);
    setProposedDurations(durationMap);
  }, [showingArchived]);

 useEffect(() => {
  let cancelled = false;
  const refreshTimer = window.setTimeout(() => {
    void fetchRequests().catch((error) => {
      if (!cancelled) console.log("Professional requests load failed:", error);
    });
  }, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(refreshTimer);
  };
}, [fetchRequests]);
useEffect(() => {
  const handleFocus = () => void fetchRequests();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") void fetchRequests();
  };
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);
  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}, [fetchRequests]);
useEffect(() => {
  openChatRequestIdRef.current = chatRequest?.id || null;
}, [chatRequest]);
useEffect(() => {
  showingArchivedRef.current = showingArchived;
}, [showingArchived]);
useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  const setupRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || cancelled) return;

    channel = supabase
      .channel(createRealtimeChannelTopic(`artist-dashboard-${user.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_updates",
        },
        (payload) => {
          if (cancelled) return;
          const update = payload.new as RequestUpdate;
          const isOpenIncomingMessage =
            openChatRequestIdRef.current === update.request_id &&
            update.sender_type !== "artist";

          setUpdates((prev) => ({
            ...prev,
            [update.request_id]: [
              ...(prev[update.request_id] || []),
              update,
            ],
          }));

          if (isOpenIncomingMessage) {
            void markRequestConversationRead(update.request_id, "artist").then(
              ({ error }) => {
                if (error) return;
                setUpdates((current) => ({
                  ...current,
                  [update.request_id]: markConversationUpdatesRead(
                    current[update.request_id] || [],
                    "artist"
                  ),
                }));
              }
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          setNotifications((prev) => [
            payload.new as Notification,
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_requests",
          filter: `artist_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const newRequest = payload.new as ClientRequest;

          if (showingArchivedRef.current || newRequest.artist_hidden) {
            return;
          }

          void fetchRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_requests",
          filter: `artist_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const updatedRequest = payload.new as ClientRequest;

          setRequests((prev) =>
            prev.map((request) =>
              request.id === updatedRequest.id
                ? { ...request, ...updatedRequest }
                : request
            )
          );
        }
      );

    channel.subscribe();
  };

  void setupRealtime().catch((error) => {
    if (!cancelled) {
      console.log("Professional request realtime setup failed:", error);
    }
  });

  return () => {
    cancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [fetchRequests]);
  const updateRequest = async (id: string, status: string) => {
  setSavingId(id);
  const existingRequest = requests.find((request) => request.id === id);
  const isProposalRevision =
    status === "accepted" && existingRequest?.status === "accepted";

  if (status === "accepted" && existingRequest?.completion_protocol_version === 3) {
    const price = Number(proposedPrices[id]);
    const durationMinutes = Number(proposedDurations[id]);
    const scheduledFor = createScheduledFor(proposedDates[id], proposedTimes[id]);
    const expectedEndAt = createExpectedEndAt(scheduledFor, durationMinutes);
    if (
      !proposedDates[id] ||
      !proposedTimes[id] ||
      proposedPrices[id] === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      !scheduledFor ||
      !expectedEndAt ||
      new Date(scheduledFor).getTime() <= Date.now()
    ) {
      setSavingId(null);
      alert("Add a future date and time, an estimated duration, and a valid final total before sending the proposal.");
      return;
    }
  }

  const scheduledFor =
    status === "accepted"
      ? createScheduledFor(proposedDates[id], proposedTimes[id])
      : existingRequest?.scheduled_for || null;
  const expectedEndAt =
    status === "accepted"
      ? createExpectedEndAt(scheduledFor, Number(proposedDurations[id]))
      : existingRequest?.expected_end_at || null;

  const { error } = await supabase
    .from("client_requests")
    .update({
      status,
      artist_response: responses[id] || null,
      proposed_date: proposedDates[id] || null,
      proposed_time: proposedTimes[id] || null,
      proposed_price: proposedPrices[id] ? Number(proposedPrices[id]) : null,
      scheduled_for:
        scheduledFor,
      expected_end_at: expectedEndAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  setSavingId(null);

  if (error) {
    alert(error.message);
    return;
  }

  await supabase.from("request_updates").insert({
    request_id: id,
    sender_type: "artist",
    status,
    message: responses[id] || null,
    proposed_date: proposedDates[id] || null,
    proposed_time: proposedTimes[id] || null,
    proposed_price: proposedPrices[id] ? Number(proposedPrices[id]) : null,
    expected_end_at: expectedEndAt,
  });

  if (status === "accepted") {
    const request = requests.find((r) => r.id === id);

    if (!request?.client_id) {
      alert("Could not create notification because client_id is missing.");
    } else {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: request.client_id,
          request_id: id,
          title: isProposalRevision ? "Proposal Updated" : "New Proposal",
          message: isProposalRevision
            ? "Your artist updated the appointment proposal."
            : "An artist responded to your request.",
        });

      if (notificationError) {
        alert(notificationError.message);
      }
    }
  }

  await fetchRequests();
  alert("Request updated ✨");
};
const submitArtistCompletionResponse = async (
  request: ClientRequest,
  response: CompletionResponse
) => {
  const confirmed = window.confirm(
    response === "confirmed"
      ? request.completion_protocol_version === 3
        ? "Mark this service completed? This is optional in Booking Lite; the client can also assert that it occurred by reviewing."
        : "Confirm that this service took place? The appointment completes after the client also confirms."
      : "Report that this service did not take place? It will be marked as needing attention."
  );

  if (!confirmed) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please log in again.");
    return;
  }

  const { data: updatedRequest, error } =
    request.completion_protocol_version === 3
      ? await supabase.rpc("record_booking_lite_artist_outcome", {
          p_request_id: request.id,
          p_outcome: response === "confirmed" ? "completed" : "did_not_take_place",
          p_note: null,
        })
      : await supabase
          .from("client_requests")
          .update({
            artist_completion_response: response,
            updated_at: new Date().toISOString(),
          })
          .eq("id", request.id)
          .eq("artist_id", user.id)
          .select("id, booking_status")
          .maybeSingle();

  if (error) {
    alert(error.message);
    return;
  }

  if (!updatedRequest) {
    alert(
      "This completion response could not be saved. Refresh and check the appointment status."
    );
    await fetchRequests();
    return;
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: request.client_id,
      request_id: request.id,
      title:
        response === "disputed"
          ? "Completion Needs Attention"
          : updatedRequest.booking_status === "completed"
          ? "Appointment Completed"
          : "Completion Confirmation Needed",
      message:
        response === "disputed"
          ? "Your professional reported that this service did not take place. The request now needs attention."
          : updatedRequest.booking_status === "completed"
          ? request.completion_protocol_version === 3
            ? "Your professional marked the service complete. You can now share your experience."
            : "Both you and your professional confirmed the service. You can now leave a verified review."
          : "Your professional confirmed the service took place. Please submit your completion response.",
    });

  if (notificationError) {
    console.log(notificationError);
  }

  await fetchRequests();
};

const reportBookingLiteException = async (
  request: ClientRequest,
  reason: AppointmentExceptionReason
) => {
  const label = getAppointmentExceptionLabel(reason) || "Appointment issue";
  const note = window.prompt(
    `${label}: add an optional factual note for the client and Lumina record.`,
    ""
  );
  if (note === null) return;

  const confirmed = window.confirm(
    "Report this exception? The request will need attention, the client will be notified, and neither side will be treated as automatically correct."
  );
  if (!confirmed) return;

  setSavingId(request.id);
  const { error } = await supabase.rpc("record_booking_lite_artist_outcome", {
    p_request_id: request.id,
    p_outcome: reason,
    p_note: note,
  });
  setSavingId(null);

  if (error) {
    alert(error.message);
    return;
  }

  await fetchRequests();
};

const setRequestHidden = async (id: string, hidden: boolean) => {
  const confirmed = window.confirm(
    hidden
      ? "Move this request to Archived?"
      : "Restore this request to its current workflow view?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("client_requests")
    .update({
      artist_hidden: hidden,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  fetchRequests();
};
const unreadCount = notifications.filter((n) => !n.is_read).length;

const openNotification = async (notification: Notification) => {
  if (notification.request_id) {
    setExpandedRequestId(notification.request_id);
    setHighlightedRequestId(notification.request_id);

    setTimeout(() => {
      requestRefs.current[notification.request_id!]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    setTimeout(() => {
      setHighlightedRequestId(null);
    }, 1200);
  }

  setShowNotifications(false);

  if (!notification.is_read) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
  }

  if (
    notification.title === "New Message" &&
    notification.request_id
  ) {
    const request = requests.find(
      (item) => item.id === notification.request_id
    );

    if (request) {
      await markMessagesRead(request.id);
      setChatRequest(request);
      setDraftMessage("");
    }
  }
};

const clearNotifications = async () => {
  if (!notifications.length) return;
  if (!window.confirm("Clear all notifications?")) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    alert(error.message);
    return;
  }

  setNotifications([]);
};

  const markMessagesRead = async (requestId: string) => {
  setUpdates((prev) => ({
    ...prev,
    [requestId]: markConversationUpdatesRead(
      prev[requestId] || [],
      "artist"
    ),
  }));

  const { error } = await markRequestConversationRead(requestId, "artist");

  if (error) {
    alert(error.message);
    await fetchRequests();
  }
};
const getUnreadCount = (requestId: string) => {
  return getRequestConversationUnreadCount(updates[requestId] || [], "artist");
};
const getLatestUpdate = (requestId: string) => {
  return getLatestRequestConversationUpdate(updates[requestId] || []);
};
const visibleRequests = useMemo(
  () =>
    requests.filter((request) => {
      if (
        !matchesRequestLifecycleView(
          request,
          requestView,
          !!request.artist_hidden
        )
      ) {
        return false;
      }

      if (
        requestView === "active" &&
        !matchesActiveRequestFilter(request, activeFilter, {
          role: "artist",
        })
      ) {
        return false;
      }

      if (
        requestView === "history" &&
        !matchesHistoryRequestFilter(request, historyFilter)
      ) {
        return false;
      }

      return matchesRequestSearch(searchQuery, [
        request.client_name,
        ...getRequestServiceNames(request),
      ]);
    }),
  [activeFilter, historyFilter, requestView, requests, searchQuery]
);
const deleteMessage = async (messageId: string) => {
  const confirmed = window.confirm("Delete this message for everyone?");

  if (!confirmed) return;

  setUpdates((prev) => {
    const next = { ...prev };

    Object.keys(next).forEach((requestId) => {
      next[requestId] = next[requestId].map((update) =>
        update.id === messageId
          ? {
              ...update,
              is_deleted: true,
              message: null,
              image_url: null,
            }
          : update
      );
    });

    return next;
  });

  const { error } = await supabase
    .from("request_updates")
    .update({
      is_deleted: true,
      message: null,
      image_url: null,
    })
    .eq("id", messageId);

  if (error) {
    alert(error.message);
    await fetchRequests();
  }
};
	  return (
	    <div className="relative bg-lumina-surface text-lumina-text">
	      <div className="hidden justify-end px-5 pt-5 md:px-10 lg:flex">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface transition hover:bg-lumina-surface-soft"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={1.7} />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lumina-black px-1 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
{showNotifications && (
  <div className="absolute right-3 top-[64px] z-40 w-[min(320px,calc(100vw-24px))] rounded-[22px] border border-lumina-glass-border bg-lumina-glass p-4 shadow-sm backdrop-blur-[12px] md:right-5 lg:top-[72px]">
    <div className="flex items-center justify-between gap-4">
      <p className="text-[15px] font-medium">Notifications</p>
      {notifications.length > 0 && (
        <button
          onClick={() => void clearNotifications()}
          className="text-[12px] text-lumina-text-muted transition hover:text-lumina-text"
        >
          Clear all
        </button>
      )}
    </div>

    <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      {notifications.length === 0 ? (
        <p className="text-[14px] text-lumina-text-muted">
          No notifications yet.
        </p>
      ) : (
        notifications.map((notification) => {
          const relatedRequest = requests.find(
            (request) => request.id === notification.request_id
          );
          const senderName = relatedRequest?.client_name || "Your client";
          const senderImage = relatedRequest?.client_image_url;
          const notificationMessage =
            notification.title === "New Message"
              ? `${senderName} sent you a message.`
              : notification.title === "Appointment Confirmed"
              ? `${senderName} confirmed the appointment.`
              : notification.title === "Proposal Declined"
              ? `${senderName} declined the proposal.`
              : notification.title === "Client Requested a New Time"
              ? `${senderName} requested a different time.`
              : notification.message;

          return (
          <div
            key={notification.id}
            onClick={() => openNotification(notification)}
            className={`cursor-pointer rounded-[16px] p-3 transition hover:bg-lumina-pearl ${
              notification.is_read ? "bg-lumina-surface" : "bg-lumina-surface-soft"
            }`}
          >
            <div className="flex items-start gap-3">
              <IdentityAvatar
                name={senderName}
                imageUrl={senderImage}
                className="flex h-9 w-9 shrink-0 rounded-full bg-lumina-pearl text-[12px] font-medium text-lumina-text-muted"
              />

              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-lumina-text">
                  {senderName}
                </p>
                <p className="text-[14px] font-medium">
                  {notification.title}
                </p>

                {notificationMessage && (
                  <p className="mt-1 text-[13px] text-lumina-text-muted">
                    {notificationMessage}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-lumina-text-muted">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  </div>
)}
      <section className="w-full px-3 py-4 md:px-8 md:py-7 lg:px-10 lg:py-14">
        <div className="flex items-start justify-between gap-4 lg:hidden">
          <div>
            <h1
              className="text-[26px] font-semibold leading-[1.04] md:text-[30px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Requests
            </h1>
            <p className="mt-1 max-w-[560px] text-[12px] leading-[1.45] text-lumina-text-muted">
              Respond to clients and manage upcoming appointments.
            </p>
          </div>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            <Bell size={17} strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lumina-black px-1 text-[10px] text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        <h1
          className="hidden text-[38px] font-semibold leading-[1.08] lg:block"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Requests
        </h1>

        <p className="mt-2 hidden max-w-[680px] text-[14px] leading-[1.55] text-lumina-text-muted lg:block">
          Manage client inquiries, send proposals, and follow up.
        </p>
        <div className="mt-4 lg:mt-5">
          <p className="mb-2 hidden text-[12px] text-lumina-text-muted lg:block">
            {visibleRequests.length} request{visibleRequests.length !== 1 ? "s" : ""}
          </p>
          <div className="relative max-w-[520px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lumina-text-muted" size={16} strokeWidth={1.7} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search requests"
              aria-label="Search requests"
              className="min-h-11 w-full rounded-full border border-lumina-border bg-lumina-surface py-2.5 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-lumina-text-muted focus:border-lumina-text"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto rounded-full border border-lumina-border/70 bg-lumina-pearl/65 p-1 sm:w-fit" aria-label="Request views">
            {(["active", "history", "archived"] as RequestLifecycleView[]).map((view) => (
              <button key={view} type="button" onClick={() => setRequestView(view)} aria-pressed={requestView === view} className={`min-h-9 flex-1 shrink-0 rounded-full px-4 text-[11px] font-medium capitalize transition sm:flex-none lg:text-[13px] ${requestView === view ? "bg-lumina-black text-white" : "text-lumina-text-muted hover:text-lumina-text"}`}>
                {view}
              </button>
            ))}
          </div>
          {requestView === "active" && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1" aria-label="Active request filters">
              {([["all", "All"], ["needs_action", "Needs action"], ["waiting", "Waiting"], ["confirmed", "Confirmed"]] as Array<[ActiveRequestFilter, string]>).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setActiveFilter(value)} aria-pressed={activeFilter === value} className={`min-h-9 shrink-0 rounded-full border px-3 text-[11px] transition lg:text-[12px] ${activeFilter === value ? "border-lumina-text bg-lumina-surface-soft text-lumina-text" : "border-lumina-border bg-lumina-surface text-lumina-text-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {requestView === "history" && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1" aria-label="Request history filters">
              {(["all", "completed", "declined"] as HistoryRequestFilter[]).map((value) => (
                <button key={value} type="button" onClick={() => setHistoryFilter(value)} aria-pressed={historyFilter === value} className={`min-h-9 shrink-0 rounded-full border px-3 text-[11px] capitalize transition lg:text-[12px] ${historyFilter === value ? "border-lumina-text bg-lumina-surface-soft text-lumina-text" : "border-lumina-border bg-lumina-surface text-lumina-text-muted"}`}>
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-3 lg:mt-6 lg:gap-3">
          {visibleRequests.length === 0 ? (
            <div className="rounded-[18px] border border-lumina-border bg-lumina-surface p-4 lg:rounded-[24px] lg:p-6">
              <h2 className="text-[15px] font-medium text-lumina-text lg:text-[16px]">
                {searchQuery.trim() ? "No matching requests" : `No ${requestView} requests`}
              </h2>
              <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted lg:text-[14px] lg:leading-[1.55]">
                {searchQuery.trim()
                  ? "Try another client or service name."
                  : requests.length === 0
                  ? "New client requests will appear here when they arrive."
                  : "Choose another view or filter to see more requests."}
              </p>
            </div>
	          ) : (
	            visibleRequests.map((request) => {
	  const latestUpdate = getLatestUpdate(request.id);
	  const unreadMessages = getUnreadCount(request.id);
	  const requestedServiceNames = getRequestServiceNames(request);
	  const completionState = getCompletionState(request);
  const showCompletionState = completionState !== "scheduled";
  const canRespondToCompletion = canSubmitCompletionResponse(request, "artist");
  const canMarkBookingLiteComplete = canMarkBookingLiteCompleted(request);
  const canReportBookingLiteException =
    request.completion_protocol_version === 3 &&
    request.status === "accepted" &&
    request.client_status === "confirmed" &&
    request.booking_status === "booked" &&
    !request.appointment_exception_reason;
  const exceptionLabel = getAppointmentExceptionLabel(
    request.appointment_exception_reason
  );
  const appointmentDurationMinutes = getAppointmentDurationMinutes(request);
  const proposalScheduledFor = createScheduledFor(
    proposedDates[request.id],
    proposedTimes[request.id]
  );
	  const proposalExpectedEndAt = createExpectedEndAt(
	    proposalScheduledFor,
	    Number(proposedDurations[request.id])
	  );
	  const mobileStatus = getProfessionalMobileRequestStatus(request, {
	    completionState,
	    professionalAction: getProfessionalRequestAction(request),
	    canComplete: canRespondToCompletion || canMarkBookingLiteComplete,
	  });
	  const mobilePriorityClass = getProfessionalMobilePriorityClass(
	    mobileStatus.priority
	  );
	  const mobileScheduleLabel = formatMobileRequestSchedule(
	    request.scheduled_for,
	    request.proposed_date || request.preferred_date,
	    request.proposed_time || request.preferred_time
	  );
	  const desktopIsConfirmed = isConfirmedUpcomingRequest(request);
	  const desktopStatusLabel = desktopIsConfirmed ? "Confirmed" : mobileStatus.label;
	  const desktopStatusTone = desktopIsConfirmed ? "confirmed" : mobileStatus.tone;
	  const desktopTimingKind =
	    request.client_status === "confirmed" || request.booking_status === "completed"
	      ? "Appointment"
	      : request.status === "accepted" || request.status === "needs_changes"
	      ? "Proposed"
	      : "Requested";
	  const desktopTiming = formatMobileRequestSchedule(
	    desktopTimingKind === "Appointment" ? request.scheduled_for : null,
	    desktopTimingKind === "Requested" ? request.preferred_date : request.proposed_date,
	    desktopTimingKind === "Requested" ? request.preferred_time : request.proposed_time
	  );
	  const desktopNeedsAction =
	    requestView === "active" &&
	    !desktopIsConfirmed &&
	    (mobileStatus.tone === "attention" || mobileStatus.tone === "action");
	  const mobileMessagePreview =
	    latestUpdate &&
	    (latestUpdate.message?.trim() || latestUpdate.image_url)
	      ? getRequestConversationPreview(latestUpdate)
	      : null;
	  const toggleRequestDetails = () =>
	    setExpandedRequestId(
	      expandedRequestId === request.id ? null : request.id
	    );

	  return (
	             <div
	  id={`professional-request-${request.id}`}
	  key={request.id}
	  ref={(el) => {
	    requestRefs.current[request.id] = el;
	  }}
	  className={`${mobilePriorityClass} rounded-[18px] border p-3.5 transition-all duration-300 lg:order-none lg:rounded-[18px] lg:p-4 lg:duration-300 ${
	    highlightedRequestId === request.id
	      ? "border-lumina-blush bg-lumina-blush/10 ring-1 ring-lumina-blush/60 lg:bg-lumina-surface lg:ring-1 lg:ring-lumina-attention/25"
	      : mobileStatus.tone === "attention" || mobileStatus.tone === "action"
	      ? `border-lumina-blush/75 bg-lumina-surface ${desktopNeedsAction ? "lg:border-lumina-blush/60 lg:bg-lumina-blush/[0.035]" : "lg:border-lumina-border/65 lg:bg-lumina-surface"}`
	      : "border-lumina-border/70 bg-lumina-surface lg:border-lumina-border/65 lg:bg-lumina-surface"
	  }`}
>
	                <ProfessionalRequestMobileSummary
	                  requestId={request.id}
	                  clientName={request.client_name || "Client"}
	                  clientImageUrl={request.client_image_url || null}
	                  serviceSummary={
	                    requestedServiceNames.join(" · ") || "Service request"
	                  }
	                  status={mobileStatus}
	                  scheduleLabel={mobileScheduleLabel}
	                  priceLabel={
	                    request.proposed_price != null
	                      ? `$${request.proposed_price}`
	                      : null
	                  }
	                  latestMessagePreview={mobileMessagePreview}
	                  unreadCount={unreadMessages}
	                  expanded={expandedRequestId === request.id}
	                  archived={requestView === "archived"}
	                  onExpand={toggleRequestDetails}
	                  onPrimaryAction={() => {
	                    if (mobileStatus.action?.kind === "complete") {
	                      return submitArtistCompletionResponse(
	                        request,
	                        "confirmed"
	                      );
	                    }
	                    toggleRequestDetails();
	                  }}
	                  onArchive={() =>
	                    setRequestHidden(request.id, requestView !== "archived")
	                  }
	                />
	                <div className="hidden lg:block">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <IdentityAvatar name={request.client_name || "Client"} imageUrl={request.client_image_url || null} className="h-11 w-11 shrink-0 rounded-full" fallbackClassName="bg-lumina-pearl text-[13px] font-medium text-lumina-text" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="truncate text-[17px] font-medium text-lumina-text">{request.client_name || "Client"}</h2>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${desktopStatusTone === "attention" || desktopStatusTone === "action" ? "bg-lumina-blush/35 text-lumina-text" : "bg-lumina-pearl/70 text-lumina-text-muted"}`}>
                              {desktopStatusLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[13px] text-lumina-text-muted">{requestedServiceNames.join(" · ") || "Service request"}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-lumina-text-muted">
                            {desktopTiming && <span><span className="text-lumina-text-muted/70">{desktopTimingKind} · </span>{desktopTiming}</span>}
                            {request.proposed_price != null && <span>Final total · ${request.proposed_price}</span>}
                            {unreadMessages > 0 && <span className="font-medium text-lumina-text">{unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[56px] xl:pl-0">
                        {mobileStatus.action && !desktopIsConfirmed && (
                          <button type="button" onClick={() => {
                            if (mobileStatus.action?.kind === "complete") void submitArtistCompletionResponse(request, "confirmed");
                            else toggleRequestDetails();
                          }} className="min-h-9 rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white transition hover:opacity-85">
                            {mobileStatus.action.label}
                          </button>
                        )}
                        {updates[request.id]?.length > 0 && (
                          <button type="button" aria-label="Open conversation" onClick={() => {
                            setChatRequest(request);
                            setDraftMessage("");
                            markMessagesRead(request.id);
                          }} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-lumina-border/70 text-lumina-text-muted transition hover:text-lumina-text">
                            <MessageCircle size={16} strokeWidth={1.7} />
                            {unreadMessages > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lumina-black px-1 text-[9px] text-white">{unreadMessages}</span>}
                          </button>
                        )}
                        <button type="button" onClick={toggleRequestDetails} aria-expanded={expandedRequestId === request.id} aria-controls={`professional-request-details-${request.id}`} className="min-h-9 rounded-full border border-lumina-border/70 px-3 text-[12px] text-lumina-text-muted transition hover:text-lumina-text">
                          {expandedRequestId === request.id ? "Hide details" : "View details"}
                        </button>
                        <button type="button" onClick={() => setRequestHidden(request.id, requestView !== "archived")} className="min-h-9 px-2 text-[11px] text-lumina-text-muted transition hover:text-lumina-text">
                          {requestView === "archived" ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </div>
                </div>
<div
	  id={`professional-request-details-${request.id}`}
	  className={`overflow-hidden transition-all duration-400 ${
    expandedRequestId === request.id
      ? "max-h-[5000px] opacity-100"
      : "max-h-0 opacity-0"
  }`}
>
                <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3 lg:mt-4 lg:gap-3 lg:border-t lg:border-lumina-border/55 lg:pt-4">
  <div className="flex items-center gap-3 rounded-[16px] bg-lumina-surface-soft p-3.5 lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-1">
    <Sparkles size={24} strokeWidth={1.6} className="h-5 w-5 text-lumina-text lg:h-6 lg:w-6" />

    <div>
      <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
        {requestedServiceNames.length === 1 ? "Service" : "Services"}
      </p>
      {requestedServiceNames.length > 0 ? (
        <div className="mt-1 space-y-1">
          {requestedServiceNames.map((serviceName) => (
            <p key={serviceName} className="text-[15px]">
              {serviceName}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[15px]">Not specified</p>
      )}
    </div>
  </div>

  <div className="flex items-center gap-3 rounded-[16px] bg-lumina-surface-soft p-3.5 lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-1">
    <CalendarDays size={24} strokeWidth={1.6} className="h-5 w-5 text-lumina-text lg:h-6 lg:w-6" />

    <div>
      <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
        Client Date
      </p>
      <p className="mt-1 text-[15px]">
        {request.preferred_date || "Flexible"}
      </p>
    </div>
  </div>

  <div className="flex items-center gap-3 rounded-[16px] bg-lumina-surface-soft p-3.5 lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-1">
    <Clock size={24} strokeWidth={1.6} className="h-5 w-5 text-lumina-text lg:h-6 lg:w-6" />

    <div>
      <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
        Client Time
      </p>
      <p className="mt-1 text-[15px]">
        {request.preferred_time || "Flexible"}
      </p>
    </div>
  </div>
</div>

                <ConsultationSnapshot
                  snapshot={request.consultation_snapshot}
                  imageUrls={consultationImageUrls[request.id] || []}
                />

                {request.notes && (
                  <p className="mt-4 whitespace-pre-line rounded-[16px] bg-lumina-surface-soft p-3.5 text-[13px] leading-[1.55] text-lumina-text lg:mt-4 lg:rounded-none lg:bg-transparent lg:p-0 lg:text-[14px] lg:leading-[1.6]">
                    {request.notes}
                  </p>
                )}

                {request.client_contact && <p className="mt-3 hidden text-[12px] text-lumina-text-muted lg:block">Client contact · {request.client_contact}</p>}

                {(canRespondToCompletion || canMarkBookingLiteComplete) && request.completion_protocol_version !== 3 && (
                  <button type="button" onClick={() => void submitArtistCompletionResponse(request, "disputed")} className="mt-3 hidden text-[12px] text-lumina-text-muted underline underline-offset-4 transition hover:text-lumina-text lg:inline-flex">
                    Service did not occur
                  </button>
                )}

                <div className="mt-4 rounded-[18px] bg-lumina-surface-soft p-3.5 lg:mt-5 lg:rounded-none lg:border-t lg:border-lumina-border/55 lg:bg-transparent lg:p-0 lg:pt-4">
                  {(request.booking_status === "completed" ||
                    request.client_status === "confirmed" ||
                    request.client_status === "declined") ? (
                     <>
 <div className="flex items-center justify-between">
  <p className="text-[13px] uppercase tracking-[0.14em] text-lumina-text-muted">
    Appointment Details
  </p>

  
</div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-1">
        <p className="text-[12px] text-lumina-text-muted">Date</p>
        <p className="mt-1 text-[14px]">{request.proposed_date || "-"}</p>
      </div>

      <div className="rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-1">
        <p className="text-[12px] text-lumina-text-muted">Time</p>
        <p className="mt-1 text-[14px]">{request.proposed_time || "-"}</p>
      </div>

      <div className="rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-1">
        <p className="text-[12px] text-lumina-text-muted">Estimated duration</p>
        <p className="mt-1 text-[14px]">
          {formatDurationMinutes(appointmentDurationMinutes) || "—"}
        </p>
        {request.expected_end_at && (
          <p className="mt-1 text-[11px] text-lumina-text-muted">
            Expected end {new Date(request.expected_end_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      <div className="rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-1">
        <p className="text-[12px] text-lumina-text-muted">Final total</p>
        <p className="mt-1 text-[14px]">
          {request.proposed_price ? `$${request.proposed_price}` : "-"}
        </p>
      </div>
    </div>
    {showCompletionState && (
      <div className="mt-4 rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:border-t lg:border-lumina-border/55 lg:bg-transparent lg:px-0 lg:pt-3">
        <p className="text-[13px] font-medium text-lumina-text">
          {getCompletionStateLabel(completionState)}
        </p>
        <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
          {completionState === "awaiting_confirmation"
            ? "The appointment time has passed. Submit your completion response."
            : completionState === "review_ready"
            ? "The expected service end has passed. The client may now leave a review; marking complete is optional."
            : completionState === "booked"
            ? "The client confirmed this appointment in Lumina."
            : completionState === "completion_pending"
            ? "One participant has confirmed. The other response is still required."
            : completionState === "needs_attention"
            ? `${exceptionLabel || "An appointment issue was reported"}. The client's position and any review are preserved for later moderation.`
            : request.completion_protocol_version === 3
            ? "This Booking Lite appointment is completed."
            : "Both participants confirmed that the service took place."}
        </p>
        {request.appointment_exception_note && (
          <p className="mt-2 text-[12px] leading-5 text-lumina-text-muted">
            Your report: {request.appointment_exception_note}
          </p>
        )}
        {request.client_exception_note && (
          <p className="mt-2 rounded-[12px] bg-lumina-surface-soft px-3 py-2 text-[12px] leading-5 text-lumina-text-muted">
            Client response: {request.client_exception_note}
          </p>
        )}
      </div>
    )}
    {canReportBookingLiteException && (
      <div className="mt-4 border-t border-lumina-border pt-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-lumina-text-muted">
          Appointment exceptions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["client_cancelled", "Client cancelled"],
            ["issue", "Report an issue"],
            ...(appointmentTimeHasPassed(request)
              ? ([
                  ["no_show", "No-show"],
                  ["did_not_take_place", "Did not take place"],
                ] as const)
              : []),
          ] as ReadonlyArray<readonly [AppointmentExceptionReason, string]>).map(([reason, label]) => (
            <button
              key={reason}
              type="button"
              onClick={() => void reportBookingLiteException(request, reason)}
              disabled={savingId === request.id}
              className="rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] text-lumina-text-muted transition hover:border-lumina-text-muted/35 hover:text-lumina-text disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-lumina-text-muted">
          An exception notifies the client and creates a Needs attention record; it does not decide either side&apos;s claim.
        </p>
      </div>
    )}
  </>
) : (
    <>
                    <div className="flex items-center justify-between">
  <p className="text-[13px] uppercase tracking-[0.14em] text-lumina-text-muted">

  Your Proposal

</p>

</div>

                  <div className="mt-4 rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                      Services included
                    </p>
                    <p className="mt-1 text-[14px] leading-[1.5] text-lumina-text">
                      {requestedServiceNames.join(", ") || "Service not specified"}
                    </p>
                  </div>

                  <textarea
                    placeholder="Write your proposal or message to the client..."
                    value={responses[request.id] || ""}
                    onChange={(e) =>
                      setResponses({
                        ...responses,
                        [request.id]: e.target.value,
                      })
                    }
                    className="mt-4 h-[92px] w-full resize-none rounded-[18px] border border-lumina-border bg-lumina-surface px-5 py-4 text-[15px] outline-none transition focus:border-lumina-text-muted/50"
                  />

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
  <div className="mb-2 flex items-center gap-2">
  <CalendarDays
    size={15}
    strokeWidth={1.8}
    className="text-lumina-text-muted"
  />

  <p className="text-[12px] font-medium text-lumina-text-muted">
    Date
  </p>
</div>

  <input
    type="date"
    value={proposedDates[request.id] || ""}
    onChange={(e) =>
      setProposedDates({
        ...proposedDates,
        [request.id]: e.target.value,
      })
    }
    className="w-full rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
  />
</div>

                    <div>
  <div className="mb-2 flex items-center gap-2">
    <Clock size={15} strokeWidth={1.8} className="text-lumina-text-muted" />
    <p className="text-[12px] font-medium text-lumina-text-muted">
      Estimated duration
    </p>
  </div>

  <input
    type="number"
    min="15"
    max="1440"
    step="15"
    inputMode="numeric"
    placeholder="Minutes"
    value={proposedDurations[request.id] || ""}
    onChange={(e) =>
      setProposedDurations({
        ...proposedDurations,
        [request.id]: e.target.value,
      })
    }
    className="w-full rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
  />
  {(formatDurationMinutes(Number(proposedDurations[request.id])) ||
    proposalExpectedEndAt) && (
    <p className="mt-2 text-[11px] leading-4 text-lumina-text-muted">
      {formatDurationMinutes(Number(proposedDurations[request.id]))}
      {proposalExpectedEndAt
        ? ` · Expected end ${new Date(proposalExpectedEndAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}`
        : ""}
    </p>
  )}
</div>

                    <div>
  <div className="mb-2 flex items-center gap-2">
  <Clock
    size={15}
    strokeWidth={1.8}
    className="text-lumina-text-muted"
  />

  <p className="text-[12px] font-medium text-lumina-text-muted">
    Time
  </p>
</div>

  <input
    type="time"
    value={proposedTimes[request.id] || ""}
    onChange={(e) =>
      setProposedTimes({
        ...proposedTimes,
        [request.id]: e.target.value,
      })
    }
    className="w-full rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
  />
</div>

                    <div>
 <div className="mb-2 flex items-center gap-2">
  <span className="text-[15px] text-lumina-text-muted">$</span>

  <p className="text-[12px] font-medium text-lumina-text-muted">
    Final total price
  </p>
</div>

  <input
    type="number"
    placeholder="Final proposed total"
    value={proposedPrices[request.id] || ""}
    onChange={(e) =>
      setProposedPrices({
        ...proposedPrices,
        [request.id]: e.target.value,
      })
    }
    className="w-full rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
  />
</div>
                  </div>
                  <div className="mt-5 flex flex-row items-center justify-end gap-2 lg:mt-6 lg:flex-col lg:items-end">
  <button
    onClick={() => updateRequest(request.id, "accepted")}
    disabled={savingId === request.id}
    className="rounded-full bg-lumina-black px-7 py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-lumina-black disabled:opacity-50"
  >
    {savingId === request.id
      ? "Saving…"
      : request.status === "accepted"
      ? "Update proposal"
      : "Send proposal"}
  </button>

  <button
    onClick={() => updateRequest(request.id, "declined")}
    disabled={savingId === request.id}
    className="min-h-10 rounded-full px-3 text-[11px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text disabled:opacity-50 lg:min-h-0 lg:border lg:border-lumina-border lg:px-6 lg:py-2.5 lg:text-[13px] lg:no-underline lg:hover:border-lumina-text-muted/35"
  >
    Decline request
  </button>
</div>
                  </>
                  )}                
                </div>
              </div>
            </div>
          );

})
        
        )}
        </div>
      </section>
    {chatRequest && (
  <ChatModal
    request={{
      id: chatRequest.id,
      artist_name: chatRequest.client_name,
      artist_image_url: chatRequest.client_image_url || null,
      image_url: null,
      artist_category: "Client",
      status: chatRequest.status,
      client_status: chatRequest.client_status,
      booking_status: chatRequest.booking_status,
      proposed_date: chatRequest.proposed_date,
      proposed_time: chatRequest.proposed_time,
      proposed_price: chatRequest.proposed_price,
      scheduled_for: chatRequest.scheduled_for,
      expected_end_at: chatRequest.expected_end_at,
      completion_protocol_version: chatRequest.completion_protocol_version,
      appointment_confirmed_at: chatRequest.appointment_confirmed_at,
      appointment_exception_reason: chatRequest.appointment_exception_reason,
      artist_completion_response: chatRequest.artist_completion_response,
      client_completion_response: chatRequest.client_completion_response,
      service_requested: chatRequest.service_requested,
      requested_services: chatRequest.requested_services,
      created_at: chatRequest.created_at,
    }}
    updates={updates[chatRequest.id] || []}
    draft={draftMessage}
    onDraftChange={setDraftMessage}
    selectedImage={selectedImage}
    onImageChange={setSelectedImage}
    onDeleteMessage={deleteMessage}
    onSend={async () => {
    
      const message = draftMessage.trim();

if (!message && !selectedImage) return;
let imageUrl: string | null = null;

if (selectedImage) {
  const fileExt = selectedImage.name.split(".").pop();
  const filePath = `${chatRequest.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-images")
    .upload(filePath, selectedImage);

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("chat-images")
    .getPublicUrl(filePath);

  imageUrl = data.publicUrl;
}

      const { error } = await supabase.from("request_updates").insert({
  request_id: chatRequest.id,
  sender_type: "artist",
  message,
  image_url: imageUrl,
  status: "message",
  is_read_by_artist: true,
  is_read_by_client: false,
});

      if (error) {
        alert(error.message);
        return;
      }

      await supabase.from("notifications").insert({
        user_id: chatRequest.client_id,
        request_id: chatRequest.id,
        title: "New Message",
        message: "Your artist sent you a message.",
      });

      setDraftMessage("");
      setSelectedImage(null);
      await fetchRequests();
    }}
    onAccept={() => {}}
    onDecline={() => {}}
    onRequestDifferentTime={() => {}}
    currentUserType="artist"
    onClose={() => setChatRequest(null)}
  />
)} 
    </div>
  );
}
