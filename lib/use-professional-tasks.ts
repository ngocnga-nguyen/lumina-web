"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRefreshGeneration, mutateAndRefresh } from "@/lib/authoritative-refresh";
import { supabase } from "@/lib/supabase";
import { createRealtimeChannelTopic } from "@/lib/realtime-channel";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";
import type { ClientNote } from "@/lib/client-notes";
import type { ProfessionalAppointment, ProfessionalTaskSnapshot } from "@/lib/professional-tasks";

export async function readAllTaskPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await read(offset, offset + 499);
    if (page.error) throw new Error(page.error.message);
    result.push(...(page.data || []));
    if (!page.data || page.data.length < 500) return result;
  }
}
export async function loadProfessionalTasks(artistId: string): Promise<ProfessionalTaskSnapshot> {
  const [notes, appointments, cards] = await Promise.all([
    readAllTaskPages((from, to) => supabase.from("artist_client_notes").select("*").eq("artist_id", artistId).eq("note_type", "reminder").is("reminder_completed_at", null).order("id").range(from, to)),
    readAllTaskPages((from, to) => supabase.from("client_requests").select("id, client_name, service_requested, status, client_status, booking_status, scheduled_for, appointment_exception_reason, expected_end_at, completion_protocol_version, appointment_confirmed_at, artist_completion_response, client_completion_response").eq("artist_id", artistId).eq("status", "accepted").eq("client_status", "confirmed").eq("booking_status", "booked").order("id").range(from, to)),
    readAllTaskPages((from, to) => supabase.from("artist_client_cards").select("id, client_id, manual_name").eq("artist_id", artistId).order("id").range(from, to)),
  ]);
  const profiles = new Map<string, string>();
  const ids = [...new Set(cards.flatMap((card) => card.client_id ? [card.client_id as string] : []))];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await loadRelatedClientIdentities(ids.slice(i, i + 100));
    if (error) throw new Error(error.message);
    for (const profile of data || []) profiles.set(profile.id, profile.full_name || "Client");
  }
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  return { appointments: appointments as ProfessionalAppointment[], reminders: (notes as ClientNote[]).map((note) => {
    const card = cardMap.get(note.client_card_id);
    return { ...note, client_label: card?.manual_name || profiles.get(card?.client_id) || "Client" };
  }) };
}
export function useProfessionalTasks(artistId: string) {
  const [state, setState] = useState<{ owner: string; snapshot: ProfessionalTaskSnapshot | null; error: string | null }>({ owner: artistId, snapshot: null, error: null });
  const generationRef = useRef(createRefreshGeneration());
  const mountedRef = useRef(false);
  const refresh = useCallback(async () => {
    const generation = generationRef.current;
    const attempt = generation.beginRead();
    if (attempt === null) return;
    const current = () => mountedRef.current && generation.isCurrent(attempt);
    try {
      const snapshot = await loadProfessionalTasks(artistId);
      if (current()) setState({ owner: artistId, snapshot, error: null });
    } catch {
      if (current()) setState((old) => ({ owner: artistId, snapshot: old.owner === artistId ? old.snapshot : null, error: "Today could not be refreshed. Information may be out of date." }));
    }
  }, [artistId]);
  const mutate = useCallback(<T,>(write: () => Promise<T>) =>
    mutateAndRefresh(generationRef.current, write, refresh), [refresh]);
  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    const generation = generationRef.current;
    const reload = () => { if (active) void refresh(); };
    reload();
    const channel = supabase.channel(createRealtimeChannelTopic(`professional-tasks-${artistId}`));
    for (const table of ["artist_client_notes", "artist_client_cards", "client_requests"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `artist_id=eq.${artistId}` }, reload);
    }
    channel.subscribe((status) => { if (status === "SUBSCRIBED") reload(); });
    const visible = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    // Polling also recovers deletes and unavailable realtime publication.
    const timer = window.setInterval(visible, 60_000);
    return () => { active = false; mountedRef.current = false; generation.invalidate(); window.clearInterval(timer); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); void supabase.removeChannel(channel); };
  }, [artistId, refresh]);
  return { snapshot: state.owner === artistId ? state.snapshot : null, error: state.owner === artistId ? state.error : null, refresh, mutate };
}
