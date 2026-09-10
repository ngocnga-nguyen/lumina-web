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

  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);

  const loadInbox = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    const requestRows = (data || []) as unknown as RequestRow[];
    const clientNames = new Map<string, string>();

    if (role === "artist") {
      const clientIds = [...new Set(requestRows.map((request) => request.client_id))];
      if (clientIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);

        if (!profilesError) {
          (profiles || []).forEach((profile) => {
            if (profile.full_name) clientNames.set(profile.id, profile.full_name);
          });
        }
      }
    }

    const normalizedRequests = requestRows.map((request) => ({
      ...request,
      participant_name:
        role === "client"
          ? request.artist_name?.trim() || "Lumina professional"
          : clientNames.get(request.client_id) ||
            request.client_name?.trim() ||
            "Lumina client",
      participant_image_url:
        role === "client" ? request.artist_image_url || null : null,
      participant_subtitle:
        role === "client"
          ? request.artist_category?.trim() || "Beauty professional"
          : "Client",
    }));
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

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadInbox(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadInbox]);

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
      if (readError) {
        setError(readError.message);
        await loadInbox();
      }
    },
    [loadInbox, role]
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

    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const channel = supabase
      .channel(`request-inbox-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_updates" },
        (payload) => {
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
        () => void loadInbox()
      );

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInbox, markRead, role, userId]);

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
      await loadInbox();
    },
    [loadInbox, requests, role]
  );

  const removeMessage = useCallback(
    async (messageId: string) => {
      const { error: deleteError } = await deleteRequestMessage(messageId);
      if (deleteError) throw deleteError;
      await loadInbox();
    },
    [loadInbox]
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
    refresh: loadInbox,
  };
}
