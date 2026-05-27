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

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedArtists, setSavedArtists] = useState<Artist[]>([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedArtists = async () => {
      const stored = localStorage.getItem("savedArtists");
      const ids = stored ? JSON.parse(stored) : [];

      setSavedIds(ids);

      if (ids.length === 0) {
        setSavedArtists([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .in("id", ids);

      if (error) {
        console.log(error);
        setLoading(false);
        return;
      }

      setSavedArtists(data || []);
      setLoading(false);
    };

    loadSavedArtists();
  }, []);

  const selectedArtists = useMemo(() => {
    return savedArtists.filter((artist) =>
      selectedCompareIds.includes(artist.id)
    );
  }, [savedArtists, selectedCompareIds]);

  const removeSaved = (id: string) => {
    const updatedIds = savedIds.filter((savedId) => savedId !== id);

    setSavedIds(updatedIds);
    setSavedArtists((artists) => artists.filter((artist) => artist.id !== id));
    setSelectedCompareIds((ids) => ids.filter((selectedId) => selectedId !== id));

    localStorage.setItem("savedArtists", JSON.stringify(updatedIds));
  };

  const toggleCompare = (id: string) => {
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds((ids) => ids.filter((item) => item !== id));
      return;
    }

    if (selectedCompareIds.length >= 3) {
      alert("You can compare up to 3 artists at once.");
      return;
    }

    setSelectedCompareIds((ids) => [...ids, id]);
  };

  const clearCompare = () => {
    setSelectedCompareIds([]);
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/browse" className="transition hover:opacity-70">
          ← Back
        </Link>

        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="w-[60px]" />
      </header>

      <section className="px-4 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[22px] text-[#e9a8a8]">♡</span>
              <span className="text-[18px] font-medium md:text-[20px]">
                Saved Artists
              </span>
            </div>

            <p className="mt-2 text-[14px] text-neutral-500">
              Save artists, compare options, and choose who fits best.
            </p>
          </div>

          {selectedCompareIds.length > 0 && (
            <button
              onClick={clearCompare}
              className="text-left text-[13px] text-neutral-500 hover:text-black md:text-right"
            >
              Clear comparison
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-neutral-500">Loading saved artists...</p>
        ) : savedArtists.length === 0 ? (
          <div className="mt-16 text-center md:mt-20">
            <p className="text-[16px] text-neutral-500 md:text-[18px]">
              No saved artists yet.
            </p>

            <p className="mt-2 text-[14px] text-neutral-400 md:text-[15px]">
              Tap the heart on artists you want to come back to.
            </p>

            <Link
              href="/browse"
              className="mt-6 inline-block rounded-full border border-black px-6 py-3 text-[14px] transition hover:bg-black hover:text-white"
            >
              Browse Artists
            </Link>
          </div>
        ) : (
          <>
            {selectedArtists.length > 0 && (
              <section className="mb-12 rounded-[26px] bg-[#fbf7f6] p-5 md:p-7">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.14em] text-neutral-400">
                      Compare
                    </p>

                    <h2
                      className="mt-2 text-[30px] font-semibold md:text-[38px]"
                      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                    >
                      Artist comparison
                    </h2>
                  </div>

                  <p className="text-[13px] text-neutral-500">
                    {selectedArtists.length}/3 selected
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="py-3 pr-4 font-medium">Artist</th>
                        {selectedArtists.map((artist) => (
                          <th key={artist.id} className="py-3 pr-4 font-medium">
                            {artist.name}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-b border-neutral-200">
                        <td className="py-4 pr-4 text-neutral-500">Category</td>
                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            {artist.category}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-neutral-200">
                        <td className="py-4 pr-4 text-neutral-500">Location</td>
                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            {artist.location}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-neutral-200">
                        <td className="py-4 pr-4 text-neutral-500">
                          Starting price
                        </td>
                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            From ${artist.price_start}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="py-4 pr-4 text-neutral-500">Profile</td>
                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            <Link
                              href={`/artist/${artist.id}`}
                              className="text-[#d8b4b4] hover:text-black"
                            >
                              View Profile
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
              {savedArtists.map((artist) => {
                const isSelected = selectedCompareIds.includes(artist.id);

                return (
                  <div key={artist.id}>
                    <div className="relative h-[190px] overflow-hidden rounded-[14px] bg-[#eeeeee] md:h-[210px]">
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

                      <button
                        onClick={() => removeSaved(artist.id)}
                        className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[20px] transition hover:scale-110"
                      >
                        <span className="text-[#e9a8a8]">♥</span>
                      </button>
                    </div>

                    <h2 className="mt-4 text-[18px] font-medium">
                      {artist.name}
                    </h2>

                    <p className="text-neutral-500">{artist.category}</p>

                    <p className="mt-3 text-sm text-neutral-500">
                      {artist.location}
                    </p>

                    <p className="mt-2 font-medium">
                      From ${artist.price_start}
                    </p>

                    <div className="mt-5 flex items-center justify-between text-sm">
                      <Link
                        href={`/artist/${artist.id}`}
                        className="text-[#d8b4b4] transition hover:text-black"
                      >
                        View Profile
                      </Link>

                      <button
                        onClick={() => removeSaved(artist.id)}
                        className="text-neutral-400 transition hover:text-black"
                      >
                        Remove
                      </button>
                    </div>

                    <button
                      onClick={() => toggleCompare(artist.id)}
                      className={
                        isSelected
                          ? "mt-4 w-full rounded-full bg-black px-4 py-2 text-[13px] text-white"
                          : "mt-4 w-full rounded-full border border-black px-4 py-2 text-[13px] transition hover:bg-black hover:text-white"
                      }
                    >
                      {isSelected ? "Selected for Compare" : "Compare"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}