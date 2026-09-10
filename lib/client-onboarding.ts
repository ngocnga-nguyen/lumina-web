export const CLIENT_ONBOARDING_METADATA_KEY = "client_onboarding_v1";
export const CLIENT_ONBOARDING_VERSION = 1;

export const CLIENT_ONBOARDING_TIPS = [
  "saved_compare",
  "service_selection",
  "proposal_confirmation",
  "review_ready",
] as const;

export type ClientOnboardingTip = (typeof CLIENT_ONBOARDING_TIPS)[number];

export type ClientOnboardingState = {
  version: 1;
  welcome_dismissed_at: string | null;
  dismissed_tips: ClientOnboardingTip[];
};

const defaultState: ClientOnboardingState = {
  version: CLIENT_ONBOARDING_VERSION,
  welcome_dismissed_at: null,
  dismissed_tips: [],
};

export function parseClientOnboardingState(value: unknown): ClientOnboardingState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultState };
  }

  const candidate = value as Record<string, unknown>;
  const dismissedTips = Array.isArray(candidate.dismissed_tips)
    ? candidate.dismissed_tips.filter(
        (tip): tip is ClientOnboardingTip =>
          typeof tip === "string" &&
          CLIENT_ONBOARDING_TIPS.includes(tip as ClientOnboardingTip)
      )
    : [];

  return {
    version: CLIENT_ONBOARDING_VERSION,
    welcome_dismissed_at:
      typeof candidate.welcome_dismissed_at === "string"
        ? candidate.welcome_dismissed_at
        : null,
    dismissed_tips: [...new Set(dismissedTips)],
  };
}

export function dismissClientWelcome(
  state: ClientOnboardingState,
  dismissedAt = new Date().toISOString()
): ClientOnboardingState {
  return { ...state, welcome_dismissed_at: dismissedAt };
}

export function dismissClientTip(
  state: ClientOnboardingState,
  tip: ClientOnboardingTip
): ClientOnboardingState {
  return state.dismissed_tips.includes(tip)
    ? state
    : { ...state, dismissed_tips: [...state.dismissed_tips, tip] };
}

export function shouldShowClientWelcome({
  ready,
  isClient,
  welcomeDismissed,
  requestCount,
  savedCount,
}: {
  ready: boolean;
  isClient: boolean;
  welcomeDismissed: boolean;
  requestCount: number;
  savedCount: number;
}) {
  return (
    ready &&
    isClient &&
    !welcomeDismissed &&
    requestCount === 0 &&
    savedCount === 0
  );
}
