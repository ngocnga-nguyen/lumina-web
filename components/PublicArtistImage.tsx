"use client";

import { useCallback, useState } from "react";

type PublicArtistImageProps = {
  artistName: string;
  profileImageUrl?: string | null;
  portfolioImageUrl?: string | null;
  imageClassName?: string;
};

export default function PublicArtistImage({
  artistName,
  profileImageUrl,
  portfolioImageUrl,
  imageClassName = "object-cover",
}: PublicArtistImageProps) {
  const profileSource = profileImageUrl?.trim() || null;
  const portfolioSource = portfolioImageUrl?.trim() || null;
  const [imageSource, setImageSource] = useState(
    profileSource || portfolioSource
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const tryFallback = useCallback(() => {
    setImageLoaded(false);
    setImageSource((currentSource) =>
      currentSource === profileSource &&
      portfolioSource &&
      portfolioSource !== profileSource
        ? portfolioSource
        : null
    );
  }, [portfolioSource, profileSource]);
  const handleImageElement = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete) return;
      if (image.naturalWidth > 0) setImageLoaded(true);
      else tryFallback();
    },
    [tryFallback]
  );

  return (
    <div className="relative h-full w-full bg-lumina-pearl">
      <div className="absolute inset-0 flex items-center justify-center text-[24px] font-medium text-lumina-text-muted">
        {artistName.charAt(0).toUpperCase()}
      </div>
      {imageSource && (
        // Public profile media is intentionally served directly from the public
        // Supabase bucket, matching the working Browse card renderer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageSource}
          ref={handleImageElement}
          src={imageSource}
          alt={`${artistName} profile`}
          onLoad={() => setImageLoaded(true)}
          onError={tryFallback}
          className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${imageClassName} ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
