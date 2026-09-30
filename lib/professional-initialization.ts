import type { SupabaseClient } from "@supabase/supabase-js";

const profileColumns = "id, name, category, profile_image_url";

// Uses the ordinary authenticated client: the existing owner INSERT policy
// remains the authority. Never accept an owner ID or privileged fields as input.
export async function initializeProfessional(client: SupabaseClient) {
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return { status: "unauthenticated" as const };

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== session.user.id) {
    throw new Error("Your session changed. Please sign in again.");
  }

  const readArtist = () => client.from("artists").select(profileColumns)
    .eq("id", user.id).maybeSingle();
  const { data: existing, error: readError } = await readArtist();
  if (readError) throw readError;
  // Existing professionals do not depend on signup metadata or new defaults.
  if (existing) return { status: "artist" as const, artist: existing, created: false };
  const metadata = user.user_metadata;
  if (metadata?.account_type !== "artist") return { status: "client" as const };
  if (!user.email_confirmed_at) throw new Error("Please confirm your email first.");

  const name = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const business = metadata.business_name;
  if (!name || name.length > 160 ||
      (business != null && (typeof business !== "string" || business.trim().length > 160)) ||
      !user.email) {
    throw new Error("Your professional signup details are incomplete. Please contact support.");
  }

  const { error: insertError } = await client.from("artists").insert({
    id: user.id,
    name,
    business_name: typeof business === "string" ? business.trim() || null : null,
    category: "Beauty Professional",
    location: "Location coming soon",
    price_start: 0,
    email: user.email,
    is_active: false,
  });
  // A concurrent attempt or a lost response may already have created the row.
  // Read it back instead of using an upsert that could overwrite profile edits.
  const { data: artist, error: verifyError } = await readArtist();
  if (verifyError) throw verifyError;
  if (artist) return { status: "artist" as const, artist, created: !insertError };
  throw insertError || new Error("We couldn't finish setting up your professional profile. Please try again.");
}
