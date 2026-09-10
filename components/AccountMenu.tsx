"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLuminaAdminAccess } from "@/lib/use-lumina-admin-access";

type AccountMenuProps = {
  showNotifications?: boolean;
  workspace?: "professional";
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

export default function AccountMenu({
  showNotifications = false,
  workspace,
}: AccountMenuProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [artistProfile, setArtistProfile] =
    useState<ArtistAccountProfile | null>(null);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLuminaAdmin = useLuminaAdminAccess(user?.id);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/login";
  };

  if (!user) {
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

      {menuOpen && (
        <div className="absolute right-0 top-12 z-50 w-[220px] rounded-[20px] border border-lumina-glass-border bg-lumina-surface/95 p-2 text-lumina-text shadow-[0_12px_32px_rgba(39,36,40,0.10)] backdrop-blur-[14px]">
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
                href="/client"
                className="block rounded-[14px] px-4 py-3 text-sm font-medium text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                Open my account
              </Link>

              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 text-sm text-lumina-text hover:bg-lumina-blush/70 focus-visible:bg-lumina-blush/70"
              >
                Profile / Settings
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
        </div>
      )}
    </div>
  );
}
