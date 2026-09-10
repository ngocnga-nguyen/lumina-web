"use client";

import Link from "next/link";
import SaveArtistButton from "@/components/SaveArtistButton";

type ArtistCardProps = {
  artist: {
    id: string;
    name: string;
    category: string;
    location: string;
    price_start: number;
    profile_image_url?: string | null;
  };
  distance?: number | null;
  className?: string;
  showCompare?: boolean;
  isSelected?: boolean;
  onCompare?: () => void;
  onRemoved?: () => void;
  viewerIsArtist?: boolean;
  isOwnProfile?: boolean;
  compactMobile?: boolean;
};

export default function ArtistCard({
  artist,
  distance = null,
  className = "",
  showCompare = false,
  isSelected = false,
  onCompare,
  onRemoved,
  viewerIsArtist = false,
  isOwnProfile = false,
  compactMobile = false,
}: ArtistCardProps) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className={`group block ${className}`}
    >
      <div
        className={`relative w-full overflow-hidden bg-lumina-pearl sm:aspect-[4/3] sm:h-auto sm:rounded-[18px] ${
          compactMobile
            ? "h-[152px] rounded-[14px]"
            : "aspect-video rounded-[16px]"
        }`}
      >
        {artist.profile_image_url ? (
          <img
            src={artist.profile_image_url}
            alt={artist.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-lumina-text-muted">
            <div>
              <p className="text-[15px]">Profile Image</p>
              <p className="mt-1 text-[12px]">Coming soon</p>
            </div>
          </div>
        )}

        {!viewerIsArtist && (
          <div
            className="absolute right-3 top-3"
            onClick={(event) => event.preventDefault()}
          >
            <SaveArtistButton
              artistId={artist.id}
              artistName={artist.name}
              onChange={(saved) => {
                if (!saved) {
                  onRemoved?.();
                }
              }}
            />
          </div>
        )}

        {isOwnProfile && (
          <span className="absolute left-3 top-3 rounded-full bg-lumina-black px-3 py-1.5 text-[12px] font-medium text-white shadow-sm">
            Your profile
          </span>
        )}
      </div>

      <div className={compactMobile ? "pt-2 sm:pt-4" : "pt-2.5 sm:pt-4"}>
        <p
          className={`text-lumina-text-muted sm:text-[13px] ${
            compactMobile ? "text-[11px] leading-4 sm:leading-normal" : "text-[12px] leading-5"
          }`}
        >
          <span className="text-lumina-black">★</span> New profile
        </p>

        <h3
          className={`leading-[1.15] sm:mt-3 sm:text-[21px] ${
            compactMobile ? "mt-0.5 text-[18px]" : "mt-1 text-[19px]"
          }`}
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {artist.name}
        </h3>

        <p
          className={`text-lumina-text-muted sm:mt-1 sm:text-[15px] sm:leading-normal ${
            compactMobile ? "mt-0 text-[13px] leading-4" : "mt-0.5 text-[14px] leading-5"
          }`}
        >
          {artist.category}
        </p>

        <div
          className={`flex justify-between border-t border-lumina-border sm:mt-4 sm:items-start sm:gap-4 sm:pt-4 sm:text-[14px] ${
            compactMobile
              ? "mt-1.5 items-end gap-2 pt-1.5 text-[12px]"
              : "mt-2 items-start gap-3 pt-2 text-[13px]"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-lumina-text-muted">
              {artist.location}
              {compactMobile && distance !== null && (
                <span className="sm:hidden"> · {distance.toFixed(1)} mi</span>
              )}
            </p>

            {distance !== null && (
              <p
                className={`text-[12px] text-lumina-text-muted sm:mt-1 ${
                  compactMobile ? "hidden sm:block" : "mt-0.5"
                }`}
              >
                {distance.toFixed(1)} miles away
              </p>
            )}

            <p className={compactMobile ? "mt-0 font-medium text-lumina-black sm:mt-1" : "mt-0.5 font-medium text-lumina-black sm:mt-1"}>
              From ${artist.price_start}
            </p>
          </div>

          <span className="shrink-0 text-lumina-text-muted transition group-hover:translate-x-1 group-hover:text-lumina-black">
            {isOwnProfile ? "View your profile →" : "View →"}
          </span>
          {showCompare && (
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onCompare?.();
    }}
    aria-pressed={isSelected}
    className={`mt-5 inline-flex items-center gap-2 text-[14px] font-medium transition ${
      isSelected ? "text-lumina-black" : "text-lumina-text-muted hover:text-lumina-black"
    }`}
  >
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border text-[12px] ${
        isSelected
          ? "border-lumina-black bg-lumina-black text-white"
          : "border-lumina-border bg-lumina-surface"
      }`}
    >
      {isSelected ? "✓" : ""}
    </span>

    Compare
  </button>
)}
        </div>
      </div>
    </Link>
  );
}
