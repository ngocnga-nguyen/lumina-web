"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import type { ClientRequestActionState } from "@/lib/request-completion";
import type { ClientMobileRequestStatus } from "@/lib/client-request-mobile";

type ClientRequestMobileSummaryProps = {
  requestId: string;
  artistName: string;
  artistImageUrl: string | null;
  artistHref: string;
  serviceSummary: string;
  status: ClientMobileRequestStatus;
  scheduleLabel: string | null;
  priceLabel: string | null;
  latestMessagePreview: string | null;
  unreadCount: number;
  action: ClientRequestActionState | null;
  reviewHref: string;
  expanded: boolean;
  archived: boolean;
  onExpand: () => void;
  onMessage: () => void | Promise<void>;
  onArchive: () => void | Promise<void>;
};

const statusToneClasses: Record<
  ClientMobileRequestStatus["tone"],
  string
> = {
  attention: "bg-lumina-attention-soft text-lumina-attention",
  action: "border border-lumina-blush bg-lumina-blush/55 text-lumina-text",
  review: "border border-lumina-blush bg-lumina-blush/55 text-lumina-text",
  confirmed: "bg-lumina-success-soft text-lumina-success",
  quiet: "bg-lumina-pearl text-lumina-text-muted",
};

export default function ClientRequestMobileSummary({
  requestId,
  artistName,
  artistImageUrl,
  artistHref,
  serviceSummary,
  status,
  scheduleLabel,
  priceLabel,
  latestMessagePreview,
  unreadCount,
  action,
  reviewHref,
  expanded,
  archived,
  onExpand,
  onMessage,
  onArchive,
}: ClientRequestMobileSummaryProps) {
  const initials = artistName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const actionControl = !expanded && action ? (
    action.key === "review_ready" ? (
      <Link
        href={reviewHref}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-lumina-black px-3 text-[10px] font-medium text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
      >
        {action.cta}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={expanded}
        aria-controls={`request-details-${requestId}`}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-lumina-black px-3 text-[10px] font-medium text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
      >
        {action.cta}
      </button>
    )
  ) : null;

  return (
    <div className="lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={artistHref}
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[10px] font-medium text-lumina-text">
            {artistImageUrl ? (
              <img
                src={artistImageUrl}
                alt={artistName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials || "L"
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-lumina-text">
              {artistName}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-lumina-text-muted">
              {serviceSummary}
            </span>
          </span>
        </Link>

        <span
          className={`max-w-[47%] shrink-0 rounded-full px-2.5 py-1 text-right text-[9px] font-medium leading-[1.25] ${statusToneClasses[status.tone]}`}
        >
          {status.label}
        </span>
      </div>

      {(scheduleLabel || priceLabel) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-lumina-border/60 pt-2.5 text-[11px]">
          {scheduleLabel ? (
            <span className="flex min-w-0 items-center gap-1.5 text-lumina-text-muted">
              <CalendarDays size={13} strokeWidth={1.65} aria-hidden="true" />
              <span className="truncate">{scheduleLabel}</span>
            </span>
          ) : (
            <span />
          )}
          {priceLabel && (
            <span className="shrink-0 font-medium text-lumina-text">
              {priceLabel}
            </span>
          )}
        </div>
      )}

      {latestMessagePreview && (
        <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[10px] text-lumina-text-muted">
          <MessageCircle size={12} strokeWidth={1.65} aria-hidden="true" />
          <span className="truncate">{latestMessagePreview}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {actionControl}
        <button
          type="button"
          onClick={() => void onMessage()}
          className="relative inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-2.5 text-[10px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 min-[420px]:px-3 min-[420px]:text-[11px]"
        >
          <MessageCircle size={14} strokeWidth={1.65} aria-hidden="true" />
          Message artist
          {unreadCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lumina-black px-1 text-[8px] text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls={`request-details-${requestId}`}
          aria-label={expanded ? "Close request details" : "View request details"}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center gap-1 rounded-full text-[10px] font-medium text-lumina-text-muted transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 min-[420px]:w-auto min-[420px]:px-2"
        >
          <span className="hidden min-[420px]:inline">
            {expanded ? "Close" : "View details"}
          </span>
          {expanded ? (
            <ChevronUp size={14} strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} strokeWidth={1.7} aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={() => void onArchive()}
            className="min-h-9 px-2 text-[10px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            {archived ? "Restore" : "Archive"}
          </button>
        </div>
      )}
    </div>
  );
}
