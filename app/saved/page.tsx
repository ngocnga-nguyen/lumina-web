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
        "https://i.pinimg.com/736x/46/8c/76/468c761b7d788b2a540ec02bc3e3f1bf.jpg",
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
        "https://i.pinimg.com/736x/03/4b/26/034b2662f1747eefe22a5df207cfee0c.jpg",
    },
    {
      id: "anna-h",
      category: "nail",
      albumTitle: "Nail",
      albumHref: "/saved/nail",
      image:
        "https://i.pinimg.com/736x/c6/12/e6/c612e651df488d64a48ce23eda24ce18.jpg",
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
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/browse" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-4 py-8 md:px-10 md:py-10">
        <div className="mb-10 flex items-center gap-3 md:mb-12">
          <span className="text-[22px] text-[#e9a8a8]">♡</span>
          <span className="text-[18px] font-medium md:text-[20px]">Saved</span>
        </div>

        {visibleAlbums.length === 0 ? (
          <div className="mt-16 text-center md:mt-20">
            <p className="text-[16px] text-neutral-500 md:text-[18px]">
              No saved artists yet.
            </p>
            <p className="mt-2 text-[14px] text-neutral-400 md:text-[15px]">
              Tap the heart on profiles you want to come back to.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-x-20 lg:gap-y-20">
            {visibleAlbums.map((album) => {
              const isClickable = availablePages.includes(album.href);

              const content = (
                <div>
                  {album.images.length === 1 ? (
                    <img
                      src={album.images[0]}
                      alt={album.title}
                      className="h-[180px] w-full object-cover md:h-[200px]"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <img
                        src={album.images[0]}
                        alt={album.title}
                        className="h-[180px] w-full object-cover md:h-[200px]"
                      />
                      <img
                        src={album.images[1]}
                        alt={album.title}
                        className="h-[180px] w-full object-cover md:h-[200px]"
                      />
                    </div>
                  )}

                  <p className="mt-4 text-center text-[18px] font-medium md:mt-5 md:text-[20px]">
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