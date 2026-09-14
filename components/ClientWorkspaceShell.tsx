"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import ClientNotificationCenter from "@/components/ClientNotificationCenter";
import { ClientWorkspaceProvider } from "@/components/ClientWorkspaceContext";
import WorkspaceNavigationIndicator, {
  getWorkspaceIndicatorLabel,
} from "@/components/WorkspaceNavigationIndicator";
import { supabase } from "@/lib/supabase";
import { useWorkspaceActionCounts } from "@/lib/use-workspace-action-counts";
import { useClientNotifications } from "@/lib/use-client-notifications";
import { useWorkspaceMessageUnreadCount } from "@/lib/use-workspace-message-unread-count";
import { useWorkspaceSidebarPreference } from "@/lib/use-workspace-sidebar-preference";
import { clientWorkspaceNavigation } from "@/lib/workspace-navigation";

type ClientProfile = {
  full_name: string | null;
};

type ClientWorkspaceShellProps = {
  children: React.ReactNode;
  topBarActions?: React.ReactNode;
};

const pageTitles: Array<{ path: string; title: string }> = [
  { path: "/client/messages", title: "Messages" },
  { path: "/client/reviews", title: "Reviews" },
  { path: "/my-requests", title: "My Requests" },
  { path: "/saved", title: "Saved" },
  { path: "/account", title: "Profile / Settings" },
  { path: "/client", title: "Overview" },
];

export default function ClientWorkspaceShell({
  children,
  topBarActions,
}: ClientWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useWorkspaceSidebarPreference();
  const [accountResolved, setAccountResolved] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [locationHash, setLocationHash] = useState("");
  const [accountLoadError, setAccountLoadError] = useState(false);
  const [accountLoadAttempt, setAccountLoadAttempt] = useState(0);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadClient = async () => {
      try {
        setAccountLoadError(false);
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;
        if (authError) throw authError;
        if (!user) {
          router.replace(
            `/login?redirect=${encodeURIComponent(pathnameRef.current)}`
          );
          return;
        }

        const [profileResult, artistResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("artists").select("id").eq("id", user.id).maybeSingle(),
        ]);

        if (cancelled) return;
        if (artistResult.error) throw artistResult.error;
        if (artistResult.data) {
          router.replace("/dashboard");
          return;
        }

        setProfile(profileResult.data);
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        setEmail(user.email || "");
        setAccountId(user.id);
        setAccountResolved(true);
      } catch (error) {
        if (cancelled) return;
        console.log("Client workspace account load failed:", error);
        setAccountLoadError(true);
      }
    };

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [accountLoadAttempt, router]);

  useEffect(() => {
    const updateHash = () => setLocationHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const currentTitle =
    pathname.startsWith("/saved") && locationHash === "#compare"
      ? "Compare"
      : pageTitles.find(({ path }) => pathname.startsWith(path))?.title ||
        "Client account";

  const navigationItems = useMemo(
    () => clientWorkspaceNavigation,
    []
  );
  const actionCounts = useWorkspaceActionCounts("client", accountId);
  const messageUnreadCount = useWorkspaceMessageUnreadCount("client", accountId);
  const clientNotifications = useClientNotifications(accountId);

  const isSelected = (label: string, href: string) => {
    if (label === "Compare") {
      return pathname.startsWith("/saved") && locationHash === "#compare";
    }
    if (href === "/client") return pathname === href;
    if (label === "Saved") {
      return pathname.startsWith("/saved") && locationHash !== "#compare";
    }
    return pathname.startsWith(href);
  };

  const clientName = profile?.full_name?.trim() || email || "Client account";
  const clientInitial = clientName.charAt(0).toUpperCase();

  const renderSidebar = (collapsed: boolean, mobile = false) => (
    <div className="flex h-full flex-col bg-lumina-glass text-lumina-text backdrop-blur-[12px]">
      <div
        className={`flex h-[68px] items-center border-b border-lumina-glass-border ${
          collapsed ? "justify-center gap-1 px-2" : "justify-between px-6"
        }`}
      >
        <Link
          href="/"
          onClick={() => setMobileNavigationOpen(false)}
          className={`${
            collapsed
              ? "flex h-9 w-9 items-center justify-center text-[17px]"
              : "text-[18px] tracking-[0.12em]"
          } font-semibold text-lumina-text`}
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          aria-label="Lumina home"
        >
          {collapsed ? "L" : "LUMINA"}
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileNavigationOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lumina-text-muted"
            aria-label="Close account navigation"
          >
            <X size={20} strokeWidth={1.7} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-lumina-glass-border bg-lumina-surface/55 text-lumina-text-muted transition hover:bg-lumina-surface hover:text-lumina-black lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            )}
          </button>
        )}
      </div>

      <nav
        className={`flex-1 space-y-1 py-6 ${
          collapsed ? "overflow-visible px-3" : "overflow-y-auto px-4"
        }`}
        aria-label="Client account"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const selected = isSelected(item.label, item.href);
          const indicator =
            item.id === "requests"
              ? {
                  count: actionCounts.requests,
                  issueCount: actionCounts.requestIssues,
                  label: "action",
                }
              : item.id === "reviews"
              ? {
                  count: clientNotifications.reviewUnreadCount,
                  issueCount: 0,
                  label: "new review notification",
                }
              : item.id === "messages"
              ? {
                  count: messageUnreadCount,
                  issueCount: 0,
                  label: "unread message",
                }
              : null;
          const indicatorLabel =
            indicator && indicator.count > 0
              ? getWorkspaceIndicatorLabel(
                  indicator.count,
                  indicator.label,
                  indicator.issueCount
                )
              : null;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileNavigationOpen(false)}
              aria-current={selected ? "page" : undefined}
              aria-label={
                collapsed
                  ? [item.label, indicatorLabel].filter(Boolean).join(", ")
                  : undefined
              }
              className={`group relative flex items-center rounded-[14px] py-3 text-[14px] transition ${
                collapsed ? "justify-center px-3" : "gap-3 px-4"
              } ${
                selected
                  ? "bg-lumina-glass font-medium text-lumina-text ring-1 ring-inset ring-lumina-glass-border backdrop-blur-[10px]"
                  : "text-lumina-text-muted hover:bg-lumina-surface/75 hover:text-lumina-black"
              }`}
            >
              <Icon size={19} strokeWidth={1.65} className="shrink-0" />
              <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>
                {item.label}
              </span>
              {!collapsed && item.supportingText && (
                <span className="shrink-0 text-[10px] text-lumina-text-muted">
                  {item.supportingText}
                </span>
              )}
              {indicator && indicator.count > 0 && (
                <>
                  {!collapsed && <span className="sr-only">, {indicatorLabel}</span>}
                  <WorkspaceNavigationIndicator
                    count={indicator.count}
                    hasIssue={indicator.issueCount > 0}
                    collapsed={collapsed}
                  />
                </>
              )}
              {collapsed && !mobile && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none invisible absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-lumina-glass-border bg-lumina-glass px-2.5 py-1.5 text-[12px] font-medium text-lumina-text opacity-0 backdrop-blur-[12px] transition-[opacity,transform,visibility] duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-lumina-glass-border p-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 rounded-[16px] bg-lumina-surface/55 py-3">
            <Link
              href="/account"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-lumina-black text-[13px] font-medium text-white"
              aria-label="Open profile settings"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={clientName}
                  className="h-full w-full object-cover"
                />
              ) : (
                clientInitial
              )}
            </Link>
            <Link
              href="/account"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-surface hover:text-lumina-black"
              aria-label="Account settings"
            >
              <Settings size={16} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
        <div className="flex items-center gap-3 rounded-[16px] bg-lumina-surface/70 p-3">
          <Link
            href="/account"
            onClick={() => setMobileNavigationOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-black text-[13px] font-medium text-white"
            aria-label="Open profile settings"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={clientName}
                className="h-full w-full object-cover"
              />
            ) : (
              clientInitial
            )}
          </Link>
          <Link
            href="/account"
            onClick={() => setMobileNavigationOpen(false)}
            className="min-w-0 flex-1"
          >
            <p className="truncate text-[13px] font-medium text-lumina-text">
              {clientName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
              Lumina client
            </p>
          </Link>
          <Link
            href="/account"
            onClick={() => setMobileNavigationOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-blush hover:text-lumina-black"
            aria-label="Account settings"
          >
            <Settings size={16} strokeWidth={1.6} />
          </Link>
        </div>
        )}
      </div>
    </div>
  );

  if (accountLoadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lumina-bg px-5 text-lumina-text">
        <div role="alert" className="max-w-sm text-center">
          <p className="text-[15px] font-medium">Your account could not be loaded.</p>
          <p className="mt-2 text-[13px] text-lumina-text-muted">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setAccountLoadAttempt((current) => current + 1)}
            className="mt-5 min-h-11 rounded-full bg-lumina-black px-6 text-[13px] font-medium text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!accountResolved) {
    return <div className="min-h-screen bg-lumina-bg" aria-label="Loading client workspace" />;
  }

  return (
    <ClientWorkspaceProvider
      value={{
        requestActionCount: actionCounts.requests,
        requestIssueCount: actionCounts.requestIssues,
        reviewReadyCount: actionCounts.reviews,
        messageUnreadCount,
        notifications: clientNotifications.notifications,
        acknowledgeNotifications: clientNotifications.acknowledge,
      }}
    >
    <div className="min-h-screen overflow-x-hidden bg-lumina-bg text-lumina-text">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-lumina-glass-border transition-[width] duration-200 lg:block ${
          sidebarCollapsed ? "w-[88px]" : "w-[264px]"
        }`}
      >
        {renderSidebar(sidebarCollapsed)}
      </aside>

      {mobileNavigationOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Close account navigation"
          />
          <aside className="relative h-full w-[min(86vw,300px)] border-r border-lumina-border bg-lumina-bg-soft text-lumina-text shadow-xl">
            {renderSidebar(false, true)}
          </aside>
        </div>
      )}

      <div
        className={`min-w-0 transition-[padding] duration-200 ${
          sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[264px]"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-lumina-border bg-lumina-surface/92 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavigationOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text lg:hidden"
              aria-label="Open account navigation"
              aria-expanded={mobileNavigationOpen}
            >
              <Menu size={20} strokeWidth={1.7} />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted sm:block">
                Client account
              </p>
              <p className="truncate text-[14px] font-medium text-lumina-text sm:mt-0.5">
                {currentTitle}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            {topBarActions}
            <ClientNotificationCenter
              notifications={clientNotifications.notifications}
              requestsById={clientNotifications.requestsById}
              unreadCount={clientNotifications.unreadCount}
              error={clientNotifications.error}
              onAcknowledge={clientNotifications.acknowledge}
              onClearAll={clientNotifications.clearAll}
            />
            <AccountMenu />
          </div>
        </header>

        <main className="min-h-[calc(100vh-68px)] min-w-0 bg-lumina-bg text-lumina-text">{children}</main>
      </div>
    </div>
    </ClientWorkspaceProvider>
  );
}
