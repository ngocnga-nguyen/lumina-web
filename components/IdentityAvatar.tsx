"use client";

/* eslint-disable @next/next/no-img-element -- Profile media uses validated public storage URLs with an initials fallback. */

import { useState } from "react";
import {
  getClientIdentityInitials,
  normalizeClientAvatarUrl,
} from "@/lib/client-identity";

type IdentityAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export default function IdentityAvatar({
  name,
  imageUrl,
  className,
  imageClassName = "object-cover",
  fallbackClassName = "",
}: IdentityAvatarProps) {
  const source = normalizeClientAvatarUrl(imageUrl);
  const [imageState, setImageState] = useState<{
    source: string | null;
    loaded: boolean;
    failed: boolean;
  }>({ source: null, loaded: false, failed: false });
  const currentState =
    imageState.source === source
      ? imageState
      : { source, loaded: false, failed: false };
  const showImage = Boolean(source && !currentState.failed);

  return (
    <span className={`relative overflow-hidden ${className}`}>
      <span
        className={`absolute inset-0 flex items-center justify-center ${fallbackClassName}`}
        aria-hidden={showImage && currentState.loaded}
      >
        {getClientIdentityInitials(name)}
      </span>
      {showImage && source && (
        <img
          src={source}
          alt={name}
          className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${imageClassName} ${
            currentState.loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() =>
            setImageState({ source, loaded: true, failed: false })
          }
          onError={() =>
            setImageState({ source, loaded: false, failed: true })
          }
        />
      )}
    </span>
  );
}
