"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, MessageCircle, CalendarDays, Star } from "lucide-react";
import ChatModal from "@/components/ChatModal";
import AccountMenu from "@/components/AccountMenu";

type ClientRequest = {
  id: string;
  artist_id: string;
  service_requested: string | null;
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
  created_at: string;
  client_response_note: string | null;
  artist_name: string | null;
artist_image_url: string | null;
artist_slug: string | null;
artist_category: string | null;
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
  created_at: string;
  is_read_by_client: boolean | null;
is_read_by_artist: boolean | null;
image_url: string | null;
is_deleted: boolean | null;
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
export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAction, setSelectedAction] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const requestRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const openChatRequestIdRef = useRef<string | null>(null);
  const [requestTab, setRequestTab] = useState<"active" | "archived">("active");
  const [updates, setUpdates] = useState<Record<string, RequestUpdate[]>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
const [showNotifications, setShowNotifications] = useState(false);
const unreadCount = notifications.filter((n) => !n.is_read).length;


  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }
    const { data: notificationData } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

setNotifications(notificationData || []);

    const { data, error } = await supabase
    .from("client_requests")
      .select("*")
     .eq("client_id", user.id)
     .eq("client_hidden", requestTab === "archived")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }
    const artistIds = [...new Set((data || []).map((request) => request.artist_id))];
const { data: artistProfiles } = await supabase
  .from("artists")
  .select("id, social_link")
  .in("id", artistIds);

const bookingMap: Record<string, string | null> = {};

(artistProfiles || []).forEach((profile) => {
  bookingMap[profile.id] = profile.social_link || null;
});

const requestsWithSocialLinks = (data || []).map((request) => ({
  ...request,
  social_link: bookingMap[request.artist_id] || null,
}));
console.log("bookingMap", bookingMap);
console.log("requestsWithSocialLinks", requestsWithSocialLinks);

    setRequests(requestsWithSocialLinks);
    const { data: updateData } = await supabase

  .from("request_updates")
  .select("*")
  .order("created_at", { ascending: true });

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
  loadRequests();
}, [requestTab]);

useEffect(() => {
  openChatRequestIdRef.current = openHistoryId;
}, [openHistoryId]);

useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  const setupRealtime = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || cancelled) return;

    channel = supabase
      .channel(`client-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
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
          table: "request_updates",
        },
        (payload) => {
          const update = payload.new as RequestUpdate;
          const isOpenIncomingMessage =
            openChatRequestIdRef.current === update.request_id &&
            update.sender_type !== "client";
          const visibleUpdate = isOpenIncomingMessage
            ? { ...update, is_read_by_client: true }
            : update;

          setUpdates((prev) => ({
            ...prev,
            [update.request_id]: [
              ...(prev[update.request_id] || []),
              visibleUpdate,
            ],
          }));

          if (isOpenIncomingMessage) {
            void supabase
              .from("request_updates")
              .update({ is_read_by_client: true })
              .eq("id", update.id);
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
          const updatedRequest = payload.new as ClientRequest;

          setRequests((prev) =>
            prev.map((request) =>
              request.id === updatedRequest.id ? updatedRequest : request
            )
          );
        }
      );

    channel.subscribe();
  };

  setupRealtime();

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

  const { error } = await supabase
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
const request = requests.find((r) => r.id === id);

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
      ? "Request accepted."
      : clientStatus === "declined"
      ? "Appointment declined."
      : "Your request for a different time was sent."
  );
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
      : "Move this request back to Active?"
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
  const labelStatus = (status: string | null) => {
    if (!status || status === "new") return "Waiting for artist";
    if (status === "accepted") return "Artist sent proposal";
    if (status === "needs_changes") return "Artist sent proposal";
    if (status === "declined") return "Artist declined";
    return status;
  };
const openNotification = async (notification: Notification) => {
  if (notification.request_id) {
  setExpandedRequestId(notification.request_id);
  setHighlightedRequestId(notification.request_id);

  setTimeout(() => {
    setHighlightedRequestId(null);
  }, 1200);
}
setTimeout(() => {
  document
    .getElementById(`request-${notification.request_id}`)
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
}, 150);

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
    await markMessagesRead(notification.request_id);
    setOpenHistoryId(notification.request_id);
    return;
  }

  if (
    notification.title === "Appointment Completed" &&
    notification.request_id
  ) {
    let artistId = requests.find(
      (request) => request.id === notification.request_id
    )?.artist_id;

    if (!artistId) {
      const { data } = await supabase
        .from("client_requests")
        .select("artist_id")
        .eq("id", notification.request_id)
        .maybeSingle();

      artistId = data?.artist_id;
    }

    if (artistId) {
      window.location.assign(`/artist/${artistId}?tab=reviews#leave-review`);
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
    [requestId]: (prev[requestId] || []).map((update) =>
      update.sender_type !== "client"
        ? { ...update, is_read_by_client: true }
        : update
    ),
  }));

  const { error } = await supabase
    .from("request_updates")
    .update({ is_read_by_client: true })
    .eq("request_id", requestId)
    .neq("sender_type", "client");

  if (error) {
    alert(error.message);
  }
};
const getUnreadCount = (requestId: string) => {
  return (updates[requestId] || []).filter(
    (update) =>
      !update.is_deleted &&
      update.sender_type !== "client" &&
      update.is_read_by_client === false
  ).length;
};
const getLatestUpdate = (requestId: string) => {
  const history = updates[requestId] || [];

  return history[history.length - 1];
};
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-5 py-5 text-[15px]">
        <Link href="/browse">← Browse</Link>
        <Link href="/" className="font-medium">
          Lumina
        </Link>
        <div className="flex items-center gap-2">
        <button
  onClick={() => setShowNotifications(!showNotifications)}
  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-[#faf6f5]"
  aria-label="Notifications"
>
<Bell size={18} strokeWidth={1.7} />

  {unreadCount > 0 && (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white">
{unreadCount}
    </span>
  )}
</button>

<AccountMenu />
</div>
      </header>
      {showNotifications && (
  <div className="absolute right-5 top-[72px] z-40 w-[320px] rounded-[22px] border border-neutral-200 bg-white p-4 shadow-xl">
    <div className="flex items-center justify-between gap-4">
      <p className="text-[15px] font-medium">Notifications</p>
      {notifications.length > 0 && (
        <button
          onClick={() => void clearNotifications()}
          className="text-[12px] text-neutral-500 transition hover:text-black"
        >
          Clear all
        </button>
      )}
    </div>

    <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      {notifications.length === 0 ? (
        <p className="text-[14px] text-neutral-500">
          No notifications yet.
        </p>
      ) : (
        notifications.map((notification) => {
          const relatedRequest = requests.find(
            (request) => request.id === notification.request_id
          );
          const senderName = relatedRequest?.artist_name || "Your artist";
          const senderImage = relatedRequest?.artist_image_url;
          const notificationMessage =
            notification.title === "New Message"
              ? `${senderName} sent you a message.`
              : notification.title === "New Proposal"
              ? `${senderName} sent you a proposal.`
              : notification.title === "Proposal Updated"
              ? `${senderName} updated your proposal.`
              : notification.title === "Appointment Completed"
              ? `${senderName} marked your appointment completed. You can now leave a verified review.`
              : notification.message;

          return (
          <div
  key={notification.id}
  onClick={() => openNotification(notification)}
  className={`cursor-pointer rounded-[16px] p-3 transition hover:bg-[#f3eeee] ${
    notification.is_read ? "bg-white" : "bg-[#faf6f5]"
  }`}
>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-[12px] font-medium text-neutral-600">
                {senderImage ? (
                  <img
                    src={senderImage}
                    alt={senderName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  senderName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-neutral-800">
                  {senderName}
                </p>
                <p className="text-[14px] font-medium">
                  {notification.title}
                </p>

                {notificationMessage && (
                  <p className="mt-1 text-[13px] text-neutral-600">
                    {notificationMessage}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-neutral-400">
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

      <section className="px-5 py-10 md:px-10">
        <h1
          className="text-[44px] leading-[1.02] font-semibold md:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          My requests
        </h1>

        <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-neutral-600">
          Track your booking requests and confirm artist suggestions.
        </p>
       {!loading && (
  <div>
    <p className="mt-2 text-[14px] text-neutral-500">
      {requests.length} {requestTab} request
      {requests.length !== 1 ? "s" : ""}
    </p>

    <div className="mt-6 flex gap-2">
      <button
        onClick={() => setRequestTab("active")}
        className={`rounded-full px-4 py-2 text-[13px] ${
          requestTab === "active"
            ? "bg-black text-white"
            : "border border-neutral-200 bg-white text-neutral-600"
        }`}
      >
        Active
      </button>

      <button
        onClick={() => setRequestTab("archived")}
        className={`rounded-full px-4 py-2 text-[13px] ${
          requestTab === "archived"
            ? "bg-black text-white"
            : "border border-neutral-200 bg-white text-neutral-600"
        }`}
      >
        Archived
      </button>
    </div>
  </div>
)}

        <div className="mt-10 space-y-5">
          {loading ? (
            <div className="rounded-[24px] bg-[#fbf4f4] p-6 text-neutral-600">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-[24px] bg-[#fbf4f4] p-6 text-neutral-600">
              You have not sent any requests yet.
            </div>
          ) : (
requests.map((request) => {
  const latestUpdate = getLatestUpdate(request.id);
    const proposedDate =
    latestUpdate?.proposed_date ?? request.proposed_date;

  const proposedTime =
    latestUpdate?.proposed_time ?? request.proposed_time;

  const proposedPrice =
    latestUpdate?.proposed_price ?? request.proposed_price;

  const latestMessage =
    latestUpdate?.message ?? request.artist_response;
    const unreadCount = getUnreadCount(request.id);

  return (
                <div
  id={`request-${request.id}`}
  key={request.id}
  ref={(el) => {
    requestRefs.current[request.id] = el;
  }}
  className={`rounded-[24px] border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-700 ${
    highlightedRequestId === request.id
      ? "bg-[#fdf9f4] ring-2 ring-[#e9ddcf]"
      : ""
  }`}
>
                <div
  onClick={() =>
    setExpandedRequestId(
      expandedRequestId === request.id ? null : request.id
    )
  }
  className="cursor-pointer flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
>
                  <div>
  <div className="mb-3">
  <Link
    href={`/artist/${request.artist_slug || ""}`}
    className="flex items-center gap-3 hover:opacity-80"
  >
    <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-100">
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
      {request.service_requested || "Service Request"}
    </h2>

                      <span
  className={`rounded-full px-3 py-1 text-[13px] ${
    request.booking_status === "completed"
      ? "bg-neutral-100 text-neutral-500"
      : request.status === "needs_changes"
      ? "bg-[#f7e8e7] text-[#8f5d5a]"
      : request.status === "accepted"
      ? "bg-[#e9f6ec] text-[#3b6b4a]"
      : "bg-neutral-100 text-neutral-600"
  }`}
>
  {request.booking_status === "completed"
  ? "Service completed"
  : request.client_status === "confirmed"
  ? "Accepted"
  : request.status === "accepted" || request.status === "needs_changes"
  ? "Artist replied"
  : labelStatus(request.status)}
</span>
                    </div>

                      
<p className="mt-2 text-[14px] text-neutral-500">
  Sent{" "}
  {new Date(request.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}
  {" • "}
  Requested:{" "}
  <span className="text-neutral-700">
    {request.preferred_date || "Flexible"}
    {request.preferred_time && ` · ${request.preferred_time}`}
  </span>
</p>
                  </div>

  <div className="flex items-center gap-3">
  {request.booking_status === "completed" && (
    <Link
      href={`/artist/${request.artist_id}?tab=reviews#leave-review`}
      onClick={(e) => e.stopPropagation()}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0f5] text-[#d86f91] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ffe4ee] hover:shadow-md"
      aria-label="Leave a review"
      title="Leave a review"
    >
      <Star size={18} fill="currentColor" strokeWidth={1.5} />
    </Link>
  )}
  <button
  onClick={async (e) => {
  e.stopPropagation();

  await markMessagesRead(request.id);
  setOpenHistoryId(request.id);
}}
className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-[#faf6f5] hover:text-black"
  aria-label="Message artist"
>
  <MessageCircle size={18} strokeWidth={1.7} />
  {unreadCount > 0 && (
  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white">
    {unreadCount}
  </span>
)}
</button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      setRequestHidden(request.id, requestTab === "active");
    }}
    className="rounded-full border border-neutral-200 px-3 py-1 text-[12px] text-neutral-500 transition hover:text-black"
  >
    {requestTab === "active" ? "Hide" : "Unhide"}
  </button>
  <span className="text-[15px] text-neutral-400">
    {expandedRequestId === request.id ? "⌃" : "⌄"}
  </span>
</div>

                </div>
<div
  className={`overflow-hidden transition-all duration-400 ${
    expandedRequestId === request.id
      ? "max-h-[1500px] opacity-100"
      : "max-h-0 opacity-0"
  }`}
>

                {(proposedDate ||
                proposedTime ||
                proposedPrice) && ( 
<div className="mt-6 rounded-[24px] border border-neutral-200 bg-[#fcfbfa] p-5 shadow-[0_10px_30px_rgba(30,25,20,0.04)]">
    <div>
  <p className="text-[12px] uppercase tracking-[0.16em] text-neutral-400">
    Artist Proposal
  </p>
  
</div>

<div className="mt-4 rounded-[20px] border border-neutral-200 bg-white px-6 py-5 shadow-[0_6px_18px_rgba(30,25,20,0.025)]">
<div className="flex items-center justify-between">
    
<div className="flex items-center gap-3">
      <CalendarDays
    size={22}
    strokeWidth={1.7}
    className="text-neutral-500"
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

    <p className="mt-0.5 text-[14px] text-neutral-500">
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
  </div>
</div>

<div className="min-w-[140px] pl-8 text-right">
          <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">
        Estimated Price
      </p>

<p className="mt-1 text-[24px] font-medium tracking-[-0.02em] text-black">
  {proposedPrice ? `$${proposedPrice}` : "—"}
</p>
    </div>
  </div>
</div>

                    {(request.status === "accepted" || request.status === "needs_changes") &&
request.booking_status !== "completed" &&
request.client_status !== "confirmed" &&
request.client_status !== "declined" && (
<div className="mt-5 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-5">
    <button
  onClick={() => {
  if (request.social_link) {
  window.open(request.social_link, "_blank", "noopener,noreferrer");
  return;
}

  alert("This artist has not added a booking link yet. Please message them to confirm.");
}}

className="group rounded-full bg-black px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
Continue to Booking <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span></button>

                      <button
  onClick={() => {
    setSelectedAction({
      ...selectedAction,
      [request.id]: "declined",
    });

    updateClientStatus(request.id, "declined");
  }}
  className="px-2 py-2 text-[13px] text-neutral-500 hover:text-black"
>
  Not Interested
</button>
                    </div>
)}
{request.booking_status === "completed" && (
  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-5">
    <div>
      <p className="text-[13px] font-medium text-neutral-800">
        Your service is complete
      </p>
      <p className="mt-1 text-[12px] text-neutral-500">
        Share your experience to help other Lumina clients.
      </p>
    </div>

    <Link
      href={`/artist/${request.artist_id}?tab=reviews#leave-review`}
      className="group flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Star size={16} fill="currentColor" strokeWidth={1.5} />
      Leave a review
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
    </main>
  );
}
