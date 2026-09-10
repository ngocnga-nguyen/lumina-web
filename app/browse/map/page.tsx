"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabase";
import PublicPageHeader from "@/components/PublicPageHeader";
import { useSearchParams } from "next/navigation";
import SaveArtistButton from "@/components/SaveArtistButton";
import SearchBar from "@/components/SearchBar";
import { MapPin } from "lucide-react";
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
};

function BrowseMapContent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerIsArtist, setViewerIsArtist] = useState(false);
  const isPinnedRef = useRef(false);
  const cardHoverRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [openSort, setOpenSort] = useState(false);
const [openFilter, setOpenFilter] = useState(false);
const browseControlsRef = useRef<HTMLDivElement>(null);
const searchParams = useSearchParams();

const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

const [sortBy, setSortBy] = useState("newest");
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

  const {
    userLocation,
    locationStatus,
    isLocating,
    requestLocation,
  } = useBrowseGeolocation({
    successMessage: "Using your current location.",
  });

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



  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.log(error);
        return;
      }

      setArtists(data || []);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setViewerUserId(user?.id || null);

      if (user) {
        const { data: artistAccount } = await supabase
          .from("artists")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        setViewerIsArtist(Boolean(artistAccount));
      }

    };

    fetchArtists();
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
  }, [searchParams]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-95.9928, 36.154],
      zoom: 8.5,
    });

    mapRef.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );
  }, []);


  const useMyLocation = () => {
    requestLocation(() => setSortBy("nearest"));
  };

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 9.5,
    });

    userMarkerRef.current?.remove();
    userMarkerRef.current = new mapboxgl.Marker({
      color: "#000000",
    })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .setPopup(new mapboxgl.Popup().setText("You are here"))
      .addTo(mapRef.current);
  }, [userLocation]);

  const getArtistDistance = useCallback((artist: Artist) => {
    if (
      !userLocation ||
      artist.latitude === null ||
      artist.longitude === null
    ) {
      return null;
    }

    return getBrowseDistanceMiles(
      userLocation,
      artist.latitude,
      artist.longitude
    );
  }, [userLocation]);
const toggleCategory = (category: string) => {
  setSelectedCategories((current) =>
    current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]
  );
};

const clearFilters = () => {
  setSelectedCategories([]);
  setSearchQuery("");
};

const activeFilterCount = selectedCategories.length;

  const filteredArtists = useMemo(() => {
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
    sortBy,
    userLocation,
    getArtistDistance,
  ]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) =>
      marker.remove()
    );

    markersRef.current = [];

    filteredArtists.forEach((artist) => {
      if (artist.latitude === null || artist.longitude === null)
        return;

      const markerEl = document.createElement("button");

      markerEl.type = "button";
      markerEl.innerHTML = "📍";

      markerEl.style.fontSize = "28px";
      markerEl.style.cursor = "pointer";

      markerEl.style.filter =
        "drop-shadow(0 3px 4px rgba(0,0,0,0.25))";

      const marker = new mapboxgl.Marker({
        element: markerEl,
      })
        .setLngLat([
          artist.longitude,
          artist.latitude,
        ])
        .addTo(mapRef.current!);

      markerEl.addEventListener("mouseenter", () => {
  if (!isPinnedRef.current) {
    setSelectedArtist(artist);
  }

  mapRef.current?.flyTo({
    center: [
  artist.longitude!,
  artist.latitude!,
],
    zoom: 11.5,
  });
});
markerEl.addEventListener("click", () => {

  if (

    isPinnedRef.current &&

    selectedArtist?.id === artist.id

  ) {

    isPinnedRef.current = false;

    setSelectedArtist(null);

    return;

  }

  isPinnedRef.current = true;

  setSelectedArtist(artist);

  mapRef.current?.flyTo({

    center: [

      artist.longitude!,

      artist.latitude!,

    ],

    zoom: 11.5,

  });

});
markerEl.addEventListener("mouseleave", () => {
  setTimeout(() => {
    if (!isPinnedRef.current && !cardHoverRef.current) {
      setSelectedArtist(null);
    }
  }, 400);
});
      markersRef.current.push(marker);
    });

    if (filteredArtists.length > 0) {

      const firstWithCoords = filteredArtists.find(
        (artist) =>
          artist.latitude !== null &&
          artist.longitude !== null
      );

      if (firstWithCoords && !userLocation) {
        mapRef.current.flyTo({
          center: [
            firstWithCoords.longitude!,
            firstWithCoords.latitude!,
          ],
          zoom: 9.5,
        });
      }
    } else {
      setSelectedArtist(null);
    }
  }, [filteredArtists, userLocation]);

  return (
    <main data-lumina-public-page className="min-h-screen bg-lumina-surface text-lumina-text">
      <PublicPageHeader backHref="/" />

      <section className="px-4 pb-14 pt-6 md:px-10 md:pb-20 md:pt-10">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            
<div className="mb-4 flex w-fit items-center rounded-full border border-lumina-border bg-lumina-surface p-1 text-[13px] md:mb-5 md:text-sm">
  <Link
      href={buildViewLink("/browse")}
    className="rounded-full px-4 py-1.5 text-lumina-text-muted transition hover:text-lumina-black"
  >
    List
  </Link>

  <span className="rounded-full bg-lumina-black px-4 py-1.5 text-white">
    Map
  </span>
            </div>
            <h1
              className="mt-0 text-[34px] font-normal leading-[1.02] md:mt-8 md:text-[58px]"
              style={{
                fontFamily:
                  "Georgia, Times New Roman, serif",
              }}
            >
              Explore on map
            </h1>

            <p className="mt-2 text-[14px] leading-6 text-lumina-text-muted md:mt-3 md:text-[18px] md:leading-7">
              Discover {filteredArtists.length} beauty
              professionals
            </p>

            <button
              onClick={useMyLocation}
              disabled={isLocating}
              aria-busy={isLocating}
              aria-label={isLocating ? "Finding your location" : "Use my location"}
              className="mt-4 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-lumina-black bg-lumina-surface px-2.5 py-2 text-[11px] text-lumina-text transition hover:bg-lumina-black hover:text-white disabled:cursor-wait disabled:opacity-60 md:px-5 md:text-[14px]"
            >
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 md:hidden" strokeWidth={1.8} />
              <span className="md:hidden">{isLocating ? "Locating…" : "Location"}</span>
              <span className="hidden md:inline">{isLocating ? "Locating…" : "Use my location"}</span>
            </button>

            {locationStatus && (
              <p aria-live="polite" className="mt-2 text-[13px] text-lumina-text-muted">
                {locationStatus}
              </p>
            )}
          </div>

          <div className="w-full lg:w-[620px]">
  <div className="w-full lg:w-[620px]">
  <SearchBar
    value={searchQuery}
    onChange={setSearchQuery}
    placeholder="Search by city, artist, or service"
    showButton={false}
  />
</div>

  <div ref={browseControlsRef} className="mt-3 flex items-center justify-end gap-2 text-[13px] text-lumina-text md:mt-4 md:gap-8 md:text-[15px]">
    <div className="relative">
      <button
        onClick={() => {
          setOpenFilter((current) => !current);
          setOpenSort(false);
        }}
        className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-3.5 py-2 transition hover:border-lumina-glass-border hover:bg-lumina-surface-soft md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0"
      >
        ☷ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>

      {openFilter && (
        <div className="absolute right-0 top-8 z-20 w-[280px] rounded-[18px] border border-lumina-glass-border bg-lumina-surface/95 p-4 text-lumina-text shadow-lg backdrop-blur-[14px]">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium">Filters</p>

            <button
              onClick={clearFilters}
              className="text-xs text-lumina-text-muted hover:text-lumina-black"
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
                  ? "bg-lumina-pearl font-medium text-lumina-text"
                  : "text-lumina-text-muted hover:bg-lumina-surface-soft"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>

    <div className="relative">
      <button
        onClick={() => {
          setOpenSort((current) => !current);
          setOpenFilter(false);
        }}
        className="min-h-10 rounded-full border border-lumina-border bg-lumina-surface px-3.5 py-2 transition hover:border-lumina-glass-border hover:bg-lumina-surface-soft md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0"
      >
        ☰ Sort
      </button>

      {openSort && (
        <div className="absolute right-0 top-8 z-20 w-[220px] rounded-[18px] border border-lumina-glass-border bg-lumina-surface/95 p-3 text-lumina-text shadow-lg backdrop-blur-[14px]">
          <button
            className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-lumina-surface-soft"
            onClick={() => {
              setSortBy("newest");
              setOpenSort(false);
            }}
          >
            Newest
          </button>

          <button
            className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-lumina-surface-soft"
            onClick={() => {
              setSortBy("nearest");
              setOpenSort(false);
            }}
          >
            Nearest first
          </button>

          <button
            className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-lumina-surface-soft"
            onClick={() => {
              setSortBy("low");
              setOpenSort(false);
            }}
          >
            Price low → high
          </button>

          <button
            className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-lumina-surface-soft"
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


        <div className="relative mt-7 md:mt-10">
          <div className="relative">
  <div
    ref={mapContainer}
    className="h-[430px] w-full overflow-hidden rounded-[28px] bg-lumina-pearl md:h-[620px]"
  />

  <div className="absolute bottom-3 right-3 z-20 w-[calc(100%-24px)] max-w-[380px] sm:bottom-5 sm:right-5 sm:w-[calc(100%-40px)]"
    onMouseEnter={() => {
    cardHoverRef.current = true;
  }}

onMouseLeave={() => {
  cardHoverRef.current = false;

  if (!isPinnedRef.current) {
    setSelectedArtist(null);
   }

  }}
>
    <div className="relative overflow-hidden rounded-[22px] border border-lumina-glass-border bg-lumina-glass p-4 text-lumina-text shadow-[0_20px_60px_rgba(39,36,40,0.10),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[14px] sm:rounded-[26px] sm:p-6">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-lumina-surface/35 via-lumina-surface/10 to-transparent" />

<div className="relative z-10">


      {selectedArtist ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">
                {viewerIsArtist && viewerUserId === selectedArtist.id
                  ? "Your profile"
                  : "Selected artist"}
              </p>

              <h3
                className="mt-2 text-[25px] leading-[1.05]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                {selectedArtist.name}
              </h3>

              <p className="mt-2 text-[14px] text-lumina-text-muted">
                {selectedArtist.category}
              </p>
            </div>

            <SaveArtistButton
              artistId={selectedArtist.id}
              artistName={selectedArtist.name}
              viewerIsArtist={viewerIsArtist}
            />
          </div>

          <div className="mt-5 flex items-center gap-3 text-[13px] text-lumina-text">
            <span>From ${selectedArtist.price_start}</span>
            <span className="text-lumina-text-muted">•</span>
            <span>
              {getArtistDistance(selectedArtist) !== null
                ? `${getArtistDistance(selectedArtist)?.toFixed(1)} mi`
                : "Distance unavailable"}
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-[1.5] text-lumina-text-muted">
            {selectedArtist.location}
          </p>

          <Link
            href={`/artist/${selectedArtist.id}`}
            className="mt-5 inline-flex w-full items-center justify-between rounded-full bg-lumina-black px-5 py-3 text-[14px] text-white transition hover:opacity-85"
          >
            {viewerIsArtist && viewerUserId === selectedArtist.id
              ? "View your public profile"
              : "View Profile"}
            <span>→</span>
          </Link>
        </>
            ) : (
        <div className="py-3 text-center">
          <p className="text-[15px] font-medium">
            Select an artist
          </p>

          <p className="mt-1 text-[13px] text-lumina-text-muted">
            Choose a map marker to preview their profile.
          </p>
        </div>
      )}
    </div>
  </div>
</div>
          </div>
        </div>
      </section>
    </main>
  );
}
export default function BrowseMapPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-lumina-surface px-4 py-10 text-lumina-text md:px-10">
          <p className="text-lumina-text-muted">Loading map...</p>
        </main>
      }
    >
      <BrowseMapContent />
    </Suspense>
  );
}
