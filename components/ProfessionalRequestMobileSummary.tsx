"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import IdentityAvatar from "@/components/IdentityAvatar";
import type { ProfessionalMobileRequestStatus } from "@/lib/professional-request-mobile";

type ProfessionalRequestMobileSummaryProps = {
  requestId: string;
  clientName: string;
  clientImageUrl: string | null;
  serviceSummary: string;
  status: ProfessionalMobileRequestStatus;
  scheduleLabel: string | null;
  priceLabel: string | null;
  latestMessagePreview: string | null;
  unreadCount: number;
  expanded: boolean;
  archived: boolean;
  onExpand: () => void;
  onPrimaryAction: () => void | Promise<void>;
  onArchive: () => void | Promise<void>;
};

const statusToneClasses: Record<
  ProfessionalMobileRequestStatus["tone"],
  string
> = {
  attention: "bg-lumina-attention-soft text-lumina-attention",
  action: "border border-lumina-blush bg-lumina-blush/50 text-lumina-text",
  confirmed: "bg-lumina-success-soft text-lumina-success",
  quiet: "bg-lumina-pearl text-lumina-text-muted",
};

export default function ProfessionalRequestMobileSummary({
  requestId,
  clientName,
  clientImageUrl,
  serviceSummary,
  status,
  scheduleLabel,
  priceLabel,
  latestMessagePreview,
  unreadCount,
  expanded,
  archived,
  onExpand,
  onPrimaryAction,
  onArchive,
}: ProfessionalRequestMobileSummaryProps) {
  const statusToneClass =
    status.label === "New request"
      ? "border border-lumina-blush/45 bg-lumina-surface-soft text-lumina-text-muted"
      : statusToneClasses[status.tone];

  return (
    <div className="lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <IdentityAvatar
            name={clientName}
            imageUrl={clientImageUrl}
            className="flex h-10 w-10 shrink-0 rounded-full bg-lumina-pearl text-[10px] font-medium text-lumina-text"
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-lumina-text">
              {clientName}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-lumina-text-muted">
              {serviceSummary}
            </span>
          </span>
        </div>

        <span
          className={`max-w-[48%] shrink-0 rounded-full px-2.5 py-1 text-right text-[9px] font-medium leading-[1.25] ${statusToneClass}`}
        >
          {status.label}
        </span>
      </div>

      {(scheduleLabel || priceLabel) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-lumina-border/55 pt-2.5 text-[11px]">
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
        {status.action && (!expanded || status.action.kind === "complete") && (
          <button
            type="button"
            onClick={() => void onPrimaryAction()}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-lumina-black px-3.5 text-[10px] font-medium text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 min-[420px]:text-[11px]"
          >
            {status.action.label}
          </button>
        )}

        <Link
          href={`/dashboard/messages?request=${requestId}`}
          className="relative inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border bg-lumina-surface px-2.5 text-[10px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 min-[420px]:px-3 min-[420px]:text-[11px]"
        >
          <MessageCircle size={14} strokeWidth={1.65} aria-hidden="true" />
          Message client
          {unreadCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lumina-black px-1 text-[8px] text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          aria-controls={`professional-request-details-${requestId}`}
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

      {expanded && status.waitingDetail && (
        <p className="mt-2.5 rounded-[12px] bg-lumina-pearl/65 px-3 py-2 text-[10px] leading-4 text-lumina-text-muted">
          {status.waitingDetail}
        </p>
      )}

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
