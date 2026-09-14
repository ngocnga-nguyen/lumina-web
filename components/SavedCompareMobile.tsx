"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, X } from "lucide-react";
import type {
  SavedReviewSummary,
  SavedServiceSummary,
} from "@/lib/saved-professional-view";
import type { SavedMobileArtist } from "@/components/SavedArtistMobileRow";

export type SavedCompareArtist = SavedMobileArtist & {
  distance: number | null;
  reviewSummary?: SavedReviewSummary;
  services: SavedServiceSummary[];
  availability?: string | null;
};

type SavedCompareMobileProps = {
  artists: SavedCompareArtist[];
  onBack: () => void;
  onRemove: (artistId: string) => void;
};

function availabilityPreview(value?: string | null) {
  if (!value?.trim()) return "View profile for availability";
  return value.split(/\n|\r/).find((line) => line.trim())?.trim() || value.trim();
}

export default function SavedCompareMobile({
  artists,
  onBack,
  onRemove,
}: SavedCompareMobileProps) {
  const threeArtists = artists.length === 3;

  return (
    <section aria-labelledby="mobile-compare-title" className="pb-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 text-[12px] font-medium text-lumina-text-muted transition hover:text-lumina-text"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to Saved
      </button>

      <div className="mb-4 mt-1 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">
            Compare
          </p>
          <h1
            id="mobile-compare-title"
            className="mt-1 text-[28px] font-semibold leading-none text-lumina-text"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Your shortlist
          </h1>
        </div>
        <p className="text-[11px] text-lumina-text-muted">{artists.length}/3</p>
      </div>

      <div
        className={
          threeArtists
            ? "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-2 gap-3"
        }
      >
        {artists.map((artist) => (
          <article
            key={artist.id}
            className={`flex min-w-0 flex-col rounded-[19px] border border-lumina-glass-border bg-[rgba(255,255,255,0.78)] p-2.5 shadow-[0_5px_18px_rgba(39,36,40,0.045)] backdrop-blur-md ${
              threeArtists
                ? "w-[calc((100vw-3.25rem)/2)] shrink-0 snap-start"
                : ""
            }`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[13px] bg-lumina-pearl">
              {artist.profile_image_url ? (
                <Image
                  src={artist.profile_image_url}
                  alt={`${artist.name} profile`}
                  fill
                  sizes="(max-width: 767px) 45vw, 180px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[24px] font-medium text-lumina-text-muted">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(artist.id)}
                aria-label={`Remove ${artist.name} from comparison`}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-lumina-text"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/60 bg-white/72 shadow-[0_2px_7px_rgba(39,36,40,0.06)] backdrop-blur-md">
                  <X size={12} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </button>
            </div>

            <div className="min-h-[76px] pt-2.5">
              <h2 className="line-clamp-2 text-[15px] font-semibold leading-[1.2] text-lumina-text">
                {artist.name}
              </h2>
              {artist.business_name && (
                <p className="mt-1 line-clamp-1 text-[11px] text-lumina-text-muted">
                  {artist.business_name}
                </p>
              )}
              <p className="mt-1 line-clamp-1 text-[11px] text-lumina-text-muted">
                {artist.category}
              </p>
            </div>

            <dl className="text-[11px]">
              <div className="min-h-[58px] border-t border-lumina-border/45 py-2.5">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                  Location
                </dt>
                <dd className="mt-1 flex items-start gap-1 leading-[1.35] text-lumina-text">
                  <MapPin size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {artist.location}
                    {artist.distance !== null ? ` · ${artist.distance.toFixed(1)} mi` : ""}
                  </span>
                </dd>
              </div>
              <div className="min-h-[55px] border-t border-lumina-border/45 py-2.5">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                  Reviews
                </dt>
                <dd className="mt-1 text-lumina-text">
                  {artist.reviewSummary && artist.reviewSummary.count > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="fill-current" aria-hidden="true" />
                      {artist.reviewSummary.average.toFixed(1)} ({artist.reviewSummary.count})
                    </span>
                  ) : (
                    <span className="text-lumina-text-muted">No published reviews</span>
                  )}
                </dd>
              </div>
              <div className="min-h-[54px] border-t border-lumina-border/45 py-2.5">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                  Starting price
                </dt>
                <dd className="mt-1 font-medium text-lumina-text">From ${artist.price_start}</dd>
              </div>
              <div className="min-h-[96px] border-t border-lumina-border/45 py-2.5">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                  Services
                </dt>
                <dd className="mt-1.5 space-y-1.5 leading-[1.3] text-lumina-text">
                  {artist.services.length > 0 ? (
                    artist.services.slice(0, 3).map((service) => (
                      <span key={service.id} className="block">
                        {service.service_name}
                        {service.price !== null ? ` · $${service.price}` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-lumina-text-muted">View current services</span>
                  )}
                </dd>
              </div>
              <div className="min-h-[70px] border-t border-lumina-border/45 py-2.5">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">
                  Availability
                </dt>
                <dd className="mt-1 line-clamp-2 leading-[1.35] text-lumina-text">
                  {availabilityPreview(artist.availability)}
                </dd>
              </div>
            </dl>

            <Link
              href={`/artist/${artist.id}`}
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-lumina-border/80 bg-white/82 px-3 text-center text-[11px] font-medium text-lumina-text transition hover:border-lumina-black hover:bg-lumina-black hover:text-white"
            >
              View profile
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
