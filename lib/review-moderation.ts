export const REVIEW_REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment_abusive_language", label: "Harassment / abusive language" },
  { value: "fake_or_manipulated", label: "Fake or manipulated review" },
  {
    value: "personal_private_information",
    label: "Contains personal/private information",
  },
  { value: "not_about_service", label: "Not about the actual service" },
  { value: "other", label: "Other" },
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]["value"];
export type ReviewModerationStatus = "published" | "pending" | "removed";

export function getReviewReportReasonLabel(reason: string) {
  return (
    REVIEW_REPORT_REASONS.find((option) => option.value === reason)?.label ||
    reason
  );
}
