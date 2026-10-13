import { supabase } from "@/lib/supabase";
import { createInFlightRead, createSessionReadInvalidator, withReadDeadline } from "@/lib/in-flight-load";
import { loadWorkspaceUser } from "@/lib/workspace-load-recovery";

// The client workspace, its menu, onboarding, request loader and realtime setup
// mount together (twice in development). Verify once per pending batch, then forget.
// Do not call from an Auth callback: Supabase holds its session lock there.
export const loadClientWorkspaceUser = createInFlightRead(() =>
  withReadDeadline(() => loadWorkspaceUser(() => supabase.auth.getUser()), new AbortController())
);

// Synchronous invalidation only: never start SDK work while an Auth callback holds the lock.
// A new sign-in must not join an older account's still-pending read.
const invalidateSession = createSessionReadInvalidator(() => loadClientWorkspaceUser.invalidate());
supabase.auth.onAuthStateChange((event, session) => {
  invalidateSession(event, session?.user.id ?? null);
});
