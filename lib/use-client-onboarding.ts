"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLIENT_ONBOARDING_METADATA_KEY,
  dismissClientTip,
  dismissClientWelcome,
  parseClientOnboardingState,
  type ClientOnboardingState,
  type ClientOnboardingTip,
} from "@/lib/client-onboarding";
import { supabase } from "@/lib/supabase";

const initialState = parseClientOnboardingState(null);

export function useClientOnboarding() {
  const [ready, setReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [state, setState] = useState<ClientOnboardingState>(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        setIsClient(false);
        setReady(true);
        return;
      }

      const { data: artist, error } = await supabase
        .from("artists")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.log("Client onboarding role check failed:", error);
        setIsClient(false);
        setReady(true);
        return;
      }

      if (artist) {
        setIsClient(false);
        setReady(true);
        return;
      }

      const nextState = parseClientOnboardingState(
        user.user_metadata?.[CLIENT_ONBOARDING_METADATA_KEY]
      );
      stateRef.current = nextState;
      setState(nextState);
      setIsClient(true);
      setReady(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (
      update: (current: ClientOnboardingState) => ClientOnboardingState
    ) => {
      if (!isClient) return false;

      const previous = stateRef.current;
      const next = update(previous);
      stateRef.current = next;
      setState(next);

      const { error } = await supabase.auth.updateUser({
        data: { [CLIENT_ONBOARDING_METADATA_KEY]: next },
      });

      if (error) {
        console.log("Client onboarding preference save failed:", error);
        stateRef.current = previous;
        setState(previous);
        return false;
      }

      return true;
    },
    [isClient]
  );

  const dismissWelcome = useCallback(
    () => persist((current) => dismissClientWelcome(current)),
    [persist]
  );

  const dismissTip = useCallback(
    (tip: ClientOnboardingTip) =>
      persist((current) => dismissClientTip(current, tip)),
    [persist]
  );

  const hasDismissedTip = useCallback(
    (tip: ClientOnboardingTip) => state.dismissed_tips.includes(tip),
    [state.dismissed_tips]
  );

  return {
    ready,
    isClient,
    welcomeDismissed: Boolean(state.welcome_dismissed_at),
    dismissWelcome,
    dismissTip,
    hasDismissedTip,
  };
}
