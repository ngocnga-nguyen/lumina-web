"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useLuminaAdminAccess(userId: string | null | undefined) {
  const [authorizedUserId, setAuthorizedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!userId) return;

    const checkAccess = async () => {
      const { data, error } = await supabase.rpc("is_lumina_admin");

      if (!cancelled) {
        setAuthorizedUserId(!error && data === true ? userId : null);
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return Boolean(userId && authorizedUserId === userId);
}
