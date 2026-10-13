"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowUpRight, Heart, UserRound, X } from "lucide-react";
import DiscoverySaveArtistButton from "@/components/DiscoverySaveArtistButton";
import { useLocalLookLibrary } from "@/lib/local-look-library";
import { discoveryCategory, discoveryLocation } from "@/lib/discovery-categories";

type Props = {
  saved?: boolean;
  artistIds?: string[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onCompare?: () => void;
};
type Shortcut = { id: string; left: number; top: number };

export default function DiscoverLooks({ saved = false, artistIds, selectedIds = [], onSelect, onCompare }: Props) {
  const { catalog, artists, state, toggle, assign, createFolder, status, ready, loading, error, retry, requireClient, saveDraft } = useLocalLookLibrary();
  const [folder, setFolder] = useState("All");
  const [draft, setDraft] = useState<{ id: string; notes: string } | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftFocus, setDraftFocus] = useState(0);
  const draftNotes = useRef<HTMLTextAreaElement>(null);
  const [demoProfile, setDemoProfile] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState<Shortcut | null>(null);
  const initialLookOpened = useRef(false);
  useEffect(() => {
    if (initialLookOpened.current || !catalog.length) return;
    const id = new URLSearchParams(window.location.search).get("look");
    const openLinkedLook = () => { if (id && catalog.some(l => l.id === id)) { initialLookOpened.current = true; setDetail(id); } };
    openLinkedLook();
  }, [catalog]);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shortcutOpener = useRef<HTMLButtonElement | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef<string | null>(null);

  const cancelHold = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  useEffect(() => cancelHold, []);

  useEffect(() => {
    if (detail) {
      opener.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
    }
  }, [detail]);

  useEffect(() => {
    if (!draftFocus) return;
    const notes = draftNotes.current;
    notes?.focus({ preventScroll: true });
    notes?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [draftFocus]);


  useEffect(() => {
    if (!shortcut) return;
    surface.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!surface.current?.contains(event.target as Node)) setShortcut(null);
    };
    const dismiss = () => setShortcut(null);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShortcut(null);
        shortcutOpener.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [shortcut]);

  const showShortcuts = (id: string, target: HTMLButtonElement) => {
    const rect = target.getBoundingClientRect();
    shortcutOpener.current = target;
    setShortcut({
      id,
      left: Math.max(14, Math.min(rect.left + 12, window.innerWidth - 248)),
      top: Math.max(14, Math.min(rect.top + rect.height / 2, window.innerHeight - 250)),
    });
  };
  const beginHold = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (!event.isPrimary || event.button !== 0) return;
    cancelHold();
    suppressClick.current = null;
    start.current = { x: event.clientX, y: event.clientY };
    const target = event.currentTarget;
    // Local interaction only. Scroll/movement/pointer cancellation never opens the shortcut.
    timer.current = setTimeout(() => {
      timer.current = null;
      suppressClick.current = id;
      showShortcuts(id, target);
    }, 550);
  };

  const visible = catalog.filter(l =>
    (!artistIds || artistIds.includes(l.artistId)) &&
    (!saved || state.saved.includes(l.id)) &&
    (!saved || folder === "All" || state.membership[l.id] === folder)
  );
  const look = catalog.find(l => l.id === detail);
  const artist = artists.find(a => a.id === look?.artistId);
  const shortcutLook = catalog.find(l => l.id === shortcut?.id);
  const shortcutArtist = artists.find(a => a.id === shortcutLook?.artistId);
  const requestLook = async (id: string) => {
    if (requesting) return;
    setRequesting(true);
    try {
      if (!(await requireClient())) return;
      setShortcut(null); setDetail(id); setDemoProfile(false);
      setDraft({ id, notes: draft?.id === id ? draft.notes : state.drafts[id] || "" });
      setDraftFocus(version => version + 1);
    } finally { setRequesting(false); }
  };
  const priceLabel = (price: number | null) => price == null ? "Price on request" : `$${price}`;

  return <div className="discovery-panel">
    {loading && <p role="status" className="look-local-notice">Loading shared work…</p>}
    {error && <p role="alert" className="look-local-notice">{error} <button onClick={retry}>Try again</button></p>}
    {catalog.some(l => l.demo && (!saved || state.saved.includes(l.id))) && <p className="look-local-notice">Local development demo · AI beauty outcomes and fictional professionals. Demo saves stay in this browser; requests are never sent.</p>}
    {saved && <p className="look-local-notice">Saved Looks and their collections are private to this client account in this browser.</p>}
    {saved && <div className="look-collections">
      <label>Collection<select value={folder} onChange={e => setFolder(e.target.value)}>
        {["All", ...state.folders].map(f => <option key={f}>{f}</option>)}
      </select></label>
      <form onSubmit={e => {
        e.preventDefault();
        void createFolder(String(new FormData(e.currentTarget).get("folder") || ""));
        e.currentTarget.reset();
      }}>
        <input name="folder" aria-label="New look collection" placeholder="New collection" maxLength={40} required />
        <button>Add collection</button>
      </form>
    </div>}
    <div className="look-masonry">{visible.map((l, i) => {
      const a = artists.find(a => a.id === l.artistId);
      if (!a) return null;
      const isSaved = state.saved.includes(l.id);
      // One slot: demo provenance locally, or a single supplied marketplace signal.
      const signal = l.demo ? "AI demo outcome" : l.signal;
      return <article key={l.id} className="look-tile">
        <div className={`look-photo shape-${i % 3}`}>
          <button className="look-open" aria-label={`Open ${l.title} by ${a.name}`} aria-haspopup="dialog"
            onPointerDown={e => beginHold(e, l.id)}
            onPointerMove={e => {
              if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancelHold();
            }}
            onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold}
            onContextMenu={e => { e.preventDefault(); cancelHold(); suppressClick.current = l.id; showShortcuts(l.id, e.currentTarget); }}
            onKeyDown={e => {
              if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
                e.preventDefault(); showShortcuts(l.id, e.currentTarget);
              }
            }}
            onClick={e => {
              if (suppressClick.current === l.id && e.detail !== 0) { e.preventDefault(); suppressClick.current = null; return; }
              setShortcut(null); setDraft(null); setDemoProfile(false); setDetail(l.id);
            }}>
            <img src={l.image} loading={i < 3 ? "eager" : "lazy"} decoding="async" draggable={false} alt={`${l.title}${l.demo ? " — AI demo beauty outcome" : ""}`} />
            <span className="look-overlay">
              <strong>{a.name}</strong><span>{discoveryCategory(a.category)} · {discoveryLocation(a.location)}</span>
              {signal && <small className="look-signal">{signal}</small>}
            </span>
          </button>
          <button className="look-heart" disabled={!ready} aria-label={`${isSaved ? "Unsave" : "Save"} look: ${l.title}`} aria-pressed={isSaved} onClick={() => toggle(l.id)}>
            <Heart size={19} strokeWidth={1.7} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
        <div className="look-caption"><strong>{l.title}</strong><span>{priceLabel(l.price)}</span></div>
        {saved && <div className="look-organize">
          <label><input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => onSelect?.(a.id)} />Compare {a.name}</label>
          <select aria-label={`Collection for ${l.title}`} value={state.membership[l.id] || ""} onChange={e => assign(l.id, e.target.value)}>
            <option value="">No collection</option>{state.folders.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>}
      </article>;
    })}</div>
    {!loading && !visible.length && <div className="look-empty"><p>{saved ? "Save a look from Discover to start your beauty moodboard." : "No looks in this category yet."}</p><Link href="/discover">Explore Discover</Link></div>}
    {saved && <div className="look-compare-bar"><span>{selectedIds.length}/3 professionals selected</span><button className="look-primary" disabled={selectedIds.length < 2} onClick={onCompare}>Compare artists</button></div>}
    <p className="look-status" role="status">{status}</p>

    {shortcut && shortcutLook && shortcutArtist && <div ref={surface} className="look-context" role="dialog" aria-label="Look shortcuts" style={{ left: shortcut.left, top: shortcut.top }}>
      <div className="look-context-heading"><span>For this look</span><button aria-label="Close shortcuts" onClick={() => { setShortcut(null); shortcutOpener.current?.focus({ preventScroll: true }); }}><X size={16} /></button></div>
      <button aria-pressed={state.saved.includes(shortcutLook.id)} onClick={() => { toggle(shortcutLook.id); setShortcut(null); shortcutOpener.current?.focus({ preventScroll: true }); }}>
        <Heart size={18} strokeWidth={1.7} fill={state.saved.includes(shortcutLook.id) ? "currentColor" : "none"} />{state.saved.includes(shortcutLook.id) ? "Unsave look" : "Save look"}
      </button>
      <DiscoverySaveArtistButton artistId={shortcutArtist.id} name={shortcutArtist.name} demo={shortcutLook.demo} onChange={() => setShortcut(null)} />
      {shortcutLook.demo ? <button onClick={() => { setShortcut(null); setDetail(shortcutLook.id); setDemoProfile(true); setDraft(null); }}><UserRound size={18} strokeWidth={1.7} />View artist</button> : <Link href={`/artist/${shortcutArtist.id}`}><UserRound size={18} strokeWidth={1.7} />View artist</Link>}
      <button disabled={!ready || requesting} aria-busy={requesting} onClick={() => void requestLook(shortcutLook.id)}><ArrowUpRight size={18} strokeWidth={1.7} />{requesting ? "Opening local draft…" : "Request this look"}</button>
    </div>}

    <dialog ref={dialog} className="look-dialog" aria-label="Look details" onCancel={() => setDetail(null)} onClose={() => { setDetail(null); opener.current?.focus({ preventScroll: true }); }}>
      <button className="look-close" aria-label="Close look" onClick={() => setDetail(null)}><X size={20} /></button>
      {look && artist && <div className="look-detail"><img src={look.image} alt={look.title} /><div>
        {look.demo && <p className="look-demo-label">AI DEMO OUTCOME · FICTIONAL ARTIST</p>}
        <h2>{look.title}</h2><p>{artist.name} · {discoveryCategory(artist.category)} · {discoveryLocation(artist.location)}</p>
        <p>{priceLabel(look.price)}{look.duration != null ? ` · ${look.duration} min` : ""}{look.signal && !look.demo ? ` · ${look.signal}` : ""}</p>
        <div className="look-actions">
          <button disabled={!ready} aria-pressed={state.saved.includes(look.id)} onClick={() => toggle(look.id)}><Heart size={18} strokeWidth={1.7} fill={state.saved.includes(look.id) ? "currentColor" : "none"} />{state.saved.includes(look.id) ? "Look saved" : "Save look"}</button>
          <DiscoverySaveArtistButton artistId={artist.id} name={artist.name} demo={look.demo} />
          {look.demo ? <button onClick={() => { setDemoProfile(true); setDraft(null); }}><UserRound size={18} strokeWidth={1.7} />View artist</button> : <Link href={`/artist/${artist.id}`}><UserRound size={18} strokeWidth={1.7} />View artist</Link>}
          <button className="look-primary" disabled={!ready || requesting} aria-busy={requesting} onClick={() => void requestLook(look.id)}><ArrowUpRight size={18} strokeWidth={1.7} />{requesting ? "Opening local draft…" : "Request this look"}</button>
        </div>
        <label className="look-detail-folder">Collection<select value={state.membership[look.id] || ""} onChange={e => assign(look.id, e.target.value)}>
          <option value="">No collection</option>{state.folders.map(f => <option key={f}>{f}</option>)}
        </select></label>
        {demoProfile && <section aria-label="Demo artist profile" className="look-note"><h3>{artist.name}</h3><p>Fictional local demo professional · {discoveryCategory(artist.category)} · {discoveryLocation(artist.location)}</p><p>{look.title} · {priceLabel(look.price)}. This demo has no public storefront or booking record.</p></section>}
        {draft?.id === look.id && <form className="look-draft" aria-label="Local look request draft" onSubmit={async e => {
          e.preventDefault();
          if (savingDraft) return;
          setSavingDraft(true);
          try { await saveDraft(look.id, draft.notes); }
          finally { setSavingDraft(false); }
        }}>
          <h3>Local request draft</h3>
          <p>Selected look: <strong>{look.title}</strong> by {artist.name}.</p>
          <label>Notes<textarea ref={draftNotes} maxLength={2000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
          <button className="look-primary look-draft-save" type="submit" disabled={savingDraft} aria-busy={savingDraft}>{savingDraft ? "Saving local draft…" : "Save local draft"}</button>
          <p className="look-note">Saved only in this browser. Nothing is sent to the professional.</p>
          <p role="status" className="look-status">{status}</p>
        </form>}
        <p className="look-note">Private look saves, collections and drafts stay in this browser. Artist bookmarks for real professionals use your existing Saved Artists. Request this look only creates a local draft.</p>
        {draft?.id !== look.id && <p role="status" className="look-status">{status}</p>}
      </div></div>}
    </dialog>
  </div>;
}
