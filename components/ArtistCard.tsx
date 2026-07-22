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
};

export default function ArtistCard({
  artist,
  distance = null,
  className = "",
  showCompare = false,
  isSelected = false,
  onCompare,
  onRemoved,
}: ArtistCardProps) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className={`group block ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-[#eeeeee]">
        {artist.profile_image_url ? (
          <img
            src={artist.profile_image_url}
            alt={artist.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-neutral-400">
            <div>
              <p className="text-[15px]">Profile Image</p>
              <p className="mt-1 text-[12px]">Coming soon</p>
            </div>
          </div>
        )}

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
      </div>

      <div className="pt-4">
        <p className="text-[13px] text-neutral-500">
          <span className="text-black">★</span> New profile
        </p>

        <h3
          className="mt-3 text-[21px] leading-[1.15]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {artist.name}
        </h3>

        <p className="mt-1 text-[15px] text-neutral-500">
          {artist.category}
        </p>

        <div className="mt-4 flex items-start justify-between gap-4 border-t border-neutral-200 pt-4 text-[14px]">
          <div>
            <p className="text-neutral-600">{artist.location}</p>

            {distance !== null && (
              <p className="mt-1 text-[12px] text-neutral-500">
                {distance.toFixed(1)} miles away
              </p>
            )}

            <p className="mt-1 font-medium text-black">
              From ${artist.price_start}
            </p>
          </div>

          <span className="text-neutral-500 transition group-hover:translate-x-1 group-hover:text-black">
            View →
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
      isSelected ? "text-black" : "text-neutral-500 hover:text-black"
    }`}
  >
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border text-[12px] ${
        isSelected
          ? "border-black bg-black text-white"
          : "border-neutral-300 bg-white"
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