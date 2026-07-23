"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabase";
import AccountMenu from "@/components/AccountMenu";
import { useSearchParams } from "next/navigation";
import SaveArtistButton from "@/components/SaveArtistButton";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  latitude: number | null;
  longitude: number | null;
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

function BrowseMapContent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [openSort, setOpenSort] = useState(false);
const [openFilter, setOpenFilter] = useState(false);
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

  const [userLocation, setUserLocation] =
    useState<UserLocation | null>(null);

  const [locationStatus, setLocationStatus] = useState("");

  



  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.log(error);
        return;
      }

      setArtists(data || []);

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
  }, []);

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
    if (!navigator.geolocation) {
      setLocationStatus(
        "Location is not supported on this browser."
      );

      return;
    }

    setLocationStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserLocation(currentLocation);

        setLocationStatus(
          "Showing nearest artists first."
        );

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [
              currentLocation.longitude,
              currentLocation.latitude,
            ],
            zoom: 9.5,
          });

          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          userMarkerRef.current = new mapboxgl.Marker({
            color: "#000000",
          })
            .setLngLat([
              currentLocation.longitude,
              currentLocation.latitude,
            ])
            .setPopup(
              new mapboxgl.Popup().setText("You are here")
            )
            .addTo(mapRef.current);
        }
      },
      () => {
        setLocationStatus(
          "Location permission was denied."
        );
      }
    );
  };

  const getArtistDistance = (artist: Artist) => {
    if (
      !userLocation ||
      artist.latitude === null ||
      artist.longitude === null
    ) {
      return null;
    }

    return getDistanceMiles(
      userLocation.latitude,
      userLocation.longitude,
      artist.latitude,
      artist.longitude
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
  ]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) =>
      marker.remove()
    );

    markersRef.current = [];

    filteredArtists.forEach((artist) => {
      if (!artist.latitude || !artist.longitude)
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

      markerEl.addEventListener("click", () => {
        setSelectedArtist(artist);

        mapRef.current?.flyTo({
          center: [
            artist.longitude!,
            artist.latitude!,
          ],
          zoom: 11.5,
        });
      });

      markersRef.current.push(marker);
    });

    if (filteredArtists.length > 0) {
      setSelectedArtist(filteredArtists[0]);

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
    <main className="min-h-screen bg-white text-black">
      <header className="grid grid-cols-3 items-center bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
  <div className="justify-self-start">
    <Link href="/" className="font-medium transition hover:opacity-70">
      Lumina
    </Link>
  </div>

  <Link
  href="/browse"
  className="hidden justify-self-center transition hover:opacity-70 md:block"
>
  Browse Artists
</Link>

  <div className="justify-self-end">
  <AccountMenu />
</div>
</header>

      <section className="px-4 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            
<div className="mb-5 flex items-center rounded-full border border-neutral-200 p-1 text-sm w-fit">
  <Link
      href={buildViewLink("/browse")}
    className="rounded-full px-4 py-1.5 text-neutral-500 transition hover:text-black"
  >
    List
  </Link>

  <span className="rounded-full bg-black px-4 py-1.5 text-white">
    Map
  </span>
</div>
            <h1
              className="mt-5 text-[32px] leading-[1.02] font-semibold md:mt-8 md:text-[54px]"
              style={{
                fontFamily:
                  "Georgia, Times New Roman, serif",
              }}
            >
              Explore on map
            </h1>

            <p className="mt-2 text-[15px] text-neutral-700 md:mt-3 md:text-[18px]">
              Discover {filteredArtists.length} beauty
              professionals
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

          <div className="w-full md:w-[620px]">
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

  <div className="mt-4 flex items-center justify-end gap-8 text-sm text-neutral-700 md:text-[15px]">
    <div className="relative">
      <button
        onClick={() => setOpenFilter(!openFilter)}
        className="transition hover:text-black"
      >
        ☷ Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>

      {openFilter && (
        <div className="absolute right-0 top-8 z-20 w-[280px] rounded-[18px] border border-neutral-200 bg-white p-4 shadow-lg">
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
        <div className="absolute right-0 top-8 z-20 w-[220px] rounded-[18px] border border-neutral-200 bg-white p-3 shadow-lg">
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


        <div className="relative mt-10">
          <div className="relative">
  <div
    ref={mapContainer}
    className="h-[430px] w-full overflow-hidden rounded-[28px] bg-[#f1ece8] md:h-[620px]"
  />

  <div className="absolute bottom-5 right-5 z-20 w-[calc(100%-40px)] max-w-[340px]">
    <div className="relative overflow-hidden rounded-[26px] border border-white/30 bg-white/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.40)] backdrop-blur-3xl">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent" />

<div className="relative z-10">


      {selectedArtist ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                Selected artist
              </p>

              <h3
                className="mt-2 text-[25px] leading-[1.05]"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                {selectedArtist.name}
              </h3>

              <p className="mt-2 text-[14px] text-neutral-600">
                {selectedArtist.category}
              </p>
            </div>

            <SaveArtistButton
              artistId={selectedArtist.id}
              artistName={selectedArtist.name}
            />
          </div>

          <div className="mt-5 flex items-center gap-3 text-[13px] text-neutral-700">
            <span>From ${selectedArtist.price_start}</span>
            <span className="text-neutral-400">•</span>
            <span>
              {getArtistDistance(selectedArtist) !== null
                ? `${getArtistDistance(selectedArtist)?.toFixed(1)} mi`
                : "Distance unavailable"}
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-[1.5] text-neutral-600">
            {selectedArtist.location}
          </p>

          <Link
            href={`/artist/${selectedArtist.id}`}
            className="mt-5 inline-flex w-full items-center justify-between rounded-full bg-black px-5 py-3 text-[14px] text-white transition hover:opacity-85"
          >
            View Profile
            <span>→</span>
          </Link>
        </>
            ) : (
        <div className="py-3 text-center">
          <p className="text-[15px] font-medium">
            Select an artist
          </p>

          <p className="mt-1 text-[13px] text-neutral-500">
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
        <main className="min-h-screen bg-white px-4 py-10 text-black md:px-10">
          <p className="text-neutral-500">Loading map...</p>
        </main>
      }
    >
      <BrowseMapContent />
    </Suspense>
  );
}