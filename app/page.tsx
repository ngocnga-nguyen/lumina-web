"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ArtistCard from "@/components/ArtistCard";
import SearchBar from "@/components/SearchBar";
import { useRouter } from "next/navigation";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
};
const categoryImages: Record<string, string> = {
  "Nail Technician": "/categories/nail.jpg",
  "Facial Esthetician": "/categories/facial.jpg",
  "Aesthetician": "/categories/facial.jpg",
  "Lash Technician": "/categories/lash.jpg",
  "Lash Artist": "/categories/lash.jpg",
  "Hair Stylist": "/categories/hair.jpg",
  "Makeup Artist": "/categories/makeup.jpg",
  "Brow Artist": "/categories/brow.jpg",
};
export default function Home() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountName =
  artistProfile?.name ||
  user?.user_metadata?.full_name ||
  user?.email ||
  "User";

const accountInitial = accountName.charAt(0).toUpperCase();

const accountImage = artistProfile?.profile_image_url || null;

  useEffect(() => {
    const recoveryLinkLandedOnHome =
      window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).get("type") === "recovery";

    if (recoveryLinkLandedOnHome) {
      router.replace(
        `/account/reset-password${window.location.search}${window.location.hash}`
      );
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/account/reset-password");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.log(error);
        return;
      }

      setArtists(data || []);
    };

    fetchArtists();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) {
        setArtistId(null);
        return;
      }

      const { data: artist } = await supabase
  .from("artists")
  .select("*")
  .eq("id", user.id)
  .maybeSingle();

setArtistId(artist?.id || null);
setArtistProfile(artist);
    };

    getUser();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(artists.map((artist) => artist.category))).filter(
      Boolean
    );
  }, [artists]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists.slice(0, 12);

    const query = searchQuery.toLowerCase();

    return artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(query) ||
        artist.category.toLowerCase().includes(query) ||
        artist.location.toLowerCase().includes(query)
    );
  }, [artists, searchQuery]);

  const handleSearch = () => {
  const query = searchQuery.trim();

  router.push(
    query
      ? `/browse?search=${encodeURIComponent(query)}`
      : "/browse"
  );
};
  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <nav className="relative flex items-center gap-5 text-sm md:text-[15px]">
  <Link href="/browse" className="transition hover:opacity-70">
    Browse Artists
  </Link>

  {!user ? (
    <>
      <Link href="/login" className="transition hover:opacity-70">
        Login
      </Link>

      <Link href="/join-as-artist" className="transition hover:opacity-70">
        Join as Artist
      </Link>
    </>
  ) : (
    <>
      <button
        onClick={() => setAccountMenuOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
        aria-label="Account menu"
      >
        {accountImage ? (
  <img
    src={accountImage}
    alt={accountName}
    className="h-9 w-9 rounded-full object-cover"
  />
) : (
  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[13px] font-medium text-white">
    {accountInitial}
  </span>
)}
      </button>

      {accountMenuOpen && (
        <div className="absolute right-0 top-12 z-50 w-[220px] rounded-[20px] border border-neutral-200 bg-white p-2 shadow-xl">
          {artistId ? (
            <>
              <Link
                href="/dashboard"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                Dashboard
              </Link>

              <Link
                href="/dashboard/profile"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                Edit Profile
              </Link>

              <Link
                href="/dashboard/settings"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                Settings &amp; Privacy
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/saved"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                Saved Artists
              </Link>

              <Link
                href="/my-requests"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                My Requests
              </Link>

              <Link
                href="/account"
                className="block rounded-[14px] px-4 py-3 hover:bg-[#faf6f5]"
              >
                Account
              </Link>
            </>
          )}
          <div className="my-1 border-t border-neutral-100" />
          <button
            onClick={handleLogout}
            className="block w-full rounded-[14px] px-4 py-3 text-left text-neutral-500 hover:bg-[#faf6f5] hover:text-black"
          >
            Sign Out
          </button>
        </div>
      )}
    </>
  )}
</nav>
      </header>
<section className="bg-white px-6 pb-6 pt-10 md:px-14 md:pb-8 md:pt-14">
  <div className="max-w-[760px]">
    <h1
      className="max-w-[700px] text-[38px] font-semibold leading-[0.95] tracking-[-0.03em] md:text-[60px] lg:text-[72px]"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Find beauty
      <br />
      professionals
      <br />
      you can trust
    </h1>

    <p
      className="mt-8 max-w-[760px] text-[20px] leading-[1.35] text-neutral-700 md:text-[26px] lg:text-[28px]"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Compare portfolios, pricing, reviews, and verified results before you
      book.
    </p>

    <div className="mt-6">
      <div className="relative w-full max-w-[720px]">

    <SearchBar

      value={searchQuery}

      onChange={setSearchQuery}

      placeholder="Search by city, artist, or service"

      showButton={true}

      onSearch={handleSearch}

    />

        {searchQuery.trim() && (
          <div className="absolute left-0 top-[52px] z-20 w-full rounded-[18px] bg-white p-3 shadow-lg">
            {filteredArtists.length > 0 ? (
              filteredArtists.slice(0, 5).map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.id}`}
                  className="block rounded-[14px] px-3 py-3 transition hover:bg-[#fbf7f6]"
                >
                  <p className="text-[15px] font-medium">{artist.name}</p>

                  <p className="text-[13px] text-neutral-500">
                    {artist.category} • {artist.location}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-3 py-3 text-[14px] text-neutral-500">
                No artists found.
              </p>
            )}

            <Link
              href={`/browse?search=${encodeURIComponent(searchQuery)}`}
              className="mt-2 block rounded-full bg-black px-4 py-2 text-center text-[13px] text-white"
            >
              Search all artists
            </Link>
          </div>
        )}
      </div>
    </div>

    <div className="mt-6 flex flex-col gap-2 sm:flex-row md:mt-8">
      <Link
        href="/browse"
        className="rounded-full bg-black px-6 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90"
      >
        Browse Artists
      </Link>

      {!user && (
        <Link
          href="/signup"
          className="rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-[14px] font-medium text-black transition hover:bg-neutral-50"
        >
          Create Client Account
        </Link>
      )}

      {user && artistId && (
        <Link
          href="/dashboard"
          className="rounded-full border border-black px-6 py-2.5 text-center text-[14px] transition hover:bg-black hover:text-white"
        >
          Go to Dashboard
        </Link>
      )}
    </div>

    {!user && (
      <p className="mt-4 text-[13px] text-neutral-500">
        Beauty professional?{" "}
        <Link href="/join-as-artist" className="text-black underline">
          Create a professional account
        </Link>
      </p>
    )}
  </div>
</section>
      <section className="px-6 pt-4 pb-10 md:px-14 md:pt-6 md:pb-16 lg:pb-20">
        <div className="max-w-[760px]">
  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
    Browse by category
  </p>

  <h2
    className="mt-3 text-[30px] leading-[1.12] md:text-[40px]"
    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
  >
    Start with the service you’re looking for.
  </h2>
</div>

        {categories.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[520px] rounded-[22px] bg-[#fbf7f6] p-6 text-center">
            <p className="text-[15px] text-neutral-600">
              No categories are live yet. Artists will appear here once profiles
              are added.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid max-w-[1280px] grid-cols-2 gap-5 md:mt-10 md:grid-cols-3 lg:grid-cols-5 lg:gap-8">
            {categories.map((category) => {
              const count = artists.filter(
                (artist) => artist.category === category
              ).length;

              return (
  <Link
    key={category}
    href={`/browse?category=${encodeURIComponent(category)}`}
    className="group overflow-hidden rounded-[22px] border border-[#eee6e2] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
  >
    <div className="aspect-[4/3] overflow-hidden bg-[#f8f5f3]">
      <img
        src={categoryImages[category] || "/categories/default.jpg"}
        alt={category}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
    </div>

    <div className="p-4 text-center">
      <p
        className="text-[18px] md:text-[20px]"
        style={{ fontFamily: "Georgia, Times New Roman, serif" }}
      >
        {category}
      </p>

      <p className="mt-1 text-[14px] text-neutral-500">
        {count} {count === 1 ? "Artist" : "Artists"}
      </p>

      <div className="mt-3 text-[22px] text-neutral-400 transition group-hover:translate-x-1">
        →
      </div>
    </div>
  </Link>
);
            })}
          </div>
        )}
      </section>

      <section className="bg-[#faf6f5] px-4 py-14 md:px-14 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-14">
          <div>
            <h2
              className="text-[42px] leading-[1.05] font-semibold md:text-[54px] lg:text-[64px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              How
              <br />
              Lumina
              <br />
              works
            </h2>

            <p className="mt-6 max-w-[360px] text-[18px] text-neutral-700 md:mt-8 md:text-[22px]">
              Beauty discovery should feel clearer before you spend money or
              trust someone with your look.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-3 md:gap-10 lg:pt-6 lg:gap-12">
            <div>
              <div className="mb-3 text-xl md:mb-4">✨</div>

              <h3 className="text-[18px] font-medium md:text-[20px]">
                1. Discover
              </h3>

              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Browse real professionals by service, city, and style.
              </p>
            </div>

            <div>
              <div className="mb-3 text-xl md:mb-4">♡</div>

              <h3 className="text-[18px] font-medium md:text-[20px]">
                2. Save & compare
              </h3>

              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Create a client account to save favorites and compare artists
                across devices.
              </p>
            </div>

            <div>
              <div className="mb-3 text-xl md:mb-4">📅</div>

              <h3 className="text-[18px] font-medium md:text-[20px]">
                3. Request
              </h3>

              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Send a request with your service, date, and contact details.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
  <div>
    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
      Artists on Lumina
    </p>

    <h2
      className="mt-3 text-[30px] leading-[1.12] md:text-[40px]"
      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
    >
      Discover professionals worth exploring.
    </h2>
  </div>

  <p className="text-[13px] text-neutral-500">
    Scroll to explore →
  </p>
</div>

        {filteredArtists.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[520px] rounded-[22px] bg-[#fbf7f6] p-6 text-center">
            <p className="text-[15px] text-neutral-600">
              No artists found. Try a different search or check back as more
              artists join.
            </p>
          </div>
        ) : (
          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-5 md:-mx-14 md:mt-14 md:gap-7 md:px-14">
            {filteredArtists.map((artist) => (
    <ArtistCard
      key={artist.id}
      artist={artist}
      className="w-[82vw] shrink-0 snap-start sm:w-[360px] md:w-[390px] lg:w-[410px]"
    />
  ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/browse"
            className="rounded-full border border-black px-7 py-3 text-[14px] transition hover:bg-black hover:text-white"
          >
            View all artists
          </Link>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-14">
          <div>
            <h2
              className="text-[42px] leading-[1.02] font-semibold md:text-[56px] lg:text-[72px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Why
              <br />
              Choose
              <br />
              Lumina?
            </h2>

            <p
              className="mt-8 max-w-[300px] text-[18px] leading-[1.35] md:mt-12 md:text-[22px] lg:text-[24px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              A trust-first beauty platform built for clarity before you
              commit.
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Real Trust Signals
            </h3>

            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              Profiles focus on real work, transparent services, and booking
              confidence.
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Clarity before you commit
            </h3>

            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              See pricing, availability, portfolio images, and service details
              before reaching out.
            </p>
          </div>

          <div className="pt-2 md:pt-4 lg:pt-8">
            <h3 className="text-[18px] font-semibold md:text-[20px]">
              Built for comparison
            </h3>

            <p className="mt-4 text-[15px] leading-[1.5] text-neutral-700 md:mt-5 md:text-[16px]">
              Save favorites, compare options, and choose the artist who fits
              your style and needs.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 text-center md:px-14 md:pb-28 lg:pb-32">
        <h2
          className="text-[36px] leading-[1.08] font-semibold md:text-[52px] lg:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Build confidence before you book
        </h2>

        <p className="mt-6 text-[16px] text-neutral-700 md:mt-8 md:text-[18px]">
          Discover, compare, and request beauty professionals with more clarity.
        </p>

        <div className="mx-auto mt-10 grid max-w-[720px] grid-cols-1 gap-4 md:mt-14 md:grid-cols-2">
          <div className="rounded-[24px] bg-[#fbf7f6] p-6">
            <p className="text-[13px] uppercase tracking-[0.14em] text-neutral-400">
              For Clients
            </p>

            <h3
              className="mt-3 text-[28px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Save and compare artists
            </h3>

            <p className="mt-3 text-[14px] leading-[1.6] text-neutral-600">
              Create a client account to save favorites, compare profiles, and
              keep track of who you want to book.
            </p>

            <Link
              href={user ? "/saved" : "/signup"}
              className="mt-6 inline-block rounded-full bg-black px-7 py-3 text-[14px] text-white"
            >
              {user ? "View Saved Artists" : "Create Client Account"}
            </Link>
          </div>

          <div className="rounded-[24px] border border-neutral-200 p-6">
            <p className="text-[13px] uppercase tracking-[0.14em] text-neutral-400">
              For Artists
            </p>

            <h3
              className="mt-3 text-[28px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Build your professional profile
            </h3>

            <p className="mt-3 text-[14px] leading-[1.6] text-neutral-600">
              Join as a beauty professional to upload your work, list services,
              and receive client requests.
            </p>

            <Link
              href={artistId ? "/dashboard" : "/join-as-artist"}
              className="mt-6 inline-block rounded-full border border-black px-7 py-3 text-[14px] transition hover:bg-black hover:text-white"
            >
              {artistId ? "Go to Dashboard" : "Join as an Artist"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#f4f4f4] px-6 py-16 md:px-14 md:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-20">
          <div>
            <Link
              href="/"
              className="text-[22px] font-semibold transition hover:opacity-70"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Lumina
            </Link>

            <p className="mt-8 max-w-[280px] text-[16px] leading-[1.35] text-neutral-800">
              Discover trusted beauty professionals and showcase your artistry
              without social media pressure.
            </p>
          </div>

          <div>
            <h3
              className="text-[20px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Clients
            </h3>

            <div className="mt-8 space-y-2 text-[16px]">
              <Link href="/browse" className="block transition hover:opacity-60">
                Find Professionals
              </Link>

              <Link href="/signup" className="block transition hover:opacity-60">
                Create Account
              </Link>

              <Link href="/my-requests" className="block transition hover:opacity-60">
              My Requests
              </Link>

              <Link href="/saved" className="block transition hover:opacity-60">
                Saved Artists
              </Link>

              <Link
                href="/browse/map"
                className="block transition hover:opacity-60"
              >
                Map View
              </Link>
            </div>
          </div>

          <div>
            <h3
              className="text-[20px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              For Artists
            </h3>

            <div className="mt-8 space-y-2 text-[16px]">
              <Link
                href="/join-as-artist"
                className="block transition hover:opacity-60"
              >
                Join as an Artist
              </Link>

              <Link href="/login" className="block transition hover:opacity-60">
                Professional Login
              </Link>

              <Link
                href="/dashboard/portfolio"
                className="block transition hover:opacity-60"
              >
                Portfolio
              </Link>

              <Link
                href="/dashboard/requests"
                className="block transition hover:opacity-60"
              >
                Requests
              </Link>
            </div>
          </div>

          <div>
            <h3
              className="text-[20px] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Company
            </h3>

            <div className="mt-8 space-y-2 text-[16px]">
              <Link href="/about" className="block transition hover:opacity-60">
                About
              </Link>

              <Link href="/contact" className="block transition hover:opacity-60">
                Contact
              </Link>

              <Link href="/privacy" className="block transition hover:opacity-60">
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-16 text-center text-[15px] text-neutral-500">
          © 2026 Lumina. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
