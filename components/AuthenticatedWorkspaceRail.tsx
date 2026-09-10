"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import WorkspaceNavigationIndicator, {
  getWorkspaceIndicatorLabel,
} from "@/components/WorkspaceNavigationIndicator";
import { supabase } from "@/lib/supabase";
import { useWorkspaceActionCounts } from "@/lib/use-workspace-action-counts";
import { useWorkspaceMessageUnreadCount } from "@/lib/use-workspace-message-unread-count";
import {
  clientWorkspaceNavigation,
  getProfessionalWorkspaceNavigation,
} from "@/lib/workspace-navigation";

type WorkspaceRole = "professional" | "client";

const PUBLIC_WORKSPACE_RAIL_STORAGE_KEY =
  "lumina:public-workspace-rail-expanded";

const excludedRoutePrefixes = [
  "/dashboard",
  "/client",
  "/my-requests",
  "/saved",
  "/account",
  "/admin",
  "/login",
  "/signup",
  "/artist-signup",
  "/join-as-artist",
];

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getInitialRailExpanded() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(PUBLIC_WORKSPACE_RAIL_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export default function AuthenticatedWorkspaceRail() {
  const pathname = usePathname();
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(getInitialRailExpanded);

  const excludedRoute = excludedRoutePrefixes.some((prefix) =>
    matchesRoutePrefix(pathname, prefix)
  );

  useEffect(() => {
    if (excludedRoute) return;
    let cancelled = false;

    const resolveRole = async (userId: string) => {
      const { data, error } = await supabase
        .from("artists")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.log("Workspace role check failed:", error);
        setRole(null);
        setAccountId(null);
        setProfessionalId(null);
        return;
      }
      setAccountId(userId);
      setProfessionalId(data?.id || null);
      setRole(data ? "professional" : "client");
    };

    const loadAccount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        setRole(null);
        setAccountId(null);
        setProfessionalId(null);
        return;
      }

      await resolveRole(user.id);
    };

    void loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setRole(null);
        setAccountId(null);
        setProfessionalId(null);
        return;
      }

      void resolveRole(session.user.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [excludedRoute]);

  useEffect(() => {
    if (!mobileNavigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavigationOpen]);

  useEffect(() => {
    const desktopRail = window.matchMedia("(min-width: 1280px)");
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileNavigationOpen(false);
    };

    desktopRail.addEventListener("change", handleBreakpointChange);
    return () => desktopRail.removeEventListener("change", handleBreakpointChange);
  }, []);

  const actionCounts = useWorkspaceActionCounts(role || "client", accountId);
  const messageUnreadCount = useWorkspaceMessageUnreadCount(
    role === "professional" ? "artist" : "client",
    role && !excludedRoute ? accountId : null
  );

  const toggleRail = () => {
    setRailExpanded((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          PUBLIC_WORKSPACE_RAIL_STORAGE_KEY,
          String(next)
        );
      } catch {
        // Local persistence is optional; retain the in-memory preference.
      }
      return next;
    });
  };

  if (excludedRoute || !role) return null;

  const navigationItems =
    role === "professional"
      ? getProfessionalWorkspaceNavigation(professionalId)
      : clientWorkspaceNavigation;
  const workspaceLabel =
    role === "professional" ? "Professional workspace" : "Client workspace";
  const isSelected = (href: string) => {
    if (href.includes("?")) return false;
    return pathname === href;
  };

  const getIndicator = (itemId: string) => {
    if (role === "professional" && itemId === "requests") {
      return {
        count: actionCounts.requests,
        issueCount: actionCounts.requestIssues,
        label: "action",
      };
    }

    if (role === "client" && itemId === "requests") {
      return {
        count: actionCounts.requests,
        issueCount: actionCounts.requestIssues,
        label: "action",
      };
    }

    if (role === "client" && itemId === "reviews") {
      return {
        count: actionCounts.reviews,
        issueCount: 0,
        label: "review-ready appointment",
      };
    }

    if (itemId === "messages") {
      return {
        count: messageUnreadCount,
        issueCount: 0,
        label: "unread message",
      };
    }

    return null;
  };

  return (
    <>
      <aside
        data-authenticated-workspace-rail="true"
        data-expanded={railExpanded}
        className={`peer fixed left-2 top-1/2 z-30 hidden max-h-[calc(100vh-2rem)] -translate-y-1/2 overflow-visible rounded-[26px] border border-lumina-glass-border bg-lumina-glass p-2 text-lumina-text shadow-[0_10px_30px_rgba(39,36,40,0.04)] backdrop-blur-[14px] transition-[width] duration-200 xl:block ${
          railExpanded ? "w-[244px]" : "w-[72px]"
        }`}
        aria-label={workspaceLabel}
      >
        <div
          className={`mb-1 flex h-10 items-center ${
            railExpanded ? "justify-between px-2" : "justify-center"
          }`}
        >
          {railExpanded && (
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
              {workspaceLabel}
            </span>
          )}
          <button
            type="button"
            onClick={toggleRail}
            aria-label={railExpanded ? "Collapse workspace rail" : "Expand workspace rail"}
            aria-expanded={railExpanded}
            aria-controls="authenticated-workspace-rail-navigation"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-lumina-glass-border bg-lumina-surface/60 text-lumina-text-muted transition hover:bg-lumina-blush/60 hover:text-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"
          >
            {railExpanded ? (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            )}
          </button>
        </div>

        <nav
          id="authenticated-workspace-rail-navigation"
          className="space-y-1"
          aria-label={`${workspaceLabel} navigation`}
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const selected = isSelected(item.href);
            const indicator = getIndicator(item.id);
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
                aria-current={selected ? "page" : undefined}
                aria-label={
                  railExpanded
                    ? undefined
                    : [item.label, indicatorLabel].filter(Boolean).join(", ")
                }
                className={`group relative flex h-12 w-full items-center rounded-[16px] text-[14px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text ${
                  railExpanded ? "gap-3 px-3" : "justify-center"
                } ${
                  selected
                    ? "bg-lumina-surface/90 font-medium text-lumina-text ring-1 ring-inset ring-lumina-glass-border"
                    : "text-lumina-text-muted hover:bg-lumina-surface/85 hover:text-lumina-black"
                }`}
              >
                <Icon size={20} strokeWidth={1.65} className="shrink-0" />
                <span className={railExpanded ? "min-w-0 flex-1 truncate" : "sr-only"}>
                  {item.label}
                </span>
                {indicator && indicator.count > 0 && (
                  <>
                    {railExpanded && <span className="sr-only">, {indicatorLabel}</span>}
                    <WorkspaceNavigationIndicator
                      count={indicator.count}
                      hasIssue={indicator.issueCount > 0}
                      collapsed={!railExpanded}
                    />
                  </>
                )}
                {!railExpanded && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute left-[calc(100%+0.625rem)] top-1/2 z-40 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-lumina-glass-border bg-lumina-glass px-2.5 py-1.5 text-[12px] font-medium text-lumina-text opacity-0 backdrop-blur-[12px] transition-[opacity,transform,visibility] duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <button
        type="button"
        onClick={() => setMobileNavigationOpen(true)}
        className="fixed bottom-5 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-lumina-glass-border bg-lumina-glass text-lumina-text shadow-[0_8px_24px_rgba(39,36,40,0.08)] backdrop-blur-[14px] xl:hidden"
        aria-label={`Open ${workspaceLabel.toLowerCase()} navigation`}
        aria-expanded={mobileNavigationOpen}
        aria-controls="authenticated-workspace-mobile-navigation"
      >
        <Menu size={20} strokeWidth={1.7} />
      </button>

      {mobileNavigationOpen && (
        <div
          id="authenticated-workspace-mobile-navigation"
          className="fixed inset-0 z-50 xl:hidden"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Close workspace navigation"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${workspaceLabel} navigation`}
            className="relative flex h-full w-[min(86vw,300px)] flex-col overflow-hidden border-r border-lumina-glass-border bg-lumina-bg-soft/95 text-lumina-text backdrop-blur-[14px]"
          >
            <div className="flex h-[68px] items-center justify-between border-b border-lumina-glass-border px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
                  Lumina
                </p>
                <p className="mt-1 text-[14px] font-medium text-lumina-text">
                  {workspaceLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-lumina-text-muted transition hover:bg-lumina-surface/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"
                aria-label="Close workspace navigation"
              >
                <X size={20} strokeWidth={1.7} />
              </button>
            </div>

            <nav
              className="flex-1 space-y-1 overflow-y-auto px-4 py-5"
              aria-label={`${workspaceLabel} mobile navigation`}
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const indicator = getIndicator(item.id);
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
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] text-lumina-text transition hover:bg-lumina-surface/80"
                  >
                    <Icon size={19} strokeWidth={1.65} className="shrink-0" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {indicator && indicator.count > 0 && (
                      <>
                        <span className="sr-only">, {indicatorLabel}</span>
                        <WorkspaceNavigationIndicator
                          count={indicator.count}
                          hasIssue={indicator.issueCount > 0}
                        />
                      </>
                    )}
                    {item.supportingText && (
                      <span className="text-[10px] text-lumina-text-muted">
                        {item.supportingText}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
