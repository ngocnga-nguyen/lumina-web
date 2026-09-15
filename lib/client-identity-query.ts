import {
  type ClientIdentityProfile,
} from "@/lib/client-identity";
import { supabase } from "@/lib/supabase";

export async function loadRelatedClientIdentities(clientIds: string[]) {
  const uniqueIds = [...new Set(clientIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { data: [] as ClientIdentityProfile[], error: null };
  }

  const { data, error } = await supabase.rpc(
    "get_related_client_identities",
    { p_client_ids: uniqueIds }
  );

  return {
    data: (data || []) as ClientIdentityProfile[],
    error,
  };
}
