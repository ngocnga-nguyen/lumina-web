"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Heart, Search, Star } from "lucide-react";
import ClientOnboardingWelcome from "@/components/ClientOnboardingWelcome";
import { useClientWorkspace } from "@/components/ClientWorkspaceContext";
import { getClientFirstName } from "@/lib/client-overview-name";
import type {
  ClientOverviewNextItem,
  ClientOverviewRequestItem,
} from "@/components/ClientOverviewMobileHome";

type Props = {
  clientName: string;
  loading: boolean;
  loadError: boolean;
  activeRequestCount: number;
  savedCount: number;
  nextRequest: ClientOverviewNextItem | null;
  recentRequests: ClientOverviewRequestItem[];
  showWelcome: boolean;
  onOpenWelcome: () => void;
  onDismissWelcome: () => Promise<unknown> | void;
  onRetry: () => void;
};

export default function ClientOverviewDesktopHome({
  clientName,
  loading,
  loadError,
  activeRequestCount,
  savedCount,
  nextRequest,
  recentRequests,
  showWelcome,
  onOpenWelcome,
  onDismissWelcome,
  onRetry,
}: Props) {
  const { reviewReadyCount } = useClientWorkspace();
  const firstName = getClientFirstName(clientName);
  const metrics = [
    { label: "Active requests", value: activeRequestCount, href: "/my-requests", icon: Clock3 },
    { label: "Saved professionals", value: savedCount, href: "/saved", icon: Heart },
    { label: "Review ready", value: reviewReadyCount, href: "/client/reviews", icon: Star },
  ];

  return (
    <section className="mx-auto hidden max-w-[1240px] px-6 py-8 lg:block xl:px-10 xl:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-lumina-border/70 pb-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Your Lumina
          </p>
          <h1
            className="mt-1.5 font-serif text-[34px] font-semibold leading-[1.1] text-lumina-text xl:text-[38px]"
          >
            {firstName ? `Welcome, ${firstName}.` : "Welcome back."}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-lumina-text-muted">
            Keep up with your appointments and the professionals you love.
          </p>
        </div>
        {!showWelcome && (
          <button
            type="button"
            onClick={onOpenWelcome}
            className="inline-flex min-h-10 items-center text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black"
          >
            How Lumina works
          </button>
        )}
      </header>

      {showWelcome && <ClientOnboardingWelcome onDismiss={onDismissWelcome} />}

      {loadError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-lumina-border bg-lumina-surface px-5 py-3.5 text-[13px] text-lumina-text-muted">
          <span>Some account details could not be loaded.</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-full border border-lumina-border px-4 font-medium text-lumina-text"
          >
            Try again
          </button>
        </div>
      )}

      <section className="mt-7" aria-labelledby="desktop-client-next-up">
        <p
          id="desktop-client-next-up"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted"
        >
          Next up
        </p>
        {loading ? (
          <div className="mt-3 h-[132px] animate-pulse rounded-[18px] bg-lumina-pearl/65" />
        ) : nextRequest ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[20px] bg-lumina-black px-6 py-5 text-white xl:px-7 xl:py-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12">
              <CalendarDays size={19} strokeWidth={1.65} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                Confirmed appointment
              </p>
              <h2 className="mt-1 font-serif text-[23px] leading-tight xl:text-[26px]">
                {nextRequest.serviceSummary}
              </h2>
              <p className="mt-1.5 text-[13px] text-white/80">
                {nextRequest.artistName}
                {(nextRequest.dateLabel || nextRequest.timeLabel) && (
                  <span className="text-white/65">
                    {" · "}{[nextRequest.dateLabel, nextRequest.timeLabel].filter(Boolean).join(" · ")}
                  </span>
                )}
              </p>
            </div>
            <Link
              href={`/my-requests?request=${nextRequest.id}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/30 px-4 text-[12px] font-medium text-white transition hover:bg-white hover:text-lumina-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              View request <ArrowRight size={14} strokeWidth={1.65} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex min-h-14 items-center gap-3 border-y border-lumina-border/70 py-3 text-[13px] text-lumina-text-muted">
            <CalendarDays size={17} strokeWidth={1.65} aria-hidden="true" />
            <span>Nothing confirmed yet</span>
          </div>
        )}
      </section>

      <section className="mt-7" aria-label="Client activity summary">
        <div className="grid grid-cols-3 divide-x divide-lumina-border/70 border-y border-lumina-border/70">
          {metrics.map(({ label, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[88px] min-w-0 items-center gap-3 px-4 py-4 transition hover:bg-lumina-surface-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black xl:gap-4 xl:px-6"
            >
              <Icon size={18} strokeWidth={1.6} className="shrink-0 text-lumina-text-muted" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[23px] font-medium leading-none text-lumina-text">
                  {loading ? "—" : value}
                </span>
                <span className="mt-1 block text-[11px] leading-tight text-lumina-text-muted xl:text-[12px]">
                  {label}
                </span>
              </span>
              <ArrowRight size={14} strokeWidth={1.6} className="ml-auto hidden shrink-0 text-lumina-text-muted/65 transition group-hover:translate-x-0.5 xl:block" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="desktop-client-recent-requests">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
              Recent activity
            </p>
            <h2 id="desktop-client-recent-requests" className="mt-1 font-serif text-[25px] leading-tight text-lumina-text">
              Recent requests
            </h2>
          </div>
          <Link href="/my-requests" className="inline-flex min-h-10 items-center text-[12px] text-lumina-text-muted transition hover:text-lumina-text">
            View all
          </Link>
        </div>
        <div className="mt-3 divide-y divide-lumina-border/70 border-y border-lumina-border/70">
          {loading ? (
            <p className="py-5 text-[13px] text-lumina-text-muted">Loading your activity…</p>
          ) : recentRequests.length === 0 ? (
            <p className="py-5 text-[13px] text-lumina-text-muted">Your recent requests will appear here.</p>
          ) : (
            recentRequests.map((request) => (
              <Link
                key={request.id}
                href={`/my-requests?request=${request.id}`}
                className="group flex min-h-[68px] items-center gap-3 py-3 transition hover:bg-lumina-surface-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[12px] font-medium text-lumina-text">
                  {request.artistImageUrl ? (
                    <img src={request.artistImageUrl} alt={request.artistName} className="h-full w-full object-cover" />
                  ) : (
                    request.artistName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-lumina-text">{request.artistName}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-lumina-text-muted">{request.serviceSummary}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-lumina-text-muted">
                  <span className="block">{request.statusLabel}</span>
                  <span className="mt-0.5 block">{request.dateLabel}</span>
                </span>
                <ArrowRight size={15} strokeWidth={1.6} className="hidden shrink-0 text-lumina-text-muted/65 transition group-hover:translate-x-0.5 xl:block" aria-hidden="true" />
              </Link>
            ))
          )}
        </div>
      </section>

      <Link
        href="/browse"
        className="mt-5 inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-lumina-text transition hover:text-lumina-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black"
      >
        <Search size={16} strokeWidth={1.65} aria-hidden="true" />
        Browse professionals
        <ArrowRight size={15} strokeWidth={1.65} aria-hidden="true" />
      </Link>
    </section>
  );
}
