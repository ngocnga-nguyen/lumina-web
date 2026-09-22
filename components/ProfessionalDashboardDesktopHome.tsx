"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Inbox,
  MessageCircle,
  Pencil,
  X,
} from "lucide-react";
import IdentityAvatar from "@/components/IdentityAvatar";
import WorkspaceNavigationIndicator, {
  getWorkspaceIndicatorLabel,
} from "@/components/WorkspaceNavigationIndicator";
import { useProfessionalWorkspace } from "@/components/ProfessionalWorkspaceContext";
import {
  type ProfessionalActivationStatus,
  type ProfessionalOnboardingStep,
  type ProfessionalProfilePanelMode,
} from "@/lib/professional-activation";
import { getProfessionalWorkspaceNavigation } from "@/lib/workspace-navigation";

type Artist = {
  id: string;
  name: string;
  category: string;
  availability?: string | null;
  profile_image_url?: string | null;
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

type Props = {
  artist: Artist;
  services: Service[];
  portfolioCount: number;
  activationStatus: ProfessionalActivationStatus | null;
  panelMode: ProfessionalProfilePanelMode | null;
  showProfilePanel: boolean;
  profileStatus: string | null;
  profileCompletion: number;
  missingProfileItems: string[];
  firstIncompleteStep: ProfessionalOnboardingStep;
  activatingProfile: boolean;
  onActivateProfile: () => void;
  onDismissActivePanel: () => void;
  onEditAvatar: () => void;
  onEditCover: () => void;
};

const businessShortcutOrder = ["clients", "services", "portfolio", "reviews"] as const;

export default function ProfessionalDashboardDesktopHome({
  artist,
  services,
  portfolioCount,
  activationStatus,
  panelMode,
  showProfilePanel,
  profileStatus,
  profileCompletion,
  missingProfileItems,
  firstIncompleteStep,
  activatingProfile,
  onActivateProfile,
  onDismissActivePanel,
  onEditAvatar,
  onEditCover,
}: Props) {
  const { requestActionCount, requestIssueCount, messageUnreadCount } =
    useProfessionalWorkspace();
  const navigation = getProfessionalWorkspaceNavigation(artist.id);
  const businessShortcuts = businessShortcutOrder
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const settingsItem = navigation.find((item) => item.id === "settings");
  const hasAttention = requestActionCount > 0 || messageUnreadCount > 0;

  const setupAction =
    activationStatus?.license_status === "rejected"
      ? { href: "/dashboard/settings#license-verification", label: "Update verification details" }
      : activationStatus?.license_status === "unverified"
        ? { href: "/dashboard/settings#license-verification", label: "Complete verification" }
        : { href: `/dashboard/onboarding?step=${firstIncompleteStep}`, label: "Continue setup" };
  const setupDescription =
    activationStatus?.license_status === "rejected"
      ? activationStatus.license_decision_message ||
        "Update your license verification details for another review."
      : activationStatus?.license_status === "unverified"
        ? "License verification must be completed before your profile can become active and public."
        : activationStatus?.license_status === "pending"
          ? "Your verification is pending, but other required profile details still need attention."
          : "Complete the remaining profile requirements before activation.";

  return (
    <div className="mx-auto hidden max-w-[1240px] lg:block">
      <header className="flex flex-col gap-5 border-b border-lumina-border/70 pb-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={onEditAvatar}
            aria-label="Change profile photo"
            className="group relative h-[76px] w-[76px] shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            <IdentityAvatar
              name={artist.name}
              imageUrl={artist.profile_image_url}
              className="block h-full w-full rounded-full bg-lumina-pearl"
              fallbackClassName="font-serif text-[25px] text-lumina-text"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text shadow-[0_2px_8px_rgba(17,17,17,0.07)] transition group-hover:bg-lumina-surface-soft">
              <Pencil size={13} strokeWidth={1.7} aria-hidden="true" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
              Professional workspace
            </p>
            <h1 className="mt-1 font-serif text-[30px] font-semibold leading-[1.1] text-lumina-text xl:text-[34px]">
              {artist.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-lumina-text-muted">
              <span>{artist.category || "Lumina professional"}</span>
              {profileStatus && (
                <span className="inline-flex items-center gap-1.5 font-medium text-lumina-text">
                  {panelMode === "active" ? (
                    <CheckCircle2 size={14} strokeWidth={1.7} className="text-lumina-success" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-lumina-text-muted" aria-hidden="true" />
                  )}
                  {profileStatus}
                </span>
              )}
            </div>
            {panelMode === "active" && showProfilePanel && (
              <div className="mt-2 flex items-center gap-3 text-[12px] text-lumina-text-muted">
                <span>Clients can discover your profile across Lumina.</span>
                <button
                  type="button"
                  onClick={onDismissActivePanel}
                  aria-label="Dismiss profile completion note"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black"
                >
                  <X size={14} strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 xl:justify-end">
          <Link
            href={`/artist/${artist.id}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            View my profile <ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-10 items-center rounded-full border border-lumina-border px-4 text-[12px] font-medium transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            Edit profile
          </Link>
          <button
            type="button"
            onClick={onEditCover}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2"
          >
            <Pencil size={12} strokeWidth={1.7} aria-hidden="true" /> Edit cover
          </button>
        </div>
      </header>

      {showProfilePanel && panelMode === "incomplete" && activationStatus && (
        <section className="mt-6 rounded-[18px] border border-lumina-border bg-lumina-surface-soft/70 px-5 py-4" aria-label="Profile setup guidance">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Your Lumina profile · {profileCompletion}% complete</p>
              <div className="mt-3 h-1.5 max-w-[520px] overflow-hidden rounded-full bg-lumina-pearl"><div className="h-full rounded-full bg-lumina-black" style={{ width: `${profileCompletion}%` }} /></div>
              <p className="mt-2 text-[13px] leading-relaxed text-lumina-text-muted">
                {missingProfileItems.length > 0
                  ? `Complete your ${missingProfileItems.join(", ")} before activation.`
                  : "Complete the remaining profile requirements before activation."}
              </p>
              <p className="mt-1 text-[12px] text-lumina-text-muted">{setupDescription}</p>
            </div>
            <Link href={setupAction.href} className="inline-flex min-h-10 items-center rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white transition hover:opacity-85">
              {setupAction.label}
            </Link>
          </div>
        </section>
      )}

      {showProfilePanel && panelMode === "verification_pending" && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-lumina-glass-border bg-lumina-glass px-5 py-3.5" aria-label="Profile verification guidance">
          <p className="text-[12px] leading-relaxed text-lumina-text-muted">Lumina is reviewing your license details. Your dashboard remains available while you wait.</p>
          <span className="text-[11px] text-lumina-text-muted">{profileCompletion}% complete</span>
        </section>
      )}

      {showProfilePanel && panelMode === "ready" && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-lumina-border bg-lumina-surface-soft/70 px-5 py-3.5" aria-label="Profile activation guidance">
          <p className="text-[13px] text-lumina-text-muted">Your profile meets every activation requirement.</p>
          <button type="button" onClick={onActivateProfile} disabled={activatingProfile} className="inline-flex min-h-10 items-center rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white transition hover:opacity-85 disabled:opacity-50">
            {activatingProfile ? "Activating…" : "Activate profile"}
          </button>
        </section>
      )}

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] xl:items-start">
        <div className="min-w-0 space-y-7">
          {hasAttention && (
            <section aria-label="Needs your attention">
              <h2 className="font-serif text-[23px] leading-tight">Needs your attention</h2>
              <div className="mt-3 divide-y divide-lumina-border/60 border-y border-lumina-border/70">
                {requestActionCount > 0 && (
                  <Link href="/dashboard/requests" aria-label={getWorkspaceIndicatorLabel(requestActionCount, "request action", requestIssueCount)} className="group flex min-h-[58px] items-center gap-3 py-3 transition hover:bg-lumina-surface-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lumina-pearl"><Inbox size={16} strokeWidth={1.7} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 text-[13px] font-medium">{requestActionCount === 1 ? "1 client request waiting" : `${requestActionCount} client requests waiting`}</span>
                    <WorkspaceNavigationIndicator count={requestActionCount} hasIssue={requestIssueCount > 0} />
                    <ChevronRight size={16} className="text-lumina-text-muted" aria-hidden="true" />
                  </Link>
                )}
                {messageUnreadCount > 0 && (
                  <Link href="/dashboard/messages" aria-label={getWorkspaceIndicatorLabel(messageUnreadCount, "unread message")} className="group flex min-h-[58px] items-center gap-3 py-3 transition hover:bg-lumina-surface-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lumina-blush/65"><MessageCircle size={16} strokeWidth={1.7} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1 text-[13px] font-medium">{messageUnreadCount === 1 ? "1 unread message" : `${messageUnreadCount} unread messages`}</span>
                    <WorkspaceNavigationIndicator count={messageUnreadCount} />
                    <ChevronRight size={16} className="text-lumina-text-muted" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </section>
          )}

          <section aria-label="Manage your business">
            <h2 className="font-serif text-[23px] leading-tight">Manage your business</h2>
            <div className="mt-3 grid grid-cols-2 gap-x-6 border-t border-lumina-border/70">
              {businessShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.href} className="group flex min-h-[55px] items-center gap-2.5 border-b border-lumina-border/60 px-1 py-2 text-[13px] transition hover:bg-lumina-surface-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lumina-black">
                    <Icon size={17} strokeWidth={1.65} className="shrink-0 text-lumina-text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <ChevronRight size={14} strokeWidth={1.7} className="shrink-0 text-lumina-text-muted/70" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            {settingsItem && (
              <Link href={settingsItem.href} className="mt-2 inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-lumina-text-muted transition hover:text-lumina-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">
                <settingsItem.icon size={15} strokeWidth={1.65} aria-hidden="true" /> Settings <ChevronRight size={13} aria-hidden="true" />
              </Link>
            )}
          </section>
        </div>

        <aside className="min-w-0 rounded-[18px] border border-lumina-border/70 bg-lumina-surface-soft/45 px-5 py-5" aria-label="Business snapshot">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Business snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 border-b border-lumina-border/60 pb-4">
            <p><span className="block font-serif text-[25px] leading-none">{services.length}</span><span className="mt-1.5 block text-[12px] text-lumina-text-muted">{services.length === 1 ? "service" : "services"}</span></p>
            <p><span className="block font-serif text-[25px] leading-none">{portfolioCount}</span><span className="mt-1.5 block text-[12px] text-lumina-text-muted">portfolio / result{portfolioCount === 1 ? "" : "s"}</span></p>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">Availability</p>
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-[13px] leading-relaxed">{artist.availability || "Availability coming soon."}</p>
          <Link href="/dashboard/profile" className="mt-3 inline-flex min-h-9 items-center text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text">Edit availability</Link>
        </aside>
      </div>

      <section className="mt-9 border-t border-lumina-border/70 pt-6" aria-label="Services preview">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">At a glance</p><h2 className="mt-1 font-serif text-[23px] leading-tight">Services</h2></div>
          <Link href="/dashboard/services" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-lumina-border px-4 text-[12px] font-medium transition hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2">Manage services <ChevronRight size={14} aria-hidden="true" /></Link>
        </div>
        {services.length === 0 ? (
          <p className="mt-3 text-[13px] text-lumina-text-muted">No services yet. Add your first service so clients can see what you offer.</p>
        ) : (
          <div className="mt-3 divide-y divide-lumina-border/60 border-y border-lumina-border/70">
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="grid min-h-[62px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0"><p className="truncate text-[13px] font-medium">{service.service_name}</p>{service.description && <p className="mt-0.5 line-clamp-1 text-[12px] text-lumina-text-muted">{service.description}</p>}</div>
                <div className="text-right text-[12px]"><p>{service.price != null ? `From $${service.price}` : "Price on request"}</p>{service.duration && <p className="mt-0.5 text-lumina-text-muted">{service.duration}</p>}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
