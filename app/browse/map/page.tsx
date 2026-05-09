"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabase";

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

export default function BrowseMapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
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
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-95.9928, 36.154],
      zoom: 8.5,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported on this browser.");
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
        setLocationStatus("Showing nearest artists first.");

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [currentLocation.longitude, currentLocation.latitude],
            zoom: 9.5,
          });

          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          userMarkerRef.current = new mapboxgl.Marker({ color: "#000000" })
            .setLngLat([currentLocation.longitude, currentLocation.latitude])
            .setPopup(new mapboxgl.Popup().setText("You are here"))
            .addTo(mapRef.current);
        }
      },
      () => {
        setLocationStatus("Location permission was denied.");
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

    if (selectedCategory !== "All") {
      result = result.filter((artist) =>
        artist.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    if (userLocation) {
      result.sort((a, b) => {
        const aDistance = getArtistDistance(a);
        const bDistance = getArtistDistance(b);

        if (aDistance === null && bDistance === null) return 0;
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;

        return aDistance - bDistance;
      });
    }

    return result;
  }, [artists, searchQuery, selectedCategory, userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredArtists.forEach((artist) => {
      if (artist.latitude === null || artist.longitude === null) return;

      const markerEl = document.createElement("button");
      markerEl.type = "button";
      markerEl.innerHTML = "📍";
      markerEl.style.fontSize = "28px";
      markerEl.style.cursor = "pointer";
      markerEl.style.filter = "drop-shadow(0 3px 4px rgba(0,0,0,0.25))";

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([artist.longitude, artist.latitude])
        .addTo(mapRef.current!);

      markerEl.addEventListener("click", () => {
        setSelectedArtist(artist);

        mapRef.current?.flyTo({
          center: [artist.longitude!, artist.latitude!],
          zoom: 11.5,
        });
      });

      markersRef.current.push(marker);
    });

    if (filteredArtists.length > 0) {
      setSelectedArtist(filteredArtists[0]);

      const firstWithCoords = filteredArtists.find(
        (artist) => artist.latitude !== null && artist.longitude !== null
      );

      if (firstWithCoords && !userLocation) {
        mapRef.current.flyTo({
          center: [firstWithCoords.longitude!, firstWithCoords.latitude!],
          zoom: 9.5,
        });
      }
    } else {
      setSelectedArtist(null);
    }
  }, [filteredArtists, userLocation]);

  const categoryButtons = ["All", "Nail", "Hair", "Aesthetician", "Lash"];

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-[#faf6f5] px-4 py-5 text-[15px] md:px-10 md:py-6">
        <Link href="/" className="font-medium">
          Lumina
        </Link>

        <div className="hidden md:block text-[15px]">Browse Artists</div>

        <Link href="/saved" className="flex items-center gap-2">
          <span className="text-[16px] text-[#e9a8a8]">♡</span>
          <span className="text-sm">Saved</span>
        </Link>
      </header>

      <section className="px-4 pt-8 pb-16 md:px-10 md:pt-10 md:pb-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/browse" className="text-[14px] md:text-[16px]">
              ← Back
            </Link>

            <h1
              className="mt-5 text-[32px] leading-[1.02] font-semibold md:mt-8 md:text-[54px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Map of beauty professionals
            </h1>

            <p className="mt-2 text-[15px] text-neutral-700 md:mt-3 md:text-[18px]">
              Discover {filteredArtists.length} beauty professionals
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

            <div className="mt-6 flex flex-wrap justify-start gap-4 text-[14px] text-neutral-700 md:mt-8 md:justify-center md:gap-8 md:text-[15px]">
              {categoryButtons.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={
                    selectedCategory === category
                      ? "font-medium text-black"
                      : "text-neutral-600"
                  }
                >
                  {category}
                </button>
              ))}
            </div>

            {(searchQuery || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-4 text-[13px] text-neutral-500 hover:text-black"
              >
                Clear map search
              </button>
            )}
          </div>

          <div className="hidden md:block text-[16px]">Map</div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div
            ref={mapContainer}
            className="h-[430px] w-full overflow-hidden rounded-[22px] bg-[#f1ece8] md:h-[620px]"
          />

          <div className="rounded-[22px] bg-[#fbf7f6] p-5">
            {selectedArtist ? (
              <>
                <h3 className="text-[22px] font-medium">
                  {selectedArtist.name}
                </h3>

                <p className="mt-1 text-[15px] text-neutral-500">
                  {selectedArtist.category}
                </p>

                <p className="mt-4 text-[14px] text-neutral-700">
                  📍 {selectedArtist.location}
                </p>

                <p className="mt-2 text-[14px] text-neutral-700">
                  From ${selectedArtist.price_start}
                </p>

                {getArtistDistance(selectedArtist) !== null && (
                  <p className="mt-2 text-[14px] text-neutral-500">
                    {getArtistDistance(selectedArtist)?.toFixed(1)} miles away
                  </p>
                )}

                <Link
                  href={`/artist/${selectedArtist.id}`}
                  className="mt-6 inline-block rounded-full bg-black px-5 py-2 text-[14px] text-white"
                >
                  View Profile
                </Link>
              </>
            ) : (
              <p className="text-[14px] text-neutral-500">
                Select a pin to view artist details.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}