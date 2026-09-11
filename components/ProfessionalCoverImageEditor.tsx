"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageIcon, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const COVER_IMAGE_BUCKET = "artist-cover-images";
const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const COVER_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type ProfessionalCoverImageEditorProps = {
  coverImageUrl: string | null;
  fallbackImageUrl?: string | null;
  onCoverImageChange: (url: string | null) => void;
};

function getOwnedCoverPath(url: string, artistId: string) {
  try {
    const marker = `/storage/v1/object/public/${COVER_IMAGE_BUCKET}/`;
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex < 0) return null;

    const storagePath = decodeURIComponent(
      pathname.slice(markerIndex + marker.length)
    );

    return storagePath.startsWith(`${artistId}/`) ? storagePath : null;
  } catch {
    return null;
  }
}

export default function ProfessionalCoverImageEditor({
  coverImageUrl,
  fallbackImageUrl = null,
  onCoverImageChange,
}: ProfessionalCoverImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busyAction, setBusyAction] = useState<"upload" | "remove" | null>(
    null
  );
  const [feedback, setFeedback] = useState("");

  const displayImageUrl = coverImageUrl || fallbackImageUrl;

  const removeStoredCover = async (url: string, artistId: string) => {
    const storagePath = getOwnedCoverPath(url, artistId);
    if (!storagePath) return;

    const { error } = await supabase.storage
      .from(COVER_IMAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn("Previous cover image cleanup failed:", error);
    }
  };

  const handleCoverSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busyAction) return;

    const extension = COVER_IMAGE_TYPES.get(file.type);
    if (!extension) {
      alert("Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > COVER_IMAGE_MAX_BYTES) {
      alert("Please choose an image smaller than 5 MB.");
      return;
    }

    setBusyAction("upload");
    setFeedback("");

    let uploadedPath = "";

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You need to be logged in.");

      const randomName =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      uploadedPath = `${user.id}/${randomName}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(COVER_IMAGE_BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(COVER_IMAGE_BUCKET)
        .getPublicUrl(uploadedPath);
      const nextCoverUrl = publicUrlData.publicUrl;

      const { data: updatedArtist, error: updateError } = await supabase
        .from("artists")
        .update({ cover_image_url: nextCoverUrl })
        .eq("id", user.id)
        .select("cover_image_url")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedArtist) {
        throw new Error("Your professional profile could not be updated.");
      }

      const previousCoverUrl = coverImageUrl;
      onCoverImageChange(nextCoverUrl);
      setFeedback("Cover image updated.");

      if (previousCoverUrl && previousCoverUrl !== nextCoverUrl) {
        await removeStoredCover(previousCoverUrl, user.id);
      }
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from(COVER_IMAGE_BUCKET)
          .remove([uploadedPath]);
      }

      alert(
        error instanceof Error
          ? error.message
          : "The cover image could not be updated."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveCover = async () => {
    if (!coverImageUrl || busyAction) return;
    if (!window.confirm("Remove your custom cover image?")) return;

    setBusyAction("remove");
    setFeedback("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You need to be logged in.");

      const { data: updatedArtist, error: updateError } = await supabase
        .from("artists")
        .update({ cover_image_url: null })
        .eq("id", user.id)
        .select("cover_image_url")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedArtist) {
        throw new Error("Your professional profile could not be updated.");
      }

      const previousCoverUrl = coverImageUrl;
      onCoverImageChange(null);
      setFeedback("Custom cover removed. Lumina will use your profile fallback.");
      await removeStoredCover(previousCoverUrl, user.id);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "The cover image could not be removed."
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] text-lumina-text-muted">Cover image</p>
          <p className="mt-1 text-[12px] leading-[1.45] text-lumina-text-muted">
            Shown at the top of your mobile public profile.
          </p>
        </div>

        {coverImageUrl && (
          <button
            type="button"
            onClick={handleRemoveCover}
            disabled={busyAction !== null}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
            Remove cover
          </button>
        )}
      </div>

      <div className="relative h-[170px] overflow-hidden rounded-[18px] border border-lumina-border bg-lumina-surface-soft sm:h-[210px]">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt="Cover preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lumina-text-muted">
            <div className="text-center">
              <ImageIcon
                size={24}
                strokeWidth={1.4}
                className="mx-auto"
                aria-hidden="true"
              />
              <p className="mt-2 text-[13px]">Add a cover image</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busyAction !== null}
          aria-label={coverImageUrl ? "Change cover image" : "Add cover image"}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-lumina-glass-border bg-lumina-glass text-lumina-text shadow-sm backdrop-blur-[10px] transition hover:bg-lumina-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-text/25 disabled:opacity-60"
        >
          {busyAction === "upload" ? (
            <LoaderCircle
              size={17}
              strokeWidth={1.7}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Pencil size={16} strokeWidth={1.7} aria-hidden="true" />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleCoverSelection}
        />
      </div>

      {!coverImageUrl && displayImageUrl && (
        <p className="mt-2 text-[12px] text-lumina-text-muted">
          Previewing your current fallback image until you add a custom cover.
        </p>
      )}

      {busyAction === "remove" && (
        <p className="mt-2 text-[12px] text-lumina-text-muted">
          Removing cover…
        </p>
      )}

      {feedback && !busyAction && (
        <p className="mt-2 text-[12px] text-lumina-success" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
