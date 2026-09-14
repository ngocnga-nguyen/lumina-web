"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import ArtistCard from "@/components/ArtistCard";
import ClientGuidanceTip from "@/components/ClientGuidanceTip";
import SavedCollectionPicker from "@/components/SavedCollectionPicker";
import SavedCollectionsBar, {
  type SavedCollection,
} from "@/components/SavedCollectionsBar";
import SavedArtistMobileRow from "@/components/SavedArtistMobileRow";
import SavedCompareMobile, {
  type SavedCompareArtist,
} from "@/components/SavedCompareMobile";
import { useClientOnboarding } from "@/lib/use-client-onboarding";
import { useRouter } from "next/navigation";
import {
  matchesSavedProfessionalSearch,
  summarizeSavedReviews,
  toggleSavedCompareSelection,
  type SavedReviewRow,
  type SavedReviewSummary,
  type SavedServiceSummary,
} from "@/lib/saved-professional-view";

type Artist = {
  id: string;
  name: string;
  business_name?: string | null;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number | null;
  availability?: string | null;
};

type SavedArtistRecord = {
  id: string;
  artist_id: string;
};

type SavedCollectionMembership = {
  collection_id: string;
  saved_artist_id: string;
};

function getDistanceMiles(
  userLat: number,
  userLng: number,
  artistLat: number,
  artistLng: number
) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = ((artistLat - userLat) * Math.PI) / 180;
  const longitudeDelta = ((artistLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((artistLat * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function SavedPage() {
  const router = useRouter();
  const [savedArtists, setSavedArtists] = useState<Artist[]>([]);
  const [savedArtistRecords, setSavedArtistRecords] = useState<SavedArtistRecord[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [memberships, setMemberships] = useState<SavedCollectionMembership[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const [mobileCompareOpen, setMobileCompareOpen] = useState(false);
  const [servicesByArtist, setServicesByArtist] = useState<
    Map<string, SavedServiceSummary[]>
  >(new Map());
  const [reviewSummaries, setReviewSummaries] = useState<
    Map<string, SavedReviewSummary>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const clientOnboarding = useClientOnboarding();
  const [userLocation, setUserLocation] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSavedArtists = async () => {
      setLoading(true);
      setLoadError(false);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (authError) throw authError;
      if (!user) {
        setSavedArtists([]);
        setLoading(false);
        return;
      }

      setClientId(user.id);

      const { data: artistAccount } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (artistAccount) {
        router.replace("/dashboard");
        return;
      }
      

      const [savedResult, collectionsResult, membershipsResult] = await Promise.all([
        supabase
          .from("saved_artists")
          .select("id, artist_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("saved_collections")
          .select("id, name, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("saved_collection_memberships")
          .select("collection_id, saved_artist_id")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const savedData = (savedResult.data || []) as SavedArtistRecord[];
      const savedError = savedResult.error;

      if (savedError) {
        console.log(savedError);
        setLoadError(true);
        setLoading(false);
        return;
      }

      setSavedArtistRecords(savedData);

      if (collectionsResult.error) {
        console.log(collectionsResult.error);
      } else {
        setCollections((collectionsResult.data || []) as SavedCollection[]);
      }

      if (membershipsResult.error) {
        console.log(membershipsResult.error);
      } else {
        setMemberships(
          (membershipsResult.data || []) as SavedCollectionMembership[]
        );
      }

      const artistIds = savedData.map((item) => item.artist_id);

      if (artistIds.length === 0) {
        setSavedArtists([]);
        setLoading(false);
        return;
      }

      const [artistsResult, servicesResult, reviewsResult] = await Promise.all([
        supabase
          .from("artists")
          .select("*")
          .in("id", artistIds)
          .eq("is_active", true),
        supabase
          .from("services")
          .select("id, artist_id, service_name, price, duration")
          .in("artist_id", artistIds),
        supabase
          .from("reviews")
          .select("artist_id, rating")
          .in("artist_id", artistIds)
          .eq("moderation_status", "published"),
      ]);

      if (cancelled) return;
      if (artistsResult.error) {
        console.log(artistsResult.error);
        setLoadError(true);
        setLoading(false);
        return;
      }

      setSavedArtists((artistsResult.data || []) as Artist[]);

      if (servicesResult.error) {
        console.log(servicesResult.error);
      } else {
        const nextServices = new Map<string, SavedServiceSummary[]>();
        ((servicesResult.data || []) as SavedServiceSummary[]).forEach((service) => {
          const current = nextServices.get(service.artist_id) || [];
          current.push(service);
          nextServices.set(service.artist_id, current);
        });
        setServicesByArtist(nextServices);
      }

      if (reviewsResult.error) {
        console.log(reviewsResult.error);
      } else {
        setReviewSummaries(
          summarizeSavedReviews((reviewsResult.data || []) as SavedReviewRow[])
        );
      }
      setLoading(false);
    };

    void loadSavedArtists().catch((error) => {
      if (cancelled) return;
      console.log("Saved professionals load failed:", error);
      setLoadError(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt, router]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        if (!cancelled) console.log("Location permission denied");
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncCompareHash = () => {
      if (window.location.hash === "#compare") {
        setMobileSelectionMode(true);
      }
    };

    syncCompareHash();
    window.addEventListener("hashchange", syncCompareHash);
    return () => window.removeEventListener("hashchange", syncCompareHash);
  }, []);

  const selectedArtists = useMemo(() => {
    return savedArtists.filter((artist) =>
      selectedCompareIds.includes(artist.id)
    );
  }, [savedArtists, selectedCompareIds]);

  const visibleSavedArtistIds = useMemo(() => {
    if (!activeCollectionId) {
      return new Set(savedArtistRecords.map((record) => record.id));
    }

    return new Set(
      memberships
        .filter((membership) => membership.collection_id === activeCollectionId)
        .map((membership) => membership.saved_artist_id)
    );
  }, [activeCollectionId, memberships, savedArtistRecords]);

  const visibleArtists = useMemo(() => {
    const artistIds = new Set(
      savedArtistRecords
        .filter((record) => visibleSavedArtistIds.has(record.id))
        .map((record) => record.artist_id)
    );
    return savedArtists.filter((artist) => artistIds.has(artist.id));
  }, [savedArtistRecords, savedArtists, visibleSavedArtistIds]);

  const mobileVisibleArtists = useMemo(
    () =>
      visibleArtists.filter((artist) =>
        matchesSavedProfessionalSearch(
          artist,
          searchQuery,
          servicesByArtist.get(artist.id) || []
        )
      ),
    [searchQuery, servicesByArtist, visibleArtists]
  );

  const getArtistDistance = useCallback(
    (artist: Artist) =>
      userLocation && artist.latitude !== null && artist.longitude !== null
        ? getDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            artist.latitude,
            artist.longitude
          )
        : null,
    [userLocation]
  );

  const mobileCompareArtists = useMemo<SavedCompareArtist[]>(
    () =>
      selectedArtists.map((artist) => ({
        ...artist,
        distance: getArtistDistance(artist),
        reviewSummary: reviewSummaries.get(artist.id),
        services: servicesByArtist.get(artist.id) || [],
      })),
    [getArtistDistance, reviewSummaries, selectedArtists, servicesByArtist]
  );

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const visibleArtistIds = new Set(savedArtists.map((artist) => artist.id));
    const visibleSavedRecordIds = new Set(
      savedArtistRecords
        .filter((record) => visibleArtistIds.has(record.artist_id))
        .map((record) => record.id)
    );
    memberships.forEach((membership) => {
      if (!visibleSavedRecordIds.has(membership.saved_artist_id)) return;
      counts[membership.collection_id] =
        (counts[membership.collection_id] || 0) + 1;
    });
    return counts;
  }, [memberships, savedArtistRecords, savedArtists]);

  const getCollectionError = (error: { code?: string; message?: string } | null) => {
    if (!error) return null;
    if (error.code === "23505") return "A collection with that name already exists.";
    if (error.code === "23514") {
      return "Use a name between 1 and 60 characters. “All saved” is reserved.";
    }
    return error.message || "We couldn’t update your collections.";
  };

  const createCollection = async (name: string, savedArtistId?: string) => {
    if (!clientId) return "Please sign in again to manage collections.";

    const { data, error } = await supabase
      .from("saved_collections")
      .insert({ name: name.trim() })
      .select("id, name, created_at, updated_at")
      .single();

    const errorMessage = getCollectionError(error);
    if (errorMessage) return errorMessage;

    const collection = data as SavedCollection;
    setCollections((current) => [...current, collection]);
    setActiveCollectionId(collection.id);

    if (savedArtistId) {
      const { error: membershipError } = await supabase
        .from("saved_collection_memberships")
        .insert({
          collection_id: collection.id,
          saved_artist_id: savedArtistId,
        });

      const membershipErrorMessage = getCollectionError(membershipError);
      if (membershipErrorMessage) return membershipErrorMessage;

      setMemberships((current) => [
        ...current,
        { collection_id: collection.id, saved_artist_id: savedArtistId },
      ]);
    }

    return null;
  };

  const renameCollection = async (collectionId: string, name: string) => {
    const { data, error } = await supabase
      .from("saved_collections")
      .update({ name: name.trim() })
      .eq("id", collectionId)
      .select("id, name, created_at, updated_at")
      .single();

    const errorMessage = getCollectionError(error);
    if (errorMessage) return errorMessage;

    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId ? (data as SavedCollection) : collection
      )
    );
    return null;
  };

  const deleteCollection = async (collectionId: string) => {
    const { error } = await supabase
      .from("saved_collections")
      .delete()
      .eq("id", collectionId);

    const errorMessage = getCollectionError(error);
    if (errorMessage) return errorMessage;

    setCollections((current) =>
      current.filter((collection) => collection.id !== collectionId)
    );
    setMemberships((current) =>
      current.filter((membership) => membership.collection_id !== collectionId)
    );
    setActiveCollectionId(null);
    return null;
  };

  const toggleMembership = async (
    savedArtistId: string,
    collectionId: string,
    selected: boolean
  ) => {
    if (!clientId) return "Please sign in again to manage collections.";

    if (selected) {
      const { error } = await supabase
        .from("saved_collection_memberships")
        .insert({
          collection_id: collectionId,
          saved_artist_id: savedArtistId,
        });

      if (error && error.code !== "23505") return getCollectionError(error);

      setMemberships((current) => {
        const alreadyPresent = current.some(
          (membership) =>
            membership.collection_id === collectionId &&
            membership.saved_artist_id === savedArtistId
        );
        return alreadyPresent
          ? current
          : [...current, { collection_id: collectionId, saved_artist_id: savedArtistId }];
      });
      return null;
    }

    const { error } = await supabase
      .from("saved_collection_memberships")
      .delete()
      .eq("collection_id", collectionId)
      .eq("saved_artist_id", savedArtistId);

    const errorMessage = getCollectionError(error);
    if (errorMessage) return errorMessage;

    setMemberships((current) =>
      current.filter(
        (membership) =>
          membership.collection_id !== collectionId ||
          membership.saved_artist_id !== savedArtistId
      )
    );
    return null;
  };

  const toggleCompare = (id: string) => {
    const nextSelection = toggleSavedCompareSelection(selectedCompareIds, id);
    if (nextSelection.limitReached) {
      alert("You can compare up to 3 artists at once.");
      return;
    }
    setSelectedCompareIds(nextSelection.ids);
  };

  const clearCompare = () => {
    setSelectedCompareIds([]);
  };

  const cancelMobileCompare = () => {
    setMobileCompareOpen(false);
    setMobileSelectionMode(false);
    clearCompare();
    if (window.location.hash === "#compare") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const removeSavedArtist = (artistId: string) => {
    const removedSavedArtistId = savedArtistRecords.find(
      (record) => record.artist_id === artistId
    )?.id;
    setSavedArtists((current) =>
      current.filter((item) => item.id !== artistId)
    );
    setSavedArtistRecords((current) =>
      current.filter((record) => record.artist_id !== artistId)
    );
    if (removedSavedArtistId) {
      setMemberships((current) =>
        current.filter(
          (membership) => membership.saved_artist_id !== removedSavedArtistId
        )
      );
    }
    setSelectedCompareIds((current) =>
      current.filter((id) => id !== artistId)
    );
  };
  return (
    <ClientWorkspaceShell>
      <div className="min-h-screen bg-lumina-surface text-lumina-text">
      <section
        id="compare"
        className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-5 md:px-7 md:py-7 lg:px-10 lg:py-14"
      >
        <div className="lg:hidden">
          {mobileCompareOpen && mobileCompareArtists.length >= 2 ? (
            <SavedCompareMobile
              artists={mobileCompareArtists}
              onBack={() => setMobileCompareOpen(false)}
              onRemove={(artistId) => {
                setSelectedCompareIds((current) =>
                  current.filter((id) => id !== artistId)
                );
                if (selectedCompareIds.length <= 2) setMobileCompareOpen(false);
              }}
            />
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h1
                    className="text-[32px] font-semibold leading-none text-lumina-text"
                    style={{ fontFamily: "Georgia, Times New Roman, serif" }}
                  >
                    Saved
                  </h1>
                  <p className="mt-2 text-[12px] leading-[1.45] text-lumina-text-muted">
                    Revisit professionals and compare your shortlist.
                  </p>
                </div>
                {!loading && savedArtists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (mobileSelectionMode) {
                        cancelMobileCompare();
                      } else {
                        setMobileSelectionMode(true);
                        window.history.replaceState(null, "", "#compare");
                      }
                    }}
                    className="min-h-10 shrink-0 px-1 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text"
                  >
                    {mobileSelectionMode ? "Cancel" : "Select to compare"}
                  </button>
                )}
              </div>

              {!loading && savedArtists.length > 0 && (
                <div className="relative mb-3">
                  <label htmlFor="saved-mobile-search" className="sr-only">
                    Search saved professionals
                  </label>
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lumina-text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="saved-mobile-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search saved professionals"
                    className="h-11 w-full rounded-[14px] border border-lumina-border bg-lumina-surface pl-10 pr-10 text-[13px] text-lumina-text outline-none placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/55"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear saved professional search"
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lumina-text-muted"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {!loading && (
                <SavedCollectionsBar
                  collections={collections}
                  activeCollectionId={activeCollectionId}
                  allSavedCount={savedArtists.length}
                  collectionCounts={collectionCounts}
                  onSelect={setActiveCollectionId}
                  onCreate={createCollection}
                  onRename={renameCollection}
                  onDelete={deleteCollection}
                  compactMobile
                />
              )}

              {!loading &&
                savedArtists.length > 0 &&
                clientOnboarding.ready &&
                clientOnboarding.isClient &&
                !clientOnboarding.hasDismissedTip("saved_compare") && (
                  <div className="mb-4">
                    <ClientGuidanceTip
                      title="Save now, compare when ready"
                      onDismiss={() => clientOnboarding.dismissTip("saved_compare")}
                    >
                      Select two or up to three professionals when you want a closer look.
                    </ClientGuidanceTip>
                  </div>
                )}

              {mobileSelectionMode && selectedCompareIds.length === 1 && (
                <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-lumina-text-muted">
                  <Check size={13} aria-hidden="true" />
                  Choose one more professional to compare.
                </p>
              )}

              {loadError ? (
                <div className="rounded-[16px] border border-lumina-border bg-lumina-surface px-4 py-4 text-[12px] text-lumina-text-muted">
                  <p>Saved professionals could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => setLoadAttempt((current) => current + 1)}
                    className="mt-3 min-h-10 rounded-full border border-lumina-border px-4 font-medium text-lumina-text"
                  >
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <p className="py-8 text-[13px] text-lumina-text-muted">
                  Loading saved professionals…
                </p>
              ) : savedArtists.length === 0 ? (
                <div className="py-12 text-center">
                  <h2 className="text-[17px] font-medium text-lumina-text">
                    No saved professionals yet
                  </h2>
                  <p className="mt-2 text-[13px] leading-[1.5] text-lumina-text-muted">
                    Save professionals from Browse to build your shortlist.
                  </p>
                  <Link
                    href="/browse"
                    className="mt-5 inline-flex min-h-11 items-center rounded-full border border-lumina-black px-5 text-[13px] font-medium transition hover:bg-lumina-black hover:text-white"
                  >
                    Browse professionals
                  </Link>
                </div>
              ) : visibleArtists.length === 0 ? (
                <div className="py-10 text-center">
                  <h2 className="text-[16px] font-medium text-lumina-text">
                    This collection is empty
                  </h2>
                  <p className="mt-2 text-[12px] text-lumina-text-muted">
                    Add professionals with the Organize control.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCollectionId(null)}
                    className="mt-4 min-h-10 rounded-full border border-lumina-border px-4 text-[12px] text-lumina-text"
                  >
                    View All saved
                  </button>
                </div>
              ) : mobileVisibleArtists.length === 0 ? (
                <div className="py-10 text-center">
                  <h2 className="text-[16px] font-medium text-lumina-text">
                    No saved professionals match
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 min-h-10 px-3 text-[12px] font-medium text-lumina-text-muted"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="border-y border-lumina-border/70">
                  {mobileVisibleArtists.map((artist) => {
                    const savedArtistRecord = savedArtistRecords.find(
                      (record) => record.artist_id === artist.id
                    );
                    return (
                      <SavedArtistMobileRow
                        key={artist.id}
                        artist={artist}
                        distance={getArtistDistance(artist)}
                        reviewSummary={reviewSummaries.get(artist.id)}
                        selectionMode={mobileSelectionMode}
                        selected={selectedCompareIds.includes(artist.id)}
                        onSelect={() => toggleCompare(artist.id)}
                        onRemoved={() => removeSavedArtist(artist.id)}
                        organizeControl={
                          savedArtistRecord ? (
                            <SavedCollectionPicker
                              compact
                              artistName={artist.name}
                              collections={collections}
                              selectedCollectionIds={memberships
                                .filter(
                                  (membership) =>
                                    membership.saved_artist_id === savedArtistRecord.id
                                )
                                .map((membership) => membership.collection_id)}
                              onToggle={(collectionId, selected) =>
                                toggleMembership(
                                  savedArtistRecord.id,
                                  collectionId,
                                  selected
                                )
                              }
                              onCreate={(name) =>
                                createCollection(name, savedArtistRecord.id)
                              }
                            />
                          ) : null
                        }
                      />
                    );
                  })}
                </div>
              )}

              {mobileSelectionMode && selectedCompareIds.length >= 2 && (
                <div className="sticky bottom-3 z-20 mt-4 flex justify-center px-3 [padding-bottom:env(safe-area-inset-bottom)]">
                  <button
                    type="button"
                    onClick={() => setMobileCompareOpen(true)}
                    className="flex min-h-11 min-w-[148px] items-center justify-center rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white shadow-[0_10px_28px_rgba(24,22,24,0.18)]"
                  >
                    Compare {selectedCompareIds.length}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="hidden lg:block">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1
              className="text-[42px] font-semibold leading-[1.02] md:text-[56px]"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Saved professionals
            </h1>

            <p className="mt-4 max-w-[620px] text-[16px] leading-[1.6] text-lumina-text-muted">
              Save professionals, compare options, and choose who fits best.
            </p>
          </div>

          {selectedCompareIds.length > 0 && (
            <button
              onClick={clearCompare}
              className="text-left text-[13px] text-lumina-text-muted hover:text-lumina-black md:text-right"
            >
              Clear comparison
            </button>
          )}
        </div>

        {!loading && (
          <SavedCollectionsBar
            collections={collections}
            activeCollectionId={activeCollectionId}
            allSavedCount={savedArtists.length}
            collectionCounts={collectionCounts}
            onSelect={setActiveCollectionId}
            onCreate={createCollection}
            onRename={renameCollection}
            onDelete={deleteCollection}
          />
        )}

        {!loading &&
          savedArtists.length > 0 &&
          clientOnboarding.ready &&
          clientOnboarding.isClient &&
          !clientOnboarding.hasDismissedTip("saved_compare") && (
            <div className="mb-8">
              <ClientGuidanceTip
                title="Save now, compare when ready"
                onDismiss={() =>
                  clientOnboarding.dismissTip("saved_compare")
                }
              >
                Select two or up to three saved professionals to compare their
                services, location, and starting prices side by side.
              </ClientGuidanceTip>
            </div>
          )}

        {loadError ? (
          <div className="rounded-[18px] border border-lumina-border bg-lumina-surface px-5 py-5 text-[13px] text-lumina-text-muted">
            <p>Saved professionals could not be loaded.</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((current) => current + 1)}
              className="mt-4 min-h-10 rounded-full border border-lumina-border px-4 font-medium text-lumina-text"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="text-lumina-text-muted">
            Loading saved artists...
          </p>
        ) : savedArtists.length === 0 ? (
          <div className="mt-12 text-center md:mt-16">
            <h2 className="text-[18px] font-medium text-lumina-text">
              No saved professionals yet
            </h2>

            <p className="mt-2 text-[14px] leading-[1.55] text-lumina-text-muted md:text-[15px]">
              Tap the heart on professionals you want to revisit.
            </p>

            <Link
              href="/browse"
              className="mt-6 inline-block rounded-full border border-lumina-black px-6 py-3 text-[14px] transition hover:bg-lumina-black hover:text-white"
            >
              Browse professionals
            </Link>
          </div>
        ) : visibleArtists.length === 0 ? (
          <div className="rounded-[22px] border border-lumina-border bg-lumina-surface px-5 py-10 text-center">
            <h2 className="text-[18px] font-medium text-lumina-text">
              This collection is empty
            </h2>
            <p className="mt-2 text-[14px] leading-[1.55] text-lumina-text-muted">
              Open All saved and add professionals with the Organize control.
            </p>
            <button
              type="button"
              onClick={() => setActiveCollectionId(null)}
              className="mt-5 rounded-full border border-lumina-border bg-lumina-surface px-5 py-2.5 text-[13px] text-lumina-text transition hover:border-lumina-text-muted/40"
            >
              View All saved
            </button>
          </div>
        ) : (
          <>
            {selectedArtists.length >= 2 && (
              <section className="mb-12 rounded-[26px] bg-lumina-surface-soft p-5 md:p-7">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                      Compare
                    </p>

                    <h2
                      className="mt-2 text-[30px] font-semibold md:text-[38px]"
                      style={{
                        fontFamily: "Georgia, Times New Roman, serif",
                      }}
                    >
                      Artist comparison
                    </h2>
                  </div>

                  <p className="text-[13px] text-lumina-text-muted">
                    {selectedArtists.length}/3 selected
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-lumina-border">
                        <th className="py-3 pr-4 font-medium">
                          Artist
                        </th>

                        {selectedArtists.map((artist) => (
                          <th
                            key={artist.id}
                            className="py-3 pr-4 font-medium"
                          >
                            <span className="block">{artist.name}</span>
                            {artist.business_name && (
                              <span className="mt-0.5 block text-[12px] font-normal text-lumina-text-muted">
                                {artist.business_name}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-b border-lumina-border">
                        <td className="py-4 pr-4 text-lumina-text-muted">
                          Category
                        </td>

                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            {artist.category}
                          </td>
                        ))}
                      </tr>

                      <tr className="border-b border-lumina-border">
                        <td className="py-4 pr-4 text-lumina-text-muted">
                          Location
                        </td>

                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
  <p>{artist.location}</p>

  {userLocation && artist.latitude && artist.longitude && (
    <p className="mt-1 text-[13px] text-lumina-text-muted">
      {getDistanceMiles(
        userLocation.latitude,
        userLocation.longitude,
        artist.latitude,
        artist.longitude
      ).toFixed(1)} miles away
    </p>
  )}
</td>
                        ))}
                      </tr>

                      <tr className="border-b border-lumina-border">
                        <td className="py-4 pr-4 text-lumina-text-muted">
                          Starting price
                        </td>

                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            From ${artist.price_start}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="py-4 pr-4 text-lumina-text-muted">
                          Profile
                        </td>

                        {selectedArtists.map((artist) => (
                          <td key={artist.id} className="py-4 pr-4">
                            <Link
                              href={`/artist/${artist.id}`}
                              className="text-lumina-attention hover:text-lumina-black"
                            >
                              View Profile
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 lg:gap-8">
              {visibleArtists.map((artist) => {
                const isSelected =
                  selectedCompareIds.includes(artist.id);
                const savedArtistRecord = savedArtistRecords.find(
                  (record) => record.artist_id === artist.id
                );

                return (
                  <div key={artist.id}>
                    <ArtistCard
                      artist={artist}
                      distance={
                        userLocation &&
                        artist.latitude !== null &&
                        artist.longitude !== null
                          ? getDistanceMiles(
                              userLocation.latitude,
                              userLocation.longitude,
                              artist.latitude,
                              artist.longitude
                            )
                          : null
                      }
                      showCompare
                      isSelected={isSelected}
                      onCompare={() => toggleCompare(artist.id)}
                      onRemoved={() => removeSavedArtist(artist.id)}
                    />

                    {savedArtistRecord && (
                      <SavedCollectionPicker
                        artistName={artist.name}
                        collections={collections}
                        selectedCollectionIds={memberships
                          .filter(
                            (membership) =>
                              membership.saved_artist_id === savedArtistRecord.id
                          )
                          .map((membership) => membership.collection_id)}
                        onToggle={(collectionId, selected) =>
                          toggleMembership(
                            savedArtistRecord.id,
                            collectionId,
                            selected
                          )
                        }
                        onCreate={(name) =>
                          createCollection(name, savedArtistRecord.id)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        </div>
      </section>
      </div>
    </ClientWorkspaceShell>
  );
}
