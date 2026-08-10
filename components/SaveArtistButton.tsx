"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SaveArtistButtonProps = {
  artistId: string;
  artistName?: string;
  className?: string;
  onChange?: (saved: boolean) => void;
};

export default function SaveArtistButton({
  artistId,
  artistName = "artist",
  className = "",
  onChange,
}: SaveArtistButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
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
  }, [artistId]);

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
        setToast("Removed from Favorites");
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
        setToast("Saved to Favorites");
      }
    }

    setTimeout(() => setToast(""), 2200);
  };

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
        className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition hover:scale-105 disabled:opacity-50 ${
          isSaved
            ? "border-neutral-200 bg-[#faf9f8]/95"
            : "border-white/60 bg-white/90"
        } ${className}`}
      >
        <Heart
          size={19}
          strokeWidth={1.8}
          className={isSaved ? "fill-[#9a7f86] text-[#9a7f86]" : "text-neutral-700"}
        />
      </button>

      {toast && (
        <div className="fixed bottom-6 left-6 z-[100]">
          <div className="rounded-2xl bg-black px-5 py-4 text-[14px] font-medium text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
