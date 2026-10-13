// Presentation only: is_active is the existing Settings public-profile visibility state.
// Setup readiness, license verification and account access remain separate authorities.
export function getProfessionalProfileVisibility(isVisible: boolean) {
  return isVisible
    ? {
        isVisible: true,
        label: "Live",
        title: "Visible to clients",
        description: "Your profile can be discovered across Lumina.",
      }
    : {
        isVisible: false,
        label: "Hidden",
        title: "Hidden from clients",
        description: "Your profile is not visible in Discover, search, or map.",
      };
}
