"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock3,
  History,
  Images,
  NotebookPen,
  Pencil,
  Save,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import ClientCardSection from "@/components/ClientCardSection";
import ClientCardWorkspaceCustomizer from "@/components/ClientCardWorkspaceCustomizer";
import ClientNotesPreview from "@/components/ClientNotesPreview";
import ClientTagEditor from "@/components/ClientTagEditor";
import ConsultationSnapshot from "@/components/ConsultationSnapshot";
import {
  type ClientCardSectionId,
  type ClientCardWorkspacePreferences,
  moveClientCardSectionWithinColumn,
  parseClientCardWorkspacePreferences,
  PRIMARY_CLIENT_CARD_SECTIONS,
  SUPPORTING_CLIENT_CARD_SECTIONS,
  toggleClientCardSection,
} from "@/lib/client-card-workspace";
import {
  type ClientNote,
  sortClientNotes,
} from "@/lib/client-notes";
import {
  createConsultationSignedUrls,
  parseConsultationSnapshot,
} from "@/lib/consultation-snapshot";
import {
  formatDurationMinutes,
  formatRequestServiceSummary,
  getRequestServices,
} from "@/lib/request-services";
import { supabase } from "@/lib/supabase";

type ClientRequest = {
  id: string;
  client_id: string;
  client_name: string | null;
  service_requested: string | null;
  requested_services: unknown;
  consultation_snapshot: unknown;
  preferred_date: string | null;
  preferred_time: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_price: number | null;
  scheduled_for: string | null;
  expected_end_at: string | null;
  booking_status: string | null;
  completed_at: string | null;
  created_at: string;
};

type ClientProfile = { id: string; full_name: string | null };

type ClientCardDetails = {
  private_notes: string;
  preferences: string;
  tags: string[];
  workspace_preferences: unknown;
};

type LinkedResult = {
  id: string;
  request_id: string;
  image_url: string;
  before_image_url: string | null;
  caption: string | null;
  service_name: string | null;
  result_date: string | null;
  created_at: string;
};

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return null;
  const timestamp = value.includes("T") ? parseDate(value) : null;
  if (timestamp) {
    return timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

function formatPrice(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function getAppointmentDate(request: ClientRequest) {
  return request.scheduled_for || request.proposed_date || request.preferred_date;
}

function getAppointmentTime(request: ClientRequest) {
  return request.scheduled_for || request.proposed_time || request.preferred_time;
}

function getCompletedVisitDate(request: ClientRequest) {
  return request.scheduled_for || request.proposed_date || request.completed_at || request.created_at;
}

function getCompletedVisitTimestamp(request: ClientRequest) {
  return parseDate(getCompletedVisitDate(request))?.getTime() || 0;
}

function getAppointmentWindow(request: ClientRequest) {
  const start = formatTime(getAppointmentTime(request));
  const end = formatTime(request.expected_end_at);
  let duration: string | null = null;
  const startDate = parseDate(request.scheduled_for);
  const endDate = parseDate(request.expected_end_at);
  if (startDate && endDate && endDate > startDate) {
    duration = formatDurationMinutes(
      Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    );
  }
  return { time: start ? `${start}${end ? ` – ${end}` : ""}` : "—", duration };
}

export default function ClientCardPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const [artistId, setArtistId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [results, setResults] = useState<LinkedResult[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [consultationUrls, setConsultationUrls] = useState<Record<string, string[]>>({});
  const [preferences, setPreferences] = useState("");
  const [savedPreferences, setSavedPreferences] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [workspacePreferences, setWorkspacePreferences] =
    useState<ClientCardWorkspacePreferences>(() => parseClientCardWorkspacePreferences(null));
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [tagSaveMessage, setTagSaveMessage] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [customizingWorkspace, setCustomizingWorkspace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadClientCard = async () => {
      setLoading(true);
      setUnavailable(false);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: requestData, error: requestError } = await supabase
        .from("client_requests")
        .select("id, client_id, client_name, service_requested, requested_services, consultation_snapshot, preferred_date, preferred_time, proposed_date, proposed_time, proposed_price, scheduled_for, expected_end_at, booking_status, completed_at, created_at")
        .eq("artist_id", user.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (requestError) {
        setErrorMessage("We couldn't load this client record. Please try again.");
        setLoading(false);
        return;
      }

      const relatedRequests = (requestData || []) as ClientRequest[];
      if (relatedRequests.length === 0) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setArtistId(user.id);
      setRequests(relatedRequests);
      setLoadedAt(new Date().toISOString());

      const [{ data: profileData, error: profileError }, { data: cardData, error: cardError }, { data: noteData, error: noteError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", clientId).maybeSingle(),
        supabase.from("artist_client_cards").select("private_notes, preferences, tags, workspace_preferences").eq("artist_id", user.id).eq("client_id", clientId).maybeSingle(),
        supabase.from("artist_client_notes").select("id, artist_id, client_id, request_id, note_type, title, body, is_pinned, reminder_due_on, reminder_due_time, reminder_completed_at, created_at, updated_at").eq("artist_id", user.id).eq("client_id", clientId).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (profileError) console.log("Client profile fetch error:", profileError);
      else setProfile((profileData as ClientProfile | null) || null);
      if (cardError) {
        setErrorMessage("We couldn't load the private client details. Please try again.");
        setLoading(false);
        return;
      }
      if (noteError) {
        console.error("Client Notes preview load failed:", noteError);
        setErrorMessage("We couldn't load the private client notes. Please try again.");
        setLoading(false);
        return;
      }

      const card = cardData as ClientCardDetails | null;
      const savedPreferenceValue = card?.preferences || "";
      setPreferences(savedPreferenceValue);
      setSavedPreferences(savedPreferenceValue);
      setEditingPreferences(false);
      setPreferencesMessage("");
      setTags(Array.isArray(card?.tags) ? card.tags : []);
      setWorkspacePreferences(parseClientCardWorkspacePreferences(card?.workspace_preferences));
      setClientNotes(sortClientNotes((noteData || []) as ClientNote[]));

      const completedRequestIds = relatedRequests.filter((request) => request.booking_status === "completed").map((request) => request.id);
      const consultationRequests = relatedRequests.filter((request) => parseConsultationSnapshot(request.consultation_snapshot));
      const [resultResponse, signedUrlEntries] = await Promise.all([
        completedRequestIds.length > 0
          ? supabase.from("portfolio_images").select("id, request_id, image_url, before_image_url, caption, service_name, result_date, created_at").eq("artist_id", user.id).eq("entry_type", "before_after").in("request_id", completedRequestIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        Promise.all(consultationRequests.map(async (request) => [request.id, await createConsultationSignedUrls(request.consultation_snapshot)] as const)),
      ]);
      if (cancelled) return;
      if (resultResponse.error) console.log("Linked Results fetch error:", resultResponse.error);
      else setResults((resultResponse.data || []) as LinkedResult[]);
      setConsultationUrls(Object.fromEntries(signedUrlEntries));
      setLoading(false);
    };
    if (clientId) void loadClientCard();
    return () => { cancelled = true; };
  }, [clientId, router]);

  const completedRequests = useMemo(
    () => requests.filter((request) => request.booking_status === "completed").sort((a, b) => getCompletedVisitTimestamp(b) - getCompletedVisitTimestamp(a)),
    [requests]
  );
  const consultationRequests = useMemo(
    () => requests.filter((request) => parseConsultationSnapshot(request.consultation_snapshot)),
    [requests]
  );
  const nextAppointment = useMemo(() => {
    const now = parseDate(loadedAt)?.getTime() || 0;
    return requests.filter((request) => {
      if (request.booking_status !== "booked") return false;
      const date = parseDate(getAppointmentDate(request));
      return date ? date.getTime() >= now : false;
    }).sort((a, b) => (parseDate(getAppointmentDate(a))?.getTime() || 0) - (parseDate(getAppointmentDate(b))?.getTime() || 0))[0] || null;
  }, [loadedAt, requests]);

  const latestCompleted = completedRequests[0] || null;
  const fallbackName = requests.find((request) => request.client_name?.trim())?.client_name;
  const clientName = profile?.full_name?.trim() || fallbackName?.trim() || "Lumina client";
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);
  const primarySections = workspacePreferences.order.filter((section) =>
    PRIMARY_CLIENT_CARD_SECTIONS.includes(section)
  );
  const supportingSections = workspacePreferences.order.filter((section) =>
    SUPPORTING_CLIENT_CARD_SECTIONS.includes(section)
  );

  const persistCardPatch = async (patch: Record<string, unknown>) => {
    if (!artistId || !clientId || unavailable) {
      return { data: null, error: new Error("Client Card unavailable") };
    }
    return supabase.from("artist_client_cards")
      .upsert({ artist_id: artistId, client_id: clientId, ...patch }, { onConflict: "artist_id,client_id" })
      .select("private_notes, preferences, tags, workspace_preferences").single();
  };

  const savePreferences = async () => {
    setSavingPreferences(true);
    setPreferencesMessage("");
    const value = preferences.trim();
    const { data, error } = await persistCardPatch({ preferences: value });
    if (error) {
      console.error("Client Card preferences save failed:", error);
      setPreferencesMessage("Your changes couldn't be saved. Please try again.");
    }
    else {
      const saved = data as ClientCardDetails;
      const savedValue = saved.preferences || "";
      setPreferences(savedValue);
      setSavedPreferences(savedValue);
      setEditingPreferences(false);
      setPreferencesMessage("Service preferences saved.");
    }
    setSavingPreferences(false);
  };

  const editPreferences = () => {
    setPreferences(savedPreferences);
    setEditingPreferences(true);
    setPreferencesMessage("");
  };

  const cancelPreferences = () => {
    setPreferences(savedPreferences);
    setEditingPreferences(false);
    setPreferencesMessage("");
  };

  const updateTags = async (nextTags: string[]) => {
    const previous = tags;
    setTags(nextTags);
    setSavingTags(true);
    setTagSaveMessage("");
    const { data, error } = await persistCardPatch({ tags: nextTags });
    setSavingTags(false);
    if (error) {
      setTags(previous);
      console.error("Client Card tag save failed:", error);
      setTagSaveMessage("Tags couldn't be saved. Please try again.");
      return false;
    }
    setTags(((data as ClientCardDetails).tags || []) as string[]);
    setTagSaveMessage("Client tags saved.");
    return true;
  };

  const updateWorkspace = async (next: ClientCardWorkspacePreferences) => {
    if (savingWorkspace) return;
    const previous = workspacePreferences;
    setWorkspacePreferences(next);
    setSavingWorkspace(true);
    setWorkspaceMessage("");
    const { data, error } = await persistCardPatch({ workspace_preferences: next });
    setSavingWorkspace(false);
    if (error) {
      setWorkspacePreferences(previous);
      console.error("Client Card workspace save failed:", error);
      setWorkspaceMessage("Workspace changes couldn't be saved.");
      return;
    }
    setWorkspacePreferences(parseClientCardWorkspacePreferences((data as ClientCardDetails).workspace_preferences));
    setWorkspaceMessage("Workspace saved.");
  };

  const toggleCollapsed = (section: ClientCardSectionId) => {
    void updateWorkspace(toggleClientCardSection(workspacePreferences, section, "collapsed"));
  };

  const renderSection = (section: ClientCardSectionId) => {
    if (workspacePreferences.hidden.includes(section)) return null;
    const collapsed = workspacePreferences.collapsed.includes(section);

    if (section === "service_history") {
      return (
        <ClientCardSection key={section} id="service-history" title="Service History" icon={<History size={17} aria-hidden="true" />} description={completedRequests.length === 0 ? "Completed visits and their original service details will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)}>
          {completedRequests.length === 0 ? <EmptyModule title="No completed visits yet" copy="Upcoming appointments still keep this client in your list." /> : (
            <div className="overflow-hidden rounded-[16px] border border-lumina-border/65">
              <div className="hidden grid-cols-[minmax(120px,0.8fr)_minmax(190px,1.5fr)_minmax(160px,1fr)_minmax(90px,0.55fr)] gap-5 bg-lumina-surface-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted md:grid">
                <span>Date</span><span>Services</span><span>Appointment</span><span>Final price</span>
              </div>
              <div className="divide-y divide-lumina-border">
                {completedRequests.map((request) => {
                  const services = getRequestServices(request);
                  const appointment = getAppointmentWindow(request);
                  return (
                    <article key={request.id} className="grid gap-4 bg-lumina-surface px-4 py-5 md:grid-cols-[minmax(120px,0.8fr)_minmax(190px,1.5fr)_minmax(160px,1fr)_minmax(90px,0.55fr)] md:items-start md:gap-5 md:px-5">
                      <HistoryField label="Date">{formatDate(getCompletedVisitDate(request))}</HistoryField>
                      <HistoryField label="Services">
                        <span className="space-y-1">
                          {services.length > 0 ? services.map((service) => (
                            <span key={`${request.id}-${service.service_id || service.service_name}`} className="block">
                              {service.service_name}
                              {service.listed_duration_minutes ? <span className="ml-2 text-[11px] text-lumina-text-muted">{formatDurationMinutes(service.listed_duration_minutes)} listed</span> : null}
                            </span>
                          )) : <span>Service not specified</span>}
                        </span>
                      </HistoryField>
                      <HistoryField label="Appointment">{appointment.time}{appointment.duration && <span className="mt-1 block text-[11px] text-lumina-text-muted">{appointment.duration} expected</span>}</HistoryField>
                      <HistoryField label="Final price">{formatPrice(request.proposed_price) || "—"}</HistoryField>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </ClientCardSection>
      );
    }

    if (section === "results") {
      return (
        <ClientCardSection key={section} id="results" title="Results / Photos" icon={<Images size={17} aria-hidden="true" />} description={results.length === 0 ? "Before & After Results linked to completed services will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)}>
          {results.length === 0 ? <EmptyModule title="No linked results yet" copy="Results linked to completed services will appear here without duplicate uploads." /> : (
            <div className="grid gap-5 lg:grid-cols-2">
              {results.map((result) => {
                const linkedRequest = requestById.get(result.request_id);
                return (
                  <article key={result.id} className="overflow-hidden rounded-[18px] border border-lumina-border/65 bg-lumina-surface">
                    <div className="grid grid-cols-2"><ResultImage label="Before" src={result.before_image_url || ""} /><ResultImage label="After" src={result.image_url} /></div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-[16px] font-medium">{result.service_name || (linkedRequest ? formatRequestServiceSummary(linkedRequest) : "") || "Result"}</h3>
                        <span className="rounded-full bg-lumina-surface-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">Professional result</span>
                      </div>
                      {result.caption && <p className="mt-3 text-[13px] leading-[1.6] text-lumina-text-muted">{result.caption}</p>}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-lumina-text-muted">
                        <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{formatDate(result.result_date || (linkedRequest ? getCompletedVisitDate(linkedRequest) : null))}</span>
                        {linkedRequest && formatTime(getAppointmentTime(linkedRequest)) && <span className="inline-flex items-center gap-2"><Clock3 size={14} />{formatTime(getAppointmentTime(linkedRequest))}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ClientCardSection>
      );
    }

    if (section === "consultation") {
      return (
        <ClientCardSection key={section} id="consultation" title="Consultation" icon={<ClipboardList size={17} aria-hidden="true" />} description={consultationRequests.length === 0 ? "Read-only snapshots submitted with requests will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)}>
          {consultationRequests.length === 0 ? <EmptyModule title="No Consultation Snapshots" copy="Optional consultation details submitted with future requests will stay grouped here by request." /> : (
            <div className="space-y-5">
              {consultationRequests.map((request) => (
                <article key={request.id} className="rounded-[15px] border border-lumina-border/60 bg-lumina-surface/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[14px] font-medium">{formatRequestServiceSummary(request) || "Service request"}</p><p className="mt-1 text-[11px] text-lumina-text-muted">Request submitted {formatDate(request.created_at)}</p></div>
                    <span className="rounded-full border border-lumina-border bg-lumina-surface px-3 py-1 text-[10px] text-lumina-text-muted">Read only</span>
                  </div>
                  <ConsultationSnapshot snapshot={request.consultation_snapshot} imageUrls={consultationUrls[request.id] || []} compact />
                </article>
              ))}
            </div>
          )}
        </ClientCardSection>
      );
    }

    if (section === "notes") {
      return (
        <ClientCardSection key={section} id="professional-notes" title="Notes" icon={<NotebookPen size={17} aria-hidden="true" />} description={clientNotes.length === 0 ? "Private service notes, follow-up context, and ideas." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)}>
          <ClientNotesPreview clientId={clientId} notes={clientNotes} />
        </ClientCardSection>
      );
    }

    return (
      <ClientCardSection key={section} id="preferences" title="Service preferences" icon={<SlidersHorizontal size={17} aria-hidden="true" />} description={editingPreferences || !savedPreferences ? "Service, scheduling, or comfort preferences." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)}>
        {editingPreferences ? (
          <>
            <textarea value={preferences} onChange={(event) => { setPreferences(event.target.value); setPreferencesMessage(""); }} rows={5} placeholder="Add simple service, scheduling, or comfort preferences." className="w-full resize-y rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] leading-[1.6] outline-none placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted" />
            <p className="mt-2 text-[11px] leading-[1.5] text-lumina-text-muted">Keep this to non-medical service preferences.</p>
            <ModuleSaveRow saving={savingPreferences} disabled={preferences === savedPreferences} label="Save preferences" message={preferencesMessage} onSave={() => void savePreferences()} onCancel={cancelPreferences} />
          </>
        ) : (
          <ModuleReadView value={savedPreferences} emptyCopy="No service preferences have been added yet." feedback={preferencesMessage} onEdit={editPreferences} />
        )}
      </ClientCardSection>
    );
  };

  if (loading) return <PageMessage message="Loading client record..." />;
  if (unavailable) {
    return (
      <div className="bg-lumina-surface text-lumina-text"><section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14"><BackToClients /><div className="mt-8 max-w-[620px] rounded-[24px] border border-lumina-border p-7"><h1 className="text-[32px] font-semibold leading-tight font-serif">Client record unavailable</h1><p className="mt-3 text-[15px] leading-[1.65] text-lumina-text-muted">This record does not exist or is not connected to your professional account.</p></div></section></div>
    );
  }
  if (errorMessage) return <PageMessage message={errorMessage} showBack />;

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
        <BackToClients />
        <div className="mt-7 rounded-[22px] border border-lumina-border/60 bg-lumina-surface/80 p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-lumina-pearl text-[24px] font-medium md:h-24 md:w-24">{clientName.charAt(0).toUpperCase()}</div>
              <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">Client overview</p><h1 className="mt-2 break-words text-[36px] font-semibold leading-[1.08] font-serif md:text-[46px]">{clientName}</h1></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[620px]">
              <OverviewStat label="Last appointment" value={latestCompleted ? formatDate(getCompletedVisitDate(latestCompleted)) : "No visits yet"} detail={latestCompleted ? formatRequestServiceSummary(latestCompleted) : null} />
              <OverviewStat label="Next appointment" value={nextAppointment ? formatDate(getAppointmentDate(nextAppointment)) : "None scheduled"} detail={nextAppointment ? formatTime(getAppointmentTime(nextAppointment)) : null} />
              <OverviewStat label="Completed visits" value={String(completedRequests.length)} detail={completedRequests.length === 1 ? "Lumina visit" : "Lumina visits"} />
            </div>
          </div>
        </div>

        <ClientTagEditor tags={tags} saving={savingTags} onChange={updateTags} />
        <p aria-live="polite" className={`mt-2 min-h-4 text-[11px] ${tagSaveMessage.includes("couldn't") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{tagSaveMessage}</p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold text-lumina-text">Client workspace</h2>
            <p className="mt-1 text-[12px] text-lumina-text-muted">History, visual results, and private service context in one place.</p>
          </div>
          <button type="button" onClick={() => setCustomizingWorkspace(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"><Settings2 size={15} aria-hidden="true" /> Customize workspace</button>
        </div>
        <div className="mt-4 grid gap-4 min-[1360px]:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] min-[1360px]:items-start min-[1360px]:gap-5">
          <div className="min-w-0 space-y-4" aria-label="Primary client workspace modules">
            {primarySections.map(renderSection)}
          </div>
          <aside className="min-w-0 space-y-4" aria-label="Supporting client workspace modules">
            {supportingSections.map(renderSection)}
          </aside>
        </div>
        {customizingWorkspace && (
          <ClientCardWorkspaceCustomizer
            preferences={workspacePreferences}
            saving={savingWorkspace}
            message={workspaceMessage}
            onMove={(section, direction) => void updateWorkspace(moveClientCardSectionWithinColumn(workspacePreferences, section, direction))}
            onToggleVisibility={(section) => void updateWorkspace(toggleClientCardSection(workspacePreferences, section, "hidden"))}
            onReset={() => {
              const defaults = parseClientCardWorkspacePreferences(null);
              void updateWorkspace({ ...defaults, template: workspacePreferences.template });
            }}
            onClose={() => setCustomizingWorkspace(false)}
          />
        )}
      </section>
    </div>
  );
}

function BackToClients() {
  return <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-[13px] font-medium text-lumina-text-muted transition hover:text-lumina-text"><ArrowLeft size={16} /> Back to clients</Link>;
}

function PageMessage({ message, showBack = false }: { message: string; showBack?: boolean }) {
  return <div className="bg-lumina-surface text-lumina-text"><section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">{showBack && <BackToClients />}<div className={`${showBack ? "mt-8" : ""} rounded-[22px] bg-lumina-surface-soft p-6 text-[14px] text-lumina-text-muted`}>{message}</div></section></div>;
}

function OverviewStat({ label, value, detail }: { label: string; value: string; detail: string | null }) {
  return <div className="border-l border-lumina-border/70 py-1 pl-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">{label}</p><p className="mt-1.5 text-[15px] font-medium">{value}</p>{detail && <p className="mt-1 truncate text-[12px] text-lumina-text-muted">{detail}</p>}</div>;
}

function HistoryField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted md:hidden">{label}</p><div className="text-[14px] leading-[1.5]">{children}</div></div>;
}

function EmptyModule({ title, copy }: { title: string; copy: string }) {
  return <div className="border-l-2 border-lumina-border py-1 pl-4"><h3 className="text-[14px] font-medium">{title}</h3><p className="mt-1 text-[12px] leading-[1.55] text-lumina-text-muted">{copy}</p></div>;
}

function ModuleReadView({ value, emptyCopy, feedback, onEdit }: { value: string; emptyCopy: string; feedback: string; onEdit: () => void }) {
  return (
    <div>
      {value ? (
        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.72] text-lumina-text">{value}</p>
      ) : (
        <p className="text-[13px] leading-[1.6] text-lumina-text-muted">{emptyCopy}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-text/20">
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
        <p aria-live="polite" className="text-[11px] text-lumina-text-muted">{feedback}</p>
      </div>
    </div>
  );
}

function ModuleSaveRow({ saving, disabled, label, message, onSave, onCancel }: { saving: boolean; disabled: boolean; label: string; message: string; onSave: () => void; onCancel: () => void }) {
  return <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={onSave} disabled={saving || disabled} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-lumina-black px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-lumina-text disabled:cursor-not-allowed disabled:bg-lumina-pearl disabled:text-lumina-text-muted"><Save size={15} aria-hidden="true" />{saving ? "Saving..." : label}</button><button type="button" onClick={onCancel} disabled={saving} className="inline-flex min-h-10 items-center rounded-full border border-lumina-border bg-lumina-surface px-4 py-2 text-[12px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><p aria-live="polite" className={`text-[11px] ${message.includes("couldn't") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{message}</p></div>;
}

function ResultImage({ label, src }: { label: string; src: string }) {
  return <div className="relative aspect-[4/3] overflow-hidden bg-lumina-pearl">{src ? <img src={src} alt={`${label} result`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[12px] text-lumina-text-muted">Image unavailable</div>}<span className="absolute bottom-3 left-3 rounded-full bg-lumina-surface/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</span></div>;
}
