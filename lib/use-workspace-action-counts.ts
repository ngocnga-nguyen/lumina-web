"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getClientWorkspaceActionCounts,
  getNextRequestStateTransitionAt,
  getProfessionalWorkspaceActionCounts,
  type WorkspaceActionRequest,
} from "@/lib/request-completion";
import { supabase } from "@/lib/supabase";

type WorkspaceRole = "client" | "professional";

const REQUEST_ACTION_COLUMNS =
  "id, status, client_status, booking_status, proposed_date, proposed_time, proposed_price, scheduled_for, expected_end_at, completion_protocol_version, appointment_confirmed_at, appointment_exception_reason, artist_completion_response, client_completion_response" as const;

export function useWorkspaceActionCounts(
  role: WorkspaceRole,
  userId: string | null | undefined
) {
  const [requests, setRequests] = useState<WorkspaceActionRequest[]>([]);
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(
    () => new Set()
  );
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async () => {
    if (!userId) return;

    const requestOwnerColumn = role === "client" ? "client_id" : "artist_id";
    const hiddenColumn = role === "client" ? "client_hidden" : "artist_hidden";
    const requestsQuery = supabase
      .from("client_requests")
      .select(REQUEST_ACTION_COLUMNS)
      .eq(requestOwnerColumn, userId)
      .eq(hiddenColumn, false);

    if (role === "client") {
      const [requestsResult, reviewsResult] = await Promise.all([
        requestsQuery,
        supabase
          .from("reviews")
          .select("request_id")
          .eq("client_id", userId)
          .not("request_id", "is", null),
      ]);

      if (requestsResult.error) {
        console.log("Client workspace action counts failed:", requestsResult.error);
        return;
      }

      setRequests((requestsResult.data || []) as WorkspaceActionRequest[]);
      if (!reviewsResult.error) {
        setReviewedRequestIds(
          new Set(
            (reviewsResult.data || [])
              .map((review) => review.request_id)
              .filter((requestId): requestId is string => Boolean(requestId))
          )
        );
      }
    } else {
      const requestsResult = await requestsQuery;
      if (requestsResult.error) {
        console.log(
          "Professional workspace action counts failed:",
          requestsResult.error
        );
        return;
      }
      setRequests((requestsResult.data || []) as WorkspaceActionRequest[]);
    }

    setNow(new Date());
  }, [role, userId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const ownerColumn = role === "client" ? "client_id" : "artist_id";
    const channel = supabase
      .channel(`workspace-action-counts-${role}-${userId}`)
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

    if (role === "client") {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `client_id=eq.${userId}`,
        },
        () => void refresh()
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, role, userId]);

  useEffect(() => {
    if (!userId) return;

    let timer: number | null = null;
    const scheduleNextTransition = () => {
      if (timer !== null) window.clearTimeout(timer);

      const currentTime = new Date();
      setNow(currentTime);
      const nextTransition = requests
        .map((request) => getNextRequestStateTransitionAt(request, currentTime))
        .filter((value): value is Date => value !== null)
        .sort((first, second) => first.getTime() - second.getTime())[0];

      if (!nextTransition) return;
      const delay = Math.min(
        Math.max(nextTransition.getTime() - currentTime.getTime() + 100, 100),
        2_147_000_000
      );
      timer = window.setTimeout(scheduleNextTransition, delay);
    };

    const refreshOnFocus = () => void refresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    scheduleNextTransition();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refresh, requests, userId]);

  return useMemo(
    () => {
      if (role === "client") {
        return getClientWorkspaceActionCounts(requests, reviewedRequestIds, now);
      }

      return {
        ...getProfessionalWorkspaceActionCounts(requests, now),
        reviews: 0,
      };
    },
    [now, requests, reviewedRequestIds, role]
  );
}
