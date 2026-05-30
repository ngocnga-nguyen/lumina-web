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
  latitude: number | null;
  longitude: number | null;
  profile_image_url?: string | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

function getDistanceMiles(
  userLat: number,
  userLng: number,
  artistLat: number,
  artistLng: number
) {
  const R = 3958.8;
  const dLat = ((artistLat - userLat) * Math.PI) / 180;
  const dLng = ((artistLng - userLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((artistLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BrowsePage() {
  const [openSort, setOpenSort] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (artistsError) {
        console.log(artistsError);
      } else {
        setArtists(artistsData || []);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: savedData, error: savedError } = await supabase
        .from("saved_artists")
        .select("artist_id")
        .eq("user_id", user.id);

      if (savedError) {
        console.log(savedError);
        return;
      }

      setSaved((savedData || []).map((item) => item.artist_id));
    };

    fetchInitialData();
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported on this browser.");
      return;
    }

    setLocationStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setSortBy("nearest");
        setLocationStatus("Using your current location.");
      },
      () => {
        setLocationStatus("Location permission was denied.");
      }
    );
  };

  const toggleSave = async (artistId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveStatus("Please log in to save artists.");
      return;
    }

    const isAlreadySaved = saved.includes(artistId);

    if (isAlreadySaved) {
      setSaved((current) => current.filter((id) => id !== artistId));

      const { error } = await supabase
        .from("saved_artists")
        .delete()
        .eq("user_id", user.id)
        .eq("artist_id", artistId);

      if (error) {
        console.log(error);
        setSaved((current) => [...current, artistId]);
        setSaveStatus("Could not remove saved artist.");
        return;
      }

      setSaveStatus("");
      return;
    }

    setSaved((current) => [...current, artistId]);

    const { error } = await supabase.from("saved_artists").insert([
      {
        user_id: user.id,
        artist_id: artistId,
      },
    ]);

    if (error) {
      console.log(error);
      setSaved((current) => current.filter((id) => id !== artistId));
      setSaveStatus("Could not save artist.");
      return;
    }

    setSaveStatus("");
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
  };

  const getArtistDistance = (artist: Artist) => {
    if (!userLocation || artist.latitude === null || artist.longitude === null) {
      return null;
    }

    return getDistanceMiles(
      userLocation.latitude,
      userLocation.longitude,
      artist.latitude,
      artist.longitude
    );
  };

  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      result = result.filter(
        (artist) =>
          artist.name.toLowerCase().includes(query) ||
          artist.category.toLowerCase().includes(query) ||
          artist.location.toLowerCase().includes(query)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((artist) =>
        selectedCategories.includes(artist.category)
      );
    }

    if (minPrice.trim()) {
      result = result.filter(
        (artist) => artist.price_start >= Number(minPrice)
      );
    }

    if (maxPrice.trim()) {
      result = result.filter(
        (artist) => artist.price_start <= Number(maxPrice)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "low") return a.price_start - b.price_start;
      if (sortBy === "high") return b.price_start - a.price_start;

      if (sortBy === "nearest" && userLocation) {
        const aDistance = getArtistDistance(a);
        const bDistance = getArtistDistance(b);

        if (aDistance === null && bDistance === null) return 0;
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;

        return aDistance - bDistance;
      }

      return 0;
    });

    return result;
  }, [
    artists,
    searchQuery,
    selectedCategories,
    minPrice,
    maxPrice,
    sortBy,
    userLocation,
  ]);

  const activeFilterCount =
    selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 md:px-10">
        <Link href="/" className="font-medium transition hover:opacity-70">
          Lumina
        </Link>

        <div className="hidden md:block">Browse Artists</div>

        <Link href="/saved" className="flex items-center gap-2">
          <span className="text-[16px] text-[#e9a8a8]">♡</span>
          <span className="text-sm">Saved</span>
        </Link>
      </header>

      <section className="px-4 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1
              className="text-[32px] font-semibold leading-[1.02] md:text-[54px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Find beauty professionals
            </h1>

            <p className="mt-2 text-sm text-neutral-700 md:mt-3 md:text-[18px]">
              Discover {filteredAndSortedArtists.length} beauty professionals
            </p>

            <button
              onClick={useMyLocation}
              className="mt-4 rounded-full border border-black px-5 py-2 text-[14px] transition hover:bg-black hover:text-white"
            >
              Use my location
            </button>

            {locationStatus && (
              <p className="mt-2 text-[13px] text-neutral-500">
                {locationStatus}
              </p>
            )}

            {saveStatus && (
              <p className="mt-2 text-[13px] text-neutral-500">
                {saveStatus}
              </p>
            )}
          </div>

          <div className="w-full md:w-[580px]">
            <div className="flex items-center rounded-full bg-[#efedeb] px-4 py-3 md:px-5">
              <span className="mr-3 text-lg text-neutral-500">⌕</span>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search by city, artist, or service"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[13px] text-neutral-500 hover:text-black"
              >
                Clear search
              </button>
            )}
          </div>

          <Link
            href="/browse/map"
            className="text-sm transition hover:opacity-60 md:mt-2 md:text-[15px]"
          >
            Map
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-6 text-sm text-neutral-700 md:mt-10 md:gap-10 md:text-[15px]">
          <div className="relative">
            <button
              onClick={() => setOpenFilter(!openFilter)}
              className="transition hover:text-black"
            >
              ☷ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            {openFilter && (
              <div className="absolute left-0 top-8 z-20 w-[280px] rounded-[18px] border border-neutral-200 bg-white p-4 shadow-lg">
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

                {[
                  "Hair Stylist",
                  "Lash Artist",
                  "Nail Technician",
                  "Aesthetician",
                  "Makeup Artist",
                  "Brow Artist",
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleCategory(item)}
                    className={`block w-full rounded-[10px] px-2 py-2 text-left text-sm ${
                      selectedCategories.includes(item)
                        ? "bg-[#faf6f5] font-medium text-black"
                        : "text-neutral-600 hover:bg-[#faf6f5]"
                    }`}
                  >
                    {item}
                  </button>
                ))}

                <p className="mb-2 mt-5 font-medium">Price range</p>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-[12px] border border-neutral-200 px-3 py-2 text-sm outline-none"
                  />

                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-[12px] border border-neutral-200 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <p className="mt-3 text-[12px] text-neutral-500">
                  Example: Min 30, Max 100
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenSort(!openSort)}
              className="transition hover:text-black"
            >
              ☰ Sort
            </button>

            {openSort && (
              <div className="absolute left-0 top-8 z-20 w-[220px] rounded-[18px] border border-neutral-200 bg-white p-3 shadow-lg">
                <button
                  className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-[#faf6f5]"
                  onClick={() => {
                    setSortBy("newest");
                    setOpenSort(false);
                  }}
                >
                  Newest
                </button>

                <button
                  className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-[#faf6f5]"
                  onClick={() => {
                    setSortBy("nearest");
                    setOpenSort(false);
                  }}
                >
                  Nearest first
                </button>

                <button
                  className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-[#faf6f5]"
                  onClick={() => {
                    setSortBy("low");
                    setOpenSort(false);
                  }}
                >
                  Price low → high
                </button>

                <button
                  className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-[#faf6f5]"
                  onClick={() => {
                    setSortBy("high");
                    setOpenSort(false);
                  }}
                >
                  Price high → low
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {filteredAndSortedArtists.map((artist) => {
            const distance = getArtistDistance(artist);

            return (
              <div key={artist.id}>
                <div className="relative h-[180px] overflow-hidden rounded-[12px] bg-[#dddddd] md:h-[200px]">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      Profile Image
                    </div>
                  )}

                  <button
                    onClick={() => toggleSave(artist.id)}
                    className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[19px] transition hover:scale-110"
                  >
                    <span className="text-[#e9a8a8]">
                      {saved.includes(artist.id) ? "♥" : "♡"}
                    </span>
                  </button>
                </div>

                <h2 className="mt-4 text-[18px] font-medium">{artist.name}</h2>

                <p className="text-neutral-500">{artist.category}</p>

                <p className="mt-3 text-sm text-neutral-500">⭐ New profile</p>

                <p className="mt-2 font-medium">From ${artist.price_start}</p>

                {distance !== null && (
                  <p className="mt-1 text-[13px] text-neutral-500">
                    {distance.toFixed(1)} miles away
                  </p>
                )}

                <div className="mt-6 flex justify-between text-sm">
                  <span>{artist.location}</span>

                  <Link
                    href={`/artist/${artist.id}`}
                    className="text-[#d8b4b4] transition hover:text-black"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAndSortedArtists.length === 0 && (
          <div className="mt-12 rounded-[20px] bg-[#fbf7f6] p-6 text-center">
            <p className="text-[15px] text-neutral-600">
              No artists found. Try searching another city, service, or name.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}