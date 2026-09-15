export const CLIENT_IDENTITY_PROFILE_COLUMNS = "id, full_name, avatar_url";

export type ClientIdentityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type ResolvedClientIdentity = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export function normalizeClientAvatarUrl(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getClientIdentityInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  return `${parts[0][0] || ""}${parts.length > 1 ? parts.at(-1)?.[0] || "" : ""}`.toUpperCase();
}

export function resolveClientIdentity(
  clientId: string,
  profile: ClientIdentityProfile | null | undefined,
  historicalName?: string | null
): ResolvedClientIdentity {
  return {
    id: clientId,
    name:
      profile?.full_name?.trim() ||
      historicalName?.trim() ||
      "Lumina client",
    avatarUrl: normalizeClientAvatarUrl(profile?.avatar_url),
  };
}
