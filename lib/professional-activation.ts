export type ProfessionalActivationLicenseStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type ProfessionalActivationStatus = {
  artist_id: string;
  name_ready?: boolean;
  category_ready?: boolean;
  activation_hidden_by_owner?: boolean;
  profile_information_ready: boolean;
  profile_photo_ready: boolean;
  bio_ready: boolean;
  location_ready: boolean;
  services_ready: boolean;
  portfolio_ready: boolean;
  availability_ready: boolean;
  license_status: ProfessionalActivationLicenseStatus;
  license_verified: boolean;
  license_decision_message: string | null;
  activation_ready: boolean;
  is_active: boolean;
};

export type ProfessionalOnboardingStep =
  | "location"
  | "about"
  | "services"
  | "portfolio"
  | "availability"
  | "license"
  | "requests"
  | "ready";

export const professionalOnboardingSteps: Array<{
  id: ProfessionalOnboardingStep;
  label: string;
}> = [
  { id: "about", label: "Professional identity" },
  { id: "location", label: "Location or service area" },
  { id: "services", label: "Services" },

  { id: "license", label: "License verification" },

  { id: "ready", label: "Go live" },
];

export function isProfessionalOnboardingStep(
  value: string | null
): value is ProfessionalOnboardingStep {
  return professionalOnboardingSteps.some((step) => step.id === value);
}

export function getActivationRequirements(
  status: ProfessionalActivationStatus
) {
  return [
    { id: "name", label: "Add your professional name", complete: status.name_ready ?? status.profile_information_ready, href: "/dashboard/profile?onboarding=about" },
    { id: "category", label: "Choose your professional category", complete: status.category_ready ?? status.profile_information_ready, href: "/dashboard/profile?onboarding=about" },
    { id: "location", label: "Add your location or service area", complete: status.location_ready, href: "/dashboard/profile?onboarding=location#location" },
    { id: "services", label: "Add at least one service", complete: status.services_ready, href: "/dashboard/services?onboarding=services" },
    { id: "license", label: status.license_status === "pending" ? "License verification pending" : status.license_status === "rejected" ? "License information needs correction" : "Verify your professional license", complete: status.license_verified, href: "/dashboard/settings#license-verification" },
  ];
}

export function getActivationCompletionPercent(
  status: ProfessionalActivationStatus
) {
  const requirements = getActivationRequirements(status);
  const completed = requirements.filter((item) => item.complete).length;
  return Math.round((completed / requirements.length) * 100);
}

export function getMissingActivationLabels(
  status: ProfessionalActivationStatus
) {
  return getActivationRequirements(status)
    .filter((item) => !item.complete)
    .map((item) => item.label);
}

export function isOnboardingStepComplete(
  status: ProfessionalActivationStatus,
  step: ProfessionalOnboardingStep
) {
  if (step === "about") {
    return (status.name_ready ?? status.profile_information_ready) && (status.category_ready ?? status.profile_information_ready);
  }
  if (step === "location") return status.location_ready;
  if (step === "services") return status.services_ready;
  if (step === "portfolio") return status.portfolio_ready;
  if (step === "availability") return status.availability_ready;
  if (step === "license") return status.license_verified;
  if (step === "requests") return true;
  return status.activation_ready;
}

export function getFirstIncompleteOnboardingStep(
  status: ProfessionalActivationStatus
): ProfessionalOnboardingStep {
  if (status.activation_ready || status.is_active) return "ready";

  const requiredSteps: ProfessionalOnboardingStep[] = [
    "about",
    "location",
    "services",
    "license",
  ];
  return (
    requiredSteps.find((step) => !isOnboardingStepComplete(status, step)) ||
    "ready"
  );
}

export function areNonLicenseRequirementsComplete(
  status: ProfessionalActivationStatus
) {
  return getActivationRequirements(status).filter((item) => item.id !== "license").every((item) => item.complete);
}

export type ProfessionalProfilePanelMode =
  | "hidden"
  | "rejected"
  | "incomplete"
  | "verification_pending"
  | "ready"
  | "active";

export function getProfessionalProfilePanelMode(
  status: ProfessionalActivationStatus
): ProfessionalProfilePanelMode {
  if (status.is_active && status.activation_ready) return "active";
  if (status.activation_ready) return status.activation_hidden_by_owner ? "hidden" : "ready";
  if (status.license_status === "rejected") return "rejected";
  if (
    status.license_status === "pending" &&
    areNonLicenseRequirementsComplete(status)
  ) {
    return "verification_pending";
  }
  return "incomplete";
}

export function shouldShowProfessionalProfilePanel(
  status: ProfessionalActivationStatus,
  activePanelDismissed: boolean
) {
  return (
    getProfessionalProfilePanelMode(status) !== "active" ||
    !activePanelDismissed
  );
}

export function getProfessionalProfilePanelDismissalKey(artistId: string) {
  return `lumina-profile-activation-panel-dismissed-v1:${artistId}`;
}

export function getProfessionalActivationLabel(status: ProfessionalActivationStatus) {
  return { incomplete: "Setup needed", verification_pending: "Verification pending", rejected: "Needs correction", ready: "Ready to go live", active: "Live", hidden: "Hidden" }[getProfessionalProfilePanelMode(status)];
}
