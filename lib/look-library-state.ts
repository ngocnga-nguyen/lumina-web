export type LookLibraryState = {
  saved: string[];
  folders: string[];
  membership: Record<string, string>;
  demoArtists: string[];
  drafts: Record<string, string>;
};
export const emptyLookLibrary = (): LookLibraryState => ({
  saved: [], folders: ["Lash ideas", "Hair color", "Nails", "Birthday look"],
  membership: {}, demoArtists: [], drafts: {},
});
export const lookStorageKey = (accountId: string) => `lumina:look-library:v1:${accountId}`;

export function parseLookLibrary(raw: string | null): LookLibraryState {
  const initial = emptyLookLibrary();
  if (!raw) return initial;
  try {
    const value = JSON.parse(raw);
    const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
    const record = (v: unknown): v is Record<string, string> => !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every(x => typeof x === "string");
    if (!strings(value.saved) || !strings(value.folders) || !record(value.membership)) return initial;
    return { saved: value.saved, folders: value.folders, membership: value.membership,
      demoArtists: strings(value.demoArtists) ? value.demoArtists : [],
      drafts: record(value.drafts) ? value.drafts : {} };
  } catch { return initial; }
}
