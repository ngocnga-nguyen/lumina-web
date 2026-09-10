"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REQUEST_MESSAGE_READ_STATE_EVENT,
  type RequestConversationRole,
} from "@/lib/request-conversations";
import { applyDatabaseConfirmedReadCount } from "@/lib/message-unread";
import { supabase } from "@/lib/supabase";

export function useWorkspaceMessageUnreadCount(
  role: RequestConversationRole,
  userId: string | null | undefined
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const visibleRequestIdsRef = useRef<Set<string>>(new Set());
  const refreshSequenceRef = useRef(0);

  const refresh = useCallback(async () => {
    const refreshSequence = ++refreshSequenceRef.current;
    if (!userId) {
      visibleRequestIdsRef.current = new Set();
      setUnreadCount(0);
      return;
    }

    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const hiddenColumn = role === "client" ? "client_hidden" : "artist_hidden";
    const { data: visibleRequests, error: requestsError } = await supabase
      .from("client_requests")
      .select("id")
      .eq(ownerColumn, userId)
      .or(`${hiddenColumn}.eq.false,${hiddenColumn}.is.null`);

    if (requestsError) {
      console.log("Workspace message request lookup failed:", requestsError);
      return;
    }
    if (refreshSequence !== refreshSequenceRef.current) return;

    const requestIds = (visibleRequests || []).map((request) => request.id);
    visibleRequestIdsRef.current = new Set(requestIds);
    if (requestIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    const readColumn =
      role === "client" ? "is_read_by_client" : "is_read_by_artist";
    const { count, error: countError } = await supabase
      .from("request_updates")
      .select("id", { count: "exact", head: true })
      .in("request_id", requestIds)
      .neq("sender_type", role)
      .eq(readColumn, false)
      .or("is_deleted.eq.false,is_deleted.is.null");

    if (countError) {
      console.log("Workspace message unread count failed:", countError);
      return;
    }
    if (refreshSequence !== refreshSequenceRef.current) return;

    setUnreadCount(count || 0);
  }, [role, userId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const channel = supabase
      .channel(`workspace-message-unread-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_updates" },
        (payload) => {
          const newRow = payload.new as {
            request_id?: string;
            sender_type?: string;
          };
          const oldRow = payload.old as {
            request_id?: string;
            sender_type?: string;
          };
          const row = newRow.request_id ? newRow : oldRow;
          if (
            !row.request_id ||
            row.sender_type === role ||
            !visibleRequestIdsRef.current.has(row.request_id)
          ) {
            return;
          }
          void refresh();
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
        () => void refresh()
      );

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, role, userId]);

  useEffect(() => {
    if (!userId) return;

    const refreshOnReadStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        requestId?: string;
        role?: RequestConversationRole;
        markedReadCount?: number;
      }>).detail;

      if (
        detail?.role === role &&
        detail.requestId &&
        visibleRequestIdsRef.current.has(detail.requestId) &&
        (detail.markedReadCount || 0) > 0
      ) {
        setUnreadCount((current) =>
          applyDatabaseConfirmedReadCount(current, detail.markedReadCount || 0)
        );
      }
      void refresh();
    };
    const refreshOnFocus = () => void refresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener(
      REQUEST_MESSAGE_READ_STATE_EVENT,
      refreshOnReadStateChange
    );
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      window.removeEventListener(
        REQUEST_MESSAGE_READ_STATE_EVENT,
        refreshOnReadStateChange
      );
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refresh, role, userId]);

  return unreadCount;
}
