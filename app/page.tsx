"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
};

export default function Home() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.log(error);
        return;
      }

      setArtists(data || []);
    };

    fetchArtists();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(artists.map((artist) => artist.category))).filter(
      Boolean
    );
  }, [artists]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists.slice(0, 4);

    const query = searchQuery.toLowerCase();

    return artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(query) ||
        artist.category.toLowerCase().includes(query) ||
        artist.location.toLowerCase().includes(query)
    );
  }, [artists, searchQuery]);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <nav className="flex items-center gap-6 text-sm md:gap-16 md:text-[15px]">
          <Link href="/browse" className="transition hover:opacity-70">
            Browse Artists
          </Link>

          <Link href="/join-as-artist" className="transition hover:opacity-70">
            Join as an Artist
          </Link>
        </nav>
      </header>

      <section className="bg-white px-4 pt-10 pb-16 md:px-14 md:pt-20 md:pb-28">
        <div className="max-w-[900px]">
          <h1
            className="max-w-[820px] text-[42px] leading-[1.0] tracking-[-0.03em] font-semibold md:text-[68px] lg:text-[84px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Know who’s
            <br />
            actually worth
            <br />
            booking
          </h1>

          <p
            className="mt-8 max-w-[930px] text-[22px] leading-[1.2] md:mt-12 md:text-[30px] lg:mt-14 lg:text-[34px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Explore beauty professionals with clearer pricing, real portfolio
            results, and trust signals before you commit.
          </p>

          <div className="mt-10 md:mt-16 lg:mt-20">
            <div className="relative w-full max-w-[430px]">
              <div className="flex w-full items-center rounded-full bg-[#efedeb] px-5 py-3">
                <span className="mr-3 text-lg text-neutral-500">⌕</span>

                <input
                  type="text"
                  placeholder="search by city, artist, or service"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
              </div>

              {searchQuery.trim() && (
                <div className="absolute left-0 top-[52px] z-20 w-full rounded-[18px] bg-white p-3 shadow-lg">
                  {filteredArtists.length > 0 ? (
                    filteredArtists.slice(0, 5).map((artist) => (
                      <Link
                        key={artist.id}
                        href={`/artist/${artist.id}`}
                        className="block rounded-[14px] px-3 py-3 transition hover:bg-[#fbf7f6]"
                      >
                        <p className="text-[15px] font-medium">
                          {artist.name}
                        </p>

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
        </div>
      </section>

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-28">
        <div className="text-center">
          <h2 className="text-[16px] font-semibold uppercase tracking-[0.08em] md:text-[18px]">
            Explore active categories
          </h2>

          <p className="mt-3 text-[16px] text-neutral-700 md:text-[18px]">
            Categories appear as real artists join Lumina
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[520px] rounded-[22px] bg-[#fbf7f6] p-6 text-center">
            <p className="text-[15px] text-neutral-600">
              No categories are live yet. Artists will appear here once profiles
              are added.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 md:mt-14 md:grid-cols-3 lg:grid-cols-5 lg:gap-8">
            {categories.map((category) => {
              const count = artists.filter(
                (artist) => artist.category === category
              ).length;

              return (
                <Link
                  key={category}
                  href={`/browse?category=${encodeURIComponent(category)}`}
                  className="rounded-[22px] bg-[#fbf7f6] p-6 text-center transition hover:-translate-y-1 hover:shadow-sm"
                >
                  <p
                    className="text-[24px] font-semibold"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    {category}
                  </p>

                  <p className="mt-2 text-[14px] text-neutral-500">
                    {count} listed
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
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

            <p className="mt-6 max-w-[360px] text-[18px] text-neutral-700 md:mt-10 md:text-[22px]">
              Beauty discovery should feel clearer before you spend money or
              trust someone with your look.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-3 md:gap-10 lg:pt-6 lg:gap-16">
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
                2. Compare
              </h3>

              <p className="mt-2 text-[14px] text-neutral-600 md:text-[15px]">
                Save favorites and compare pricing, services, and trust signals.
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

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
        <div className="text-center">
          <h2 className="text-[16px] font-semibold uppercase tracking-[0.08em] md:text-[18px]">
            Artists on Lumina
          </h2>

          <p className="mt-3 text-[16px] text-neutral-700 md:text-[18px]">
            Real profiles appear here as beauty professionals join
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
          <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {filteredArtists.map((artist) => (
              <div key={artist.id}>
                <div className="h-[220px] w-full overflow-hidden rounded-[16px] bg-[#eeeeee]">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-neutral-400">
                      <div>
                        <p className="text-[15px]">Profile Image</p>
                        <p className="mt-1 text-[12px]">Coming soon</p>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="mt-4 text-[18px] font-medium md:mt-5">
                  {artist.name}
                </h3>

                <p className="text-[15px] text-neutral-500 md:text-[16px]">
                  {artist.category}
                </p>

                <p className="mt-3 text-[14px] text-neutral-500">
                  ⭐ New profile
                </p>

                <p className="mt-2 text-[14px] font-medium">
                  From ${artist.price_start}
                </p>

                <div className="mt-6 flex items-center justify-between text-[14px] md:mt-8">
                  <span className="text-neutral-700">{artist.location}</span>

                  <Link
                    href={`/artist/${artist.id}`}
                    className="text-[#d8b4b4] transition hover:text-black"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
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

      <section className="px-4 pb-16 md:px-14 md:pb-24 lg:pb-32">
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

      <section className="px-4 pb-20 text-center md:px-14 md:pb-32 lg:pb-40">
        <h2
          className="text-[36px] leading-[1.08] font-semibold md:text-[52px] lg:text-[64px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Build confidence before you book
        </h2>

        <p className="mt-6 text-[16px] text-neutral-700 md:mt-8 md:text-[18px]">
          Discover, compare, and request beauty professionals with more clarity.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 md:mt-14 md:flex-row md:gap-6">
          <Link
            href="/browse"
            className="rounded-full bg-black px-8 py-3 text-[15px] text-white"
          >
            Browse Artists
          </Link>

          <Link
            href="/join-as-artist"
            className="rounded-full border border-black px-8 py-3 text-[15px] transition hover:bg-black hover:text-white"
          >
            Join as an Artist
          </Link>
        </div>
      </section>

      <footer className="bg-[#f4f4f4] px-6 py-16 md:px-14 md:py-24">
        <div className="grid grid-cols-1 gap-14 md:grid-cols-4">
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
              <Link
                href="/browse"
                className="block transition hover:opacity-60"
              >
                Find Professionals
              </Link>

              <Link
                href="/saved"
                className="block transition hover:opacity-60"
              >
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
                Join Lumina
              </Link>

              <Link
                href="/admin/portfolio"
                className="block transition hover:opacity-60"
              >
                Portfolio
              </Link>

              <Link
                href="/admin/requests"
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
              <Link
                href="/about"
                className="block transition hover:opacity-60"
              >
                About
              </Link>

              <Link
                href="/contact"
                className="block transition hover:opacity-60"
              >
                Contact
              </Link>

              <Link
                href="/privacy"
                className="block transition hover:opacity-60"
              >
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