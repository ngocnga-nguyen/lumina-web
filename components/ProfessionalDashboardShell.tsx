"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import WorkspaceNavigationIndicator, {
  getWorkspaceIndicatorLabel,
} from "@/components/WorkspaceNavigationIndicator";
import {
  ProfessionalWorkspaceProvider,
  type ProfessionalWorkspaceProfile,
} from "@/components/ProfessionalWorkspaceContext";
import { supabase } from "@/lib/supabase";
import { useWorkspaceActionCounts } from "@/lib/use-workspace-action-counts";
import { useWorkspaceMessageUnreadCount } from "@/lib/use-workspace-message-unread-count";
import { useWorkspaceSidebarPreference } from "@/lib/use-workspace-sidebar-preference";
import { getProfessionalWorkspaceNavigation } from "@/lib/workspace-navigation";

type ShellProps = {
  children: React.ReactNode;
};

const pageTitles: Array<{ path: string; title: string }> = [
  { path: "/dashboard/onboarding", title: "Profile setup" },
  { path: "/dashboard/messages", title: "Messages" },
  { path: "/dashboard/reviews", title: "Reviews" },
  { path: "/dashboard/requests", title: "Requests" },
  { path: "/dashboard/clients", title: "Clients" },
  { path: "/dashboard/services", title: "Services" },
  { path: "/dashboard/portfolio", title: "Portfolio / Results" },
  { path: "/dashboard/profile", title: "Profile" },
  { path: "/dashboard/settings", title: "Settings" },
  { path: "/dashboard", title: "Dashboard" },
];

export default function ProfessionalDashboardShell({ children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [professional, setProfessional] =
    useState<ProfessionalWorkspaceProfile | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useWorkspaceSidebarPreference();
  const [accountResolved, setAccountResolved] = useState(false);
  const [accountLoadError, setAccountLoadError] = useState(false);
  const [accountLoadAttempt, setAccountLoadAttempt] = useState(0);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadProfessional = async () => {
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

        const { data, error } = await supabase
          .from("artists")
          .select("id, name, category, profile_image_url")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;
        if (!data) {
          router.replace("/client");
          return;
        }

        setProfessional(data);
        setAccountResolved(true);
      } catch (error) {
        if (cancelled) return;
        console.log("Professional workspace account load failed:", error);
        setAccountLoadError(true);
      }
    };

    void loadProfessional();

    return () => {
      cancelled = true;
    };
  }, [accountLoadAttempt, router]);

  const currentTitle =
    pageTitles.find(({ path }) =>
      path === "/dashboard" ? pathname === path : pathname.startsWith(path)
    )?.title || "Dashboard";

  const navigationItems = useMemo(
    () => getProfessionalWorkspaceNavigation(professional?.id),
    [professional]
  );
  const actionCounts = useWorkspaceActionCounts(
    "professional",
    professional?.id
  );
  const messageUnreadCount = useWorkspaceMessageUnreadCount(
    "artist",
    professional?.id
  );

  const isSelected = (label: string, href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

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
          title={collapsed ? "Lumina home" : undefined}
        >
          {collapsed ? "L" : "LUMINA"}
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileNavigationOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lumina-text-muted"
            aria-label="Close dashboard navigation"
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
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
        className={`flex-1 space-y-1 overflow-y-auto py-6 ${
          collapsed ? "px-3" : "px-4"
        }`}
        aria-label="Professional dashboard"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const selected = isSelected(item.label, item.href);
          const tooltip = item.supportingText
            ? `${item.label} — ${item.supportingText}`
            : item.label;
          const indicator =
            item.id === "requests"
              ? {
                  count: actionCounts.requests,
                  issueCount: actionCounts.requestIssues,
                  label: "action",
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
                  ? [tooltip, indicatorLabel].filter(Boolean).join(", ")
                  : undefined
              }
              title={collapsed ? tooltip : item.supportingText}
              className={`relative flex items-center rounded-[14px] py-3 text-[14px] transition ${
                collapsed ? "justify-center px-3" : "gap-3 px-4"
              } ${
                selected
                  ? "bg-lumina-glass font-medium text-lumina-text ring-1 ring-inset ring-lumina-glass-border backdrop-blur-[11px]"
                  : "text-lumina-text-muted hover:bg-lumina-surface/75 hover:text-lumina-black"
              }`}
            >
              <Icon size={19} strokeWidth={1.65} className="shrink-0" />
              <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>
                {item.label}
              </span>
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
              {!collapsed && item.supportingText && (
                <span className="text-[10px] text-lumina-text-muted">
                  {item.supportingText}
                </span>
              )}
              {!collapsed && item.external && (
                <ExternalLink
                  size={13}
                  strokeWidth={1.6}
                  className="text-lumina-text-muted"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-lumina-glass-border p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 rounded-[16px] bg-lumina-surface/55 py-3">
            <Link
              href="/dashboard/profile"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-lumina-black text-[13px] font-medium text-white"
              aria-label="Edit professional profile"
              title="Edit professional profile"
            >
              {professional?.profile_image_url ? (
                <img
                  src={professional.profile_image_url}
                  alt={professional.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (professional?.name || "P").charAt(0).toUpperCase()
              )}
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-surface hover:text-lumina-black"
              aria-label="Account settings"
              title="Account settings"
            >
              <Settings size={16} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[16px] bg-lumina-surface/65 p-3">
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileNavigationOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-black text-[13px] font-medium text-white"
              aria-label="Edit professional profile"
            >
              {professional?.profile_image_url ? (
                <img
                  src={professional.profile_image_url}
                  alt={professional.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (professional?.name || "P").charAt(0).toUpperCase()
              )}
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileNavigationOpen(false)}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-[13px] font-medium text-lumina-text">
                {professional?.name || "Professional account"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">
                {professional?.category || "Lumina professional"}
              </p>
            </Link>
            <Link
              href="/dashboard/settings"
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
          <p className="text-[15px] font-medium">Your dashboard could not be loaded.</p>
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

  if (!accountResolved || !professional) {
    return (
      <div
        className="min-h-screen bg-lumina-bg"
        aria-label="Loading professional workspace"
      />
    );
  }

  return (
    <ProfessionalWorkspaceProvider
      value={{
        professional,
        requestActionCount: actionCounts.requests,
        requestIssueCount: actionCounts.requestIssues,
        messageUnreadCount,
      }}
    >
      <div className="min-h-screen overflow-x-hidden bg-lumina-bg text-lumina-text">
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden border-r border-lumina-glass-border transition-[width] duration-200 lg:block ${
            sidebarCollapsed ? "w-[88px]" : "w-[280px]"
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
              aria-label="Close dashboard navigation"
            />
            <aside className="relative h-full w-[min(86vw,300px)] border-r border-lumina-border bg-lumina-bg-soft text-lumina-text shadow-xl">
              {renderSidebar(false, true)}
            </aside>
          </div>
        )}

        <div
          className={`min-w-0 transition-[padding] duration-200 ${
            sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[280px]"
          }`}
        >
          <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-lumina-border bg-lumina-surface/95 px-4 backdrop-blur md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text lg:hidden"
                aria-label="Open dashboard navigation"
                aria-expanded={mobileNavigationOpen}
              >
                <Menu size={20} strokeWidth={1.7} />
              </button>
              <div className="min-w-0">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted sm:block">
                  Professional workspace
                </p>
                <p className="truncate text-[14px] font-medium text-lumina-text sm:mt-0.5">
                  {currentTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AccountMenu workspace="professional" />
            </div>
          </header>

          <main className="min-h-[calc(100vh-68px)] min-w-0 bg-lumina-bg text-lumina-text">
            {children}
          </main>
        </div>
      </div>
    </ProfessionalWorkspaceProvider>
  );
}
