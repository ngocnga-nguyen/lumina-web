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
    } else if (selected.length < 2) {
      setSelected([...selected, id]);
    }
  };

  const selectedArtists = artists.filter((artist) => selected.includes(artist.id));

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/saved" className="transition hover:opacity-70">
          ← Back
        </Link>

        <div className="font-medium">Lumina</div>

        <div className="w-[60px]" />
      </header>

      <section className="px-4 py-8 md:px-10 md:py-10">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[22px] text-[#e9a8a8]">♡</span>
            <div>
              <h1 className="text-[22px] font-medium md:text-[24px]">Lash</h1>
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

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:gap-14">
          {artists.map((artist) => (
            <div key={artist.id}>
              <img
                src={artist.image}
                alt={artist.name}
                className="h-[180px] w-full object-cover rounded-[12px] md:h-[200px]"
              />

              <h2 className="mt-4 text-[18px] font-medium md:mt-5 md:text-[20px]">
                {artist.name}
              </h2>
              <p className="text-[15px] text-neutral-500 md:text-[16px]">
                {artist.role}
              </p>

              <p className="mt-3 text-[14px] text-neutral-700 md:mt-4 md:text-[15px]">
                ⭐ {artist.rating} ({artist.reviews})
              </p>

              <p className="mt-2 text-[15px] md:text-[16px]">{artist.price}</p>

              <div className="mt-6 flex items-center justify-between text-[13px] md:mt-8 md:text-[14px]">
                <span className="text-neutral-700">{artist.location}</span>
                <Link
                  href="/artist/emma-l"
                  className="text-[#d8b4b4] transition hover:text-black"
                >
                  View Profile
                </Link>
              </div>

              {compareMode && (
                <button
                  onClick={() => toggleSelect(artist.id)}
                  className={`mt-4 rounded-full border px-4 py-2 text-[14px] transition md:mt-5 ${
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

      {selected.length === 2 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 md:items-stretch md:justify-end">
          <div className="h-[82vh] w-full rounded-t-[20px] bg-[#f7f2f2] p-5 shadow-xl md:h-full md:w-[460px] md:rounded-none md:p-6">
            <button
              onClick={() => {
                setSelected([]);
                setCompareMode(false);
              }}
              className="text-[14px] text-neutral-500 transition hover:text-black"
            >
              × Close
            </button>

            <h2 className="mt-5 text-[20px] font-medium md:mt-6 md:text-[22px]">
              Compare
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-5 md:mt-8 md:gap-8">
              {selectedArtists.map((artist) => (
                <div key={artist.id} className="text-center">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="mx-auto h-[120px] w-[90px] object-cover md:h-[160px] md:w-[120px]"
                  />

                  <h3 className="mt-4 text-[17px] font-medium md:mt-5 md:text-[20px]">
                    {artist.name}
                  </h3>

                  <p className="mt-2 text-[13px] md:mt-3 md:text-[15px]">
                    ⭐ {artist.rating} ({artist.reviews})
                  </p>

                  <p className="mt-2 text-[14px] md:mt-3 md:text-[16px]">
                    start at {artist.price}
                  </p>

                  <p className="mt-2 text-[14px] md:mt-3 md:text-[16px]">
                    Verified
                  </p>

                  <p className="mt-2 text-[14px] md:mt-3 md:text-[16px]">
                    {artist.experience}
                  </p>

                  <p className="mt-2 text-[14px] md:mt-3 md:text-[16px]">
                    {artist.compareNote}
                  </p>

                  <button className="mt-4 rounded-full border border-black px-4 py-2 text-[13px] transition hover:bg-black hover:text-white md:mt-5 md:text-[14px]">
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