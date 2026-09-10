export type ProfessionalActivationLicenseStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type ProfessionalActivationStatus = {
  artist_id: string;
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
  { id: "about", label: "About your business" },
  { id: "services", label: "Services" },
  { id: "portfolio", label: "Portfolio / Results" },
  { id: "availability", label: "Availability" },
  { id: "license", label: "License verification" },
  { id: "requests", label: "How Requests work" },
  { id: "ready", label: "Ready for activation" },
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
    {
      id: "profile-information",
      label: "professional profile information",
      complete: status.profile_information_ready,
    },
    {
      id: "profile-photo",
      label: "profile photo",
      complete: status.profile_photo_ready,
    },
    { id: "bio", label: "bio", complete: status.bio_ready },
    { id: "location", label: "location", complete: status.location_ready },
    { id: "services", label: "service", complete: status.services_ready },
    {
      id: "portfolio",
      label: "portfolio photo or Result",
      complete: status.portfolio_ready,
    },
    {
      id: "availability",
      label: "availability",
      complete: status.availability_ready,
    },
    {
      id: "license",
      label: "license verification",
      complete: status.license_verified,
    },
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
    return (
      status.profile_information_ready &&
      status.profile_photo_ready &&
      status.bio_ready &&
      status.location_ready
    );
  }
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
    "services",
    "portfolio",
    "availability",
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
  return (
    status.profile_information_ready &&
    status.profile_photo_ready &&
    status.bio_ready &&
    status.location_ready &&
    status.services_ready &&
    status.portfolio_ready &&
    status.availability_ready
  );
}

export type ProfessionalProfilePanelMode =
  | "incomplete"
  | "verification_pending"
  | "ready"
  | "active";

export function getProfessionalProfilePanelMode(
  status: ProfessionalActivationStatus
): ProfessionalProfilePanelMode {
  if (status.is_active && status.activation_ready) return "active";
  if (status.activation_ready) return "ready";
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
