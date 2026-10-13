"use client";
import { Bookmark } from "lucide-react";
import SaveArtistButton from "@/components/SaveArtistButton";
import { useLocalLookLibrary } from "@/lib/local-look-library";

export default function DiscoverySaveArtistButton({ artistId, name, demo, onChange }: {
  artistId: string; name: string; demo?: boolean; onChange?: () => void;
}) {
  const library = useLocalLookLibrary();
  if (!demo) return <SaveArtistButton artistId={artistId} artistName={name} showLabel onChange={onChange} />;
  const saved = library.state.demoArtists.includes(artistId);
  return <button type="button" disabled={!library.ready} aria-pressed={saved}
    aria-label={`${saved ? "Remove" : "Save"} demo artist: ${name}`}
    onClick={async () => { await library.toggleDemoArtist(artistId); onChange?.(); }}>
    <Bookmark size={18} strokeWidth={1.7} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    {saved ? "Artist saved" : "Save artist"}
  </button>;
}
