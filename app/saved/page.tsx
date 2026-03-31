"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("savedArtists");
    if (stored) {
      setSavedIds(JSON.parse(stored));
    }
  }, []);

  const allArtists = [
    {
      id: "linsey-j",
      category: "hair",
      albumTitle: "Hair",
      albumHref: "/saved/hair",
      image:
        "https://i.pinimg.com/736x/d3/94/0b/d3940b17db908e6eb6aadb81b8c9723f.jpg",
    },
    {
      id: "emma-l",
      category: "lash",
      albumTitle: "Lash & Brow",
      albumHref: "/saved/lash",
      image:
        "https://i.pinimg.com/736x/97/ee/7c/97ee7c69d550e00ab76d3572a60934c4.jpg",
    },
    {
      id: "lily-w",
      category: "skin",
      albumTitle: "Skin",
      albumHref: "/saved/skin",
      image:
        "https://i.pinimg.com/1200x/ff/e4/31/ffe431a279388d674a8e127da9321437.jpg",
    },
    {
      id: "anna-h",
      category: "nail",
      albumTitle: "Nail",
      albumHref: "/saved/nail",
      image:
        "https://i.pinimg.com/1200x/ff/da/28/ffda28118015c870c770c4fb0e7a9479.jpg",
    },
  ];

  const savedArtists = allArtists.filter((artist) => savedIds.includes(artist.id));

  const albums = savedArtists.reduce<
    Record<
      string,
      {
        title: string;
        href: string;
        images: string[];
        count: number;
      }
    >
  >((acc, artist) => {
    if (!acc[artist.category]) {
      acc[artist.category] = {
        title: artist.albumTitle,
        href: artist.albumHref,
        images: [],
        count: 0,
      };
    }

    acc[artist.category].images.push(artist.image);
    acc[artist.category].count += 1;

    return acc;
  }, {});

  const visibleAlbums = Object.values(albums);

  const availablePages = ["/saved/lash"];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top panel */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <Link href="/browse" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-10 py-10">
        {/* Title */}
        <div className="mb-12 flex items-center gap-3">
          <span className="text-[22px] text-[#e9a8a8]">♡</span>
          <span className="text-[20px] font-medium">Saved</span>
        </div>

        {visibleAlbums.length === 0 ? (
          <div className="mt-20 text-center">
            <p className="text-[18px] text-neutral-500">No saved artists yet.</p>
            <p className="mt-2 text-[15px] text-neutral-400">
              Tap the heart on profiles you want to come back to.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-20 gap-y-20">
            {visibleAlbums.map((album) => {
              const isClickable = availablePages.includes(album.href);

              const content = (
                <div>
                  {album.images.length === 1 ? (
                    <img
                      src={album.images[0]}
                      alt={album.title}
                      className="h-[180px] w-full object-cover"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <img
                        src={album.images[0]}
                        alt={album.title}
                        className="h-[180px] w-full object-cover"
                      />
                      <img
                        src={album.images[1]}
                        alt={album.title}
                        className="h-[180px] w-full object-cover"
                      />
                    </div>
                  )}

                  <p className="mt-5 text-center text-[20px] font-medium">
                    {album.title}
                  </p>
                  <p className="text-center text-sm text-neutral-500">
                    {album.count} saved
                  </p>
                </div>
              );

              return isClickable ? (
                <Link key={album.title} href={album.href} className="block">
                  {content}
                </Link>
              ) : (
                <div
                  key={album.title}
                  className="cursor-not-allowed opacity-60"
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}