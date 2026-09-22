"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import ClientOverviewDesktopHome from "@/components/ClientOverviewDesktopHome";
import ClientOverviewMobileHome, {
  type ClientOverviewNextItem,
  type ClientOverviewRequestItem,
} from "@/components/ClientOverviewMobileHome";
import { shouldShowClientWelcome } from "@/lib/client-onboarding";
import { useClientOnboarding } from "@/lib/use-client-onboarding";
import { formatRequestServiceSummary } from "@/lib/request-services";
import {
  getCompletionState,
  getCompletionStateLabel,
  type CompletionResponse,
} from "@/lib/request-completion";
import { supabase } from "@/lib/supabase";

type ClientRequest = {
  id: string;
  artist_id: string;
  artist_name: string | null;
  artist_image_url: string | null;
  service_requested: string | null;
  requested_services?: unknown;
  preferred_date: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  status: string | null;
  client_status: string | null;
  booking_status: string | null;
  scheduled_for: string | null;
  expected_end_at: string | null;
  completion_protocol_version: number | null;
  appointment_confirmed_at: string | null;
  appointment_exception_reason: "client_cancelled" | "no_show" | "did_not_take_place" | "issue" | null;
  artist_completion_response: CompletionResponse | null;
  client_completion_response: CompletionResponse | null;
  client_hidden: boolean | null;
  created_at: string;
};

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return null;
  const [hourValue, minute = "00"] = value.split(":");
  const hour = Number(hourValue);
  if (!Number.isFinite(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.slice(0, 2)} ${period}`;
}

function requestStatus(request: ClientRequest) {
  const completionState = getCompletionState(request);

  if (completionState !== "scheduled") {
    return getCompletionStateLabel(completionState);
  }

  if (request.client_status === "confirmed") return "Confirmed";
  if (
    request.status === "declined" ||
    request.client_status === "declined" ||
    request.booking_status === "client_declined"
  ) {
    return "Declined";
  }
  if (request.status === "accepted" || request.status === "needs_changes") {
    return "Proposal received";
  }
  return "Waiting for professional";
}

export default function ClientOverviewPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [welcomeManuallyOpen, setWelcomeManuallyOpen] = useState(false);
  const clientOnboarding = useClientOnboarding();

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setLoadError(false);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (authError) throw authError;
      if (!user) {
        router.replace("/login?redirect=/client");
        return;
      }

      const [profileResult, requestsResult, savedResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("client_requests")
          .select(
            "id, artist_id, artist_name, artist_image_url, service_requested, requested_services, preferred_date, proposed_date, proposed_time, status, client_status, booking_status, scheduled_for, expected_end_at, completion_protocol_version, appointment_confirmed_at, appointment_exception_reason, artist_completion_response, client_completion_response, client_hidden, created_at"
          )
          .eq("client_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("saved_artists")
          .select("artist_id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      if (requestsResult.error || savedResult.error) {
        setLoadError(true);
      }

      setClientName(
        profileResult.data?.full_name?.trim() ||
          user.user_metadata?.full_name ||
          ""
      );
      setRequests((requestsResult.data || []) as ClientRequest[]);
      setSavedCount(savedResult.count || 0);
      setLoading(false);
    };

    void loadOverview().catch((error) => {
      if (cancelled) return;
      console.log("Client overview load failed:", error);
      setLoadError(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt, router]);

  const activeRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          !request.client_hidden &&
          request.booking_status !== "completed" &&
          request.status !== "declined" &&
          request.client_status !== "declined" &&
          request.booking_status !== "client_declined"
      ),
    [requests]
  );

  const upcomingRequest = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return requests
      .filter((request) => {
        if (
          request.booking_status !== "booked" ||
          request.client_status !== "confirmed"
        ) {
          return false;
        }
        const date = parseDate(request.proposed_date);
        return date ? date.getTime() >= today.getTime() : false;
      })
      .sort(
        (first, second) =>
          (parseDate(first.proposed_date)?.getTime() || 0) -
          (parseDate(second.proposed_date)?.getTime() || 0)
      )[0];
  }, [requests]);

  const recentRequests = requests.filter((request) => !request.client_hidden).slice(0, 3);
  const mobileNextRequest: ClientOverviewNextItem | null = upcomingRequest
    ? {
        id: upcomingRequest.id,
        artistName: upcomingRequest.artist_name || "Lumina professional",
        serviceSummary:
          formatRequestServiceSummary(upcomingRequest) || "Upcoming service",
        dateLabel: formatDate(upcomingRequest.proposed_date),
        timeLabel: formatTime(upcomingRequest.proposed_time),
      }
    : null;
  const mobileRecentRequests: ClientOverviewRequestItem[] = recentRequests.map(
    (request) => ({
      id: request.id,
      artistName: request.artist_name || "Lumina professional",
      artistImageUrl: request.artist_image_url,
      serviceSummary:
        formatRequestServiceSummary(request) || "Service request",
      statusLabel: requestStatus(request),
      dateLabel: formatDate(
        request.scheduled_for ||
          request.proposed_date ||
          request.preferred_date ||
          request.created_at
      ),
    })
  );
  const desktopRecentRequests = mobileRecentRequests.map((request, index) => ({
    ...request,
    dateLabel: formatDate(recentRequests[index].created_at),
  }));
  const showAutomaticWelcome = shouldShowClientWelcome({
    ready: clientOnboarding.ready && !loading && !loadError,
    isClient: clientOnboarding.isClient,
    welcomeDismissed: clientOnboarding.welcomeDismissed,
    requestCount: requests.length,
    savedCount,
  });
  const showWelcome =
    clientOnboarding.isClient &&
    (welcomeManuallyOpen || showAutomaticWelcome);

  const dismissWelcome = async () => {
    setWelcomeManuallyOpen(false);
    await clientOnboarding.dismissWelcome();
  };

  return (
    <ClientWorkspaceShell>
      <div className="bg-lumina-surface text-lumina-text">
        <ClientOverviewMobileHome
          clientName={clientName}
          loading={loading}
          loadError={loadError}
          activeRequestCount={activeRequests.length}
          savedCount={savedCount}
          nextRequest={mobileNextRequest}
          recentRequests={mobileRecentRequests}
          showWelcome={showWelcome}
          welcomeManuallyOpen={welcomeManuallyOpen}
          onOpenWelcome={() => setWelcomeManuallyOpen(true)}
          onDismissWelcome={dismissWelcome}
          onRetry={() => setLoadAttempt((current) => current + 1)}
        />

        <ClientOverviewDesktopHome
          clientName={clientName}
          loading={loading}
          loadError={loadError}
          activeRequestCount={activeRequests.length}
          savedCount={savedCount}
          nextRequest={mobileNextRequest}
          recentRequests={desktopRecentRequests}
          showWelcome={showWelcome}
          onOpenWelcome={() => setWelcomeManuallyOpen(true)}
          onDismissWelcome={dismissWelcome}
          onRetry={() => setLoadAttempt((current) => current + 1)}
        />
      </div>
    </ClientWorkspaceShell>
  );
}
