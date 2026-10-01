"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadMyProfessionalActivationStatus } from "@/lib/professional-activation-client";
import type { ProfessionalLicenseVerification } from "@/lib/professional-license-verification";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { createProfessionalReadinessSync, type ReadinessSnapshot, type ReadinessState } from "@/lib/professional-readiness-sync";

const initialState: ReadinessState = { snapshot: null, loaded: false, error: false, announcement: "" };
const ReadinessContext = createContext<(ReadinessState & { refresh: () => Promise<ReadinessSnapshot | undefined> }) | null>(null);

async function loadSnapshot(userId: string): Promise<ReadinessSnapshot> {
  // Recheck if a review commits between the two reads. Never combine conflicting versions.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const license = await supabase.from("professional_license_verifications").select("*").eq("artist_id", userId).maybeSingle();
    const activation = await loadMyProfessionalActivationStatus();
    if (license.error || activation.error || !activation.data) throw new Error("Readiness could not be refreshed");
    const verification = license.data as ProfessionalLicenseVerification | null;
    if (activation.data.license_status === (verification?.status || "unverified") &&
        activation.data.license_decision_message === (verification?.decision_message || null)) {
      return { status: activation.data, verification };
    }
  }
  throw new Error("License review changed during refresh");
}

export default function ProfessionalReadinessProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState("");
  const owner = useRef<ReturnType<typeof createProfessionalReadinessSync> | null>(null);
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const refresh = useCallback(async () => owner.current?.refresh(), []);

  useEffect(() => {
    const sync = createProfessionalReadinessSync({ userId, load: () => loadSnapshot(userId), publish: (next) => {
      setState(next);
      if (next.announcement) setNotice(next.announcement);
    } });
    owner.current = sync;
    const channel = supabase.channel(createRealtimeChannelTopic(`professional-readiness-${userId}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "professional_license_verifications", filter: `artist_id=eq.${userId}` }, sync.changed)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "professional_license_verifications", filter: `artist_id=eq.${userId}` }, sync.changed);
    channel.subscribe(sync.subscribed);
    void sync.refresh();
    const reconcile = () => { void sync.refresh(); };
    const visible = () => { if (document.visibilityState === "visible") reconcile(); };
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", visible);
    return () => {
      sync.dispose();
      owner.current = null;
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId]);

  useEffect(() => {
    if (previousPath.current !== pathname) { previousPath.current = pathname; void refresh(); }
  }, [pathname, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return <ReadinessContext.Provider value={{ ...state, refresh }}>
    {children}
    <div role="status" aria-live="polite" aria-atomic="true" className={notice ? `fixed bottom-5 left-5 right-5 z-50 mx-auto max-w-sm rounded-2xl border border-lumina-border px-4 py-3 text-sm shadow-sm ${notice === "License verified." ? "bg-lumina-success-soft text-lumina-success" : "bg-lumina-attention-soft text-lumina-attention"}` : "sr-only"}>{notice}</div>
  </ReadinessContext.Provider>;
}

export function useProfessionalReadiness() {
  const value = useContext(ReadinessContext);
  if (!value) throw new Error("Professional readiness requires the professional workspace");
  return { ...value, status: value.snapshot?.status || null, verification: value.snapshot?.verification || null };
}
