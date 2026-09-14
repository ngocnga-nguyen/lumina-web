"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SaveArtistButtonProps = {
  artistId: string;
  artistName?: string;
  className?: string;
  onChange?: (saved: boolean) => void;
  viewerIsArtist?: boolean;
  compactGlass?: boolean;
};

export default function SaveArtistButton({
  artistId,
  artistName = "artist",
  className = "",
  onChange,
  viewerIsArtist = false,
  compactGlass = false,
}: SaveArtistButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(() => !viewerIsArtist);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (viewerIsArtist) {
      return;
    }

    const checkSaved = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("saved_artists")
        .select("artist_id")
        .eq("user_id", user.id)
        .eq("artist_id", artistId)
        .maybeSingle();

      if (error) {
        console.log(error);
      }

      setIsSaved(!!data);
      setLoading(false);
    };

    checkSaved();
  }, [artistId, viewerIsArtist]);

  const toggleSave = async () => {
    if (loading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

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
            : `Save ${artistName}`
        }
        aria-pressed={isSaved}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-50 ${
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
            className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border backdrop-blur-md shadow-[0_2px_8px_rgba(39,36,40,0.07)] ${
              isSaved
                ? "border-white/65 bg-lumina-glass/90"
                : "border-white/55 bg-white/72"
            }`}
          >
            <Heart
              size={16}
              strokeWidth={1.75}
              className={
                isSaved
                  ? "fill-lumina-attention text-lumina-attention"
                  : "text-lumina-text"
              }
            />
          </span>
        ) : (
          <Heart
            size={19}
            strokeWidth={1.8}
            className={isSaved ? "fill-lumina-attention text-lumina-attention" : "text-lumina-text"}
          />
        )}
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
