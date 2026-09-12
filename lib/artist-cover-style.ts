export const ARTIST_COVER_STYLES = [
  { value: "natural", label: "Natural" },
  { value: "soft_blur", label: "Soft blur" },
  { value: "softened", label: "Softened" },
] as const;

export type ArtistCoverStyle = (typeof ARTIST_COVER_STYLES)[number]["value"];

export function normalizeArtistCoverStyle(
  value: string | null | undefined
): ArtistCoverStyle {
  return ARTIST_COVER_STYLES.some((style) => style.value === value)
    ? (value as ArtistCoverStyle)
    : "natural";
}

export function getArtistCoverImageClass(style: ArtistCoverStyle) {
  if (style === "soft_blur") {
    return "h-full w-full object-cover blur-[2px]";
  }

  if (style === "softened") {
    return "h-full w-full object-cover saturate-[0.82] contrast-[0.9] brightness-[1.03]";
  }

  return "h-full w-full object-cover";
}

export function getArtistCoverOverlayClass(style: ArtistCoverStyle) {
  return style === "softened"
    ? "pointer-events-none absolute inset-0 bg-lumina-pearl/20"
    : null;
}
