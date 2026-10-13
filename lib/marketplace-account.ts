import { supabase } from "@/lib/supabase";
import { loadClientWorkspaceUser } from "@/lib/client-workspace-user";
import { createSessionReadInvalidator } from "@/lib/in-flight-load";
import { resolveMarketplaceAccount } from "@/lib/marketplace-access";
export type { MarketplaceAccount } from "@/lib/marketplace-access";
// Share only an in-flight lookup across cards/providers mounted together. There is no
// settled account cache: every later action still verifies the current session.
let pendingAccount: ReturnType<typeof resolveMarketplaceAccount> | undefined;
export function getMarketplaceAccount() {
  if (pendingAccount) return pendingAccount;
  const request = resolveMarketplaceAccount(supabase, loadClientWorkspaceUser);
  pendingAccount = request;
  void request.finally(() => { if (pendingAccount === request) pendingAccount = undefined; }).catch(() => {});
  return request;
}

// Auth callbacks invalidate only; the next read happens outside the held SDK lock.
const invalidateSession = createSessionReadInvalidator(() => { pendingAccount = undefined; });
supabase.auth.onAuthStateChange((event, session) => {
  invalidateSession(event, session?.user.id ?? null);
});

export function marketplaceSignIn() {
  const redirect = window.location.pathname + window.location.search;
  window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
}
