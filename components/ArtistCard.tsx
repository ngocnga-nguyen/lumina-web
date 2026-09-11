"use client";

import Link from "next/link";
import SaveArtistButton from "@/components/SaveArtistButton";

type ArtistCardProps = {
  artist: {
    id: string;
    name: string;
    business_name?: string | null;
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

function getCompactLocation(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return location.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();
  }

  const region = parts.at(-1)?.replace(/\s+\d{5}(?:-\d{4})?$/, "").trim();
  return [parts.at(-2), region].filter(Boolean).join(", ");
}

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
        className={`relative w-full overflow-hidden bg-lumina-pearl ${
          compactMobile
            ? "aspect-square rounded-[14px] lg:aspect-[4/3] lg:rounded-[18px]"
            : "aspect-video rounded-[16px] sm:aspect-[4/3] sm:rounded-[18px]"
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
            className={`absolute ${compactMobile ? "right-2 top-2 lg:right-3 lg:top-3" : "right-3 top-3"}`}
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
          <span
            className={`absolute rounded-full bg-lumina-black font-medium text-white shadow-sm ${
              compactMobile
                ? "left-2 top-2 px-2 py-1 text-[10px] lg:left-3 lg:top-3 lg:px-3 lg:py-1.5 lg:text-[12px]"
                : "left-3 top-3 px-3 py-1.5 text-[12px]"
            }`}
          >
            Your profile
          </span>
        )}
      </div>

      <div className={compactMobile ? "pt-2 lg:pt-4" : "pt-2.5 sm:pt-4"}>
        <p
          className={`text-lumina-text-muted ${
            compactMobile
              ? "text-[11px] leading-4 lg:text-[13px] lg:leading-normal"
              : "text-[12px] leading-5 sm:text-[13px]"
          }`}
        >
          <span className="text-lumina-black">★</span> New profile
        </p>

        <h3
          className={`leading-[1.15] ${
            compactMobile
              ? "mt-0.5 line-clamp-2 min-h-[37px] text-[16px] lg:mt-3 lg:line-clamp-none lg:min-h-0 lg:text-[21px]"
              : "mt-1 text-[19px] sm:mt-3 sm:text-[21px]"
          }`}
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          {artist.name}
        </h3>

        {artist.business_name && (
          <p
            className={`truncate text-lumina-text ${
              compactMobile
                ? "mt-0.5 text-[11px] leading-4 lg:text-[13px]"
                : "mt-1 text-[13px] leading-5 sm:text-[14px]"
            }`}
          >
            {artist.business_name}
          </p>
        )}

        <p
          className={`text-lumina-text-muted ${
            compactMobile
              ? "mt-0.5 truncate text-[12px] leading-4 lg:mt-1 lg:text-[15px] lg:leading-normal"
              : "mt-0.5 text-[14px] leading-5 sm:mt-1 sm:text-[15px] sm:leading-normal"
          }`}
        >
          {artist.category}
        </p>

        <div
          className={`flex justify-between border-t border-lumina-border ${
            compactMobile
              ? "mt-2 items-start gap-2 pt-2 text-[12px] lg:mt-4 lg:gap-4 lg:pt-4 lg:text-[14px]"
              : "mt-2 items-start gap-3 pt-2 text-[13px] sm:mt-4 sm:gap-4 sm:pt-4 sm:text-[14px]"
          }`}
        >
          <div className={compactMobile ? "flex min-w-0 flex-col lg:block" : "min-w-0"}>
            <p className={compactMobile ? "order-2 truncate text-[11px] leading-4 text-lumina-text-muted lg:text-[14px] lg:leading-normal" : "truncate text-lumina-text-muted"}>
              {compactMobile ? (
                <>
                  <span className="lg:hidden">
                    {getCompactLocation(artist.location)}
                    {distance !== null ? ` · ${distance.toFixed(1)} mi away` : ""}
                  </span>
                  <span className="hidden lg:inline">{artist.location}</span>
                </>
              ) : (
                artist.location
              )}
            </p>

            {distance !== null && (
              <p
                className={`text-[12px] text-lumina-text-muted sm:mt-1 ${
                  compactMobile ? "hidden lg:block" : "mt-0.5"
                }`}
              >
                {distance.toFixed(1)} miles away
              </p>
            )}

            <p className={compactMobile ? "order-1 font-medium leading-4 text-lumina-black lg:mt-1 lg:leading-normal" : "mt-0.5 font-medium text-lumina-black sm:mt-1"}>
              From ${artist.price_start}
            </p>
          </div>

          <span
            className={`shrink-0 text-lumina-text-muted transition group-hover:translate-x-1 group-hover:text-lumina-black ${
              compactMobile ? "hidden lg:inline" : ""
            }`}
          >
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
