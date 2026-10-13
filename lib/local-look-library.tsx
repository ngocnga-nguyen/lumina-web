"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMarketplaceAccount, marketplaceSignIn, type MarketplaceAccount } from "@/lib/marketplace-account";
import { loadDiscoveryCatalog, type DiscoveryCatalog } from "@/lib/discovery-catalog";
import { emptyLookLibrary, lookStorageKey, parseLookLibrary, type LookLibraryState } from "@/lib/look-library-state";
export type { DiscoveryLook } from "@/lib/discovery-catalog";

type Library = DiscoveryCatalog & {
  state: LookLibraryState;
  account: MarketplaceAccount | null;
  ready: boolean;
  loading: boolean;
  error: string;
  status: string;
  retry: () => void;
  requireClient: () => Promise<boolean>;
  toggle: (id: string) => Promise<void>;
  assign: (id: string, folder: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  toggleDemoArtist: (id: string) => Promise<void>;
  saveDraft: (id: string, notes: string) => Promise<void>;
};
const Context = createContext<Library | null>(null);

// Mounted only on Discover/Saved. Existing Dashboard/workspace providers stay intact.
export function LocalLookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DiscoveryCatalog>({ catalog: [], artists: [] });
  const [state, setState] = useState(emptyLookLibrary);
  const stateRef = useRef(state);
  const [account, setAccount] = useState<MarketplaceAccount | null>(null);
  const accountRef = useRef<MarketplaceAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  const adoptAccount = useCallback((next: MarketplaceAccount) => {
    if (accountRef.current?.id !== next.id || accountRef.current?.role !== next.role) {
      let fresh = emptyLookLibrary();
      if (next.role === "client") {
        try { fresh = parseLookLibrary(localStorage.getItem(lookStorageKey(next.id))); }
        catch { setStatus("Browser storage unavailable. Saves last for this visit."); }
      }
      stateRef.current = fresh;
      setState(fresh);
      setStatus("");
    }
    accountRef.current = next;
    setAccount(next);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const version = ++generation.current;
      setReady(false);
      try {
        const next = await getMarketplaceAccount();
        if (!cancelled && version === generation.current) adoptAccount(next);
      } catch {
        if (!cancelled && version === generation.current) {
          accountRef.current = null; setAccount(null);
          stateRef.current = emptyLookLibrary(); setState(stateRef.current);
          setStatus("We couldn’t confirm your account. Please try again before saving.");
          setReady(true);
        }
      }
    };
    void refresh();
    let refreshTimer: number | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      // The initial getUser already resolves this session; avoid a duplicate auth lock.
      if (event === "INITIAL_SESSION") return;
      // Clear synchronously; do not let a previous client's library cross a session change.
      generation.current++;
      accountRef.current = null; setAccount(null); setReady(false);
      stateRef.current = emptyLookLibrary(); setState(stateRef.current);
      // Supabase holds its auth lock during callbacks. Resolve roles in a later task.
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { if (!cancelled) void refresh(); }, 0);
    });
    const changed = (event: StorageEvent) => {
      const current = accountRef.current;
      if (current?.role === "client" && event.key === lookStorageKey(current.id)) {
        stateRef.current = parseLookLibrary(event.newValue); setState(stateRef.current);
      }
    };
    window.addEventListener("storage", changed);
    return () => { cancelled = true; window.clearTimeout(refreshTimer); subscription.unsubscribe(); window.removeEventListener("storage", changed); };
  }, [adoptAccount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    const load = async () => {
      let next: DiscoveryCatalog;
      const demoRequested = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("demo") === "1";
      try { next = demoRequested ? { catalog: [], artists: [] } : await loadDiscoveryCatalog(); }
      catch { next = { catalog: [], artists: [] }; if (!cancelled) setError("Public work could not be loaded. Try again."); }
      if (!next.catalog.length && process.env.NODE_ENV === "development") {
        // Explicit development-only fallback. Never replace real work with synthetic work.
        next = await import("@/lib/discovery-demo").then(m => m.discoveryDemo);
      }
      if (process.env.NODE_ENV === "development" && window.location.pathname === "/saved" && !next.catalog.some(l => l.demo)) {
        // Keep explicitly saved demo references usable locally even when real work exists.
        // Saved filters these records by the client's pins/bookmarks; Discover stays real-first.
        const demo = await import("@/lib/discovery-demo").then(m => m.discoveryDemo);
        next = { catalog: [...next.catalog, ...demo.catalog], artists: [...next.artists, ...demo.artists] };
      }
      if (!cancelled) { setData(next); setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [attempt]);

  const authorize = async (): Promise<MarketplaceAccount | null> => {
    try {
      const version = generation.current;
      const current = await getMarketplaceAccount();
      if (version !== generation.current) return null;
      adoptAccount(current);
      if (current.role === "guest") { marketplaceSignIn(); return null; }
      if (current.role !== "client") {
        setStatus("Use a client account to save looks or send requests. Switch accounts through the account menu."); return null;
      }
      return current;
    } catch { setStatus("We couldn’t confirm your account. Please try again."); return null; }
  };
  const requireClient = async () => !!(await authorize());
  const update = async (change: (s: LookLibraryState) => LookLibraryState, message: string) => {
    const current = await authorize();
    if (!current || accountRef.current?.id !== current.id || current.role !== "client") return;
    const next = change(stateRef.current);
    stateRef.current = next; setState(next); setStatus(message);
    // Write only after an explicitly authenticated client action, never on mount/as guest.
    try { localStorage.setItem(lookStorageKey(current.id), JSON.stringify(next)); }
    catch { setStatus(`${message} Browser storage unavailable; this visit only.`); }
  };
  const toggle = async (id: string) => {
    if (!data.catalog.some(l => l.id === id)) return;
    await update(s => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id] }), "Saved Looks updated privately in this browser.");
  };
  const assign = async (id: string, folder: string) => {
    if (!data.catalog.some(l => l.id === id)) return;
    await update(s => ({ ...s, saved: s.saved.includes(id) ? s.saved : [...s.saved, id], membership: { ...s.membership, [id]: folder } }), "Look saved to your local collection.");
  };
  const createFolder = async (name: string) => {
    name = name.trim().slice(0, 40);
    if (!name || name === "All") return;
    await update(s => ({ ...s, folders: s.folders.includes(name) ? s.folders : [...s.folders, name] }), "Local collection created.");
  };
  const toggleDemoArtist = async (id: string) => {
    if (!data.catalog.some(l => l.artistId === id && l.demo)) return;
    await update(s => ({ ...s, demoArtists: s.demoArtists.includes(id) ? s.demoArtists.filter(x => x !== id) : [...s.demoArtists, id] }), "Demo artist saves updated locally. No artist record was written.");
  };
  const saveDraft = async (id: string, notes: string) => {
    if (!data.catalog.some(l => l.id === id)) return;
    await update(s => ({ ...s, drafts: { ...s.drafts, [id]: notes.slice(0, 2000) } }), "Local request draft saved. Nothing has been sent.");
  };
  return <Context.Provider value={{ ...data, state, account, ready, loading, error, status,
    retry: () => setAttempt(x => x + 1), requireClient, toggle, assign, createFolder, toggleDemoArtist, saveDraft }}>{children}</Context.Provider>;
}
export function useLocalLookLibrary() {
  const library = useContext(Context);
  if (!library) throw new Error("Look library requires its marketplace provider");
  return library;
}
