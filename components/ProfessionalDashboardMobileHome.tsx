"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import WorkspaceNavigationIndicator, {
  getWorkspaceIndicatorLabel,
} from "@/components/WorkspaceNavigationIndicator";
import { useProfessionalWorkspace } from "@/components/ProfessionalWorkspaceContext";
import { getProfessionalWorkspaceNavigation } from "@/lib/workspace-navigation";

type ProfessionalDashboardMobileSummaryProps = {
  profileStatus: string | null;
  profileIsActive: boolean;
  onEditAvatar: () => void;
};

type ProfessionalDashboardMobileWorkspaceProps = {
  serviceCount: number;
  portfolioEntryCount: number;
};

const shortcutOrder = [
  "requests",
  "messages",
  "clients",
  "services",
  "portfolio",
  "reviews",
  "settings",
] as const;

export function ProfessionalDashboardMobileSummary({
  profileStatus,
  profileIsActive,
  onEditAvatar,
}: ProfessionalDashboardMobileSummaryProps) {
  const { professional } = useProfessionalWorkspace();

  return (
    <section className="border-b border-lumina-border/70 pb-4 lg:hidden">
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={onEditAvatar}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-lumina-pearl text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          aria-label="Change profile photo"
        >
          {professional.profile_image_url ? (
            <img
              src={professional.profile_image_url}
              alt={professional.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[20px] font-medium">
              {(professional.name || "P").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-lumina-surface bg-lumina-black text-white shadow-sm">
            <Pencil size={11} strokeWidth={1.8} aria-hidden="true" />
          </span>
        </button>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Professional workspace
          </p>
          <h1
            className="mt-1 truncate text-[25px] font-semibold leading-tight text-lumina-text"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            {professional.name}
          </h1>
          <p className="mt-1 truncate text-[13px] text-lumina-text-muted">
            {professional.category || "Lumina professional"}
          </p>
          {profileStatus && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-lumina-text">
              {profileIsActive ? (
                <CheckCircle2
                  size={13}
                  strokeWidth={1.8}
                  className="text-lumina-success"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-lumina-text-muted"
                  aria-hidden="true"
                />
              )}
              {profileStatus}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Link
          href={`/artist/${professional.id}`}
          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-lumina-black px-3.5 text-[12px] font-medium text-white transition hover:opacity-85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
        >
          View my profile
          <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <Link
          href="/dashboard/profile"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-lumina-border bg-lumina-surface px-3.5 text-[12px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
        >
          Edit profile
        </Link>
      </div>
    </section>
  );
}

export function ProfessionalDashboardMobileWorkspace({
  serviceCount,
  portfolioEntryCount,
}: ProfessionalDashboardMobileWorkspaceProps) {
  const {
    professional,
    requestActionCount,
    requestIssueCount,
    messageUnreadCount,
  } = useProfessionalWorkspace();
  const navigation = getProfessionalWorkspaceNavigation(professional.id);
  const shortcuts = shortcutOrder
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const MessagesIcon = navigation.find((item) => item.id === "messages")?.icon;
  const hasPriorityActions =
    requestActionCount > 0 || messageUnreadCount > 0;

  return (
    <div className="mt-4 lg:hidden">
      {hasPriorityActions && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Needs your attention
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {requestActionCount > 0 && (
              <Link
                href="/dashboard/requests"
                aria-label={getWorkspaceIndicatorLabel(
                  requestActionCount,
                  "request action",
                  requestIssueCount
                )}
                className={`flex min-h-[58px] items-center gap-2.5 rounded-[14px] border bg-lumina-surface/82 px-3 py-2.5 backdrop-blur-[8px] transition hover:bg-lumina-surface active:scale-[0.99] ${
                  requestIssueCount > 0
                    ? "border-lumina-attention/30"
                    : "border-lumina-glass-border"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    requestIssueCount > 0
                      ? "bg-lumina-attention-soft text-lumina-attention"
                      : "bg-lumina-pearl text-lumina-text"
                  }`}
                >
                  <AlertCircle size={14} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-lumina-text">
                    Requests
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-lumina-text-muted">
                    {requestActionCount === 1
                      ? "1 action"
                      : `${requestActionCount} actions`}
                  </span>
                </span>
                <WorkspaceNavigationIndicator
                  count={requestActionCount}
                  hasIssue={requestIssueCount > 0}
                />
              </Link>
            )}

            {messageUnreadCount > 0 && (
              <Link
                href="/dashboard/messages"
                aria-label={getWorkspaceIndicatorLabel(
                  messageUnreadCount,
                  "unread message"
                )}
                className="flex min-h-[58px] items-center gap-2.5 rounded-[14px] border border-lumina-glass-border bg-lumina-surface/82 px-3 py-2.5 backdrop-blur-[8px] transition hover:bg-lumina-surface active:scale-[0.99]"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lumina-blush/75 text-lumina-text">
                  {MessagesIcon && (
                    <MessagesIcon
                      size={14}
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-lumina-text">
                    Messages
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-lumina-text-muted">
                    {messageUnreadCount === 1
                      ? "1 unread"
                      : `${messageUnreadCount} unread`}
                  </span>
                </span>
                <WorkspaceNavigationIndicator count={messageUnreadCount} />
              </Link>
            )}
          </div>
        </section>
      )}

      <section className={hasPriorityActions ? "mt-4" : ""}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
          Workspace
        </p>
        <h2
          className="mt-1 text-[21px] leading-tight text-lumina-text"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Manage your business
        </h2>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {shortcuts.map((item, index) => {
            const Icon = item.icon;
            const count =
              item.id === "requests"
                ? requestActionCount
                : item.id === "messages"
                  ? messageUnreadCount
                  : 0;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex min-h-[52px] items-center gap-2 rounded-[14px] border border-lumina-glass-border bg-lumina-surface/74 px-2.5 py-2 text-lumina-text backdrop-blur-[7px] transition hover:border-lumina-border hover:bg-lumina-surface active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 ${
                  shortcuts.length % 2 === 1 && index === shortcuts.length - 1
                    ? "col-span-2 mx-auto w-[calc(50%-4px)]"
                    : ""
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.65}
                  className="shrink-0 text-lumina-text-muted transition group-hover:text-lumina-text"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-[11px] font-medium leading-[1.25] min-[390px]:text-[12px]">
                  {item.label}
                </span>
                {count > 0 && (
                  <WorkspaceNavigationIndicator
                    count={count}
                    hasIssue={
                      item.id === "requests" && requestIssueCount > 0
                    }
                  />
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-[16px] border border-lumina-glass-border bg-lumina-surface/66 px-3.5 py-3 backdrop-blur-[8px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">
              Business snapshot
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <p className="text-[13px] font-medium text-lumina-text">
                {serviceCount} {serviceCount === 1 ? "service" : "services"}
              </p>
              <p className="text-[12px] text-lumina-text-muted">
                {portfolioEntryCount} portfolio / result
                {portfolioEntryCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/services"
            className="shrink-0 rounded-full border border-lumina-border bg-lumina-surface px-3 py-2 text-[11px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            Manage services
          </Link>
        </div>
      </section>
    </div>
  );
}
