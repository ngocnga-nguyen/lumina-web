"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";
import SaveArtistButton from "@/components/SaveArtistButton";
import ArtistCard from "@/components/ArtistCard";
import SearchBar from "@/components/SearchBar";


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

function BrowseContent() {
  const searchParams = useSearchParams();
  const [openSort, setOpenSort] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const browseControlsRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState(
  searchParams.get("search") ?? ""
);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [user, setUser] = useState<any>(null);
const [isArtist, setIsArtist] = useState(false);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      if (
        browseControlsRef.current &&
        !browseControlsRef.current.contains(event.target as Node)
      ) {
        setOpenFilter(false);
        setOpenSort(false);
      }
    };

    const closeMenusWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFilter(false);
        setOpenSort(false);
      }
    };

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenusWithEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenusWithEscape);
    };
  }, []);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const buildViewLink = (path: string) => {
  const params = new URLSearchParams();

  if (searchQuery) params.set("q", searchQuery);
  if (sortBy) params.set("sort", sortBy);
  if (selectedCategories.length > 0) {
    params.set("categories", selectedCategories.join(","));
  }

  const queryString = params.toString();

  return queryString ? `${path}?${queryString}` : path;
};

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
  data: { user: currentUser },
} = await supabase.auth.getUser();

setUser(currentUser);

      if (!currentUser) return;
      const { data: artistProfile } = await supabase
  .from("artists")
  .select("id")
  .eq("id", currentUser.id)
  .maybeSingle();

setIsArtist(!!artistProfile);

    };

    fetchInitialData();
    const q = searchParams.get("q");
if (q) {
  setSearchQuery(q);
}

const sort = searchParams.get("sort");
if (sort) {
  setSortBy(sort);
}

const categories = searchParams.get("categories");
if (categories) {
  setSelectedCategories(categories.split(","));
}
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
     <header className="grid grid-cols-3 items-center bg-[#faf6f5] px-4 py-5 md:px-10">

  <div className="justify-self-start">
    <Link href="/" className="text-sm transition hover:opacity-70">
      ← Home
    </Link>
  </div>

  <Link href="/" className="justify-self-center font-medium transition hover:opacity-70">
    Lumina
  </Link>
  <div className="justify-self-end">

  <AccountMenu />

</div>

</header>

      <section className="px-4 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_560px] md:items-start">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-neutral-200 p-1 text-sm">
  <span className="rounded-full bg-black px-4 py-1.5 text-white">
    List
  </span>

  <Link
    href={buildViewLink("/browse/map")}
    className="rounded-full px-4 py-1.5 text-neutral-500 transition hover:text-black"
  >
    Map
  </Link>
</div>
            <h1
              className="text-[32px] font-semibold leading-[1.02] md:text-[54px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Browse beauty professionals
            </h1>

            <p className="mt-2 text-sm text-neutral-700 md:mt-3 md:text-[18px]">
  Discover {filteredAndSortedArtists.length} trusted beauty professional
  {filteredAndSortedArtists.length !== 1 ? "s" : ""}.
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

          </div>

          <div className="w-full min-w-0">
            <SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search by city, artist, or service"
  showButton={false}
/>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[13px] text-neutral-500 hover:text-black"
              >
                Clear search
              </button>
            )}
          
<div ref={browseControlsRef} className="mt-4 flex items-center gap-8 text-sm text-neutral-700 md:justify-end md:text-[15px]">
          <div className="relative">
            <button
              onClick={() => {
                setOpenFilter((current) => !current);
                setOpenSort(false);
              }}
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
              onClick={() => {
                setOpenSort((current) => !current);
                setOpenFilter(false);
              }}
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
      </div>
        </div>

        

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {filteredAndSortedArtists.map((artist) => {
  const distance = getArtistDistance(artist);

  return (
    <ArtistCard
      key={artist.id}
      artist={artist}
      distance={distance}
      viewerIsArtist={isArtist}
      isOwnProfile={isArtist && user?.id === artist.id}
    />
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
export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white px-4 py-10 text-black md:px-10">
          <p className="text-neutral-500">Loading artists...</p>
        </main>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
