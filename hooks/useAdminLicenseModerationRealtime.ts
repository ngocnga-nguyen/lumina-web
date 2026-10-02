"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { initialAdminModerationState, startAdminLicenseModerationSync } from "@/lib/admin-license-moderation-sync";

export function useAdminLicenseModerationRealtime() {
  const router = useRouter();
  const [state, setState] = useState(initialAdminModerationState);
  const owner = useRef<ReturnType<typeof startAdminLicenseModerationSync> | null>(null);
  useEffect(() => {
    const sync = startAdminLicenseModerationSync({
      client: supabase,
      topic: createRealtimeChannelTopic("admin-license-moderation"),
      browser: window,
      visibility: document,
      publish: setState,
      denied: (destination) => router.replace(destination),
    });
    owner.current = sync;
    return () => { owner.current = null; sync.dispose(); };
  }, [router]);
  const refresh = useCallback(async () => { await owner.current?.refresh(); }, []);
  return { ...state, refresh };
}
