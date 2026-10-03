"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CLIENT_NOTIFICATION_READ_STATE_EVENT, markNotificationsRead, type ClientNotification, type ClientNotificationRequest } from "@/lib/client-notifications";
import { confirmNotificationRead, preserveNotificationSnapshot } from "@/lib/notification-reconciliation";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";
import { resolveClientIdentity, type ClientIdentityProfile } from "@/lib/client-identity";
import { getReminderNotificationDestination, getProfessionalNotificationDestination } from "@/lib/professional-notifications";

export function useProfessionalNotifications(userId: string | null | undefined) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [requestsById, setRequestsById] = useState<Record<string, ClientNotificationRequest>>({});
  const [error, setError] = useState<string | null>(null);
  const sequenceRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; sequenceRef.current += 1; };
  }, []);

  const refresh = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    const current = () => mountedRef.current && sequence === sequenceRef.current;
    if (!userId) {
      setNotifications([]); setRequestsById({}); setError(null);
      return;
    }
    const { data, error: readError } = await supabase.from("notifications")
      // Optional event metadata must survive a feature rollback. Star also works
      // before migration, when those columns do not exist. The owner filter stays.
      .select("*")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (!current()) return;
    if (readError) { setError(readError.message); return; }
    const notificationRows = (data || []) as unknown as ClientNotification[];
    // Preserve the professional bell's existing history/count semantics, including archived requests.
    setNotifications((current) => preserveNotificationSnapshot(current, notificationRows));
    const ids = [...new Set(notificationRows.flatMap((item) => item.request_id ? [item.request_id as string] : []))];
    if (ids.length === 0) { setRequestsById({}); setError(null); return; }
    const { data: requests, error: requestError } = await supabase.from("client_requests")
      .select("id, client_id, client_name").eq("artist_id", userId).in("id", ids);
    if (!current()) return;
    if (requestError) { setError(requestError.message); return; }
    const clientIds = [...new Set((requests || []).map((request) => request.client_id))];
    const { data: profiles } = clientIds.length ? await loadRelatedClientIdentities(clientIds) : { data: [] };
    if (!current()) return;
    const identities = new Map((profiles || []).map((profile: ClientIdentityProfile) => [profile.id, profile]));
    setRequestsById(Object.fromEntries((requests || []).map((request) => {
      const identity = resolveClientIdentity(request.client_id, identities.get(request.client_id), request.client_name);
      return [request.id, { id: request.id, artist_id: userId, artist_name: identity.name, artist_image_url: identity.avatarUrl }];
    })));
    setError(null);
  }, [userId]);

  const refreshSafely = useCallback(() => {
    const pending = refresh();
    const sequence = sequenceRef.current;
    void pending.catch(() => {
      if (mountedRef.current && sequence === sequenceRef.current) setError("Notifications could not be refreshed.");
    });
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(refreshSafely, 0);
    if (!userId) return () => window.clearTimeout(timer);
    let active = true;
    const channel = supabase.channel(createRealtimeChannelTopic(`professional-notifications-${userId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        if (active) refreshSafely();
      });
    channel.subscribe((status) => { if (active && status === "SUBSCRIBED") refreshSafely(); });
    const readChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; notificationIds?: string[] }>).detail;
      if (detail?.userId !== userId) return;
      const ids = new Set(detail.notificationIds || []);
      setNotifications((current) => current.map((item) => ids.has(item.id) ? { ...item, is_read: true } : item));
      refreshSafely();
    };
    const visible = () => { if (document.visibilityState === "visible") refreshSafely(); };
    window.addEventListener(CLIENT_NOTIFICATION_READ_STATE_EVENT, readChanged);
    window.addEventListener("focus", refreshSafely);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false; sequenceRef.current += 1;
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
      window.removeEventListener(CLIENT_NOTIFICATION_READ_STATE_EVENT, readChanged);
      window.removeEventListener("focus", refreshSafely);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refreshSafely, userId]);

  const acknowledge = useCallback(async (input: { notificationId?: string; notificationIds?: string[] }) => {
    const result = await confirmNotificationRead(() => markNotificationsRead(input), refresh);
    if (result.error && mountedRef.current) setError(result.error.message);
    return result;
  }, [refresh]);
  const markAllAsRead = () => acknowledge({ notificationIds: notifications.filter((item) => !item.is_read).map((item) => item.id) });
  const resolveDestination = async (notification: ClientNotification) => {
    if (notification.event_type === "professional_reminder_due") {
      if (!notification.reminder_id) return getReminderNotificationDestination(null);
      const { data, error } = await supabase.from("artist_client_notes").select("id, client_card_id")
        .eq("id", notification.reminder_id).eq("artist_id", userId).eq("note_type", "reminder").maybeSingle();
      if (error) throw error;
      return getReminderNotificationDestination(data);
    }
    if (!notification.request_id) return "/dashboard/requests";
    // Recheck archive/lifecycle at click time, not from a potentially old dropdown snapshot.
    const { data, error: requestError } = await supabase.from("client_requests")
      .select("id, status, client_status, booking_status, artist_hidden")
      .eq("artist_id", userId).eq("id", notification.request_id).maybeSingle();
    if (requestError) throw requestError;
    const destination = getProfessionalNotificationDestination(notification, data || undefined);
    // A second click on the same event must also clear a subsequently changed view/filter.
    return destination ? `${destination}&opened=${Date.now()}` : null;
  };
  return { notifications, requestsById, error, acknowledge, markAllAsRead, resolveDestination,
    unreadCount: notifications.filter((item) => !item.is_read).length };
}
