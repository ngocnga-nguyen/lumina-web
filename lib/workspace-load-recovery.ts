import { isAuthError, isAuthSessionMissingError, type AuthError, type User } from "@supabase/supabase-js";

const endedSessionCodes = new Set([
  "session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt",
]);

// A connectivity/lock failure is not evidence that the user signed out.
export async function loadWorkspaceUser(getUser: () => Promise<{
  data: { user: User | null }; error: AuthError | null;
}>): Promise<User | null> {
  try {
    const { data, error } = await getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    if (isAuthError(error) && (isAuthSessionMissingError(error) || error.status === 401 ||
      (error.code && endedSessionCodes.has(error.code)))) return null;
    throw error;
  }
}

// Only the current route/read may publish either a result or its settled state.
export async function runWorkspaceLoad(load: () => Promise<void>, {
  isCurrent, onError, onSettled,
}: {
  isCurrent: () => boolean;
  onError: (error: unknown) => void;
  onSettled: () => void;
}): Promise<void> {
  try { await load(); }
  catch (error) { if (isCurrent()) onError(error); }
  finally { if (isCurrent()) onSettled(); }
}
