"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import PublicPageHeader from "@/components/PublicPageHeader";
import SaveArtistButton from "@/components/SaveArtistButton";
import ArtistCard from "@/components/ArtistCard";
import SearchBar from "@/components/SearchBar";
import {
  getBrowseDistanceMiles,
  useBrowseGeolocation,
} from "@/lib/use-browse-geolocation";


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

function BrowseContent() {
  const searchParams = useSearchParams();
  const [openSort, setOpenSort] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const browseControlsRef = useRef<HTMLDivElement>(null);
  const minPriceInputRef = useRef<HTMLInputElement>(null);
  const nearbyRequestedRef = useRef(false);
  const [sortBy, setSortBy] = useState("newest");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState(
  searchParams.get("search") ?? ""
);
  const {
    userLocation,
    locationStatus,
    isLocating,
    requestLocation,
  } = useBrowseGeolocation({
    successMessage: "Using your current location.",
  });
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

    const panel = searchParams.get("panel");
    if (panel === "category" || panel === "price" || panel === "filters") {
      setOpenFilter(true);
      setOpenSort(false);
    }

    if (panel === "price") {
      window.setTimeout(() => minPriceInputRef.current?.focus(), 50);
    }

    if (searchParams.get("nearby") === "1" && !nearbyRequestedRef.current) {
      nearbyRequestedRef.current = true;
      requestLocation(() => setSortBy("nearest"));
    }
  }, [requestLocation, searchParams]);

  const useMyLocation = () => {
    requestLocation(() => setSortBy("nearest"));
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

  const getArtistDistance = useCallback((artist: Artist) => {
    if (!userLocation || artist.latitude === null || artist.longitude === null) {
      return null;
    }

    return getBrowseDistanceMiles(
      userLocation,
      artist.latitude,
      artist.longitude
    );
  }, [userLocation]);

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
    getArtistDistance,
  ]);

  const activeFilterCount =
    selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <main data-lumina-public-page className="min-h-screen overflow-x-clip bg-lumina-surface text-lumina-text">
      <PublicPageHeader backHref="/" />

      <section className="mx-auto max-w-[1600px] px-4 pb-14 pt-6 md:px-10 md:pb-20 md:pt-12 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="w-full max-w-[900px] lg:mx-auto lg:text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-lumina-border bg-lumina-surface p-1 text-[13px] shadow-[0_4px_14px_rgba(39,36,40,0.04)] md:mb-6 md:text-sm">
              <span className="rounded-full bg-lumina-black px-4 py-1.5 text-white">
                List
              </span>

              <Link
                href={buildViewLink("/browse/map")}
                className="rounded-full px-4 py-1.5 text-lumina-text-muted transition hover:text-lumina-black"
              >
                Map
              </Link>
            </div>

            <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-lumina-attention md:mb-3">
              Explore Lumina
            </p>

            <h1
              className="w-full whitespace-nowrap text-[clamp(24px,6.4vw,27px)] font-normal leading-none tracking-[-0.03em] md:max-w-[900px] md:whitespace-normal md:text-[58px] md:leading-[1.02] md:tracking-normal lg:mx-auto"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              <span className="md:hidden">Browse beauty professional</span>
              <span className="hidden md:inline">Browse beauty professionals</span>
            </h1>

            <p className="mt-2 text-sm leading-6 text-lumina-text-muted md:mt-3 md:text-[18px] md:leading-7">
              Explore {filteredAndSortedArtists.length} beauty professional
              {filteredAndSortedArtists.length !== 1 ? "s" : ""} on Lumina.
            </p>

            <button
              onClick={useMyLocation}
              disabled={isLocating}
              aria-busy={isLocating}
              className="mt-5 hidden min-h-10 items-center rounded-full border border-lumina-black bg-lumina-surface px-5 py-2 text-[14px] transition hover:bg-lumina-black hover:text-white disabled:cursor-wait disabled:opacity-60 md:inline-flex"
            >
              {isLocating ? "Locating…" : "Use my location"}
            </button>

            {locationStatus && (
              <p aria-live="polite" className="mt-2 hidden text-[13px] text-lumina-text-muted md:block">
                {locationStatus}
              </p>
            )}
          </div>

          <div className="mt-5 w-full min-w-0 max-w-[1000px] md:mt-10 lg:mx-auto">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by city, artist, or service"
              showButton={false}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[13px] text-lumina-text-muted transition hover:text-lumina-black"
              >
                Clear search
              </button>
            )}

            <div
              ref={browseControlsRef}
              className="mt-2 flex flex-nowrap items-center gap-2 text-[12px] md:mt-4 md:flex-wrap md:justify-start md:gap-3 md:text-sm lg:justify-center"
            >
              <button
                onClick={useMyLocation}
                disabled={isLocating}
                aria-busy={isLocating}
                className="mr-auto inline-flex min-h-10 shrink-0 items-center rounded-full border border-lumina-black bg-lumina-surface px-2.5 py-2 text-[11px] text-lumina-text transition hover:bg-lumina-black hover:text-white disabled:cursor-wait disabled:opacity-60 md:hidden"
              >
                {isLocating ? "Locating…" : "Use my location"}
              </button>

              <div className="relative flex shrink-0 items-center gap-2">
                <div className="static md:relative">
                  <button
                    onClick={() => {
                      setOpenFilter((current) => !current);
                      setOpenSort(false);
                    }}
                    className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-3 py-2 text-lumina-text transition hover:border-lumina-glass-border hover:bg-lumina-surface-soft md:px-4"
                  >
                    ☷ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>

                {openFilter && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-30 max-h-[min(70vh,560px)] w-[min(320px,calc(100vw-32px))] overflow-y-auto rounded-[22px] border border-lumina-glass-border bg-lumina-surface/95 p-5 text-lumina-text shadow-[0_18px_50px_rgba(39,36,40,0.10)] backdrop-blur-[14px]">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <p
                        className="text-[22px] leading-none"
                        style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                      >
                        Filters
                      </p>

                      <button
                        onClick={clearFilters}
                        className="text-xs text-lumina-text-muted transition hover:text-lumina-black"
                      >
                        Clear all
                      </button>
                    </div>

                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-lumina-attention">
                      Category
                    </p>

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
                        className={`block w-full rounded-[12px] px-3 py-2.5 text-left text-sm transition ${
                          selectedCategories.includes(item)
                            ? "bg-lumina-pearl font-medium text-lumina-text"
                            : "text-lumina-text-muted hover:bg-lumina-surface-soft"
                        }`}
                      >
                        {item}
                      </button>
                    ))}

                    <p className="mb-2 mt-5 text-[11px] uppercase tracking-[0.18em] text-lumina-attention">
                      Starting price
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        ref={minPriceInputRef}
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="min-w-0 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 py-2.5 text-sm outline-none transition focus:border-lumina-attention focus:ring-2 focus:ring-lumina-blush"
                      />

                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="min-w-0 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 py-2.5 text-sm outline-none transition focus:border-lumina-attention focus:ring-2 focus:ring-lumina-blush"
                      />
                    </div>

                    <p className="mt-3 text-[12px] text-lumina-text-muted">
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
                    className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-3 py-2 text-lumina-text transition hover:border-lumina-glass-border hover:bg-lumina-surface-soft md:px-4"
                  >
                    ☰ Sort
                  </button>

                {openSort && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(240px,calc(100vw-32px))] rounded-[22px] border border-lumina-glass-border bg-lumina-surface/95 p-3 text-lumina-text shadow-[0_18px_50px_rgba(39,36,40,0.10)] backdrop-blur-[14px]">
                    <p
                      className="px-3 pb-2 pt-1 text-[20px]"
                      style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                    >
                      Sort by
                    </p>

                    {[
                      ["newest", "Newest"],
                      ["nearest", "Nearest first"],
                      ["low", "Price low → high"],
                      ["high", "Price high → low"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={`block w-full rounded-[12px] px-3 py-2.5 text-left text-sm transition ${
                          sortBy === value
                            ? "bg-lumina-pearl font-medium text-lumina-text"
                            : "text-lumina-text-muted hover:bg-lumina-surface-soft"
                        }`}
                        onClick={() => {
                          setSortBy(value as "newest" | "nearest" | "low" | "high");
                          setOpenSort(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>

            {locationStatus && (
              <p aria-live="polite" className="mt-2 text-[12px] text-lumina-text-muted md:hidden">
                {locationStatus}
              </p>
            )}
          </div>
        </div>

        {filteredAndSortedArtists.length === 1 ? (
          <div className="mt-6 md:mt-16">
            <p className="max-w-[720px] text-[14px] leading-6 text-lumina-text-muted">
              More professionals are joining Lumina. Explore by category, try Map view, or check back as more profiles go live.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:mt-7 md:grid-cols-3 md:gap-5 lg:grid-cols-1 lg:gap-0">
              <ArtistCard
                artist={filteredAndSortedArtists[0]}
                distance={getArtistDistance(filteredAndSortedArtists[0])}
                className="w-full max-w-[400px]"
                viewerIsArtist={isArtist}
                isOwnProfile={isArtist && user?.id === filteredAndSortedArtists[0].id}
                compactMobile
              />
            </div>
          </div>
        ) : filteredAndSortedArtists.length > 1 ? (
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:mt-16 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-12">
            {filteredAndSortedArtists.map((artist) => {
              const distance = getArtistDistance(artist);

              return (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  distance={distance}
                  viewerIsArtist={isArtist}
                  isOwnProfile={isArtist && user?.id === artist.id}
                  compactMobile
                />
              );
            })}
          </div>
        ) : null}

        {filteredAndSortedArtists.length === 0 && (
          <div className="mt-12 rounded-[22px] border border-lumina-glass-border bg-lumina-glass p-8 text-center backdrop-blur-[12px]">
            <p className="text-[15px] text-lumina-text-muted">
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
        <main className="min-h-screen bg-lumina-surface px-4 py-10 text-lumina-text md:px-10">
          <p className="text-lumina-text-muted">Loading artists...</p>
        </main>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
