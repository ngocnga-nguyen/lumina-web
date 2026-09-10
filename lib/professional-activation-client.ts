import { supabase } from "@/lib/supabase";
import type { ProfessionalActivationStatus } from "@/lib/professional-activation";

export async function loadMyProfessionalActivationStatus() {
  const { data, error } = await supabase.rpc(
    "get_my_professional_activation_status"
  );
  return {
    data: (data as ProfessionalActivationStatus | null) || null,
    error,
  };
}

export async function setProfessionalProfileVisibility(active: boolean) {
  const { data, error } = await supabase.rpc(
    "set_professional_profile_visibility",
    { p_active: active }
  );
  return {
    data: (data as ProfessionalActivationStatus | null) || null,
    error,
  };
}
