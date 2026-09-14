"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CLIENT_NOTIFICATION_READ_STATE_EVENT,
  isClientReviewNotification,
  markClientNotificationsRead,
  type ClientNotification,
  type ClientNotificationReadKind,
  type ClientNotificationRequest,
} from "@/lib/client-notifications";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { supabase } from "@/lib/supabase";

export function useClientNotifications(userId: string | null | undefined) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [requestsById, setRequestsById] = useState<
    Record<string, ClientNotificationRequest>
  >({});
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const refreshSequenceRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      refreshSequenceRef.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    const refreshSequence = ++refreshSequenceRef.current;
    const canCommit = () =>
      mountedRef.current && refreshSequence === refreshSequenceRef.current;

    if (!userId) {
      if (canCommit()) {
        setNotifications([]);
        setRequestsById({});
        setError(null);
      }
      return;
    }

    const { data: requests, error: requestsError } = await supabase
      .from("client_requests")
      .select("id, artist_id, artist_name, artist_image_url")
      .eq("client_id", userId)
      .or("client_hidden.eq.false,client_hidden.is.null");

    if (!canCommit()) return;
    if (requestsError) {
      setError(requestsError.message);
      return;
    }

    const visibleRequests = (requests || []) as ClientNotificationRequest[];
    const visibleRequestIds = new Set(visibleRequests.map((request) => request.id));
    const { data, error: notificationsError } = await supabase
      .from("notifications")
      .select("id, user_id, request_id, title, message, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!canCommit()) return;
    if (notificationsError) {
      setError(notificationsError.message);
      return;
    }

    setRequestsById(
      Object.fromEntries(visibleRequests.map((request) => [request.id, request]))
    );
    setNotifications(
      ((data || []) as ClientNotification[]).filter(
        (notification) =>
          !notification.request_id || visibleRequestIds.has(notification.request_id)
      )
    );
    setError(null);
  }, [userId]);

  const refreshSafely = useCallback(() => {
    void refresh().catch((refreshError) => {
      if (!mountedRef.current) return;
      console.log("Client notification refresh failed:", refreshError);
      setError("Notifications could not be refreshed.");
    });
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(refreshSafely, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSafely]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const channel = supabase
      .channel(createRealtimeChannelTopic(`client-notifications-${userId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (active) refreshSafely();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_requests",
          filter: `client_id=eq.${userId}`,
        },
        () => {
          if (active) refreshSafely();
        }
      );

    channel.subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refreshSafely, userId]);

  useEffect(() => {
    if (!userId) return;

    const handleReadStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ notificationIds?: string[] }>).detail;
      const notificationIds = new Set(detail?.notificationIds || []);

      if (notificationIds.size > 0) {
        setNotifications((current) =>
          current.map((notification) =>
            notificationIds.has(notification.id)
              ? { ...notification, is_read: true }
              : notification
          )
        );
      }
      refreshSafely();
    };
    const handleFocus = refreshSafely;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshSafely();
    };

    window.addEventListener(
      CLIENT_NOTIFICATION_READ_STATE_EVENT,
      handleReadStateChange
    );
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener(
        CLIENT_NOTIFICATION_READ_STATE_EVENT,
        handleReadStateChange
      );
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSafely, userId]);

  const acknowledge = useCallback(
    async (input: {
      notificationId?: string;
      notificationIds?: string[];
      requestId?: string;
      kind?: ClientNotificationReadKind;
    }) => {
      const result = await markClientNotificationsRead(input);
      if (result.error) setError(result.error.message);
      return result;
    },
    []
  );

  const clearAll = useCallback(async () => {
    if (!userId) return;
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await refresh();
  }, [refresh, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );
  const reviewUnreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read && isClientReviewNotification(notification)
      ).length,
    [notifications]
  );

  return {
    notifications,
    requestsById,
    unreadCount,
    reviewUnreadCount,
    error,
    acknowledge,
    clearAll,
    refresh,
  };
}
