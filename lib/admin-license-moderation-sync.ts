import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfessionalLicenseVerification } from "./professional-license-verification";

export type VerificationQueueItem = ProfessionalLicenseVerification & {
  professional_name: string;
};
export type AdminModerationState = {
  items: VerificationQueueItem[];
  loading: boolean;
  authorized: boolean;
  errorMessage: string;
};
export const initialAdminModerationState: AdminModerationState = {
  items: [], loading: true, authorized: false, errorMessage: "",
};

// A single page owner. Events invalidate the queue; only the protected RPC supplies rows.
export function startAdminLicenseModerationSync({ client, topic, browser, visibility, publish, denied }: {
  client: Pick<SupabaseClient, "auth" | "rpc" | "channel" | "removeChannel">;
  topic: string;
  browser: EventTarget;
  visibility: EventTarget & { visibilityState: string };
  publish: (state: AdminModerationState) => void;
  denied: (destination: "/" | "/login") => void;
}) {
  let active = true;
  let sequence = 0;
  let userId: string | null = null;
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;
  let state = initialAdminModerationState;
  const emit = (next: AdminModerationState) => { state = next; publish(next); };
  const removeChannel = () => {
    if (channel) { void client.removeChannel(channel); channel = null; }
  };
  const reset = () => {
    sequence += 1;
    userId = null;
    removeChannel();
    emit({ ...initialAdminModerationState });
  };
  const deny = (destination: "/" | "/login") => {
    reset();
    emit({ ...initialAdminModerationState, loading: false });
    denied(destination);
  };

  const refresh = async () => {
    if (!active) return;
    const request = ++sequence;
    const current = () => active && request === sequence;
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (!current()) return;
      if (authError) {
        if (authError.name === "AuthSessionMissingError" || authError.status === 401 || authError.status === 403) {
          deny("/login"); return;
        }
        throw new Error("Verification access could not be checked. Please retry when connected.");
      }
      if (!user) { deny("/login"); return; }
      if (userId && userId !== user.id) {
        reset();
        void refresh();
        return;
      }
      const { data: isAdmin, error: adminError } = await client.rpc("is_lumina_admin");
      if (!current()) return;
      if (adminError) {
        if (adminError.code === "42501") { deny("/"); return; }
        throw new Error("Verification access could not be checked. Please retry when connected.");
      }
      if (isAdmin !== true) { deny("/"); return; }
      userId = user.id;
      if (!channel) {
        const owned = client.channel(topic);
        channel = owned;
        const changed = (payload: { schema: string; table: string; eventType: string }) => {
          if (active && channel === owned && payload.schema === "public" &&
              payload.table === "professional_license_verifications" &&
              (payload.eventType === "INSERT" || payload.eventType === "UPDATE")) void refresh();
        };
        owned
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "professional_license_verifications" }, changed)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "professional_license_verifications" }, changed)
          .subscribe((status) => { if (active && channel === owned && status === "SUBSCRIBED") void refresh(); });
      }
      const { data, error } = await client.rpc("get_professional_license_verification_queue");
      if (!current()) return;
      if (error?.code === "42501") { deny("/"); return; }
      if (error) throw new Error(error.message || "The verification queue could not be loaded.");
      if (!Array.isArray(data)) throw new Error("The verification queue could not be loaded.");
      emit({ items: data as VerificationQueueItem[], loading: false, authorized: true, errorMessage: "" });
    } catch (error) {
      if (!current()) return;
      emit({ ...state, loading: false, authorized: userId !== null,
        errorMessage: error instanceof Error ? error.message : "The verification queue could not be loaded." });
    }
  };
  const reconcile = () => { void refresh(); };
  const visible = () => { if (visibility.visibilityState === "visible") reconcile(); };
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    if (!active) return;
    if (!session) { deny("/login"); return; }
    if (session.user.id !== userId) reset();
    // Do not run another auth call inside Supabase's auth callback lock.
    queueMicrotask(() => { if (active) void refresh(); });
  });
  browser.addEventListener("focus", reconcile);
  browser.addEventListener("online", reconcile);
  visibility.addEventListener("visibilitychange", visible);
  void refresh();

  return {
    refresh,
    dispose() {
      active = false;
      sequence += 1;
      removeChannel();
      subscription.unsubscribe();
      browser.removeEventListener("focus", reconcile);
      browser.removeEventListener("online", reconcile);
      visibility.removeEventListener("visibilitychange", visible);
    },
  };
}
