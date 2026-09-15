"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  markConversationUpdatesRead,
  markRequestConversationRead,
  type RequestConversationRecord,
  type RequestConversationRole,
  type RequestConversationUpdate,
} from "@/lib/request-conversations";
import {
  deleteRequestMessage,
  sendRequestMessage,
} from "@/lib/request-messaging";
import { supabase } from "@/lib/supabase";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { markClientNotificationsRead } from "@/lib/client-notifications";
import {
  resolveClientIdentity,
  type ClientIdentityProfile,
} from "@/lib/client-identity";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";

const REQUEST_COLUMNS = [
  "id",
  "client_id",
  "artist_id",
  "client_name",
  "artist_name",
  "artist_image_url",
  "artist_category",
  "service_requested",
  "requested_services",
  "status",
  "client_status",
  "booking_status",
  "proposed_date",
  "proposed_time",
  "proposed_price",
  "scheduled_for",
  "expected_end_at",
  "completion_protocol_version",
  "appointment_confirmed_at",
  "appointment_exception_reason",
  "artist_completion_response",
  "client_completion_response",
  "created_at",
  "client_hidden",
  "artist_hidden",
].join(", ");

type RequestRow = Omit<
  RequestConversationRecord,
  "participant_name" | "participant_image_url" | "participant_subtitle"
>;

export function useRequestInbox(role: RequestConversationRole) {
  const [requests, setRequests] = useState<RequestConversationRecord[]>([]);
  const [updatesByRequestId, setUpdatesByRequestId] = useState<
    Record<string, RequestConversationUpdate[]>
  >({});
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdsRef = useRef<Set<string>>(new Set());
  const selectedRequestIdRef = useRef<string | null>(null);
  const loadSequenceRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);

  const loadInbox = useCallback(async () => {
    const loadSequence = ++loadSequenceRef.current;
    const canCommit = () =>
      mountedRef.current && loadSequence === loadSequenceRef.current;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!canCommit()) return;
    if (authError) throw authError;
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const { data, error: requestError } = await supabase
      .from("client_requests")
      .select(REQUEST_COLUMNS)
      .eq(ownerColumn, user.id)
      .order("created_at", { ascending: false });

    if (!canCommit()) return;
    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    const requestRows = (data || []) as unknown as RequestRow[];
    const clientProfiles = new Map<string, ClientIdentityProfile>();
    const artistBusinessNames = new Map<string, string>();

    if (role === "artist") {
      const clientIds = [...new Set(requestRows.map((request) => request.client_id))];
      if (clientIds.length > 0) {
        const { data: profiles, error: profilesError } =
          await loadRelatedClientIdentities(clientIds);

        if (!canCommit()) return;
        if (!profilesError) {
          ((profiles || []) as ClientIdentityProfile[]).forEach((profile) => {
            clientProfiles.set(profile.id, profile);
          });
        }
      }
    } else {
      const artistIds = [...new Set(requestRows.map((request) => request.artist_id))];
      if (artistIds.length > 0) {
        const { data: artists, error: artistsError } = await supabase
          .from("artists")
          .select("id, business_name")
          .in("id", artistIds);

        if (!canCommit()) return;
        if (!artistsError) {
          (artists || []).forEach((artist) => {
            if (artist.business_name) {
              artistBusinessNames.set(artist.id, artist.business_name);
            }
          });
        }
      }
    }

    const normalizedRequests = requestRows.map((request) => {
      const clientIdentity =
        role === "artist"
          ? resolveClientIdentity(
              request.client_id,
              clientProfiles.get(request.client_id),
              request.client_name
            )
          : null;

      return {
        ...request,
        participant_name:
          role === "client"
            ? request.artist_name?.trim() || "Lumina professional"
            : clientIdentity?.name || "Lumina client",
        participant_business_name:
          role === "client"
            ? artistBusinessNames.get(request.artist_id) || null
            : null,
        participant_image_url:
          role === "client"
            ? request.artist_image_url || null
            : clientIdentity?.avatarUrl || null,
        participant_subtitle:
          role === "client"
            ? request.artist_category?.trim() || "Beauty professional"
            : "Client",
      };
    });
    const requestIds = normalizedRequests.map((request) => request.id);
    requestIdsRef.current = new Set(requestIds);
    setRequests(normalizedRequests);

    if (selectedRequestIdRef.current && !requestIdsRef.current.has(selectedRequestIdRef.current)) {
      setSelectedRequestId(null);
    }

    if (requestIds.length === 0) {
      setUpdatesByRequestId({});
      setError(null);
      setLoading(false);
      return;
    }

    const { data: updates, error: updatesError } = await supabase
      .from("request_updates")
      .select("*")
      .in("request_id", requestIds)
      .order("created_at", { ascending: true });

    if (!canCommit()) return;
    if (updatesError) {
      setError(updatesError.message);
      setLoading(false);
      return;
    }

    const groupedUpdates: Record<string, RequestConversationUpdate[]> = {};
    requestIds.forEach((requestId) => {
      groupedUpdates[requestId] = [];
    });
    ((updates || []) as RequestConversationUpdate[]).forEach((update) => {
      groupedUpdates[update.request_id]?.push(update);
    });

    setUpdatesByRequestId(groupedUpdates);
    setError(null);
    setLoading(false);
  }, [role]);

  const loadInboxSafely = useCallback(async () => {
    const expectedLoadSequence = loadSequenceRef.current + 1;
    try {
      await loadInbox();
    } catch (loadError) {
      if (
        !mountedRef.current ||
        expectedLoadSequence !== loadSequenceRef.current
      ) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "This conversation list could not be loaded."
      );
      setLoading(false);
    }
  }, [loadInbox]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadInboxSafely(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadInboxSafely]);

  useEffect(() => {
    const handleFocus = () => void loadInboxSafely();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadInboxSafely();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadInboxSafely]);

  const markRead = useCallback(
    async (requestId: string) => {
      if (!requestIdsRef.current.has(requestId)) return;

      setUpdatesByRequestId((current) => ({
        ...current,
        [requestId]: markConversationUpdatesRead(
          current[requestId] || [],
          role
        ),
      }));

      const { error: readError } = await markRequestConversationRead(
        requestId,
        role
      );
      const notificationResult =
        role === "client"
          ? await markClientNotificationsRead({
              requestId,
              kind: "message",
            })
          : { error: null };
      if (readError || notificationResult.error) {
        setError(readError?.message || notificationResult.error?.message || null);
        await loadInboxSafely();
      }
    },
    [loadInboxSafely, role]
  );

  const openConversation = useCallback(
    (requestId: string) => {
      if (!requestIdsRef.current.has(requestId)) return;
      setSelectedRequestId(requestId);
      void markRead(requestId);
    },
    [markRead]
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const channel = supabase
      .channel(createRealtimeChannelTopic(`request-inbox-${role}-${userId}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_updates" },
        (payload) => {
          if (cancelled) return;
          const nextUpdate = payload.new as RequestConversationUpdate;
          const previousUpdate = payload.old as Partial<RequestConversationUpdate>;
          const requestId = nextUpdate.request_id || previousUpdate.request_id;
          if (!requestId || !requestIdsRef.current.has(requestId)) return;

          setUpdatesByRequestId((current) => {
            const existing = current[requestId] || [];
            const updateId = nextUpdate.id || previousUpdate.id;
            const foundIndex = existing.findIndex((update) => update.id === updateId);
            let next = existing;

            if (payload.eventType === "DELETE") {
              next = existing.filter((update) => update.id !== updateId);
            } else if (foundIndex >= 0) {
              next = existing.map((update, index) =>
                index === foundIndex ? { ...update, ...nextUpdate } : update
              );
            } else {
              next = [...existing, nextUpdate].sort(
                (first, second) =>
                  new Date(first.created_at).getTime() -
                  new Date(second.created_at).getTime()
              );
            }

            return { ...current, [requestId]: next };
          });

          if (
            payload.eventType === "INSERT" &&
            selectedRequestIdRef.current === requestId &&
            nextUpdate.sender_type !== role
          ) {
            void markRead(requestId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_requests",
          filter: `${ownerColumn}=eq.${userId}`,
        },
        () => {
          if (!cancelled) void loadInboxSafely();
        }
      );

    channel.subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [loadInboxSafely, markRead, role, userId]);

  const sendMessage = useCallback(
    async (requestId: string, message: string, image: File | null) => {
      const request = requests.find((candidate) => candidate.id === requestId);
      if (!request) throw new Error("This request conversation is unavailable.");

      await sendRequestMessage({
        requestId,
        senderRole: role,
        recipientId: role === "client" ? request.artist_id : request.client_id,
        message: message.trim(),
        image,
      });
      await loadInboxSafely();
    },
    [loadInboxSafely, requests, role]
  );

  const removeMessage = useCallback(
    async (messageId: string) => {
      const { error: deleteError } = await deleteRequestMessage(messageId);
      if (deleteError) throw deleteError;
      await loadInboxSafely();
    },
    [loadInboxSafely]
  );

  return {
    requests,
    updatesByRequestId,
    selectedRequestId,
    setSelectedRequestId,
    openConversation,
    markRead,
    sendMessage,
    removeMessage,
    loading,
    error,
    refresh: loadInboxSafely,
  };
}
