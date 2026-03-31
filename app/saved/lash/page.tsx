"use client";

import Link from "next/link";
import { useState } from "react";

export default function LashPage() {
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const artists = [
    {
      id: "emma",
      name: "Emma L",
      role: "Lash Artist",
      rating: "4.9",
      reviews: "127 reviews",
      price: "$95",
      location: "Broken Arrow, OK",
      image:
        "https://i.pinimg.com/736x/97/ee/7c/97ee7c69d550e00ab76d3572a60934c4.jpg",
      compareNote: "Responds within 2 hours",
      experience: "5 years experience",
    },
    {
      id: "mia",
      name: "Mia J",
      role: "Lash Artist",
      rating: "4.7",
      reviews: "89 reviews",
      price: "$89",
      location: "Broken Arrow, OK",
      image:
        "https://i.pinimg.com/1200x/d1/4a/b1/d14ab1be4e80dac4f3c7240b9744c727.jpg",
      compareNote: "Repeat clients",
      experience: "3 years experience",
    },
  ];

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      if (selected.length < 2) {
        setSelected([...selected, id]);
      }
    }
  };

  const selectedArtists = artists.filter((artist) => selected.includes(artist.id));

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Top panel */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <Link href="/saved" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-10 py-10">
        {/* Title row */}
        <div className="mb-12 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[22px] text-[#e9a8a8]">♡</span>
            <div>
              <h1 className="text-[24px] font-medium">Lash</h1>
              <p className="text-sm text-neutral-500">2 saved</p>
            </div>
          </div>

          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelected([]);
            }}
            className="flex items-center gap-2 text-[15px] transition hover:opacity-70"
          >
            <span className="text-[18px]">◯</span>
            <span>{compareMode ? "Cancel compare" : "Select to compare"}</span>
          </button>
        </div>

        {/* Saved artists */}
        <div className="grid grid-cols-2 gap-14">
          {artists.map((artist) => (
            <div key={artist.id}>
              <img
                src={artist.image}
                alt={artist.name}
                className="h-[180px] w-full object-cover rounded-[12px]"
              />

              <h2 className="mt-5 text-[20px] font-medium">{artist.name}</h2>
              <p className="text-[16px] text-neutral-500">{artist.role}</p>

              <p className="mt-4 text-[15px] text-neutral-700">
                ⭐ {artist.rating} ({artist.reviews})
              </p>

              <p className="mt-2 text-[15px]">{artist.price}</p>

              <div className="mt-10 flex items-center justify-between text-[14px]">
                <span className="text-neutral-700">{artist.location}</span>
                <Link
                  href="/artist/linsey-j"
                  className="text-[#d8b4b4] transition hover:text-black"
                >
                  View Profile
                </Link>
              </div>

              {compareMode && (
                <button
                  onClick={() => toggleSelect(artist.id)}
                  className={`mt-5 rounded-full border px-4 py-2 text-[14px] transition ${
                    selected.includes(artist.id)
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 bg-white text-black"
                  }`}
                >
                  {selected.includes(artist.id) ? "Selected" : "Select"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Popup compare panel */}
      {selected.length === 2 && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
          <div className="h-full w-[460px] bg-[#f7f2f2] p-6 shadow-xl">
            <button
              onClick={() => {
                setSelected([]);
                setCompareMode(false);
              }}
              className="text-[14px] text-neutral-500 transition hover:text-black"
            >
              × Close
            </button>

            <h2 className="mt-6 text-[22px] font-medium">Compare</h2>

            <div className="mt-8 grid grid-cols-2 gap-8">
              {selectedArtists.map((artist) => (
                <div key={artist.id} className="text-center">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="mx-auto h-[160px] w-[120px] object-cover"
                  />

                  <h3 className="mt-5 text-[20px] font-medium">{artist.name}</h3>

                  <p className="mt-3 text-[15px]">
                    ⭐ {artist.rating} ({artist.reviews})
                  </p>

                  <p className="mt-3 text-[16px]">start at {artist.price}</p>

                  <p className="mt-3 text-[16px]">Verified</p>

                  <p className="mt-3 text-[16px]">{artist.experience}</p>

                  <p className="mt-3 text-[16px]">{artist.compareNote}</p>

                  <button className="mt-5 rounded-full border border-black px-4 py-2 text-[14px] transition hover:bg-black hover:text-white">
                    Request booking
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}