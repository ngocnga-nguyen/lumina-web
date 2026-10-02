"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAccountMenuPosition } from "@/lib/account-menu-position";
import { Menu, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLuminaAdminAccess } from "@/lib/use-lumina-admin-access";

type AccountMenuProps = {
  showNotifications?: boolean;
  workspace?: "professional";
  compactPublicHeader?: boolean;
};

type AccountRole = "professional" | "client";

type AccountProfile = {
  full_name: string | null;
};

type ArtistAccountProfile = {
  id: string;
  name: string | null;
  category: string | null;
  profile_image_url: string | null;
};

// Existing current-session menu action, shared by the Storefront client dropdown.
export const handleSignOut = async () => {
  await supabase.auth.signOut({ scope: "local" });
  window.location.href = "/login";
};

export default function AccountMenu({
  showNotifications = false,
  workspace,
  compactPublicHeader = false,
}: AccountMenuProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [artistProfile, setArtistProfile] =
    useState<ArtistAccountProfile | null>(null);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLuminaAdmin = useLuminaAdminAccess(user?.id);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const focusLastOnOpen = useRef(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const actions = () => Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'));
    const positionMenu = () => {
      const anchor = trigger.getBoundingClientRect();
      if (!anchor.width || !anchor.height || anchor.bottom <= 0 || anchor.top >= window.innerHeight) {
        setMenuOpen(false);
        return;
      }
      setMenuPosition(getAccountMenuPosition(anchor, menu.offsetWidth, menu.offsetHeight, {
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      }));
    };
    const isOutside = (target: EventTarget | null) => target instanceof Node
      && !trigger.contains(target) && !menu.contains(target);
    const closeOutside = (event: Event) => {
      if (isOutside(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        trigger.focus();
        return;
      }
      const items = actions();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index < 0) return;
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      } else if (event.key === "Tab" && ((event.shiftKey && index === 0) || (!event.shiftKey && index === items.length - 1))) {
        setMenuOpen(false);
        trigger.focus();
        // Resume the trigger's original tab order, not the end of document.body.
        if (event.shiftKey) event.preventDefault();
      }
    };

    positionMenu();
    const items = actions();
    (focusLastOnOpen.current ? items.at(-1) : items[0])?.focus();
    focusLastOnOpen.current = false;
    const observer = new ResizeObserver(positionMenu);
    observer.observe(trigger);
    observer.observe(menu);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [menuOpen]);

  const triggerProps = {
    ref: triggerRef,
    "aria-expanded": menuOpen,
    "aria-controls": menuOpen ? menuId : undefined,
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      focusLastOnOpen.current = event.key === "ArrowUp";
      setMenuOpen(true);
    },
  };
  const menuProps = {
    ref: menuRef,
    id: menuId,
    role: "group",
    "aria-label": "Account options",
    style: { ...menuPosition, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100dvh - 24px)" },
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target instanceof Element && event.target.closest("a[href], button")) setMenuOpen(false);
    },
  };

  useEffect(() => {
    let cancelled = false;

    const loadAccount = async () => {
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (cancelled) return;
        setUser(currentUser);

        if (!currentUser) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (cancelled) return;
        setProfile(profileData);

        const { data: artistData, error: artistError } = await supabase
          .from("artists")
          .select("id, name, category, profile_image_url")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (artistError) throw artistError;
        if (cancelled) return;

        setArtistProfile(artistData);
        setAccountRole(artistData ? "professional" : "client");
      } catch (error) {
        if (cancelled) return;
        console.log("Account menu load failed:", error);
        setAccountRole(null);
      }
    };

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  const accountName =
    artistProfile?.name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "User";

  const accountInitial = accountName.charAt(0).toUpperCase();

  const accountImage =
    artistProfile?.profile_image_url ||
    user?.user_metadata?.avatar_url ||
    null;

  if (!user) {
    if (compactPublicHeader) {
      return (
        <div className="relative">
          <div className="hidden items-center gap-5 sm:flex">
            <Link href="/login" className="text-sm transition hover:opacity-70">
              Login
            </Link>

            <Link
              href="/join-as-artist"
              className="text-sm transition hover:opacity-70"
            >
              Join as Artist
            </Link>
          </div>

          <button
            {...triggerProps}
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Open account options"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text transition hover:border-lumina-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 sm:hidden"
          >
            <Menu size={18} strokeWidth={1.7} aria-hidden="true" />
          </button>

          {menuOpen && createPortal(
            <div {...menuProps} className="fixed z-[45] overflow-y-auto w-[190px] rounded-[18px] border border-lumina-glass-border bg-lumina-surface/95 p-2 text-lumina-text shadow-[0_12px_32px_rgba(39,36,40,0.10)] backdrop-blur-[14px] sm:hidden">
              <Link
                href="/login"
                className="block rounded-[12px] px-4 py-3 text-sm font-medium hover:bg-lumina-blush/70"
              >
                Log in
              </Link>
              <Link
                href="/join-as-artist"
                className="block rounded-[12px] px-4 py-3 text-sm hover:bg-lumina-blush/70"
              >
                Join as Artist
              </Link>
            </div>,
            document.body
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-5">
        <Link href="/login" className="text-sm transition hover:opacity-70">
          Login
        </Link>

        <Link
          href="/join-as-artist"
          className="text-sm transition hover:opacity-70"
        >
          Join as Artist
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3">
      {showNotifications && (
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-lumina-surface-soft"
          aria-label="Notifications"
        >
          🔔
        </button>
      )}

      <button
        {...triggerProps}
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
        aria-label="Account menu"
      >
        {accountImage ? (
          <img
            src={accountImage}
            alt={accountName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lumina-black text-[13px] font-medium text-white">
            {accountInitial}
          </span>
        )}
      </button>

      {/* Body portal escapes header z-30; z-45 stays below modal/navigation overlays (z-50+). */}
      {menuOpen && createPortal(
        <div {...menuProps} className="fixed z-[45] overflow-y-auto w-[220px] rounded-[20px] border border-lumina-glass-border bg-lumina-surface/95 p-2 text-lumina-text shadow-[0_12px_32px_rgba(39,36,40,0.10)] backdrop-blur-[14px]">
          <div className="mb-2 border-b border-lumina-border pb-2">
            <div className="flex min-w-0 items-center gap-3 px-3 py-2">
              {accountImage ? (
                <img
                  src={accountImage}
                  alt={accountName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lumina-black text-sm font-medium text-white">
                  {accountInitial}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-lumina-text">
                  {accountName}
                </p>
                <p className="truncate text-[12px] text-lumina-text-muted">
                  {accountRole === "professional"
                    ? artistProfile?.category || "Professional account"
                    : accountRole === "client"
                      ? "Client account"
                      : "Confirming account type…"}
                </p>
              </div>
            </div>
          </div>

          {workspace === "professional" || accountRole === "professional" ? (
            <>
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-4 py-3 text-sm font-medium text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                Open dashboard
              </Link>

              <Link
                href={
                  artistProfile?.id
                    ? `/artist/${artistProfile.id}`
                    : "/dashboard/profile"
                }
                className="block rounded-[14px] px-4 py-3 text-sm text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                View profile
              </Link>

              <Link
                href="/dashboard/settings"
                className="block rounded-[14px] px-4 py-3 text-sm text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                Account / Settings
              </Link>
            </>
          ) : accountRole === "client" ? (
            <>
              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 text-sm text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                Profile &amp; settings
              </Link>
            </>
          ) : (
            <p className="px-4 py-3 text-[12px] text-lumina-text-muted">
              Confirming account type…
            </p>
          )}

          {isLuminaAdmin && (
            <Link
              href="/admin/reviews"
              className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
            >
              <ShieldCheck size={15} strokeWidth={1.6} aria-hidden="true" />
              Admin / Moderation
            </Link>
          )}

          <div className="my-1 border-t border-lumina-border" />

          <button
            onClick={handleSignOut}
            className="block w-full rounded-[14px] px-4 py-3 text-left text-sm text-lumina-text-muted hover:bg-lumina-blush/70 hover:text-lumina-black focus-visible:bg-lumina-blush/70 focus-visible:text-lumina-black"
          >
            Sign out
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
