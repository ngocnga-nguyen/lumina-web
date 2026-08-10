"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AccountMenuProps = {
  showNotifications?: boolean;
};

export default function AccountMenu({
  showNotifications = false,
}: AccountMenuProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (!currentUser) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, profile_image_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: artistData } = await supabase
        .from("artists")
        .select("id, name, category, profile_image_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      setArtistProfile(artistData);
    };

    loadAccount();
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
    profile?.profile_image_url ||
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
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#f5f2f1]"
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
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[13px] font-medium text-white">
            {accountInitial}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-12 z-50 w-[220px] rounded-[20px] border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="mb-2 border-b border-neutral-100 pb-2">
            <div className="flex min-w-0 items-center gap-3 px-3 py-2">
              {accountImage ? (
                <img
                  src={accountImage}
                  alt={accountName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white">
                  {accountInitial}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">
                  {accountName}
                </p>
                <p className="truncate text-[12px] text-neutral-500">
                  {artistProfile?.category || "Client account"}
                </p>
              </div>
            </div>
          </div>

          {artistProfile ? (
            <>
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Dashboard
              </Link>

              <Link
                href="/dashboard/profile"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Edit Profile
              </Link>

              <Link
                href="/dashboard/settings"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Settings &amp; Privacy
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/saved"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Saved Artists
              </Link>

              <Link
                href="/my-requests"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                My Requests
              </Link>

              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 text-sm hover:bg-[#faf6f5]"
              >
                Account
              </Link>
            </>
          )}

          <div className="my-1 border-t border-neutral-100" />

          <button
            onClick={handleSignOut}
            className="block w-full rounded-[14px] px-4 py-3 text-left text-sm text-neutral-500 hover:bg-[#faf6f5] hover:text-black"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
