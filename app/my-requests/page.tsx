"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { MessageCircle, CalendarDays, Search, Star } from "lucide-react";
import ChatModal from "@/components/ChatModal";
import ClientRequestMobileSummary from "@/components/ClientRequestMobileSummary";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import {
  hasUnreadClientActionNotification,
  useClientWorkspace,
} from "@/components/ClientWorkspaceContext";
import ConsultationSnapshot from "@/components/ConsultationSnapshot";
import ClientGuidanceTip from "@/components/ClientGuidanceTip";
import { useClientOnboarding } from "@/lib/use-client-onboarding";
import {
  formatDurationMinutes,
  getRequestServiceNames,
} from "@/lib/request-services";
import { createConsultationSignedUrls } from "@/lib/consultation-snapshot";
import {
  canSubmitCompletionResponse,
  getAppointmentDurationMinutes,
  getAppointmentExceptionLabel,
  getClientRequestActionState,
  getCompletionState,
  getCompletionStateLabel,
  getNextRequestStateTransitionAt,
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
  getClientMobilePriorityClass,
  getClientMobileRequestStatus,
} from "@/lib/client-request-mobile";
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
  artist_id: string;
  service_requested: string | null;
  requested_services?: unknown;
  consultation_snapshot?: unknown;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string | null;
  client_status: string | null;
  artist_response: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  image_url: string | null;
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
  created_at: string;
  client_response_note: string | null;
  artist_name: string | null;
artist_image_url: string | null;
artist_slug: string | null;
artist_category: string | null;
business_name?: string | null;
client_hidden: boolean | null;
social_link?: string | null;
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
  created_at: string;
  is_read_by_client: boolean | null;
is_read_by_artist: boolean | null;
image_url: string | null;
is_deleted: boolean | null;
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

function MyRequestsContent() {
  const { notifications, acknowledgeNotifications } = useClientWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(
    () => new Set()
  );
  const [requestStateNow, setRequestStateNow] = useState(() => new Date());
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAction, setSelectedAction] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [completionSavingId, setCompletionSavingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const requestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const openChatRequestIdRef = useRef<string | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);
  const routeActiveRef = useRef(true);
  const [requestView, setRequestView] = useState<RequestLifecycleView>("active");
  const [activeFilter, setActiveFilter] = useState<ActiveRequestFilter>("all");
  const [historyFilter, setHistoryFilter] = useState<HistoryRequestFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const showingArchived = requestView === "archived";
  const [updates, setUpdates] = useState<Record<string, RequestUpdate[]>>({});
  const [consultationImageUrls, setConsultationImageUrls] = useState<
    Record<string, string[]>
  >({});
const clientOnboarding = useClientOnboarding();

  useEffect(() => {
    routeActiveRef.current = true;
    return () => {
      routeActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") !== "archived") return;
    const frame = window.requestAnimationFrame(() => setRequestView("archived"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const requestId = searchParams.get("request");
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
      void acknowledgeNotifications({ requestId, kind: "action" });
      requestRefs.current[requestId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [acknowledgeNotifications, requestView, requests, searchParams]);


  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!routeActiveRef.current) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: submittedReviews, error: submittedReviewsError } =
      await supabase
        .from("reviews")
        .select("request_id")
        .eq("client_id", user.id)
        .not("request_id", "is", null);

    if (!routeActiveRef.current) return;
    if (!submittedReviewsError) {
      setReviewedRequestIds(
        new Set(
          (submittedReviews || [])
            .map((review) => review.request_id)
            .filter((requestId): requestId is string => Boolean(requestId))
        )
      );
    }

    const { data, error } = await supabase
    .from("client_requests")
      .select("*")
     .eq("client_id", user.id)
     .eq("client_hidden", showingArchived)
      .order("created_at", { ascending: false });

    if (!routeActiveRef.current) return;
    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }
    const artistIds = [...new Set((data || []).map((request) => request.artist_id))];
const { data: artistProfiles } = await supabase
  .from("artists")
  .select("id, social_link, business_name")
  .in("id", artistIds);

if (!routeActiveRef.current) return;
const bookingMap: Record<string, string | null> = {};
const businessNameMap: Record<string, string | null> = {};

(artistProfiles || []).forEach((profile) => {
  bookingMap[profile.id] = profile.social_link || null;
  businessNameMap[profile.id] = profile.business_name || null;
});

const requestsWithSocialLinks = (data || []).map((request) => ({
  ...request,
  social_link: bookingMap[request.artist_id] || null,
  business_name: businessNameMap[request.artist_id] || null,
}));
console.log("bookingMap", bookingMap);
console.log("requestsWithSocialLinks", requestsWithSocialLinks);

    setRequests(requestsWithSocialLinks);
    const consultationEntries = await Promise.all(
      requestsWithSocialLinks.map(async (request) => [
        request.id,
        await createConsultationSignedUrls(request.consultation_snapshot),
      ] as const)
    );
    if (!routeActiveRef.current) return;
    setConsultationImageUrls(Object.fromEntries(consultationEntries));
    const { data: updateData } = await supabase

  .from("request_updates")
  .select("*")
  .order("created_at", { ascending: true });

  if (!routeActiveRef.current) return;
  const updateMap: Record<string, RequestUpdate[]> = {};

(updateData || []).forEach((update) => {
  if (!updateMap[update.request_id]) {
    updateMap[update.request_id] = [];
  }

  updateMap[update.request_id].push(update);
});

setUpdates(updateMap);

const noteMap: Record<string, string> = {};

(data || []).forEach((request) => {
  noteMap[request.id] =
    request.client_response_note || "";
});

setResponseNotes(noteMap);

setLoading(false);
  };

useEffect(() => {
  let cancelled = false;
  const refreshTimer = window.setTimeout(() => {
    void loadRequests().catch((error) => {
      if (cancelled) return;
      console.log("Client requests load failed:", error);
      setLoading(false);
    });
  }, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(refreshTimer);
  };
}, [showingArchived]);

useEffect(() => {
  openChatRequestIdRef.current = openHistoryId;
}, [openHistoryId]);

useEffect(() => {
  let timer: number | null = null;

  const scheduleNextTransition = () => {
    if (timer !== null) window.clearTimeout(timer);

    const now = new Date();
    setRequestStateNow(now);

    const nextTransition = requests
      .map((request) => getNextRequestStateTransitionAt(request, now))
      .filter((value): value is Date => value !== null)
      .sort((first, second) => first.getTime() - second.getTime())[0];

    if (!nextTransition) return;

    const delay = Math.min(
      Math.max(nextTransition.getTime() - now.getTime() + 100, 100),
      2_147_000_000
    );
    timer = window.setTimeout(scheduleNextTransition, delay);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") scheduleNextTransition();
  };

  scheduleNextTransition();
  window.addEventListener("focus", scheduleNextTransition);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    if (timer !== null) window.clearTimeout(timer);
    window.removeEventListener("focus", scheduleNextTransition);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [requests]);

useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  const setupRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || cancelled) return;

    channel = supabase
      .channel(createRealtimeChannelTopic(`client-realtime-${user.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const requestId = (payload.new as { request_id?: string | null })
            .request_id;
          if (!requestId) return;
          setReviewedRequestIds((current) => {
            const next = new Set(current);
            next.add(requestId);
            return next;
          });
        }
      )
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
            update.sender_type !== "client";

          setUpdates((prev) => ({
            ...prev,
            [update.request_id]: [
              ...(prev[update.request_id] || []),
              update,
            ],
          }));

          if (isOpenIncomingMessage) {
            void markRequestConversationRead(update.request_id, "client").then(
              ({ error }) => {
                if (error) return;
                setUpdates((current) => ({
                  ...current,
                  [update.request_id]: markConversationUpdatesRead(
                    current[update.request_id] || [],
                    "client"
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
          event: "UPDATE",
          schema: "public",
          table: "client_requests",
          filter: `client_id=eq.${user.id}`,
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
    if (!cancelled) console.log("Client request realtime setup failed:", error);
  });

  return () => {
    cancelled = true;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, []);

 const updateClientStatus = async (id: string, clientStatus: string) => {
  const message =
    clientStatus === "confirmed"
      ? "Accept this appointment?"
      : clientStatus === "declined"
      ? "Decline this appointment?"
      : "Request a different time?";

  const confirmed = window.confirm(message);

  if (!confirmed) return;

  const request = requests.find((r) => r.id === id);
  const isBookingLiteConfirmation =
    clientStatus === "confirmed" && request?.completion_protocol_version === 3;

  const { error } = isBookingLiteConfirmation
    ? await supabase.rpc("confirm_booking_lite_appointment", {
        p_request_id: id,
      })
    : await supabase
        .from("client_requests")
        .update({
          client_status: clientStatus,
          booking_status:
            clientStatus === "confirmed"
              ? "booked"
              : clientStatus === "declined"
              ? "client_declined"
              : "client_requested_changes",
          client_confirmed: clientStatus === "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }
if (request?.artist_id) {
  let title = "";
  let message = "";

  if (clientStatus === "confirmed") {
    title = "Appointment Confirmed";
    message = "Your client accepted your proposal.";
  } else if (clientStatus === "declined") {
    title = "Proposal Declined";
    message = "Your client declined your proposal.";
  } else {
    title = "Client Requested a New Time";
    message = "Your client requested a different appointment time.";
  }

  await supabase.from("notifications").insert({
    user_id: request.artist_id,
    request_id: id,
    title,
    message,
  });
}
  await loadRequests();

  alert(
    clientStatus === "confirmed"
      ? "Appointment confirmed in Lumina."
      : clientStatus === "declined"
      ? "Appointment declined."
      : "Your request for a different time was sent."
  );
};
const respondToBookingLiteException = async (request: ClientRequest) => {
  const note = window.prompt(
    "Share your side for Lumina's record. This does not decide the outcome or publish a review automatically.",
    request.client_exception_note || ""
  );
  if (note === null) return;

  setCompletionSavingId(request.id);
  const { error } = await supabase.rpc("respond_to_booking_lite_exception", {
    p_request_id: request.id,
    p_note: note,
  });
  setCompletionSavingId(null);

  if (error) {
    alert(error.message);
    return;
  }

  await supabase.from("notifications").insert({
    user_id: request.artist_id,
    request_id: request.id,
    title: "Client Responded to Appointment Report",
    message: "Your client disagreed with or responded to the reported appointment exception.",
  });

  await loadRequests();
};
const sendDifferentTimeNote = async (id: string) => {
  const note = responseNotes[id]?.trim();

  if (!note) {
    alert("Please write a quick note for the artist.");
    return;
  }

  const { error } = await supabase
    .from("client_requests")
    .update({
      client_status: "needs_different_time",
      booking_status: "client_requested_changes",
      client_response_note: note,
      client_confirmed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }
await supabase.from("request_updates").insert({
  request_id: id,
  sender_type: "client",
  status: "needs_different_time",
  message: note,
});
  setReplyingToId(null);
  await loadRequests();

  alert("Your note was sent to the artist.");
};
const sendMessage = async (request: ClientRequest) => {
 const message = messageDrafts[request.id]?.trim();

if (!message && !selectedImage) return;
let imageUrl: string | null = null;

if (selectedImage) {
  const fileExt = selectedImage.name.split(".").pop();
  const filePath = `${request.id}/${Date.now()}.${fileExt}`;

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
  request_id: request.id,
  sender_type: "client",
  message,
  image_url: imageUrl,
  status: "message",
  is_read_by_client: true,
  is_read_by_artist: false,
});

  if (error) {
    alert(error.message);
    return;
  }

  if (request.artist_id) {
    await supabase.from("notifications").insert({
      user_id: request.artist_id,
      request_id: request.id,
      title: "New Message",
      message: "Your client sent you a message.",
    });
  }

  setMessageDrafts({
    ...messageDrafts,
    [request.id]: "",
  });
  setSelectedImage(null);
};
const deleteMessage = async (messageId: string) => {
  const confirmed = window.confirm("Delete this message for everyone?");

  if (!confirmed) return;

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
    return;
  }

  await loadRequests();
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
      client_hidden: hidden,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadRequests();
};
const submitClientCompletionResponse = async (
  request: ClientRequest,
  response: CompletionResponse
) => {
  const confirmed = window.confirm(
    response === "confirmed"
      ? "Confirm that this service took place? This response cannot be changed."
      : "Report an issue with this completion? The request will be marked as needing attention, and this response cannot be changed."
  );

  if (!confirmed) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Please log in again.");
    return;
  }

  setCompletionSavingId(request.id);

  const { data: updatedRequest, error } = await supabase
    .from("client_requests")
    .update({
      client_completion_response: response,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("client_id", user.id)
    .select("id, booking_status")
    .maybeSingle();

  setCompletionSavingId(null);

  if (error) {
    alert(error.message);
    return;
  }

  if (!updatedRequest) {
    alert("This completion response could not be saved. Refresh and check the appointment status.");
    await loadRequests();
    return;
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: request.artist_id,
      request_id: request.id,
      title:
        response === "disputed"
          ? "Completion Needs Attention"
          : updatedRequest.booking_status === "completed"
          ? "Appointment Completed"
          : "Client Confirmed Service",
      message:
        response === "disputed"
          ? "Your client reported an issue with this completion. The request now needs attention."
          : updatedRequest.booking_status === "completed"
          ? "Both you and your client confirmed the service. The appointment is complete."
          : "Your client confirmed the service took place. Your completion response is still required.",
    });

  if (notificationError) console.log(notificationError);

  await loadRequests();
};
  const labelStatus = (status: string | null) => {
    if (!status || status === "new") return "Waiting for artist";
    if (status === "accepted") return "Artist sent proposal";
    if (status === "needs_changes") return "Artist sent proposal";
    if (status === "declined") return "Artist declined";
    return status;
  };
const markMessagesRead = async (requestId: string) => {
  setUpdates((prev) => ({
    ...prev,
    [requestId]: markConversationUpdatesRead(
      prev[requestId] || [],
      "client"
    ),
  }));

  const { error } = await markRequestConversationRead(requestId, "client");
  const notificationResult = await acknowledgeNotifications({
    requestId,
    kind: "message",
  });

  if (error || notificationResult.error) {
    alert(error?.message || notificationResult.error?.message);
    await loadRequests();
  }
};
const getUnreadCount = (requestId: string) => {
  return getRequestConversationUnreadCount(updates[requestId] || [], "client");
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
          !!request.client_hidden
        )
      ) {
        return false;
      }

      if (
        requestView === "active" &&
        !matchesActiveRequestFilter(request, activeFilter, {
          role: "client",
          hasReviewed: reviewedRequestIds.has(request.id),
          now: requestStateNow,
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
        request.artist_name,
        request.business_name,
        ...getRequestServiceNames(request),
      ]);
    }),
  [
    activeFilter,
    historyFilter,
    requestStateNow,
    requestView,
    requests,
    reviewedRequestIds,
    searchQuery,
  ]
);
const currentActionKeys = requests
  .filter((request) =>
    matchesRequestLifecycleView(request, "active", !!request.client_hidden)
  )
  .map(
    (request) =>
      getClientRequestActionState(
        request,
        reviewedRequestIds.has(request.id),
        requestStateNow
      )?.key
  );
const hasReviewReadyAction = currentActionKeys.includes("review_ready");
const hasProposalConfirmationAction = currentActionKeys.some(
  (key) => key === "review_proposal" || key === "confirm_appointment"
);
  return (
      <div className="min-h-screen bg-lumina-surface text-lumina-text">

      <section className="mx-auto w-full max-w-[1600px] px-3 py-4 md:px-8 md:py-7 lg:px-10 lg:py-14">
        <h1
          className="text-[26px] font-semibold leading-[1.04] md:text-[30px] lg:text-[56px] lg:leading-[1.02]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          My requests
        </h1>

        <p className="mt-1 max-w-[680px] text-[12px] leading-[1.45] text-lumina-text-muted lg:mt-4 lg:text-[16px] lg:leading-[1.6]">
          Track your booking requests and confirm artist suggestions.
        </p>
       {!loading && (
  <div className="mt-4 lg:mt-6">
    <p className="mt-2 hidden text-[14px] text-lumina-text-muted lg:block">
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
        <button
          key={view}
          type="button"
          onClick={() => setRequestView(view)}
          aria-pressed={requestView === view}
          className={`min-h-9 flex-1 shrink-0 rounded-full px-4 text-[11px] font-medium capitalize transition sm:flex-none lg:text-[13px] ${
            requestView === view
              ? "bg-lumina-black text-white"
              : "text-lumina-text-muted hover:text-lumina-text"
          }`}
        >
          {view}
        </button>
      ))}
    </div>

    {requestView === "active" && (
      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1" aria-label="Active request filters">
        {([
          ["all", "All"],
          ["needs_action", "Needs action"],
          ["waiting", "Waiting"],
          ["confirmed", "Confirmed"],
        ] as Array<[ActiveRequestFilter, string]>).map(([value, label]) => (
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
)}

        {!loading &&
          requestView === "active" &&
          clientOnboarding.ready &&
          clientOnboarding.isClient &&
          hasReviewReadyAction &&
          !clientOnboarding.hasDismissedTip("review_ready") && (
            <div className="mt-6 max-w-[860px]">
              <ClientGuidanceTip
                title="Your verified review is ready"
                onDismiss={() => clientOnboarding.dismissTip("review_ready")}
                tone="review-ready"
                icon={<Star size={14} className="fill-lumina-blush" />}
              >
                Review ready appears after an eligible appointment&apos;s expected
                service end. Your review will be tied to that Lumina appointment.
              </ClientGuidanceTip>
            </div>
          )}

        {!loading &&
          requestView === "active" &&
          clientOnboarding.ready &&
          clientOnboarding.isClient &&
          !hasReviewReadyAction &&
          hasProposalConfirmationAction &&
          !clientOnboarding.hasDismissedTip("proposal_confirmation") && (
            <div className="mt-6 max-w-[860px]">
              <ClientGuidanceTip
                title="Confirm appointments in Lumina"
                onDismiss={() =>
                  clientOnboarding.dismissTip("proposal_confirmation")
                }
              >
                Review the services, date, time, duration, and final price first.
                Confirm appointment records your acceptance in Lumina; an external
                booking or payment link is secondary logistics only.
              </ClientGuidanceTip>
            </div>
          )}

        <div className="mt-5 flex flex-col gap-3 lg:mt-10 lg:gap-5">
          {loading ? (
            <div className="rounded-[18px] bg-lumina-surface-soft p-4 text-[12px] text-lumina-text-muted lg:rounded-[24px] lg:p-6 lg:text-base">
              Loading requests...
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="rounded-[18px] border border-lumina-border bg-lumina-surface p-4 lg:rounded-[24px] lg:p-6">
              <h2 className="text-[16px] font-medium text-lumina-text">
                {searchQuery.trim() ? "No matching requests" : `No ${requestView} requests`}
              </h2>
              <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
                {searchQuery.trim()
                  ? "Try another professional, business, or service name."
                  : requests.length === 0
                  ? "Requests you send to professionals will appear here."
                  : "Choose another view or filter to see more requests."}
              </p>
              {requests.length === 0 && requestView === "active" && (
                <Link href="/browse" className="mt-4 inline-flex rounded-full bg-lumina-black px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85">
                  Browse professionals
                </Link>
              )}
            </div>
          ) : (
visibleRequests.map((request) => {
  const latestUpdate = getLatestUpdate(request.id);
  const requestedServiceNames = getRequestServiceNames(request);
    const proposedDate =
    latestUpdate?.proposed_date ?? request.proposed_date;

  const proposedTime =
    latestUpdate?.proposed_time ?? request.proposed_time;

  const proposedPrice =
    latestUpdate?.proposed_price ?? request.proposed_price;
  const proposedExpectedEndAt =
    latestUpdate?.expected_end_at ?? request.expected_end_at;
  const appointmentDurationMinutes = getAppointmentDurationMinutes({
    scheduled_for: request.scheduled_for,
    expected_end_at: proposedExpectedEndAt,
  });

  const latestMessage =
    latestUpdate?.message ?? request.artist_response;
    const unreadCount = getUnreadCount(request.id);
    const completionState = getCompletionState(request, requestStateNow);
    const showCompletionState = completionState !== "scheduled";
    const canRespondToCompletion = canSubmitCompletionResponse(
      request,
      "client",
      requestStateNow
    );
    const actionState = getClientRequestActionState(
      request,
      reviewedRequestIds.has(request.id),
      requestStateNow
    );
    const canConfirmAppointment = actionState?.key === "confirm_appointment";
    const canReview = actionState?.key === "review_ready";
    const exceptionLabel = getAppointmentExceptionLabel(
      request.appointment_exception_reason
    );
    const mobileStatus = getClientMobileRequestStatus(
      request,
      actionState,
      completionState
    );
    const mobileScheduleLabel = formatMobileRequestSchedule(
      request.scheduled_for,
      proposedDate || request.preferred_date,
      proposedTime || request.preferred_time
    );
    const mobileMessagePreview =
      latestUpdate && (latestUpdate.message?.trim() || latestUpdate.image_url)
        ? getRequestConversationPreview(latestUpdate)
        : latestMessage?.trim() || null;
    const mobilePriorityClass = getClientMobilePriorityClass(
      mobileStatus.priority
    );
    const hasUnreadActionAttention =
      !!actionState &&
      hasUnreadClientActionNotification(notifications, request.id);
    const toggleRequestDetails = () => {
      const opening = expandedRequestId !== request.id;
      setExpandedRequestId(opening ? request.id : null);
      if (opening) {
        void acknowledgeNotifications({ requestId: request.id, kind: "action" });
      }
    };

  return (
                <div
  id={`request-${request.id}`}
  key={request.id}
  ref={(el) => {
    requestRefs.current[request.id] = el;
  }}
  className={`${mobilePriorityClass} rounded-[18px] border bg-lumina-surface transition-all duration-300 lg:order-none lg:rounded-[24px] ${
    actionState ? "p-3 lg:p-6" : "p-3.5 lg:p-6"
  } ${
    hasUnreadActionAttention
      ? "border-lumina-blush bg-lumina-blush/10 shadow-[0_8px_28px_rgba(129,91,98,0.08)] ring-1 ring-lumina-blush/60"
      : "border-lumina-border/70 lg:shadow-sm"
  }`}
>
                <ClientRequestMobileSummary
                  requestId={request.id}
                  artistName={request.artist_name || "Artist"}
                  artistImageUrl={request.artist_image_url}
                  artistHref={`/artist/${request.artist_slug || ""}`}
                  serviceSummary={
                    requestedServiceNames.join(" · ") || "Service request"
                  }
                  status={mobileStatus}
                  scheduleLabel={mobileScheduleLabel}
                  priceLabel={
                    proposedPrice != null ? `$${proposedPrice}` : null
                  }
                  latestMessagePreview={mobileMessagePreview}
                  unreadCount={unreadCount}
                  action={mobileStatus.action}
                  reviewHref={`/artist/${request.artist_id}?tab=reviews&request=${request.id}`}
                  expanded={expandedRequestId === request.id}
                  archived={requestView === "archived"}
                  onExpand={toggleRequestDetails}
                  onMessage={async () => {
                    await markMessagesRead(request.id);
                    setOpenHistoryId(request.id);
                  }}
                  onArchive={() =>
                    setRequestHidden(request.id, requestView !== "archived")
                  }
                  onAcknowledgeAction={() =>
                    acknowledgeNotifications({
                      requestId: request.id,
                      kind: "action",
                    })
                  }
                />
                <div
  onClick={toggleRequestDetails}
  className="hidden cursor-pointer flex-col gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between"
>
                  <div>
  <div className="mb-3">
  <Link
    href={`/artist/${request.artist_slug || ""}`}
    className="flex items-center gap-3 hover:opacity-80"
  >
    <div className="h-10 w-10 overflow-hidden rounded-full bg-lumina-pearl">
      {request.artist_image_url && (
        <img
          src={request.artist_image_url}
          alt={request.artist_name || "Artist"}
          className="h-full w-full object-cover"
        />
      )}
    </div>

    <div>
      <p className="text-[15px] font-medium">
        {request.artist_name || "Artist"}
      </p>

      
    </div>
  </Link>
</div>


  <div className="flex flex-wrap items-center gap-3">
    <h2 className="text-[22px] font-medium">
      {requestedServiceNames.join(", ") || "Service Request"}
    </h2>

                      <span
  className={`rounded-full px-3 py-1 text-[13px] ${
    actionState?.key === "review_ready"
      ? "border border-lumina-blush bg-lumina-blush text-lumina-text"
      : actionState
      ? "border border-lumina-glass-border bg-lumina-surface text-lumina-text"
      : completionState === "completed"
      ? "bg-lumina-pearl text-lumina-text-muted"
      : completionState === "needs_attention"
      ? "bg-lumina-attention-soft text-lumina-attention"
      : completionState === "completion_pending" ||
        completionState === "awaiting_confirmation" ||
        completionState === "booked" ||
        completionState === "review_ready"
      ? "bg-lumina-pearl text-lumina-text"
      : request.status === "needs_changes"
      ? "bg-lumina-attention-soft text-lumina-attention"
      : request.status === "accepted"
      ? "bg-lumina-success-soft text-lumina-success"
      : "bg-lumina-pearl text-lumina-text-muted"
  }`}
>
  {actionState
  ? actionState.label
  : showCompletionState
  ? getCompletionStateLabel(completionState)
  : request.client_status === "confirmed"
  ? "Accepted"
  : request.status === "accepted" || request.status === "needs_changes"
  ? "Artist replied"
  : labelStatus(request.status)}
</span>
                    </div>

                      
<p className="mt-2 text-[14px] text-lumina-text-muted">
  Sent{" "}
  {new Date(request.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}
  {" • "}
  Requested:{" "}
  <span className="text-lumina-text">
    {request.preferred_date || "Flexible"}
    {request.preferred_time && ` · ${request.preferred_time}`}
  </span>
</p>
                  </div>

  <div className="flex items-center gap-3">
  {actionState?.key === "review_ready" ? (
    <Link
      href={`/artist/${request.artist_id}?tab=reviews&request=${request.id}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void acknowledgeNotifications({
          requestId: request.id,
          kind: "action",
        }).then(() => {
          router.push(
            `/artist/${request.artist_id}?tab=reviews&request=${request.id}`
          );
        });
      }}
      className="inline-flex items-center gap-2 rounded-full bg-lumina-black px-4 py-2.5 text-[12px] font-medium text-white transition hover:opacity-85"
    >
      <Star size={14} fill="currentColor" strokeWidth={1.5} />
      {actionState.cta}
    </Link>
  ) : actionState ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setExpandedRequestId(request.id);
        void acknowledgeNotifications({ requestId: request.id, kind: "action" });
      }}
      aria-expanded={expandedRequestId === request.id}
      aria-controls={`request-details-${request.id}`}
      className={`rounded-full px-4 py-2.5 text-[12px] font-medium transition ${
        actionState.key === "confirm_appointment" ||
        actionState.key === "completion_confirmation"
          ? "bg-lumina-black text-white hover:opacity-85"
          : "border border-lumina-glass-border bg-lumina-surface/75 text-lumina-text hover:border-lumina-text-muted/40"
      }`}
    >
      {actionState.cta}
    </button>
  ) : null}
  <button
  onClick={async (e) => {
  e.stopPropagation();

  await markMessagesRead(request.id);
  setOpenHistoryId(request.id);
}}
className="relative flex h-10 w-10 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted transition hover:bg-lumina-blush/60 hover:text-lumina-black"
  aria-label="Message artist"
>
  <MessageCircle size={18} strokeWidth={1.7} />
  {unreadCount > 0 && (
  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lumina-black px-1 text-[10px] text-white">
    {unreadCount}
  </span>
)}
</button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      setRequestHidden(request.id, requestView !== "archived");
    }}
    className="rounded-full border border-lumina-border px-3 py-1 text-[12px] text-lumina-text-muted transition hover:text-lumina-black"
  >
    {requestView === "archived" ? "Restore" : "Archive"}
  </button>
  <span className="text-[15px] text-lumina-text-muted">
    {expandedRequestId === request.id ? "⌃" : "⌄"}
  </span>
</div>

                </div>
<div
  id={`request-details-${request.id}`}
  className={`overflow-hidden transition-all duration-400 ${
    expandedRequestId === request.id
      ? "max-h-[4000px] opacity-100"
      : "max-h-0 opacity-0"
  }`}
>

                <ConsultationSnapshot
                  snapshot={request.consultation_snapshot}
                  imageUrls={consultationImageUrls[request.id] || []}
                  compact
                />

                {(proposedDate ||
                proposedTime ||
                proposedPrice) && ( 
<div className="mt-5 border-t border-lumina-border/80 pt-4">
    <div>
  <p className="inline-flex rounded-full bg-lumina-pearl px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">
    Artist Proposal
  </p>
  <div className="mt-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
      Services included
    </p>
    <div className="mt-2 flex flex-wrap gap-2">
      {requestedServiceNames.length > 0 ? (
        requestedServiceNames.map((serviceName) => (
          <span
            key={serviceName}
            className="rounded-full border border-lumina-border bg-lumina-surface px-3 py-1.5 text-[12px] text-lumina-text"
          >
            {serviceName}
          </span>
        ))
      ) : (
        <span className="text-[12px] text-lumina-text-muted">Service not specified</span>
      )}
    </div>
  </div>
  
</div>

<div className="mt-3 rounded-[20px] border border-lumina-border bg-lumina-surface px-4 py-4 shadow-sm sm:px-5">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    
<div className="flex items-center gap-3">
      <CalendarDays
    size={22}
    strokeWidth={1.7}
    className="text-lumina-text-muted"
  />

  <div>
    <h3
className="text-[18px] font-semibold leading-tight tracking-[-0.01em]"      
style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      {proposedDate
        ? new Date(proposedDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })
        : "Flexible date"}
    </h3>

    <p className="mt-0.5 text-[14px] text-lumina-text-muted">
      {proposedTime
        ? new Date(`2000-01-01T${proposedTime}`).toLocaleTimeString(
            "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          )
        : "Flexible time"}
    </p>
    {proposedExpectedEndAt && (
      <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
        {formatDurationMinutes(appointmentDurationMinutes) || "Estimated duration"}
        {" · Expected end "}
        {new Date(proposedExpectedEndAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    )}
  </div>
</div>

<div className="border-t border-lumina-border pt-3 text-left sm:min-w-[140px] sm:border-0 sm:pl-8 sm:pt-0 sm:text-right">
          <p className="text-[11px] uppercase tracking-[0.15em] text-lumina-text-muted">
        Final proposed total
      </p>

<p className="mt-1 text-[24px] font-medium tracking-[-0.02em] text-lumina-text">
  {proposedPrice ? `$${proposedPrice}` : "—"}
</p>
    </div>
  </div>
</div>

                    {(request.status === "accepted" || request.status === "needs_changes") &&
request.booking_status !== "completed" &&
request.client_status !== "confirmed" &&
request.client_status !== "declined" && (
<>
  {request.client_status !== "needs_different_time" && (
    <div className="mt-4 border-t border-lumina-border pt-4 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void updateClientStatus(request.id, "confirmed")}
          disabled={
            request.completion_protocol_version === 3 && !canConfirmAppointment
          }
          className="min-h-10 rounded-full bg-lumina-black px-3 text-[11px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() =>
            setReplyingToId(
              replyingToId === request.id ? null : request.id
            )
          }
          aria-expanded={replyingToId === request.id}
          className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-3 text-[10px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft"
        >
          Request different time
        </button>
      </div>
      <button
        type="button"
        onClick={() => void updateClientStatus(request.id, "declined")}
        className="mt-1.5 min-h-9 px-2 text-[10px] text-lumina-text-muted transition hover:text-lumina-text"
      >
        Decline
      </button>

      {replyingToId === request.id && (
        <div className="mt-2.5 rounded-[14px] bg-lumina-pearl/65 p-3">
          <label
            htmlFor={`different-time-${request.id}`}
            className="text-[10px] font-medium text-lumina-text"
          >
            What timing would work better?
          </label>
          <textarea
            id={`different-time-${request.id}`}
            value={responseNotes[request.id] || ""}
            onChange={(event) =>
              setResponseNotes((current) => ({
                ...current,
                [request.id]: event.target.value,
              }))
            }
            rows={3}
            className="mt-2 w-full resize-none rounded-[12px] border border-lumina-border bg-lumina-surface px-3 py-2 text-[12px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted focus:border-lumina-text-muted"
            placeholder="Share a preferred day or time."
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void sendDifferentTimeNote(request.id)}
              className="min-h-9 rounded-full bg-lumina-black px-3.5 text-[10px] font-medium text-white"
            >
              Send request
            </button>
            <button
              type="button"
              onClick={() => setReplyingToId(null)}
              className="min-h-9 px-2 text-[10px] text-lumina-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )}

  <div className="mt-4 hidden flex-wrap items-center gap-4 border-t border-lumina-border pt-4 lg:flex">
    <button
      onClick={() => void updateClientStatus(request.id, "confirmed")}
      disabled={request.completion_protocol_version === 3 && !canConfirmAppointment}
      className="group rounded-full bg-lumina-black px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
    >
      Confirm appointment <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
    </button>
    <button
      onClick={() => {
        setSelectedAction({
          ...selectedAction,
          [request.id]: "declined",
        });
        updateClientStatus(request.id, "declined");
      }}
      className="px-2 py-2 text-[13px] text-lumina-text-muted hover:text-lumina-black"
    >
      Not Interested
    </button>
  </div>
</>
)}
{request.client_status === "confirmed" &&
  request.booking_status === "booked" &&
  !request.appointment_exception_reason &&
  request.social_link && (
    <div className="mt-4 border-t border-lumina-border pt-4">
      <a
        href={request.social_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] text-lumina-text transition hover:border-lumina-text-muted/40 hover:text-lumina-black"
      >
        Continue to professional&apos;s booking/payment page →
      </a>
      <p className="mt-2 text-[11px] text-lumina-text-muted">
        Optional logistics only — your appointment is already confirmed in Lumina.
      </p>
    </div>
  )}
{showCompletionState && !canReview && (
  <div className="mt-4 border-t border-lumina-border pt-4">
    <p className="text-[13px] font-medium text-lumina-text">
      {getCompletionStateLabel(completionState)}
    </p>
    <p className="mt-1 text-[12px] leading-[1.55] text-lumina-text-muted">
      {completionState === "awaiting_confirmation"
        ? "The appointment time has passed. Tell Lumina whether the service took place."
        : completionState === "review_ready"
        ? "How did your appointment go? You can now share your experience."
        : completionState === "booked"
        ? "Lumina has recorded your accepted appointment."
        : completionState === "completion_pending"
        ? "One participant has confirmed. The other response is still required."
        : completionState === "needs_attention"
        ? `${exceptionLabel || "An appointment issue was reported"}. Lumina has preserved both sides and paused public review publication until later review.`
        : request.completion_protocol_version === 3
        ? "Lumina has recorded this appointment as completed."
        : "Both you and the professional confirmed that the service took place."}
    </p>

    {canRespondToCompletion && (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => void submitClientCompletionResponse(request, "confirmed")}
          disabled={completionSavingId === request.id}
          className="rounded-full bg-lumina-black px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
        >
          Confirm service took place
        </button>
        <button
          onClick={() => void submitClientCompletionResponse(request, "disputed")}
          disabled={completionSavingId === request.id}
          className="rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] text-lumina-text-muted transition hover:border-lumina-text-muted/40 hover:text-lumina-black disabled:opacity-50"
        >
          Report an issue / Dispute completion
        </button>
      </div>
    )}
    {request.completion_protocol_version === 3 &&
      request.appointment_exception_reason &&
      !request.client_completion_response && (
        <button
          onClick={() => void respondToBookingLiteException(request)}
          disabled={completionSavingId === request.id}
          className="mt-4 rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] text-lumina-text transition hover:border-lumina-text-muted/40 hover:text-lumina-black disabled:opacity-50"
        >
          I disagree / Share my side
        </button>
      )}
    {request.client_exception_note && (
      <p className="mt-3 rounded-[14px] bg-lumina-attention-soft px-4 py-3 text-[12px] leading-5 text-lumina-text-muted">
        Your response: {request.client_exception_note}
      </p>
    )}
  </div>
)}
{canReview && (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-l-2 border-lumina-blush pl-4">
    <div>
      <p className="text-[13px] font-medium text-lumina-text">
        {request.appointment_exception_reason
          ? "Share your experience for review"
          : request.booking_status === "completed"
          ? "Your service is complete"
          : "How did your appointment go?"}
      </p>
      <p className="mt-1 text-[12px] text-lumina-text-muted">
        {request.appointment_exception_reason
          ? "Because an exception was reported, your review will be saved as pending for future moderation."
          : "Share your experience to help other Lumina clients."}
      </p>
    </div>

    <Link
      href={`/artist/${request.artist_id}?tab=reviews&request=${request.id}`}
      onClick={(event) => {
        event.preventDefault();
        void acknowledgeNotifications({
          requestId: request.id,
          kind: "action",
        }).then(() => {
          router.push(
            `/artist/${request.artist_id}?tab=reviews&request=${request.id}`
          );
        });
      }}
      className="group flex items-center gap-2 rounded-full bg-lumina-black px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Star size={16} fill="currentColor" strokeWidth={1.5} />
      {request.appointment_exception_reason ? "Submit pending review" : "Leave a review"}
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  </div>
)}
                  </div>
                                )}

              </div>
            </div>
                    );
        })
        )}
        </div>
      </section>
    {openHistoryId && (
  <ChatModal
    request={requests.find((r) => r.id === openHistoryId)!}
    updates={updates[openHistoryId] || []}
    draft={messageDrafts[openHistoryId] || ""}
    selectedImage={selectedImage}
onImageChange={setSelectedImage}
    onDraftChange={(value) =>
      setMessageDrafts({
        ...messageDrafts,
        [openHistoryId]: value,
      })
    }
    onDeleteMessage={deleteMessage}
    onSend={() => {
      const request = requests.find((r) => r.id === openHistoryId);

      if (request) {
        sendMessage(request);
      }
    }}
    onAccept={() => updateClientStatus(openHistoryId, "confirmed")}
onDecline={() => updateClientStatus(openHistoryId, "declined")}
onRequestDifferentTime={() => {
  setReplyingToId(openHistoryId);
  setOpenHistoryId(null);
}}   
    onClose={() => setOpenHistoryId(null)}
  />
)}
      </div>
  );
}

export default function MyRequestsPage() {
  return (
    <ClientWorkspaceShell>
      <MyRequestsContent />
    </ClientWorkspaceShell>
  );
}
