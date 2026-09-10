import { supabase } from "@/lib/supabase";

export const CONSULTATION_IMAGE_BUCKET = "consultation-images";
export const CONSULTATION_IMAGE_LIMIT = 5;
export const CONSULTATION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CONSULTATION_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ConsultationMaintenance =
  | "low"
  | "moderate"
  | "open"
  | "not_sure";

export type ConsultationSnapshotV1 = {
  version: 1;
  goal?: string;
  avoid?: string;
  maintenance?: ConsultationMaintenance;
  budget?: string;
  inspiration_paths?: string[];
};

export type ConsultationSnapshotDraft = {
  goal: string;
  avoid: string;
  maintenance: ConsultationMaintenance | "";
  budget: string;
};

const maintenanceLabels: Record<ConsultationMaintenance, string> = {
  low: "Low maintenance",
  moderate: "Moderate",
  open: "Open to maintenance",
  not_sure: "Not sure",
};

function readTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function parseConsultationSnapshot(
  value: unknown
): ConsultationSnapshotV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const snapshot = value as Record<string, unknown>;
  if (snapshot.version !== 1) return null;

  const goal = readTrimmedString(snapshot.goal, 600);
  const avoid = readTrimmedString(snapshot.avoid, 500);
  const budget = readTrimmedString(snapshot.budget, 100);
  const maintenance =
    typeof snapshot.maintenance === "string" &&
    snapshot.maintenance in maintenanceLabels
      ? (snapshot.maintenance as ConsultationMaintenance)
      : undefined;
  const inspirationPaths = Array.isArray(snapshot.inspiration_paths)
    ? snapshot.inspiration_paths
        .filter((path): path is string => typeof path === "string")
        .map((path) => path.trim())
        .filter(Boolean)
        .slice(0, CONSULTATION_IMAGE_LIMIT)
    : [];

  if (!goal && !avoid && !budget && !maintenance && inspirationPaths.length === 0) {
    return null;
  }

  return {
    version: 1,
    ...(goal ? { goal } : {}),
    ...(avoid ? { avoid } : {}),
    ...(maintenance ? { maintenance } : {}),
    ...(budget ? { budget } : {}),
    ...(inspirationPaths.length > 0
      ? { inspiration_paths: inspirationPaths }
      : {}),
  };
}

export function buildConsultationSnapshot(
  draft: ConsultationSnapshotDraft,
  inspirationPaths: string[]
): ConsultationSnapshotV1 | null {
  return parseConsultationSnapshot({
    version: 1,
    goal: draft.goal,
    avoid: draft.avoid,
    maintenance: draft.maintenance || undefined,
    budget: draft.budget,
    inspiration_paths: inspirationPaths,
  });
}

export function getConsultationMaintenanceLabel(
  maintenance: ConsultationMaintenance
) {
  return maintenanceLabels[maintenance];
}

export async function createConsultationSignedUrls(
  snapshotValue: unknown,
  expiresInSeconds = 15 * 60
) {
  const snapshot = parseConsultationSnapshot(snapshotValue);
  const paths = snapshot?.inspiration_paths || [];
  if (paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(CONSULTATION_IMAGE_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) {
    console.log("Consultation image URL error:", error);
    return [];
  }

  return (data || [])
    .map((item) => item.signedUrl)
    .filter((url): url is string => Boolean(url));
}

