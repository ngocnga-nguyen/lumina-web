"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Heart,
  Search,
  Star,
} from "lucide-react";
import ClientOnboardingWelcome from "@/components/ClientOnboardingWelcome";
import { useClientWorkspace } from "@/components/ClientWorkspaceContext";

export type ClientOverviewRequestItem = {
  id: string;
  artistName: string;
  artistImageUrl: string | null;
  serviceSummary: string;
  statusLabel: string;
  dateLabel: string | null;
};

export type ClientOverviewNextItem = {
  artistName: string;
  serviceSummary: string;
  dateLabel: string | null;
  timeLabel: string | null;
};

type ClientOverviewMobileHomeProps = {
  clientName: string;
  loading: boolean;
  loadError: boolean;
  activeRequestCount: number;
  savedCount: number;
  nextRequest: ClientOverviewNextItem | null;
  recentRequests: ClientOverviewRequestItem[];
  showWelcome: boolean;
  welcomeManuallyOpen: boolean;
  onOpenWelcome: () => void;
  onDismissWelcome: () => Promise<unknown> | void;
  onRetry: () => void;
};

export default function ClientOverviewMobileHome({
  clientName,
  loading,
  loadError,
  activeRequestCount,
  savedCount,
  nextRequest,
  recentRequests,
  showWelcome,
  welcomeManuallyOpen,
  onOpenWelcome,
  onDismissWelcome,
  onRetry,
}: ClientOverviewMobileHomeProps) {
  const { reviewReadyCount } = useClientWorkspace();
  const firstName = clientName.trim().split(/s+/)[0];
  const metrics = [
    {
      label: "Active",
      supportingLabel: "requests",
      value: activeRequestCount,
      href: "/my-requests",
      icon: Clock3,
    },
    {
      label: "Saved",
      supportingLabel: "professionals",
      value: savedCount,
      href: "/saved",
      icon: Heart,
    },
    {
      label: "Review",
      supportingLabel: "ready",
      value: reviewReadyCount,
      href: "/my-requests",
      icon: Star,
    },
  ];

  return (
    <section className="px-3 py-5 md:px-8 md:py-8 lg:hidden">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
          Your Lumina
        </p>
        <h1
          className="mt-0.5 text-[26px] font-semibold leading-[1.08] text-lumina-text min-[410px]:text-[28px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {firstName ? `Welcome, ${firstName}.` : "Welcome back."}
        </h1>
        <p className="mt-1 text-[13px] leading-[1.45] text-lumina-text-muted">
          Keep up with your appointments and the professionals you love.
        </p>
        {!showWelcome && (
          <button
            type="button"
            onClick={onOpenWelcome}
            className="mt-1.5 inline-flex min-h-8 items-center text-[10px] text-lumina-text-muted/85 underline decoration-lumina-border/70 underline-offset-4 transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            How Lumina works
          </button>
        )}
      </header>

      {showWelcome && (
        <ClientOnboardingWelcome
          onDismiss={onDismissWelcome}
          variant="mobile-compact"
          initiallyExpanded={welcomeManuallyOpen}
        />
      )}

      {loadError && (
        <div className="mt-4 flex min-h-11 items-center justify-between gap-3 border-y border-lumina-border/70 py-2 text-[11px] text-lumina-text-muted">
          <span>Some account details could not be loaded.</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-9 shrink-0 rounded-full border border-lumina-border px-3 font-medium text-lumina-text"
          >
            Try again
          </button>
        </div>
      )}

      <section className="mt-5" aria-labelledby="client-next-up">
        <p
          id="client-next-up"
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted"
        >
          Next up
        </p>
        {loading ? (
          <div className="mt-2 h-[76px] animate-pulse rounded-[16px] bg-lumina-pearl/65" />
        ) : nextRequest ? (
          <div className="mt-2 rounded-[18px] bg-lumina-black px-3.5 py-3 text-white min-[410px]:px-4 min-[410px]:py-3.5">
            <div className="flex items-start gap-2.5 min-[410px]:gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12">
                <CalendarDays size={16} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/55">
                  Confirmed appointment
                </p>
                <h2
                  className="mt-1 truncate text-[18px] font-medium leading-tight"
                  style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                >
                  {nextRequest.serviceSummary}
                </h2>
                <p className="mt-1 text-[12px] text-white/78">
                  {nextRequest.artistName}
                </p>
                {(nextRequest.dateLabel || nextRequest.timeLabel) && (
                  <p className="mt-2 text-[11px] text-white/65">
                    {[nextRequest.dateLabel, nextRequest.timeLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <Link
                href="/my-requests"
                className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/18 px-3 text-[11px] font-medium text-white transition hover:bg-white hover:text-lumina-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                View request
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex min-h-12 items-center gap-2.5 border-y border-lumina-border/70 py-2 text-lumina-text-muted">
            <CalendarDays size={16} strokeWidth={1.65} aria-hidden="true" />
            <p className="text-[12px]">Nothing confirmed yet</p>
          </div>
        )}
      </section>

      <section className="mt-5" aria-label="Client activity summary">
        <div className="grid grid-cols-3 divide-x divide-lumina-border/70 border-y border-lumina-border/70">
          {metrics.map(({ label, supportingLabel, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[66px] flex-col items-center justify-center px-1.5 py-2 text-center transition hover:bg-lumina-surface-soft/70 active:bg-lumina-pearl/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
            >
              <span className="flex items-center gap-1.5">
                <Icon
                  size={13}
                  strokeWidth={1.65}
                  className="text-lumina-text-muted"
                  aria-hidden="true"
                />
                <span className="text-[17px] font-medium leading-none text-lumina-text">
                  {loading ? "—" : value}
                </span>
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-lumina-text-muted">
                {label}
              </span>
              <span className="mt-0.5 text-[9px] leading-none text-lumina-text-muted">
                {supportingLabel}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5" aria-labelledby="client-recent-requests">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="client-recent-requests"
            className="text-[19px] leading-tight text-lumina-text"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Recent requests
          </h2>
          <Link
            href="/my-requests"
            className="min-h-9 py-2 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text"
          >
            View all
          </Link>
        </div>

        <div className="mt-1 divide-y divide-lumina-border/70">
          {loading ? (
            <p className="py-5 text-[12px] text-lumina-text-muted">
              Loading your requests…
            </p>
          ) : recentRequests.length === 0 ? (
            <p className="py-4 text-[12px] text-lumina-text-muted">
              Your recent requests will appear here.
            </p>
          ) : (
            recentRequests.map((request) => (
              <Link
                key={request.id}
                href="/my-requests"
                className="group flex min-h-[58px] items-center gap-2.5 py-2.5 transition hover:bg-lumina-surface-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[11px] font-medium text-lumina-text">
                  {request.artistImageUrl ? (
                    <img
                      src={request.artistImageUrl}
                      alt={request.artistName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    request.artistName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-lumina-text">
                    {request.artistName}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-lumina-text-muted">
                    {request.serviceSummary}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[10px] font-medium text-lumina-text">
                    {request.statusLabel}
                  </span>
                  {request.dateLabel && (
                    <span className="mt-0.5 block text-[9px] text-lumina-text-muted">
                      {request.dateLabel}
                    </span>
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 border-t border-lumina-border/70 pt-3">
        <Link
          href="/browse"
          className="group inline-flex min-h-10 items-center gap-2 text-[12px] font-medium text-lumina-text transition hover:text-lumina-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
        >
          <Search size={15} strokeWidth={1.65} aria-hidden="true" />
          Browse professionals
          <ArrowRight
            size={13}
            strokeWidth={1.7}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </section>
    </section>
  );
}
