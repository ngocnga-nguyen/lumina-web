import type { CSSProperties } from "react";
import type { ArtistCoverStyle } from "@/lib/artist-cover-style";

export const DEFAULT_ARTIST_COVER_FRAMING = {
  positionX: 0.5,
  positionY: 0.5,
  scale: 1,
} as const;

export type ArtistCoverFraming = {
  positionX: number;
  positionY: number;
  scale: number;
};

function parseFramingNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return Number(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeArtistCoverFraming(
  positionX: unknown,
  positionY: unknown,
  scale: unknown
): ArtistCoverFraming {
  const parsedX = parseFramingNumber(positionX);
  const parsedY = parseFramingNumber(positionY);
  const parsedScale = parseFramingNumber(scale);

  return {
    positionX: Number.isFinite(parsedX) ? clamp(parsedX, 0, 1) : 0.5,
    positionY: Number.isFinite(parsedY) ? clamp(parsedY, 0, 1) : 0.5,
    scale: Number.isFinite(parsedScale) ? clamp(parsedScale, 1, 1.5) : 1,
  };
}

export function getArtistCoverFramingStyle(
  framing: ArtistCoverFraming,
  style: ArtistCoverStyle = "natural"
): CSSProperties {
  const normalized = normalizeArtistCoverFraming(
    framing.positionX,
    framing.positionY,
    framing.scale
  );
  const blurCompensation = style === "soft_blur" ? 1.025 : 1;
  const renderedScale = Number(
    (normalized.scale * blurCompensation).toFixed(4)
  );

  return {
    objectPosition: `${normalized.positionX * 100}% ${normalized.positionY * 100}%`,
    transform: `scale(${renderedScale})`,
    transformOrigin: "center",
  };
}
