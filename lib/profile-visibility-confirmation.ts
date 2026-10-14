// Browser-only presentation preference. Never controls public-profile visibility.
type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type VisibilityConfirmation = { visible: boolean; dismissed: boolean };
const memory = new Map<string, VisibilityConfirmation>();
export const VISIBILITY_CONFIRMATION_EVENT = "lumina:visibility-confirmation";
export const visibilityConfirmationKey = (artistId: string) =>
  `lumina-profile-visibility-confirmation-v1:${artistId}`;

function browserStorage(): StorageLike | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

export function readVisibilityConfirmation(
  artistId: string, storage: StorageLike | null = browserStorage()
): VisibilityConfirmation | null {
  const key = visibilityConfirmationKey(artistId);
  if (!storage) return memory.get(key) || null;
  try {
    const value = JSON.parse(storage.getItem(key) || "null");
    return value && typeof value.visible === "boolean" && typeof value.dismissed === "boolean"
      ? { visible: value.visible, dismissed: value.dismissed } : null;
  } catch { return memory.get(key) || null; }
}

export function writeVisibilityConfirmation(
  artistId: string, value: VisibilityConfirmation, storage: StorageLike | null = browserStorage()
) {
  memory.set(visibilityConfirmationKey(artistId), value);
  try { storage?.setItem(visibilityConfirmationKey(artistId), JSON.stringify(value)); }
  catch { /* A blocked/full store falls back to this tab's memory. */ }
}

export function reconcileVisibilityConfirmation(
  previous: VisibilityConfirmation | null, visible: boolean
): VisibilityConfirmation {
  return previous?.visible === visible ? previous : { visible, dismissed: false };
}

// Called only after the existing Settings visibility operation succeeds.
export function queueVisibilityConfirmation(artistId: string, visible: boolean) {
  writeVisibilityConfirmation(artistId, { visible, dismissed: false });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(VISIBILITY_CONFIRMATION_EVENT));
}
