import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Camera, ChevronDown, Pencil, ShieldCheck, Star } from "lucide-react";

type Props = {
  name: string;
  businessName?: string | null;
  category: string;
  location: string;
  startingPrice: number;
  profileImage?: string;
  coverImage: string | null;
  coverClassName: string;
  coverStyle: CSSProperties;
  coverOverlayClassName: string | null;
  bio: string;
  availability?: string;
  availabilitySummary: string;
  availabilityExpanded: boolean;
  onToggleAvailability: () => void;
  detailsExpanded: boolean;
  onToggleDetails: () => void;
  licenseVerified: boolean;
  experience: string | null;
  serviceCount: number;
  portfolioCount: number;
  resultCount: number;
  reviewCount: number;
  rating: number;
  locationType?: string | null;
  mobileLocationDetails?: string | null;
  isOwner: boolean;
  privatePreview: boolean;
  onEditCover: () => void;
  onEditAvatar: () => void;
  saveControl: ReactNode;
};

/** Presentation only: the public route owns data, access and interaction state. */
export default function StorefrontDesktopHero(props: Props) {
  const avatar = props.profileImage ? (
    <img src={props.profileImage} alt={props.name} className="h-full w-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-lumina-pearl font-serif text-[36px]">{props.name.charAt(0).toUpperCase()}</span>
  );
  return (
    <div className="hidden md:block" data-storefront-desktop-hero>
      <div className="relative h-[210px] overflow-hidden rounded-t-[20px] bg-lumina-pearl lg:h-[250px] xl:h-[280px]">
        {props.coverImage && (
          <img src={props.coverImage} alt="" aria-hidden="true" className={props.coverClassName} style={props.coverStyle} />
        )}
        {props.coverImage && props.coverOverlayClassName && <span className={props.coverOverlayClassName} aria-hidden="true" />}
        {props.isOwner && (
          <button type="button" onClick={props.onEditCover} className="absolute right-4 top-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/35 bg-lumina-surface/85 px-3.5 text-[12px] text-lumina-text backdrop-blur-[8px]">
            <Pencil size={13} aria-hidden="true" /> Edit cover
          </button>
        )}
      </div>

      <div className="relative -mt-8 rounded-b-[20px] border-x border-b border-lumina-glass-border/50 bg-lumina-glass/85 px-6 pb-6 backdrop-blur-[12px] xl:px-8 xl:pb-7">
        <div className="flex items-end justify-between gap-5">
          {props.isOwner ? (
            <button type="button" aria-label="Change profile photo" onClick={props.onEditAvatar} className="relative -mt-12 h-28 w-28 shrink-0 overflow-hidden rounded-full border border-lumina-surface/65 bg-transparent">
              {avatar}
              <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-lumina-black/55 text-white"><Camera size={13} aria-hidden="true" /></span>
            </button>
          ) : (
            <div className="relative -mt-12 h-28 w-28 shrink-0 overflow-hidden rounded-full border border-lumina-surface/65 bg-transparent">
              {avatar}
            </div>
          )}
          <div className="pb-2">{props.saveControl}</div>
        </div>

        <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
          <div className="min-w-0">
            <h1 className="break-words font-serif text-[32px] font-semibold leading-[1.08] lg:text-[36px] xl:text-[40px]">{props.name}</h1>
            {props.businessName && <p className="mt-1 text-[16px] text-lumina-text-muted">{props.businessName}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-lumina-text-muted">
              <span>{props.category}</span><span aria-hidden="true">·</span><span>{props.location}</span>
              <span className="font-medium text-lumina-text">Starting at ${props.startingPrice}</span>
            </div>
            {props.isOwner && <p className="mt-2 text-[11px] text-lumina-text-muted">{props.privatePreview ? "Private preview · Not currently active" : "This is your public profile"}</p>}
            {(props.licenseVerified || props.reviewCount > 0) && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px]" aria-label="Professional highlights">
                {props.licenseVerified && <span className="inline-flex items-center gap-1.5" title="Professional-license details reviewed by Lumina"><ShieldCheck size={15} strokeWidth={1.7} aria-hidden="true" />License verified</span>}
                {props.reviewCount > 0 && <span className="inline-flex items-center gap-1.5" title="Linked to completed Lumina appointments"><Star size={14} strokeWidth={1.7} aria-hidden="true" />{props.rating.toFixed(1)} · {props.reviewCount} verified {props.reviewCount === 1 ? "review" : "reviews"}</span>}
              </div>
            )}
            <div className="mt-3">
              <button type="button" onClick={props.onToggleDetails} aria-expanded={props.detailsExpanded} aria-controls="desktop-storefront-details" className="inline-flex min-h-8 items-center gap-1 text-[12px] text-lumina-text-muted hover:text-lumina-text">
                {props.detailsExpanded ? "Less about this professional" : "More about this professional"}<ChevronDown size={13} aria-hidden="true" className={props.detailsExpanded ? "rotate-180" : ""} />
              </button>
              <div id="desktop-storefront-details" hidden={!props.detailsExpanded}>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-relaxed text-lumina-text-muted">
                  {props.experience && <span>{props.experience} <span className="text-[11px]">· Provided by the professional</span></span>}
                  {props.serviceCount > 0 && <span>{props.serviceCount} {props.serviceCount === 1 ? "service listed" : "services listed"}</span>}
                  {props.portfolioCount > 0 && <span>{props.portfolioCount} {props.portfolioCount === 1 ? "portfolio photo" : "portfolio photos"}</span>}
                  {props.resultCount > 0 && <span>{props.resultCount} Before &amp; After {props.resultCount === 1 ? "result" : "results"} · Added by professional</span>}
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-[800px] whitespace-pre-line text-[14px] leading-[1.65] text-lumina-text">{props.bio}</p>
          </div>

          <div className="min-w-0 border-t border-lumina-glass-border/70 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <button type="button" onClick={props.onToggleAvailability} aria-expanded={props.availabilityExpanded} aria-controls="profile-availability-details" className="flex min-h-10 w-full items-start justify-between gap-3 text-left">
              <span className="min-w-0"><span className="block font-serif text-[18px]">Availability</span>{!props.availabilityExpanded && <span className="mt-1 block text-[12px] leading-relaxed text-lumina-text-muted">{props.availabilitySummary}</span>}</span>
              <ChevronDown size={15} aria-hidden="true" className={`mt-1 shrink-0 text-lumina-text-muted ${props.availabilityExpanded ? "rotate-180" : ""}`} />
            </button>
            {props.availabilityExpanded && <div id="profile-availability-details"><p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-lumina-text-muted">{props.availability || "Availability coming soon."}</p>{props.isOwner && <Link href="/dashboard/profile" className="mt-3 inline-flex min-h-8 items-center text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">Edit profile</Link>}</div>}
            {props.locationType === "mobile_salon" && <p className="mt-4 text-[12px] leading-relaxed text-lumina-text-muted">Mobile salon — exact appointment location is shared after confirmation.{props.mobileLocationDetails ? ` ${props.mobileLocationDetails}` : ""}</p>}
            {props.locationType === "travels" && <p className="mt-4 text-[12px] leading-relaxed text-lumina-text-muted">Exact service details are shared after booking confirmation.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
