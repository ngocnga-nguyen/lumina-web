"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Heart,
  Search,
} from "lucide-react";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import ClientOnboardingWelcome from "@/components/ClientOnboardingWelcome";
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

        <div className="hidden lg:block">
        <section className="mx-auto max-w-[1240px] px-5 py-10 md:px-10 md:py-14">
          <div className="max-w-[760px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
              Your Lumina
            </p>
            <h1
              className="mt-3 text-[42px] font-semibold leading-[1.02] md:text-[56px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              {clientName ? `Welcome, ${clientName.split(" ")[0]}.` : "Welcome back."}
            </h1>
            <p className="mt-4 max-w-[620px] text-[16px] leading-[1.6] text-lumina-text-muted">
              Keep up with your requests and return to the professionals you are considering.
            </p>
            {!showWelcome && (
              <button
                type="button"
                onClick={() => setWelcomeManuallyOpen(true)}
                className="mt-4 text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-black"
              >
                How Lumina works
              </button>
            )}
          </div>

          {showWelcome && (
            <ClientOnboardingWelcome onDismiss={dismissWelcome} />
          )}

          {loadError && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-lumina-border bg-lumina-surface px-5 py-4 text-[13px] text-lumina-text-muted">
              <span>Some account details could not be loaded.</span>
              <button
                type="button"
                onClick={() => setLoadAttempt((current) => current + 1)}
                className="min-h-10 rounded-full border border-lumina-border px-4 font-medium text-lumina-text"
              >
                Try again
              </button>
            </div>
          )}

          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/my-requests"
              className="rounded-[22px] border border-lumina-border bg-lumina-surface p-5 transition hover:border-lumina-text-muted/40"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lumina-pearl text-lumina-text">
                  <Clock3 size={18} strokeWidth={1.6} />
                </span>
                <ArrowRight size={17} strokeWidth={1.6} className="text-lumina-text-muted" />
              </div>
              <p className="mt-6 text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                Active requests
              </p>
              <p className="mt-1 text-[28px] font-medium">
                {loading ? "—" : activeRequests.length}
              </p>
            </Link>

            <Link
              href="/saved"
              className="rounded-[22px] border border-lumina-border bg-lumina-surface p-5 transition hover:border-lumina-text-muted/40"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lumina-pearl text-lumina-text">
                  <Heart size={18} strokeWidth={1.6} />
                </span>
                <ArrowRight size={17} strokeWidth={1.6} className="text-lumina-text-muted" />
              </div>
              <p className="mt-6 text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                Saved professionals
              </p>
              <p className="mt-1 text-[28px] font-medium">
                {loading ? "—" : savedCount}
              </p>
            </Link>

            <Link
              href="/browse"
              className="rounded-[22px] border border-lumina-border bg-lumina-black p-5 text-white transition hover:bg-lumina-text sm:col-span-2 xl:col-span-1"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lumina-surface/12">
                  <Search size={18} strokeWidth={1.6} />
                </span>
                <ArrowRight size={17} strokeWidth={1.6} className="text-white/70" />
              </div>
              <p className="mt-6 text-[12px] uppercase tracking-[0.14em] text-white/55">
                Discover
              </p>
              <p className="mt-1 text-[18px] font-medium">Browse professionals</p>
            </Link>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <section className="rounded-[24px] border border-lumina-border bg-lumina-surface p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
                    Recent activity
                  </p>
                  <h2
                    className="mt-2 text-[28px] font-semibold"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    Your requests
                  </h2>
                </div>
                <Link href="/my-requests" className="text-[13px] text-lumina-text-muted hover:text-lumina-black">
                  View all
                </Link>
              </div>

              <div className="mt-5 divide-y divide-lumina-border">
                {loading ? (
                  <p className="py-6 text-[14px] text-lumina-text-muted">Loading your activity…</p>
                ) : recentRequests.length === 0 ? (
                  <div className="py-8">
                    <p className="text-[15px] font-medium">No requests yet.</p>
                    <p className="mt-2 text-[13px] leading-[1.6] text-lumina-text-muted">
                      Browse Lumina and choose services from a professional when you are ready.
                    </p>
                  </div>
                ) : (
                  recentRequests.map((request) => (
                    <Link
                      key={request.id}
                      href="/my-requests"
                      className="flex items-center gap-4 py-4 first:pt-1"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[13px] font-medium">
                        {request.artist_image_url ? (
                          <img
                            src={request.artist_image_url}
                            alt={request.artist_name || "Professional"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (request.artist_name || "P").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">
                          {request.artist_name || "Lumina professional"}
                        </p>
                        <p className="mt-1 truncate text-[12px] text-lumina-text-muted">
                          {formatRequestServiceSummary(request) || "Service request"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-lumina-text-muted">
                          {formatDate(request.created_at)}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-lumina-text-muted">
                          {requestStatus(request)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section
              className={`rounded-[24px] border border-lumina-glass-border bg-lumina-surface/80 p-5 backdrop-blur-[10px] md:p-6 ${
                upcomingRequest ? "ring-1 ring-lumina-blush/70" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lumina-blush text-lumina-text">
                <CalendarDays size={18} strokeWidth={1.6} />
              </div>
              <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
                Next confirmed request
              </p>
              {loading ? (
                <p className="mt-3 text-[14px] text-lumina-text-muted">Loading…</p>
              ) : upcomingRequest ? (
                <>
                  <h2
                    className="mt-3 text-[25px] font-semibold leading-tight"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {formatRequestServiceSummary(upcomingRequest) || "Upcoming service"}
                  </h2>
                  <p className="mt-3 text-[14px] text-lumina-text">
                    {upcomingRequest.artist_name || "Lumina professional"}
                  </p>
                  <p className="mt-2 text-[13px] text-lumina-text-muted">
                    {formatDate(upcomingRequest.proposed_date)}
                    {upcomingRequest.proposed_time
                      ? ` · ${formatTime(upcomingRequest.proposed_time)}`
                      : ""}
                  </p>
                  <Link
                    href="/my-requests"
                    className="mt-6 inline-flex rounded-full bg-lumina-black px-5 py-2.5 text-[13px] text-white transition hover:opacity-80"
                  >
                    View request
                  </Link>
                </>
              ) : (
                <>
                  <h2
                    className="mt-3 text-[25px] font-semibold leading-tight"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    Nothing confirmed yet.
                  </h2>
                  <p className="mt-3 text-[13px] leading-[1.6] text-lumina-text-muted">
                    Confirmed professional proposals will appear here when a date is set.
                  </p>
                </>
              )}
            </section>
          </div>
        </section>
        </div>
      </div>
    </ClientWorkspaceShell>
  );
}
