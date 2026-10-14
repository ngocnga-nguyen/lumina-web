"use client";

import { useEffect, useState } from "react";
import { EyeOff, X } from "lucide-react";
import { getProfessionalProfileVisibility } from "@/lib/professional-profile-visibility";
import {
  readVisibilityConfirmation, reconcileVisibilityConfirmation,
  writeVisibilityConfirmation, VISIBILITY_CONFIRMATION_EVENT,
  type VisibilityConfirmation,
} from "@/lib/profile-visibility-confirmation";
import styles from "./ProfessionalDashboardHome.module.css";

export function VisibilityConfirmationBanner({ isVisible, onDismiss }: {
  isVisible: boolean; onDismiss: () => void;
}) {
  const visibility = getProfessionalProfileVisibility(isVisible);
  return <section className={`${styles.liveBanner} ${isVisible ? "" : styles.hiddenBanner}`} aria-label="Public profile visibility confirmation">
    {isVisible ? <span className={styles.liveBannerDot} aria-hidden="true" /> : <span className={styles.visibilityIcon}><EyeOff size={16} strokeWidth={1.5} aria-hidden="true" /></span>}
    <div className={styles.liveBannerCopy} role="status"><strong>{visibility.title}</strong><span>{isVisible ? visibility.description : "Your profile is no longer shown in Discover, search, or map."}</span></div>
    <button type="button" aria-label="Dismiss visibility confirmation" onClick={onDismiss} className={styles.bannerDismiss}><X size={16} strokeWidth={1.5} aria-hidden="true" /></button>
  </section>;
}

export default function ProfessionalVisibilityConfirmation({ artistId, isVisible }: {
  artistId: string; isVisible: boolean;
}) {
  const [resolved, setResolved] = useState<(VisibilityConfirmation & { artistId: string }) | null>(null);
  useEffect(() => {
    const reconcile = () => {
      const next = reconcileVisibilityConfirmation(readVisibilityConfirmation(artistId), isVisible);
      writeVisibilityConfirmation(artistId, next);
      setResolved({ ...next, artistId });
    };
    // Other tabs can announce a newer state before readiness refreshes here.
    // Sync dismissal only for the authoritative state this Dashboard currently has.
    const syncPreference = () => {
      const saved = readVisibilityConfirmation(artistId);
      if (saved?.visible === isVisible) setResolved({ ...saved, artistId });
    };
    const timer = window.setTimeout(reconcile, 0);
    window.addEventListener("storage", syncPreference);
    window.addEventListener(VISIBILITY_CONFIRMATION_EVENT, syncPreference);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(VISIBILITY_CONFIRMATION_EVENT, syncPreference);
    };
  }, [artistId, isVisible]);

  if (!resolved || resolved.artistId !== artistId || resolved.visible !== isVisible || resolved.dismissed) return null;
  return <VisibilityConfirmationBanner isVisible={isVisible} onDismiss={() => {
    writeVisibilityConfirmation(artistId, { visible: isVisible, dismissed: true });
    setResolved({ artistId, visible: isVisible, dismissed: true });
    window.dispatchEvent(new Event(VISIBILITY_CONFIRMATION_EVENT));
  }} />;
}
