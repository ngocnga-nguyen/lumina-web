"use client";
import ProfessionalTodayView from "@/components/ProfessionalTodayView";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfessionalTasks } from "@/lib/use-professional-tasks";
import type { ProfessionalReminder } from "@/lib/professional-tasks";

export default function ProfessionalToday({ artistId }: { artistId: string }) {
  const { snapshot, error, refresh, mutate } = useProfessionalTasks(artistId);
  const [now, setNow] = useState(() => new Date());
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const complete = async (note: ProfessionalReminder) => {
    if (busy) return;
    setBusy(note.id); setActionError(null);
    try {
      await mutate(async () => {
        const { data, error: saveError } = await supabase.from("artist_client_notes")
          .update({ reminder_completed_at: new Date().toISOString() }).eq("id", note.id).eq("artist_id", artistId)
          .eq("note_type", "reminder").eq("updated_at", note.updated_at).is("reminder_completed_at", null).select("id");
        if (saveError || !data?.length) throw new Error("This reminder changed or could not be completed. The latest state has been requested; check Today before trying again.");
      });
    } catch (failure) { setActionError(failure instanceof Error ? failure.message : "The reminder could not be completed."); }
    finally { setBusy(null); }
  };
  return <>
    {!snapshot ? <section className="my-6 rounded-[22px] border border-lumina-border p-5"><h2 className="font-serif text-[26px]">Today</h2><p role="status">{error || "Loading your day…"}</p>{error && <button className="min-h-11 underline" onClick={refresh}>Retry</button>}</section>
      : <><ProfessionalTodayView snapshot={snapshot} now={now} timeZone={timeZone} busy={busy} error={actionError || error} onComplete={(note) => void complete(note)} />{error && <button className="min-h-11 underline" onClick={refresh}>Refresh Today</button>}</>}
  </>;
}
