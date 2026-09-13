"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
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

const businessShortcutOrder = [
  "clients",
  "services",
  "portfolio",
  "reviews",
] as const;

export function ProfessionalDashboardMobileSummary({
  profileStatus,
  profileIsActive,
  onEditAvatar,
}: ProfessionalDashboardMobileSummaryProps) {
  const { professional } = useProfessionalWorkspace();

  return (
    <section className="border-b border-lumina-border/70 pb-4 lg:hidden">
      <div className="flex items-start gap-3">
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

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Professional workspace
          </p>
          <h1
            className="mt-0.5 truncate text-[25px] font-semibold leading-tight text-lumina-text"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            {professional.name}
          </h1>
          <p className="mt-1 truncate text-[13px] text-lumina-text-muted">
            {professional.category || "Lumina professional"}
          </p>
          {profileStatus && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-lumina-text">
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
  const businessShortcuts = businessShortcutOrder
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const requestsItem = navigation.find((item) => item.id === "requests");
  const messagesItem = navigation.find((item) => item.id === "messages");
  const servicesItem = navigation.find((item) => item.id === "services");
  const settingsItem = navigation.find((item) => item.id === "settings");
  const RequestsIcon = requestsItem?.icon;
  const MessagesIcon = messagesItem?.icon;
  const ServicesIcon = servicesItem?.icon;
  const SettingsIcon = settingsItem?.icon;
  const hasPriorityActions =
    requestActionCount > 0 || messageUnreadCount > 0;
  const overviewMetrics = [
    {
      label: "Requests",
      value: requestActionCount,
      href: requestsItem?.href || "/dashboard/requests",
      icon: RequestsIcon,
    },
    {
      label: "Unread",
      value: messageUnreadCount,
      href: messagesItem?.href || "/dashboard/messages",
      icon: MessagesIcon,
    },
    {
      label: "Services",
      value: serviceCount,
      href: servicesItem?.href || "/dashboard/services",
      icon: ServicesIcon,
    },
  ];

  return (
    <div className="mt-3.5 lg:hidden">
      <section aria-label="Professional overview">
        <div className="grid grid-cols-3 divide-x divide-lumina-border/70 border-y border-lumina-border/70">
          {overviewMetrics.map((metric) => {
            const MetricIcon = metric.icon;

            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group flex min-h-[62px] flex-col items-center justify-center gap-1 px-2 py-2.5 text-center transition hover:bg-lumina-surface-soft/70 active:bg-lumina-pearl/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
              >
                <span className="flex min-h-[17px] items-center justify-center gap-1.5">
                  {MetricIcon && (
                    <MetricIcon
                      size={13}
                      strokeWidth={1.65}
                      className="shrink-0 text-lumina-text-muted group-hover:text-lumina-text"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-[17px] font-medium leading-none text-lumina-text">
                    {metric.value}
                  </span>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">
                  {metric.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {hasPriorityActions && (
        <section className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Needs your attention
          </p>
          <div className="mt-2 divide-y divide-lumina-border/70 rounded-[14px] border border-lumina-border bg-lumina-surface/88 shadow-[0_8px_20px_rgba(17,17,17,0.035)] backdrop-blur-[7px]">
            {requestActionCount > 0 && (
              <Link
                href="/dashboard/requests"
                aria-label={getWorkspaceIndicatorLabel(
                  requestActionCount,
                  "request action",
                  requestIssueCount
                )}
                className="flex min-h-12 items-center gap-2.5 px-3 py-2 transition hover:bg-lumina-surface/80 active:bg-lumina-pearl/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
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
                  <span className="block text-[12px] font-medium leading-tight text-lumina-text">
                    {requestActionCount === 1
                      ? "1 client request waiting"
                      : `${requestActionCount} client requests waiting`}
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
                className="flex min-h-12 items-center gap-2.5 px-3 py-2 transition hover:bg-lumina-surface/80 active:bg-lumina-pearl/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
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
                  <span className="block text-[12px] font-medium leading-tight text-lumina-text">
                    {messageUnreadCount === 1
                      ? "1 unread message"
                      : `${messageUnreadCount} unread messages`}
                  </span>
                </span>
                <WorkspaceNavigationIndicator count={messageUnreadCount} />
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="mt-4">
        <h2
          className="text-[19px] leading-tight text-lumina-text"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Your business
        </h2>

        <div className="mt-2 grid grid-cols-2 gap-x-4">
          {businessShortcuts.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex min-h-11 items-center gap-2 border-b border-lumina-border/60 px-1 py-2 text-lumina-text/85 transition hover:bg-lumina-surface-soft/50 hover:text-lumina-text active:bg-lumina-pearl/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black"
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
                <ChevronRight
                  size={13}
                  strokeWidth={1.7}
                  className="shrink-0 text-lumina-text-muted/70"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        {settingsItem && SettingsIcon && (
          <Link
            href={settingsItem.href}
            className="mt-2 inline-flex min-h-10 items-center gap-2 px-1 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 min-[390px]:text-[12px]"
          >
            <SettingsIcon size={15} strokeWidth={1.65} aria-hidden="true" />
            Settings
            <ChevronRight size={12} strokeWidth={1.7} aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="mt-3 border-t border-lumina-border/70 pt-3">
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
