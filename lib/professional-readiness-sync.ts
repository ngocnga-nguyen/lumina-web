import type { ProfessionalActivationStatus } from "./professional-activation";
import type { ProfessionalLicenseVerification } from "./professional-license-verification";

export type ReadinessSnapshot = {
  status: ProfessionalActivationStatus;
  verification: ProfessionalLicenseVerification | null;
};
export type ReadinessState = {
  snapshot: ReadinessSnapshot | null;
  loaded: boolean;
  error: boolean;
  announcement: string;
};

// Events invalidate a snapshot; only authenticated database reads can replace it.
export function createProfessionalReadinessSync({ userId, load, publish }: {
  userId: string;
  load: () => Promise<ReadinessSnapshot>;
  publish: (state: ReadinessState) => void;
}) {
  let active = true;
  let sequence = 0;
  let state: ReadinessState = { snapshot: null, loaded: false, error: false, announcement: "" };
  const refresh = async () => {
    if (!active) return;
    const request = ++sequence;
    try {
      const snapshot = await load();
      if (!active || request !== sequence) return;
      if (snapshot.status.artist_id !== userId || (snapshot.verification && snapshot.verification.artist_id !== userId)) {
        throw new Error("Readiness owner mismatch");
      }
      const previous = state.snapshot?.status.license_status;
      const next = snapshot.status.license_status;
      const announcement = previous && previous !== next
        ? next === "verified" ? "License verified."
          : next === "rejected" ? "License review needs your attention."
          : next === "pending" ? "License resubmitted for review." : ""
        : "";
      state = { snapshot, loaded: true, error: false, announcement };
      publish(state);
      return snapshot;
    } catch {
      if (!active || request !== sequence) return;
      state = { ...state, loaded: true, error: true, announcement: "" };
      publish(state);
    }
  };
  return {
    refresh,
    changed: (payload: { new?: { artist_id?: unknown } }) => {
      if (active && payload.new?.artist_id === userId) void refresh();
    },
    subscribed: (status: string) => { if (active && status === "SUBSCRIBED") void refresh(); },
    dispose: () => { active = false; sequence += 1; },
  };
}
