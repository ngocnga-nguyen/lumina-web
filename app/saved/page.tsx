"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ClientWorkspaceShell from "@/components/ClientWorkspaceShell";
import ArtistCard from "@/components/ArtistCard";
import ClientGuidanceTip from "@/components/ClientGuidanceTip";
import SavedCollectionPicker from "@/components/SavedCollectionPicker";
import SavedCollectionsBar, {
  type SavedCollection,
} from "@/components/SavedCollectionsBar";
import { useClientOnboarding } from "@/lib/use-client-onboarding";
import { useRouter } from "next/navigation";

type Artist = {
  id: string;
  name: string;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number | null;
};

type SavedArtistRecord = {
  id: string;
  artist_id: string;
};

type SavedCollectionMembership = {
  collection_id: string;
  saved_artist_id: string;
};

export default function SavedPage() {
  const router = useRouter();
  const [savedArtists, setSavedArtists] = useState<Artist[]>([]);
  const [savedArtistRecords, setSavedArtistRecords] = useState<SavedArtistRecord[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [memberships, setMemberships] = useState<SavedCollectionMembership[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
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

      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("*")
        .in("id", artistIds)
        .eq("is_active", true);

      if (cancelled) return;
      if (artistsError) {
        console.log(artistsError);
        setLoadError(true);
        setLoading(false);
        return;
      }

      setSavedArtists(artistsData || []);
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
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds((ids) =>
        ids.filter((item) => item !== id)
      );
      return;
    }

    if (selectedCompareIds.length >= 3) {
      alert("You can compare up to 3 artists at once.");
      return;
    }

    setSelectedCompareIds((ids) => [...ids, id]);
  };

  const clearCompare = () => {
    setSelectedCompareIds([]);
  };
  const getDistanceMiles = (
  userLat: number,
  userLng: number,
  artistLat: number,
  artistLng: number
) => {
  const R = 3958.8;
  const dLat = ((artistLat - userLat) * Math.PI) / 180;
  const dLng = ((artistLng - userLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((artistLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

  return (
    <ClientWorkspaceShell>
      <div className="min-h-screen bg-lumina-surface text-lumina-text">
      <section
        id="compare"
        className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-10 md:py-14"
      >
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
                            {artist.name}
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
                      onRemoved={() => {
                        const removedSavedArtistId = savedArtistRecord?.id;
                        setSavedArtists((current) =>
                          current.filter((item) => item.id !== artist.id)
                        );
                        setSavedArtistRecords((current) =>
                          current.filter((record) => record.artist_id !== artist.id)
                        );
                        if (removedSavedArtistId) {
                          setMemberships((current) =>
                            current.filter(
                              (membership) =>
                                membership.saved_artist_id !== removedSavedArtistId
                            )
                          );
                        }
                        setSelectedCompareIds((current) =>
                          current.filter((id) => id !== artist.id)
                        );
                      }}
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
      </section>
      </div>
    </ClientWorkspaceShell>
  );
}
