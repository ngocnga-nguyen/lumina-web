"use client";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import SavedCompareMobile from "@/components/SavedCompareMobile";
import { toggleSavedCompareSelection } from "@/lib/saved-professional-view";
import { useLocalLookLibrary } from "@/lib/local-look-library";

export default function SavedDemoArtists() {
  const library = useLocalLookLibrary();
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const artists = library.artists.filter(a => library.state.demoArtists.includes(a.id));
  const compare = artists.filter(a => selected.includes(a.id));
  if (!artists.length) return null;
  return <section className="look-demo-artists" aria-label="Locally saved demo artists">
    <h2>Demo artists · browser only</h2>
    <p className="look-note">Fictional professionals for local testing. Separate from your real artist bookmarks and collections.</p>
    {comparing && compare.length >= 2 ? <SavedCompareMobile artists={compare} getProfileHref={id => `/discover?demo=1&look=${encodeURIComponent(library.catalog.find(l => l.artistId === id)!.id)}`} onBack={() => setComparing(false)} onRemove={id => {
      setSelected(s => s.filter(x => x !== id)); if (compare.length <= 2) setComparing(false);
    }} /> : <>
      <div className="look-demo-artist-list">{artists.map(a => <article key={a.id}>
        <strong>{a.name}</strong><span>{a.category} · {a.location}</span><span>From ${a.price_start} · AI demo</span>
        <button aria-pressed={selected.includes(a.id)} onClick={() => setSelected(s => toggleSavedCompareSelection(s, a.id).ids)}>Compare {a.name}</button>
        <button onClick={() => void library.toggleDemoArtist(a.id)}><Bookmark size={16} strokeWidth={1.7} aria-hidden="true" /> Remove demo artist</button>
      </article>)}</div>
      <button className="look-primary" disabled={compare.length < 2} onClick={() => setComparing(true)}>Compare demo artists ({compare.length}/3)</button>
    </>}
  </section>;
}
