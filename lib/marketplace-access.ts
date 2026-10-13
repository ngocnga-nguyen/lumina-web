import type { SupabaseClient, User } from "@supabase/supabase-js";

export type MarketplaceAccount =
  | { role: "guest"; id: null }
  | { role: "client" | "professional"; id: string };

// Match the existing workspace check. Never initialize a professional or write roles.
export async function resolveMarketplaceAccount(
  client: Pick<SupabaseClient, "auth" | "from">,
  readUser?: () => Promise<User | null>,
): Promise<MarketplaceAccount> {
  // Runtime callers share the authoritative pending Auth read with the workspace.
  // Keep the injectable direct reader for isolated role checks and other clients.
  let user: User | null;
  if (readUser) user = await readUser();
  else {
    const { data, error } = await client.auth.getUser();
    user = data.user;
    if (!user && (!error || error.name === "AuthSessionMissingError")) return { role: "guest", id: null };
    if (error) throw error;
  }
  if (!user) return { role: "guest", id: null };
  const { data: artist, error: roleError } = await client.from("artists")
    .select("id").eq("id", user.id).maybeSingle();
  if (roleError) throw roleError;
  return {
    // A professional awaiting onboarding must not acquire client actions.
    role: artist || user.user_metadata?.account_type === "artist" ? "professional" : "client",
    id: user.id,
  };
}

