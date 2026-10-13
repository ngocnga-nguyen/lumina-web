"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { getMarketplaceAccount, marketplaceSignIn } from "@/lib/marketplace-account";
import { supabase } from "@/lib/supabase";

type SaveArtistButtonProps = {
  artistId: string;
  artistName?: string;
  className?: string;
  onChange?: (saved: boolean) => void;
  viewerIsArtist?: boolean;
  compactGlass?: boolean;
  showLabel?: boolean;
  initialSaved?: boolean;
};

export default function SaveArtistButton({
  artistId,
  artistName = "artist",
  className = "",
  onChange,
  viewerIsArtist = false,
  compactGlass = false,
  showLabel = false,
  initialSaved,
}: SaveArtistButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved ?? false);
  const [loading, setLoading] = useState(() => !viewerIsArtist && initialSaved === undefined);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (viewerIsArtist) return;
    // Saved has already loaded this record for the authenticated client.
    if (initialSaved !== undefined) return;
    let cancelled = false;

    const checkSaved = async () => {
      // Resolve the current account once. Do not race a second auth request per card.
      const account = await getMarketplaceAccount();
      if (cancelled) return;
      if (account.role !== "client") { setLoading(false); return; }
      const { data, error } = await supabase
        .from("saved_artists")
        .select("artist_id")
        .eq("user_id", account.id)
        .eq("artist_id", artistId)
        .maybeSingle();
      if (cancelled) return;
      if (error) throw error;
      setIsSaved(!!data);
      setLoading(false);
    };

    void checkSaved().catch(() => {
      if (!cancelled) {
        // Keep the action disabled when its persisted state is unknown.
        setToast("Could not confirm saved artists. Reload to try again.");
      }
    });
    return () => { cancelled = true; };
  }, [artistId, viewerIsArtist, initialSaved]);

  const toggleSave = async () => {
    if (loading) return;

    let account;
    try { account = await getMarketplaceAccount(); }
    catch { setToast("Could not confirm your account. Please try again."); return; }
    if (account.role === "guest") { marketplaceSignIn(); return; }
    if (account.role !== "client") {
      setToast("Use a client account to save artists. Switch accounts through the account menu."); return;
    }
    // Fictional discovery IDs must never reach the real saved_artists table.
    if (artistId.startsWith("demo-")) { setToast("Demo artist saves are local to Discover."); return; }
    const user = { id: account.id };

    if (isSaved) {
      setIsSaved(false);
      onChange?.(false);

      const { error } = await supabase
        .from("saved_artists")
        .delete()
        .eq("user_id", user.id)
        .eq("artist_id", artistId);

      if (error) {
        console.log(error);
        setIsSaved(true);
        onChange?.(true);
        setToast("Could not remove artist");
      } else {
        setToast("Removed from saved");
      }
    } else {
      setIsSaved(true);
      onChange?.(true);

      const { error } = await supabase.from("saved_artists").insert([
        {
          user_id: user.id,
          artist_id: artistId,
        },
      ]);

      if (error) {
        console.log(error);
        setIsSaved(false);
        onChange?.(false);
        setToast("Could not save artist");
      } else {
        setToast("Saved");
      }
    }

    setTimeout(() => setToast(""), 2200);
  };

  if (viewerIsArtist) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggleSave}
        disabled={loading}
        aria-label={
          isSaved
            ? `Remove ${artistName} from saved artists`
            : `Save artist: ${artistName}`
        }
        aria-pressed={isSaved}
        className={`flex min-h-11 ${showLabel ? "gap-2 px-4" : "w-11"} items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-50 ${
          compactGlass
            ? "border border-transparent bg-transparent shadow-none"
            : `border shadow-sm backdrop-blur ${
                isSaved
                  ? "border-lumina-border bg-lumina-bg-soft/95"
                  : "border-white/60 bg-white/90"
              }`
        } ${className}`}
      >
        {compactGlass ? (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-none backdrop-blur-sm ${
              isSaved
                ? "border-white/35 bg-[rgba(250,247,249,0.54)]"
                : "border-white/30 bg-[rgba(255,255,255,0.46)]"
            }`}
          >
            <Bookmark
              size={13}
              strokeWidth={1.7}
              className={
                isSaved
                  ? "fill-lumina-black text-lumina-black"
                  : "text-lumina-text"
              }
            />
          </span>
        ) : (
          <Bookmark
            size={19}
            strokeWidth={1.8}
            className={isSaved ? "fill-lumina-black text-lumina-black" : "text-lumina-text"}
          />
        )}
        {showLabel && <span>{isSaved ? "Artist saved" : "Save artist"}</span>}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-6 z-[100]">
          <div className="rounded-2xl bg-lumina-black px-5 py-4 text-[14px] font-medium text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
