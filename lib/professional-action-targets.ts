export const professionalActionHrefs: Record<string, string> = {
  name: "/dashboard/profile?onboarding=about&focus=identity",
  category: "/dashboard/profile?onboarding=about&focus=category",
  location: "/dashboard/profile?onboarding=location&focus=location",
  services: "/dashboard/services?onboarding=services&focus=service",
  license: "/dashboard/settings?onboarding=license&focus=license",
};

export type ProfessionalActionTarget = "identity" | "category" | "location" | "service" | "license" | "bio" | "availability" | "photo" | "cover";
export type ProfessionalActionSurface = "profile" | "services" | "settings";
const targets: Record<ProfessionalActionSurface, readonly string[]> = {
  profile: ["identity", "category", "location", "bio", "availability", "photo", "cover"],
  services: ["service"],
  settings: ["license"],
};

export function getProfessionalActionTarget(search: string, surface: ProfessionalActionSurface): ProfessionalActionTarget | null {
  const value = new URLSearchParams(search).get("focus");
  return value && targets[surface].includes(value) ? value as ProfessionalActionTarget : null;
}

export const professionalActionEvent = "lumina:professional-action";
