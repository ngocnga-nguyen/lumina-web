export const PROFILE_IMAGE_BUCKET = "profile-images";
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const PROFILE_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function getProfileImageValidationError(
  file: Pick<File, "type" | "size">
) {
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "Please choose an image smaller than 5 MB.";
  }

  return null;
}

export function createProfileImagePath(userId: string, mimeType: string) {
  const extension = PROFILE_IMAGE_TYPES.get(mimeType);
  if (!extension) {
    throw new Error("Unsupported profile image type.");
  }

  const randomName =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${userId}/${randomName}.${extension}`;
}

export function getOwnedProfileImagePath(url: string, userId: string) {
  try {
    const marker = `/storage/v1/object/public/${PROFILE_IMAGE_BUCKET}/`;
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const storagePath = decodeURIComponent(
      pathname.slice(markerIndex + marker.length)
    );
    const ownerFolder = `${userId}/`;

    if (storagePath.startsWith(ownerFolder)) return storagePath;
    if (!storagePath.includes("/") && storagePath.startsWith(`${userId}-`)) {
      return storagePath;
    }

    return null;
  } catch {
    return null;
  }
}
