export type ProfessionalLicenseVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type ProfessionalLicenseVerification = {
  artist_id: string;
  legal_professional_name: string;
  license_number: string;
  license_jurisdiction: string;
  license_type: string;
  business_name: string | null;
  status: ProfessionalLicenseVerificationStatus;
  submitted_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  decision_message: string | null;
};

export const professionalVerificationStatusLabels: Record<
  ProfessionalLicenseVerificationStatus,
  string
> = {
  pending: "Pending review",
  verified: "License verified",
  rejected: "Needs correction",
};
