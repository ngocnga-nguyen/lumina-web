"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Artist = {
  id: string;
  name: string;
  role: string;
  category: "Hair" | "Lashes" | "Nails" | "Skin";
  rating: number;
  reviews: number;
  price: number;
  displayPrice: string;
  location: string;
};

export default function BrowsePage() {
  const [openSort, setOpenSort] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("default");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("savedArtists");
    if (stored) {
      setSaved(JSON.parse(stored));
    }
  }, []);

  const toggleSave = (id: string) => {
    let updated: string[] = [];

    if (saved.includes(id)) {
      updated = saved.filter((item) => item !== id);
    } else {
      updated = [...saved, id];
    }

    setSaved(updated);
    localStorage.setItem("savedArtists", JSON.stringify(updated));
  };

  const toggleArrayValue = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPrices([]);
    setSelectedRatings([]);
  };

  const artists: Artist[] = [
    {
      id: "linsey-j",
      name: "Linsey J",
      role: "Hair Stylist",
      category: "Hair",
      rating: 4.6,
      reviews: 55,
      price: 68,
      displayPrice: "From $68",
      location: "Broken Arrow, OK",
    },
    {
      id: "emma-l",
      name: "Emma L",
      role: "Lash Artist",
      category: "Lashes",
      rating: 4.2,
      reviews: 34,
      price: 45,
      displayPrice: "From $45",
      location: "Claremore, OK",
    },
    {
      id: "lily-w",
      name: "Lily W",
      role: "Aesthetician",
      category: "Skin",
      rating: 4.5,
      reviews: 23,
      price: 55,
      displayPrice: "From $55",
      location: "Tulsa, OK",
    },
    {
      id: "anna-h",
      name: "Anna H",
      role: "Nail Technician",
      category: "Nails",
      rating: 4.8,
      reviews: 45,
      price: 35,
      displayPrice: "From $35",
      location: "Pryor, OK",
    },
  ];

  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists];

    if (selectedCategories.length > 0) {
      result = result.filter((artist) =>
        selectedCategories.includes(artist.category)
      );
    }

    if (selectedPrices.length > 0) {
      result = result.filter((artist) => {
        return selectedPrices.some((priceLevel) => {
          if (priceLevel === "$") return artist.price < 50;
          if (priceLevel === "$$") return artist.price >= 50 && artist.price <= 80;
          if (priceLevel === "$$$") return artist.price > 80;
          return false;
        });
      });
    }

    if (selectedRatings.length > 0) {
      result = result.filter((artist) => {
        return selectedRatings.some((ratingLevel) => {
          if (ratingLevel === "4.5+") return artist.rating >= 4.5;
          if (ratingLevel === "4.0+") return artist.rating >= 4.0;
          return false;
        });
      });
    }

    result.sort((a, b) => {
      if (sortBy === "top") return b.rating - a.rating;
      if (sortBy === "low") return a.price - b.price;
      if (sortBy === "high") return b.price - a.price;
      return 0;
    });

    return result;
  }, [artists, selectedCategories, selectedPrices, selectedRatings, sortBy]);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* NAV */}
      <header className="flex items-center justify-between bg-[#faf6f5] px-10 py-6 text-[15px]">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div>Browse Artists</div>

        <Link href="/saved" className="flex items-center gap-3">
          <span className="text-[20px] text-[#e9a8a8]">♡</span>
          <span>Saved</span>
        </Link>
      </header>

      {/* HEADER */}
      <section className="px-10 pt-10 pb-20">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-[54px] leading-[1.02] font-semibold"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Professionals near me
            </h1>

            <p className="mt-3 text-[18px] text-neutral-700">
              Discover {filteredAndSortedArtists.length} beauty professionals
            </p>
          </div>

          <div className="w-[580px]">
            <div className="flex items-center rounded-full bg-[#efedeb] px-5 py-3">
              <span className="mr-3 text-lg text-neutral-500">⌕</span>
              <input
                type="text"
                placeholder="search professional near me"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          <Link href="/browse/map" className="mt-2">
            Map
          </Link>
        </div>

        {/* FILTER + SORT */}
        <div className="mt-10 flex items-center gap-10 text-[15px] text-neutral-700">
          {/* FILTER */}
          <div className="relative">
            <button onClick={() => setOpenFilter(!openFilter)}>
              ☷ Filter
            </button>

            {openFilter && (
              <div className="absolute left-0 top-8 z-10 w-[260px] bg-white p-4 shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium">Filters</p>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-neutral-500 hover:text-black"
                  >
                    Clear all
                  </button>
                </div>

                <p className="mb-2 font-medium">Category</p>
                <button
                  onClick={() =>
                    toggleArrayValue("Hair", selectedCategories, setSelectedCategories)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedCategories.includes("Hair")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  Hair
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("Lashes", selectedCategories, setSelectedCategories)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedCategories.includes("Lashes")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  Lashes
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("Nails", selectedCategories, setSelectedCategories)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedCategories.includes("Nails")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  Nails
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("Skin", selectedCategories, setSelectedCategories)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedCategories.includes("Skin")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  Skin
                </button>

                <p className="mb-2 mt-4 font-medium">Price</p>
                <button
                  onClick={() =>
                    toggleArrayValue("$", selectedPrices, setSelectedPrices)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedPrices.includes("$")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  $
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("$$", selectedPrices, setSelectedPrices)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedPrices.includes("$$")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  $$
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("$$$", selectedPrices, setSelectedPrices)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedPrices.includes("$$$")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  $$$
                </button>

                <p className="mb-2 mt-4 font-medium">Rating</p>
                <button
                  onClick={() =>
                    toggleArrayValue("4.5+", selectedRatings, setSelectedRatings)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedRatings.includes("4.5+")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  4.5+
                </button>
                <button
                  onClick={() =>
                    toggleArrayValue("4.0+", selectedRatings, setSelectedRatings)
                  }
                  className={`block w-full py-1 text-left text-sm ${
                    selectedRatings.includes("4.0+")
                      ? "text-black font-medium"
                      : "text-neutral-600"
                  }`}
                >
                  4.0+
                </button>
              </div>
            )}
          </div>

          {/* SORT */}
          <div className="relative">
            <button onClick={() => setOpenSort(!openSort)}>
              ☰ Sort
            </button>

            {openSort && (
              <div className="absolute left-0 top-8 z-10 w-[200px] bg-white p-3 shadow-md">
                <button
                  className="block w-full py-1 text-left"
                  onClick={() => {
                    setSortBy("top");
                    setOpenSort(false);
                  }}
                >
                  Top-rated
                </button>
                <button
                  className="block w-full py-1 text-left"
                  onClick={() => {
                    setSortBy("low");
                    setOpenSort(false);
                  }}
                >
                  Price low → high
                </button>
                <button
                  className="block w-full py-1 text-left"
                  onClick={() => {
                    setSortBy("high");
                    setOpenSort(false);
                  }}
                >
                  Price high → low
                </button>
                <button
                  className="block w-full py-1 text-left"
                  onClick={() => {
                    setSortBy("default");
                    setOpenSort(false);
                  }}
                >
                  Default
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE FILTER TAGS */}
        {(selectedCategories.length > 0 ||
          selectedPrices.length > 0 ||
          selectedRatings.length > 0) && (
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {selectedCategories.map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#f3ecea] px-4 py-2"
              >
                {item}
              </span>
            ))}
            {selectedPrices.map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#f3ecea] px-4 py-2"
              >
                {item}
              </span>
            ))}
            {selectedRatings.map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#f3ecea] px-4 py-2"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {/* GRID */}
        <div className="mt-16 grid grid-cols-4 gap-12">
          {filteredAndSortedArtists.map((artist) => (
            <div key={artist.id}>
              <div className="relative h-[200px] bg-[#dddddd]">
                <button
                  onClick={() => toggleSave(artist.id)}
                  className="absolute right-3 top-3 text-[19px] transition hover:scale-110"
                >
                  <span className="text-[#e9a8a8]">
                    {saved.includes(artist.id) ? "♥" : "♡"}
                  </span>
                </button>
              </div>

              <h2 className="mt-4 text-[18px] font-medium">
                {artist.name}
              </h2>

              <p className="text-neutral-500">{artist.role}</p>

              <p className="mt-3 text-sm text-neutral-500">
                ⭐ {artist.rating} ({artist.reviews} reviews)
              </p>

              <p className="mt-2 font-medium">{artist.displayPrice}</p>

              <div className="mt-6 flex justify-between text-sm">
                <span>{artist.location}</span>

                <Link
                  href={`/artist/${artist.id}`}
                  className="text-[#d8b4b4] hover:text-black transition"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}