"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BrowseUserLocation = {
  latitude: number;
  longitude: number;
};

const STORAGE_KEY = "lumina:browse-location:v1";
let memoryLocation: BrowseUserLocation | null = null;

function isValidLocation(value: unknown): value is BrowseUserLocation {
  if (!value || typeof value !== "object") return false;

  const location = value as Partial<BrowseUserLocation>;

  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Number(location.latitude) >= -90 &&
    Number(location.latitude) <= 90 &&
    Number(location.longitude) >= -180 &&
    Number(location.longitude) <= 180
  );
}

export function getStoredBrowseLocation() {
  if (memoryLocation) return memoryLocation;
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!isValidLocation(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    memoryLocation = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function storeBrowseLocation(location: BrowseUserLocation) {
  memoryLocation = location;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // In-memory state still supports the current Browse session.
  }
}

function getLocationErrorMessage(error?: Pick<GeolocationPositionError, "code">) {
  if (error?.code === 1) {
    return "Location permission was denied. You can continue browsing by city or service.";
  }

  if (error?.code === 2) {
    return "Your location is unavailable right now. Try searching by city instead.";
  }

  if (error?.code === 3) {
    return "Finding your location took too long. Please try again.";
  }

  return "We couldn't determine your location. Try searching by city instead.";
}

export function getBrowseDistanceMiles(
  userLocation: BrowseUserLocation,
  artistLatitude: number,
  artistLongitude: number
) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta =
    ((artistLatitude - userLocation.latitude) * Math.PI) / 180;
  const longitudeDelta =
    ((artistLongitude - userLocation.longitude) * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos((userLocation.latitude * Math.PI) / 180) *
      Math.cos((artistLatitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

type UseBrowseGeolocationOptions = {
  successMessage: string;
};

export function useBrowseGeolocation({
  successMessage,
}: UseBrowseGeolocationOptions) {
  const [userLocation, setUserLocation] = useState<BrowseUserLocation | null>(
    null
  );
  const [locationStatus, setLocationStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const storedLocation = getStoredBrowseLocation();
    if (storedLocation) {
      queueMicrotask(() => {
        if (!mountedRef.current) return;

        setUserLocation(storedLocation);
        setLocationStatus(successMessage);
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [successMessage]);

  const requestLocation = useCallback(
    (onResolved?: (location: BrowseUserLocation) => void) => {
      if (requestInFlightRef.current) return;

      const storedLocation = getStoredBrowseLocation();
      if (storedLocation) {
        setUserLocation(storedLocation);
        setLocationStatus(successMessage);
        onResolved?.(storedLocation);
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationStatus(
          "Location is not supported on this browser. Try searching by city instead."
        );
        return;
      }

      requestInFlightRef.current = true;
      setIsLocating(true);
      setLocationStatus("Locating…");

      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            storeBrowseLocation(location);
            requestInFlightRef.current = false;

            if (!mountedRef.current) return;

            setIsLocating(false);
            setUserLocation(location);
            setLocationStatus(successMessage);
            onResolved?.(location);
          },
          (error) => {
            requestInFlightRef.current = false;

            if (!mountedRef.current) return;

            setIsLocating(false);
            setLocationStatus(getLocationErrorMessage(error));
          },
          {
            enableHighAccuracy: false,
            maximumAge: 5 * 60 * 1000,
            timeout: 10 * 1000,
          }
        );
      } catch {
        requestInFlightRef.current = false;

        if (!mountedRef.current) return;

        setIsLocating(false);
        setLocationStatus(getLocationErrorMessage());
      }
    },
    [successMessage]
  );

  return {
    userLocation,
    locationStatus,
    isLocating,
    requestLocation,
  };
}
