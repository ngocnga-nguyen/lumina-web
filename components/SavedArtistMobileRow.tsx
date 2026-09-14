"use client";

import { useRouter } from "next/navigation";
import { Check, MapPin, Star } from "lucide-react";
import SaveArtistButton from "@/components/SaveArtistButton";
import PublicArtistImage from "@/components/PublicArtistImage";
import type { SavedReviewSummary } from "@/lib/saved-professional-view";

export type SavedMobileArtist = {
  id: string;
  name: string;
  business_name?: string | null;
  category: string;
  location: string;
  price_start: number;
  profile_image_url?: string | null;
  portfolio_image_url?: string | null;
};

type SavedArtistMobileRowProps = {
  artist: SavedMobileArtist;
  distance: number | null;
  reviewSummary?: SavedReviewSummary;
  selectionMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemoved: () => void;
  organizeControl?: React.ReactNode;
};

export default function SavedArtistMobileRow({
  artist,
  distance,
  reviewSummary,
  selectionMode,
  selected,
  onSelect,
  onRemoved,
  organizeControl,
}: SavedArtistMobileRowProps) {
  const router = useRouter();

  const activateRow = () => {
    if (selectionMode) {
      onSelect();
      return;
    }
    router.push(`/artist/${artist.id}`);
  };

  return (
    <article
      role={selectionMode ? "checkbox" : "link"}
      aria-checked={selectionMode ? selected : undefined}
      tabIndex={0}
      onClick={activateRow}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateRow();
        }
      }}
      className={`group grid cursor-pointer grid-cols-[96px_minmax(0,1fr)] gap-3 border-b px-0 py-3 outline-none transition last:border-b-0 focus-visible:ring-2 focus-visible:ring-lumina-text/20 sm:grid-cols-[104px_minmax(0,1fr)] ${
        selected
          ? "border-lumina-border bg-lumina-blush/35"
          : "border-lumina-border/75 bg-transparent hover:bg-lumina-pearl/45"
      }`}
    >
      <div className="relative h-[104px] overflow-hidden rounded-[16px] bg-lumina-pearl sm:h-[112px]">
        <PublicArtistImage
          artistName={artist.name}
          profileImageUrl={artist.profile_image_url}
          portfolioImageUrl={artist.portfolio_image_url}
        />

        <div
          className="absolute right-1.5 top-1.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <SaveArtistButton
            artistId={artist.id}
            artistName={artist.name}
            compactGlass
            onChange={(saved) => {
              if (!saved) onRemoved();
            }}
          />
        </div>

        {selectionMode && (
          <span
            aria-hidden="true"
            className={`absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-sm ${
              selected
                ? "border-lumina-black bg-lumina-black text-white"
                : "border-white/80 bg-white/85 text-transparent"
            }`}
          >
            <Check size={15} strokeWidth={2.2} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col py-0.5">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-[16px] font-semibold leading-[1.2] text-lumina-text">
            {artist.name}
          </h2>
          {artist.business_name && (
            <p className="mt-0.5 truncate text-[12px] text-lumina-text-muted">
              {artist.business_name}
            </p>
          )}
          <p className="mt-1 truncate text-[12px] text-lumina-text-muted">
            {artist.category}
          </p>
        </div>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-lumina-text-muted">
          {reviewSummary && reviewSummary.count > 0 && (
            <span className="inline-flex items-center gap-1 text-lumina-text">
              <Star size={11} className="fill-current" aria-hidden="true" />
              {reviewSummary.average.toFixed(1)} ({reviewSummary.count})
            </span>
          )}
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {artist.location}
              {distance !== null ? ` · ${distance.toFixed(1)} mi` : ""}
            </span>
          </span>
        </div>

        <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
          <p className="shrink-0 text-[13px] font-medium text-lumina-text">
            From ${artist.price_start}
          </p>
          <div
            className="min-w-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {organizeControl}
          </div>
        </div>
      </div>
    </article>
  );
}
