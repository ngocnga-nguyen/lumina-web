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
  MessageCircle,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import ClientCardSection from "@/components/ClientCardSection";
import ClientCardWorkspaceCustomizer from "@/components/ClientCardWorkspaceCustomizer";
import ClientNotesPreview from "@/components/ClientNotesPreview";
import ClientTagEditor from "@/components/ClientTagEditor";
import ConsultationSnapshot from "@/components/ConsultationSnapshot";
import IdentityAvatar from "@/components/IdentityAvatar";
import { normalizeManualClientEmail, normalizeManualClientName } from "@/lib/artist-client-records";
import {
  resolveClientIdentity,
  type ClientIdentityProfile,
} from "@/lib/client-identity";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";
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

type ClientProfile = ClientIdentityProfile;

type ClientCardDetails = {
  id: string;
  client_id: string | null;
  source: "lumina_request" | "manual";
  manual_name: string | null;
  manual_phone: string | null;
  manual_email: string | null;
  archived_at: string | null;
  private_notes: string;
  preferences: string;
  tags: string[];
  workspace_preferences: unknown;
};

type LinkedResult = {
  id: string;
  request_id: string | null;
  image_url: string;
  before_image_url: string | null;
  caption: string | null;
  service_name: string | null;
  result_date: string | null;
  created_at: string;
};

type ManualServiceEntry = {
  id: string;
  client_card_id: string;
  service_name: string;
  service_date: string;
  price: number | null;
  created_at: string;
};

type ManualServiceDraft = {
  serviceName: string;
  serviceDate: string;
  price: string;
};

const EMPTY_MANUAL_SERVICE: ManualServiceDraft = {
  serviceName: "",
  serviceDate: "",
  price: "",
};

const MOBILE_SECTION_LABELS: Record<ClientCardSectionId, string> = {
  service_history: "Service history",
  consultation: "Consultation",
  notes: "Private notes",
  preferences: "Preferences",
  results: "Results / Photos",
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
  const [card, setCard] = useState<ClientCardDetails | null>(null);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [results, setResults] = useState<LinkedResult[]>([]);
  const [portfolioChoices, setPortfolioChoices] = useState<LinkedResult[]>([]);
  const [manualServices, setManualServices] = useState<ManualServiceEntry[]>([]);
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
  const [mobileSection, setMobileSection] = useState<"overview" | ClientCardSectionId>("overview");
  const [editingMobileTags, setEditingMobileTags] = useState(false);
  const [editingManualService, setEditingManualService] = useState(false);
  const [manualServiceDraft, setManualServiceDraft] = useState<ManualServiceDraft>(EMPTY_MANUAL_SERVICE);
  const [savingManualService, setSavingManualService] = useState(false);
  const [manualServiceMessage, setManualServiceMessage] = useState("");
  const [selectedPortfolioResult, setSelectedPortfolioResult] = useState("");
  const [linkingResult, setLinkingResult] = useState(false);
  const [resultLinkMessage, setResultLinkMessage] = useState("");
  const [editingManualIdentity, setEditingManualIdentity] = useState(false);
  const [manualIdentityDraft, setManualIdentityDraft] = useState({ name: "", phone: "", email: "" });
  const [manualIdentityMessage, setManualIdentityMessage] = useState("");

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

      const { data: cardData, error: cardError } = await supabase
        .from("artist_client_cards")
        .select("id, client_id, source, manual_name, manual_phone, manual_email, archived_at, private_notes, preferences, tags, workspace_preferences")
        .eq("artist_id", user.id)
        .or(`id.eq.${clientId},client_id.eq.${clientId}`)
        .maybeSingle();
      if (cancelled) return;
      if (cardError) {
        setErrorMessage("We couldn't load this client record. Please try again.");
        setLoading(false);
        return;
      }
      if (!cardData) {
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const loadedCard = cardData as ClientCardDetails;
      const linkedClientId = loadedCard.client_id;
      const requestResponse = linkedClientId
        ? await supabase
            .from("client_requests")
            .select("id, client_id, client_name, service_requested, requested_services, consultation_snapshot, preferred_date, preferred_time, proposed_date, proposed_time, proposed_price, scheduled_for, expected_end_at, booking_status, completed_at, created_at")
            .eq("artist_id", user.id)
            .eq("client_id", linkedClientId)
            .order("created_at", { ascending: false })
        : { data: [], error: null };
      if (cancelled) return;
      if (requestResponse.error) {
        setErrorMessage("We couldn't load this client record. Please try again.");
        setLoading(false);
        return;
      }

      const relatedRequests = (requestResponse.data || []) as ClientRequest[];
      setArtistId(user.id);
      setCard(loadedCard);
      setManualIdentityDraft({
        name: loadedCard.manual_name || "",
        phone: loadedCard.manual_phone || "",
        email: loadedCard.manual_email || "",
      });
      setRequests(relatedRequests);
      setLoadedAt(new Date().toISOString());

      const [{ data: profileData, error: profileError }, { data: noteData, error: noteError }, manualServiceResponse] = await Promise.all([
        linkedClientId
          ? loadRelatedClientIdentities([linkedClientId]).then(({ data, error }) => ({ data: data[0] || null, error }))
          : Promise.resolve({ data: null, error: null }),
        supabase.from("artist_client_notes").select("id, artist_id, client_id, client_card_id, request_id, note_type, title, body, is_pinned, reminder_due_on, reminder_due_time, reminder_completed_at, created_at, updated_at").eq("client_card_id", loadedCard.id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("artist_client_service_entries").select("id, client_card_id, service_name, service_date, price, created_at").eq("client_card_id", loadedCard.id).order("service_date", { ascending: false }),
      ]);
      if (cancelled) return;
      if (profileError) console.log("Client profile fetch error:", profileError);
      else setProfile((profileData as ClientProfile | null) || null);
      if (noteError || manualServiceResponse.error) {
        console.error("Client Notes preview load failed:", noteError);
        setErrorMessage("We couldn't load the private client notes. Please try again.");
        setLoading(false);
        return;
      }

      const savedPreferenceValue = loadedCard.preferences || "";
      setPreferences(savedPreferenceValue);
      setSavedPreferences(savedPreferenceValue);
      setEditingPreferences(false);
      setPreferencesMessage("");
      setTags(Array.isArray(loadedCard.tags) ? loadedCard.tags : []);
      setWorkspacePreferences(parseClientCardWorkspacePreferences(loadedCard.workspace_preferences));
      setClientNotes(sortClientNotes((noteData || []) as ClientNote[]));
      setManualServices((manualServiceResponse.data || []) as ManualServiceEntry[]);

      const completedRequestIds = relatedRequests.filter((request) => request.booking_status === "completed").map((request) => request.id);
      const consultationRequests = relatedRequests.filter((request) => parseConsultationSnapshot(request.consultation_snapshot));
      const [requestResultResponse, resultLinkResponse, portfolioResponse, signedUrlEntries] = await Promise.all([
        completedRequestIds.length > 0
          ? supabase.from("portfolio_images").select("id, request_id, image_url, before_image_url, caption, service_name, result_date, created_at").eq("artist_id", user.id).eq("entry_type", "before_after").in("request_id", completedRequestIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        loadedCard.source === "manual"
          ? supabase.from("artist_client_result_links").select("portfolio_image_id").eq("client_card_id", loadedCard.id)
          : Promise.resolve({ data: [], error: null }),
        loadedCard.source === "manual"
          ? supabase.from("portfolio_images").select("id, request_id, image_url, before_image_url, caption, service_name, result_date, created_at").eq("artist_id", user.id).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        Promise.all(consultationRequests.map(async (request) => [request.id, await createConsultationSignedUrls(request.consultation_snapshot)] as const)),
      ]);
      if (cancelled) return;
      if (requestResultResponse.error || resultLinkResponse.error || portfolioResponse.error) {
        console.log("Linked Results fetch error:", requestResultResponse.error || resultLinkResponse.error || portfolioResponse.error);
      } else if (loadedCard.source === "manual") {
        const portfolioRows = (portfolioResponse.data || []) as LinkedResult[];
        const linkedIds = new Set((resultLinkResponse.data || []).map((link) => link.portfolio_image_id as string));
        setResults(portfolioRows.filter((result) => linkedIds.has(result.id)));
        setPortfolioChoices(portfolioRows.filter((result) => !linkedIds.has(result.id)));
      } else {
        setResults((requestResultResponse.data || []) as LinkedResult[]);
        setPortfolioChoices([]);
      }
      setConsultationUrls(Object.fromEntries(signedUrlEntries));
      setLoading(false);
    };
    if (clientId) void loadClientCard();
    return () => { cancelled = true; };
  }, [clientId, router]);

  useEffect(() => {
    if (!card?.client_id) return;
    let cancelled = false;
    let loadSequence = 0;

    const refreshIdentity = async () => {
      const sequence = ++loadSequence;
      const { data, error } = await loadRelatedClientIdentities([card.client_id!]);
      if (cancelled || sequence !== loadSequence || error) return;
      setProfile(data[0] || null);
    };

    const handleFocus = () => void refreshIdentity();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshIdentity();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      loadSequence += 1;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [card?.client_id]);

  const completedRequests = useMemo(
    () => requests.filter((request) => request.booking_status === "completed").sort((a, b) => getCompletedVisitTimestamp(b) - getCompletedVisitTimestamp(a)),
    [requests]
  );
  const sortedManualServices = useMemo(
    () => [...manualServices].sort((first, second) =>
      (parseDate(second.service_date)?.getTime() || 0) -
      (parseDate(first.service_date)?.getTime() || 0)
    ),
    [manualServices]
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
  const latestManualService = sortedManualServices[0] || null;
  const completedVisitCount = completedRequests.length + sortedManualServices.length;
  const fallbackName = requests.find((request) => request.client_name?.trim())?.client_name;
  const clientIdentity = card?.client_id
    ? resolveClientIdentity(card.client_id, profile, fallbackName || card.manual_name)
    : {
        id: card?.id || clientId,
        name: card?.manual_name?.trim() || "Manual client",
        avatarUrl: null,
        initials: "MC",
      };
  const clientName = clientIdentity.name;
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);
  const availableSections = workspacePreferences.order.filter(
    (section) => card?.source !== "manual" || section !== "consultation"
  );
  const primarySections = availableSections.filter((section) =>
    PRIMARY_CLIENT_CARD_SECTIONS.includes(section) && !workspacePreferences.hidden.includes(section)
  );
  const supportingSections = availableSections.filter((section) =>
    SUPPORTING_CLIENT_CARD_SECTIONS.includes(section) && !workspacePreferences.hidden.includes(section)
  );
  const visibleMobileSections = availableSections.filter(
    (section) => !workspacePreferences.hidden.includes(section)
  );
  const selectedMobileSection =
    mobileSection === "overview" || visibleMobileSections.includes(mobileSection)
      ? mobileSection
      : "overview";

  const persistCardPatch = async (patch: Record<string, unknown>) => {
    if (!artistId || !card?.id || unavailable) {
      return { data: null, error: new Error("Client Card unavailable") };
    }
    return supabase.from("artist_client_cards")
      .update(patch)
      .eq("id", card.id)
      .eq("artist_id", artistId)
      .select("private_notes, preferences, tags, workspace_preferences").single();
  };

  const saveManualService = async () => {
    if (!card || card.source !== "manual" || savingManualService) return;
    const serviceName = manualServiceDraft.serviceName.trim();
    if (!serviceName || !manualServiceDraft.serviceDate) {
      setManualServiceMessage("Add a service name and date.");
      return;
    }
    const price = manualServiceDraft.price.trim() === ""
      ? null
      : Number(manualServiceDraft.price);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setManualServiceMessage("Enter a valid price or leave it blank.");
      return;
    }
    setSavingManualService(true);
    setManualServiceMessage("");
    const { data, error } = await supabase
      .from("artist_client_service_entries")
      .insert({
        client_card_id: card.id,
        service_name: serviceName,
        service_date: manualServiceDraft.serviceDate,
        price,
      })
      .select("id, client_card_id, service_name, service_date, price, created_at")
      .single();
    setSavingManualService(false);
    if (error) {
      setManualServiceMessage("This service record couldn't be saved.");
      return;
    }
    setManualServices((current) => [data as ManualServiceEntry, ...current]);
    setManualServiceDraft(EMPTY_MANUAL_SERVICE);
    setEditingManualService(false);
    setManualServiceMessage("Completed service added.");
  };

  const linkManualResult = async () => {
    if (!card || card.source !== "manual" || !selectedPortfolioResult || linkingResult) return;
    setLinkingResult(true);
    setResultLinkMessage("");
    const { error } = await supabase.from("artist_client_result_links").insert({
      client_card_id: card.id,
      portfolio_image_id: selectedPortfolioResult,
    });
    setLinkingResult(false);
    if (error) {
      setResultLinkMessage("This result couldn't be linked.");
      return;
    }
    const linked = portfolioChoices.find((result) => result.id === selectedPortfolioResult);
    if (linked) {
      setResults((current) => [linked, ...current]);
      setPortfolioChoices((current) => current.filter((result) => result.id !== linked.id));
    }
    setSelectedPortfolioResult("");
    setResultLinkMessage("Result linked to this Client Card.");
  };

  const unlinkManualResult = async (result: LinkedResult) => {
    if (!card || card.source !== "manual") return;
    const { error } = await supabase
      .from("artist_client_result_links")
      .delete()
      .eq("client_card_id", card.id)
      .eq("portfolio_image_id", result.id);
    if (error) {
      setResultLinkMessage("This result couldn't be unlinked.");
      return;
    }
    setResults((current) => current.filter((item) => item.id !== result.id));
    setPortfolioChoices((current) => [result, ...current]);
    setResultLinkMessage("Result removed from this Client Card.");
  };

  const saveManualIdentity = async () => {
    if (!card || card.source !== "manual" || !artistId) return;
    const name = normalizeManualClientName(manualIdentityDraft.name);
    const email = normalizeManualClientEmail(manualIdentityDraft.email);
    if (!name) {
      setManualIdentityMessage("Name is required.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setManualIdentityMessage("Enter a valid email or leave it blank.");
      return;
    }
    const patch = {
      manual_name: name,
      manual_phone: manualIdentityDraft.phone.trim() || null,
      manual_email: email || null,
    };
    const { data, error } = await supabase
      .from("artist_client_cards")
      .update(patch)
      .eq("id", card.id)
      .eq("artist_id", artistId)
      .select("manual_name, manual_phone, manual_email")
      .single();
    if (error) {
      setManualIdentityMessage("Contact details couldn't be saved.");
      return;
    }
    setCard((current) => current ? { ...current, ...data } : current);
    setManualIdentityDraft({ name: data.manual_name || "", phone: data.manual_phone || "", email: data.manual_email || "" });
    setEditingManualIdentity(false);
    setManualIdentityMessage("Private contact details saved.");
  };

  const changeCardArchiveState = async () => {
    if (!card || !artistId) return;
    const archivedAt = card.archived_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from("artist_client_cards")
      .update({ archived_at: archivedAt })
      .eq("id", card.id)
      .eq("artist_id", artistId);
    if (error) {
      setErrorMessage(`We couldn't ${card.archived_at ? "restore" : "archive"} this client.`);
      return;
    }
    setCard((current) => current ? { ...current, archived_at: archivedAt } : current);
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

  const renderSection = (
    section: ClientCardSectionId,
    variant: "default" | "mobile" = "default"
  ) => {
    if (workspacePreferences.hidden.includes(section)) return null;
    const collapsed = workspacePreferences.collapsed.includes(section);

    if (section === "service_history") {
      if (card?.source === "manual") {
        return (
          <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-service-history" : "service-history"} title="Service History" icon={<History size={17} aria-hidden="true" />} description={sortedManualServices.length === 0 ? "Completed off-platform services can be recorded here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-lumina-text-muted">Professional-private off-platform history. It does not create requests or reviews.</p>
              <button type="button" onClick={() => { setEditingManualService(true); setManualServiceMessage(""); }} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-lumina-border px-3.5 text-[11px] font-medium">
                <Plus size={13} aria-hidden="true" /> Add service
              </button>
            </div>
            {editingManualService && (
              <div className="mt-4 grid gap-3 rounded-[15px] bg-lumina-surface-soft p-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-[11px] font-medium">Service
                  <input value={manualServiceDraft.serviceName} maxLength={120} onChange={(event) => setManualServiceDraft((current) => ({ ...current, serviceName: event.target.value }))} className="min-h-10 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 text-[13px] outline-none" />
                </label>
                <label className="grid gap-1.5 text-[11px] font-medium">Date
                  <input type="date" value={manualServiceDraft.serviceDate} onChange={(event) => setManualServiceDraft((current) => ({ ...current, serviceDate: event.target.value }))} className="min-h-10 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 text-[13px] outline-none" />
                </label>
                <label className="grid gap-1.5 text-[11px] font-medium">Price <span className="font-normal text-lumina-text-muted">Optional</span>
                  <input type="number" min="0" step="0.01" value={manualServiceDraft.price} onChange={(event) => setManualServiceDraft((current) => ({ ...current, price: event.target.value }))} className="min-h-10 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 text-[13px] outline-none" />
                </label>
                <div className="flex items-center gap-2 sm:col-span-3">
                  <button type="button" disabled={savingManualService} onClick={() => void saveManualService()} className="min-h-10 rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white disabled:opacity-50">{savingManualService ? "Saving..." : "Save service"}</button>
                  <button type="button" disabled={savingManualService} onClick={() => { setEditingManualService(false); setManualServiceDraft(EMPTY_MANUAL_SERVICE); }} className="min-h-10 px-3 text-[12px] text-lumina-text-muted">Cancel</button>
                </div>
              </div>
            )}
            <p aria-live="polite" className={`mt-2 text-[11px] ${manualServiceMessage.includes("couldn't") || manualServiceMessage.startsWith("Add ") || manualServiceMessage.startsWith("Enter ") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{manualServiceMessage}</p>
            {sortedManualServices.length === 0 ? (
              <EmptyModule title="No completed services yet" copy="Add completed off-platform work as it happens." />
            ) : (
              <div className="mt-3 divide-y divide-lumina-border/60 border-y border-lumina-border/60">
                {sortedManualServices.map((entry) => (
                  <article key={entry.id} className="py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{entry.service_name}</p>
                      <p className="mt-1 text-[11px] text-lumina-text-muted">{formatDate(entry.service_date)}{formatPrice(entry.price) ? ` · ${formatPrice(entry.price)}` : ""}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ClientCardSection>
        );
      }
      return (
        <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-service-history" : "service-history"} title="Service History" icon={<History size={17} aria-hidden="true" />} description={completedRequests.length === 0 ? "Completed visits and their original service details will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
          {completedRequests.length === 0 ? <EmptyModule title="No completed visits yet" copy="Upcoming appointments still keep this client in your list." /> : (
            <div className="overflow-hidden rounded-[16px] border border-lumina-border/65">
              <div className={`${variant === "mobile" ? "hidden" : "hidden md:grid"} grid-cols-[minmax(120px,0.8fr)_minmax(190px,1.5fr)_minmax(160px,1fr)_minmax(90px,0.55fr)] gap-5 bg-lumina-surface-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted`}>
                <span>Date</span><span>Services</span><span>Appointment</span><span>Final price</span>
              </div>
              <div className="divide-y divide-lumina-border">
                {completedRequests.map((request) => {
                  const services = getRequestServices(request);
                  const appointment = getAppointmentWindow(request);
                  return (
                    <article key={request.id} className={variant === "mobile" ? "grid gap-2.5 bg-lumina-surface px-3 py-3.5" : "grid gap-4 bg-lumina-surface px-4 py-5 md:grid-cols-[minmax(120px,0.8fr)_minmax(190px,1.5fr)_minmax(160px,1fr)_minmax(90px,0.55fr)] md:items-start md:gap-5 md:px-5"}>
                      <HistoryField label="Date" mobile={variant === "mobile"}>{formatDate(getCompletedVisitDate(request))}</HistoryField>
                      <HistoryField label="Services" mobile={variant === "mobile"}>
                        <span className="space-y-1">
                          {services.length > 0 ? services.map((service) => (
                            <span key={`${request.id}-${service.service_id || service.service_name}`} className="block">
                              {service.service_name}
                              {service.listed_duration_minutes ? <span className="ml-2 text-[11px] text-lumina-text-muted">{formatDurationMinutes(service.listed_duration_minutes)} listed</span> : null}
                            </span>
                          )) : <span>Service not specified</span>}
                        </span>
                      </HistoryField>
                      <HistoryField label="Appointment" mobile={variant === "mobile"}>{appointment.time}{appointment.duration && <span className="mt-1 block text-[11px] text-lumina-text-muted">{appointment.duration} expected</span>}</HistoryField>
                      <HistoryField label="Final price" mobile={variant === "mobile"}>{formatPrice(request.proposed_price) || "—"}</HistoryField>
                      {variant === "mobile" && (
                        <Link href={`/dashboard/requests?request=${request.id}`} className="text-[12px] font-medium text-lumina-text underline decoration-lumina-border underline-offset-4">
                          View request
                        </Link>
                      )}
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
        <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-results" : "results"} title="Results / Photos" icon={<Images size={17} aria-hidden="true" />} description={results.length === 0 ? "Before & After Results linked to completed services will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
          {card?.source === "manual" && (
            <div className="mb-4 flex flex-wrap items-end gap-2.5">
              <label className="grid min-w-[210px] flex-1 gap-1.5 text-[11px] font-medium">Link existing work
                <select value={selectedPortfolioResult} onChange={(event) => setSelectedPortfolioResult(event.target.value)} className="min-h-10 rounded-[12px] border border-lumina-border bg-lumina-surface px-3 text-[12px] outline-none">
                  <option value="">Choose portfolio or result image</option>
                  {portfolioChoices.map((result) => <option key={result.id} value={result.id}>{result.service_name || result.caption || "Untitled work"}</option>)}
                </select>
              </label>
              <button type="button" disabled={!selectedPortfolioResult || linkingResult} onClick={() => void linkManualResult()} className="min-h-10 rounded-full border border-lumina-border px-4 text-[11px] font-medium disabled:opacity-45">{linkingResult ? "Linking..." : "Link result"}</button>
              <p aria-live="polite" className="w-full text-[11px] text-lumina-text-muted">{resultLinkMessage}</p>
            </div>
          )}
          {results.length === 0 ? <EmptyModule title="No linked results yet" copy="Results linked to completed services will appear here without duplicate uploads." /> : (
            <div className={`grid lg:grid-cols-2 ${variant === "mobile" ? "grid-cols-2 gap-2.5" : "gap-5"}`}>
              {results.map((result) => {
                const linkedRequest = result.request_id ? requestById.get(result.request_id) : undefined;
                return (
                  <article key={result.id} className="overflow-hidden rounded-[18px] border border-lumina-border/65 bg-lumina-surface">
                    <div className="grid grid-cols-2"><ResultImage label="Before" src={result.before_image_url || ""} /><ResultImage label="After" src={result.image_url} /></div>
                    <div className={variant === "mobile" ? "p-3" : "p-5"}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-[16px] font-medium">{result.service_name || (linkedRequest ? formatRequestServiceSummary(linkedRequest) : "") || "Result"}</h3>
                        <span className="rounded-full bg-lumina-surface-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">Professional result</span>
                      </div>
                      {result.caption && <p className={`${variant === "mobile" ? "mt-2 line-clamp-2 text-[11px]" : "mt-3 text-[13px]"} leading-[1.6] text-lumina-text-muted`}>{result.caption}</p>}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-lumina-text-muted">
                        <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{formatDate(result.result_date || (linkedRequest ? getCompletedVisitDate(linkedRequest) : null))}</span>
                        {linkedRequest && formatTime(getAppointmentTime(linkedRequest)) && <span className="inline-flex items-center gap-2"><Clock3 size={14} />{formatTime(getAppointmentTime(linkedRequest))}</span>}
                      </div>
                      {card?.source === "manual" && <button type="button" onClick={() => void unlinkManualResult(result)} className="mt-3 text-[11px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">Unlink from client</button>}
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
      if (card?.source === "manual") return null;
      return (
        <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-consultation" : "consultation"} title="Consultation" icon={<ClipboardList size={17} aria-hidden="true" />} description={consultationRequests.length === 0 ? "Read-only snapshots submitted with requests will appear here." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
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
        <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-professional-notes" : "professional-notes"} title={variant === "mobile" ? "Private notes" : "Notes"} icon={<NotebookPen size={17} aria-hidden="true" />} description={clientNotes.length === 0 ? variant === "mobile" ? "Professional-only service notes, follow-up context, and ideas." : "Private service notes, follow-up context, and ideas." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
          <ClientNotesPreview clientId={card?.id || clientId} notes={clientNotes} />
        </ClientCardSection>
      );
    }

    return (
      <ClientCardSection key={`${variant}-${section}`} id={variant === "mobile" ? "mobile-preferences" : "preferences"} title="Service preferences" icon={<SlidersHorizontal size={17} aria-hidden="true" />} description={editingPreferences || !savedPreferences ? "Service, scheduling, or comfort preferences." : undefined} collapsed={collapsed} onToggle={() => toggleCollapsed(section)} variant={variant}>
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

  const relevantRequest = nextAppointment || requests[0] || null;
  const requestWorkspaceHref = relevantRequest
    ? `/dashboard/requests?request=${relevantRequest.id}`
    : "/dashboard/requests";
  const messageHref = relevantRequest
    ? `/dashboard/messages?request=${relevantRequest.id}`
    : "/dashboard/messages";
  const relationshipSummary = card?.source === "manual"
    ? latestManualService
      ? `${latestManualService.service_name} · ${completedVisitCount} completed ${completedVisitCount === 1 ? "visit" : "visits"}`
      : "Off-platform client relationship"
    : nextAppointment
    ? formatRequestServiceSummary(nextAppointment) || "Upcoming appointment"
    : latestCompleted
      ? `${formatRequestServiceSummary(latestCompleted) || "Completed service"} · ${completedVisitCount} completed ${completedVisitCount === 1 ? "visit" : "visits"}`
      : formatRequestServiceSummary(requests[0]) || "New Lumina client";

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-[1280px] px-5 py-6 md:px-10 md:py-9 lg:py-14">
        <div className="lg:hidden">
          <BackToClients />

          <header className="mt-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <IdentityAvatar
                name={clientName}
                imageUrl={clientIdentity.avatarUrl}
                className="flex h-14 w-14 shrink-0 rounded-full bg-lumina-pearl/80 text-[17px] font-semibold tracking-[0.04em] ring-1 ring-inset ring-lumina-border/55"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
                  {card?.source === "manual" ? "Added manually" : "Lumina client"}
                </p>
                <h1 className="mt-1 truncate font-serif text-[28px] font-semibold leading-[1.05] text-lumina-text">
                  {clientName}
                </h1>
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.4] text-lumina-text-muted">
                  {relationshipSummary}
                </p>
              </div>
            </div>

            {card?.source !== "manual" && relevantRequest && (
              <div className="mt-4 flex items-center gap-2.5">
                <Link href={messageHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white transition hover:bg-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
                  <MessageCircle size={14} aria-hidden="true" /> Message client
                </Link>
                <Link href={requestWorkspaceHref} className="inline-flex min-h-10 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
                  View requests
                </Link>
              </div>
            )}

            <div className="mt-3.5 border-y border-lumina-border/55 py-2.5">
              {nextAppointment ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lumina-blush/45 text-lumina-text">
                    <CalendarDays size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">Next appointment</p>
                    <p className="mt-1 truncate text-[13px] font-medium">{formatRequestServiceSummary(nextAppointment) || "Confirmed appointment"}</p>
                    <p className="mt-0.5 text-[11px] text-lumina-text-muted">{formatDate(getAppointmentDate(nextAppointment))}{formatTime(getAppointmentTime(nextAppointment)) ? ` · ${formatTime(getAppointmentTime(nextAppointment))}` : ""}</p>
                  </div>
                </div>
              ) : latestCompleted || latestManualService ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lumina-pearl/75 text-lumina-text"><History size={15} aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">Most recent service</p>
                    <p className="mt-1 truncate text-[13px] font-medium">{latestManualService?.service_name || (latestCompleted ? formatRequestServiceSummary(latestCompleted) : "") || "Completed service"}</p>
                    <p className="mt-0.5 text-[11px] text-lumina-text-muted">{formatDate(latestManualService?.service_date || (latestCompleted ? getCompletedVisitDate(latestCompleted) : null))}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-lumina-text-muted">No completed services yet.</p>
              )}
            </div>
          </header>

          <div className="-mx-5 mt-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Client Card sections">
            <div role="tablist" className="flex w-max min-w-full items-center gap-1 border-b border-lumina-border/50">
              <MobileSectionTab active={selectedMobileSection === "overview"} emphasized label="Overview" onClick={() => setMobileSection("overview")} />
              {visibleMobileSections.map((section) => (
                <MobileSectionTab key={section} active={selectedMobileSection === section} emphasized={section === "service_history"} label={MOBILE_SECTION_LABELS[section]} onClick={() => setMobileSection(section)} />
              ))}
            </div>
          </div>

          <div className="mt-4">
            {selectedMobileSection === "overview" ? (
              <div className="space-y-5">
                <section aria-labelledby="mobile-relationship-overview">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="mobile-relationship-overview" className="text-[16px] font-semibold">Relationship overview</h2>
                    <span className="text-[10px] text-lumina-text-muted/80">{completedVisitCount} completed {completedVisitCount === 1 ? "visit" : "visits"}</span>
                  </div>
                  <dl className="mt-3 divide-y divide-lumina-border/50 border-y border-lumina-border/50">
                    <MobileOverviewRow label="Next appointment" value={nextAppointment ? formatDate(getAppointmentDate(nextAppointment)) : "None scheduled"} detail={nextAppointment ? formatRequestServiceSummary(nextAppointment) : null} />
                    <MobileOverviewRow label="Recent service" value={latestManualService ? formatDate(latestManualService.service_date) : latestCompleted ? formatDate(getCompletedVisitDate(latestCompleted)) : "No completed visits"} detail={latestManualService?.service_name || (latestCompleted ? formatRequestServiceSummary(latestCompleted) : null)} />
                  </dl>
                </section>

                {card?.source === "manual" && (
                  <section aria-labelledby="mobile-private-contact" className="border-t border-lumina-border/50 pt-4">
                    <div className="flex items-center justify-between gap-3"><h2 id="mobile-private-contact" className="text-[13px] font-medium text-lumina-text-muted">Private contact</h2><button type="button" onClick={() => setEditingManualIdentity((current) => !current)} className="min-h-8 px-2 text-[10px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">{editingManualIdentity ? "Cancel" : "Edit"}</button></div>
                    {editingManualIdentity ? <ManualIdentityEditor draft={manualIdentityDraft} message={manualIdentityMessage} onChange={setManualIdentityDraft} onSave={() => void saveManualIdentity()} /> : <div className="mt-2 space-y-1 text-[12px] text-lumina-text"><p>{card.manual_phone || "No phone saved"}</p><p className="break-all">{card.manual_email || "No email saved"}</p></div>}
                    <p className="mt-1.5 text-[10px] text-lumina-text-muted">Visible only in your professional workspace.</p>
                  </section>
                )}

                <section aria-labelledby="mobile-client-tags">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="mobile-client-tags" className="text-[13px] font-medium text-lumina-text-muted">Client tags</h2>
                    <button type="button" onClick={() => setEditingMobileTags((current) => !current)} className="min-h-8 rounded-full px-2 text-[10px] font-medium text-lumina-text-muted underline decoration-lumina-border underline-offset-4">
                      {editingMobileTags ? "Done" : "Manage"}
                    </button>
                  </div>
                  {editingMobileTags ? (
                    <ClientTagEditor instanceId="mobile-client-tags-editor" tags={tags} saving={savingTags} onChange={updateTags} />
                  ) : tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag.toLocaleLowerCase()} className="rounded-full bg-lumina-pearl/45 px-2.5 py-1 text-[10px] text-lumina-text-muted">{tag}</span>)}</div>
                  ) : (
                    <p className="mt-1.5 text-[12px] text-lumina-text-muted">No private client tags yet.</p>
                  )}
                  <p aria-live="polite" className={`mt-1.5 min-h-3 text-[10px] ${tagSaveMessage.includes("couldn't") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{tagSaveMessage}</p>
                </section>

                {!workspacePreferences.hidden.includes("preferences") && (
                  <MobilePreviewBlock title="Preference preview" empty="No service preferences saved yet." value={savedPreferences} actionLabel="Open preferences" onOpen={() => setMobileSection("preferences")} />
                )}
                {!workspacePreferences.hidden.includes("notes") && (
                  <MobilePreviewBlock title="Recent private note" empty="No private notes yet." value={clientNotes[0]?.title?.trim() || clientNotes[0]?.body?.trim() || ""} actionLabel="Open private notes" onOpen={() => setMobileSection("notes")} />
                )}
              </div>
            ) : (
              renderSection(selectedMobileSection, "mobile")
            )}
          </div>

          <button type="button" onClick={() => setCustomizingWorkspace(true)} className="mt-5 inline-flex min-h-9 items-center gap-2 text-[11px] font-medium text-lumina-text-muted transition hover:text-lumina-text">
            <Settings2 size={14} aria-hidden="true" /> Customize workspace
          </button>
          {card?.source === "manual" && <button type="button" onClick={() => void changeCardArchiveState()} className="ml-4 min-h-9 text-[11px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">{card.archived_at ? "Restore client" : "Archive client"}</button>}
        </div>

        <div className="hidden lg:block">
        <BackToClients />
        <header className="mt-6 flex flex-col gap-5 border-b border-lumina-border/70 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <IdentityAvatar
              name={clientName}
              imageUrl={clientIdentity.avatarUrl}
              className="flex h-[68px] w-[68px] shrink-0 rounded-full bg-lumina-pearl text-[21px] font-medium"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lumina-text-muted">{card?.source === "manual" ? "Added manually" : "Lumina client"}</p>
              <h1 className="mt-1 break-words font-serif text-[32px] font-semibold leading-[1.1] xl:text-[36px]">{clientName}</h1>
            </div>
          </div>
          {card?.source !== "manual" && relevantRequest && (
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <Link href={messageHref} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white transition hover:bg-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
                <MessageCircle size={14} aria-hidden="true" /> Message client
              </Link>
              <Link href={requestWorkspaceHref} className="inline-flex min-h-10 items-center rounded-full border border-lumina-border px-4 text-[12px] font-medium transition hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
                View requests
              </Link>
            </div>
          )}
        </header>

        <section className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-3 border-b border-lumina-border/70 pb-5" aria-label="Client relationship summary">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lumina-blush/35">
              {nextAppointment ? <CalendarDays size={17} aria-hidden="true" /> : <History size={17} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">{nextAppointment ? "Next appointment" : latestCompleted || latestManualService ? "Most recent service" : "Relationship history"}</p>
              <p className="mt-1 text-[15px] font-medium leading-snug">{nextAppointment ? formatRequestServiceSummary(nextAppointment) || "Appointment" : latestManualService?.service_name || (latestCompleted ? formatRequestServiceSummary(latestCompleted) : null) || "No completed services yet"}</p>
              {(nextAppointment || latestCompleted || latestManualService) && <p className="mt-1 text-[12px] text-lumina-text-muted">{nextAppointment ? formatDate(getAppointmentDate(nextAppointment)) : formatDate(latestManualService?.service_date || (latestCompleted ? getCompletedVisitDate(latestCompleted) : null))}{nextAppointment && formatTime(getAppointmentTime(nextAppointment)) ? ` · ${formatTime(getAppointmentTime(nextAppointment))}` : ""}</p>}
            </div>
          </div>
          {completedVisitCount > 0 && <p className="text-[12px] text-lumina-text-muted"><span className="font-medium text-lumina-text">{completedVisitCount}</span> completed {completedVisitCount === 1 ? "visit" : "visits"}</p>}
        </section>

        <ClientTagEditor instanceId="desktop-client-tags" tags={tags} saving={savingTags} onChange={updateTags} compact />
        <p aria-live="polite" className={`mt-2 min-h-4 text-[11px] ${tagSaveMessage.includes("couldn't") ? "text-lumina-attention" : "text-lumina-text-muted"}`}>{tagSaveMessage}</p>
        {card?.source === "manual" && <div className="flex items-start justify-between gap-4 border-b border-lumina-border/55 py-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">Private contact</p>{editingManualIdentity ? <ManualIdentityEditor draft={manualIdentityDraft} message={manualIdentityMessage} onChange={setManualIdentityDraft} onSave={() => void saveManualIdentity()} /> : <p className="mt-2 text-[13px] text-lumina-text">{[card.manual_phone, card.manual_email].filter(Boolean).join(" · ") || "No private contact details saved."}</p>}</div><div className="flex items-center gap-3"><button type="button" onClick={() => setEditingManualIdentity((current) => !current)} className="min-h-9 text-[11px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">{editingManualIdentity ? "Cancel" : "Edit contact"}</button><button type="button" onClick={() => void changeCardArchiveState()} className="min-h-9 text-[11px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">{card.archived_at ? "Restore client" : "Archive client"}</button></div></div>}

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-[24px] font-semibold text-lumina-text">Client workspace</h2>
            <p className="mt-1 text-[12px] text-lumina-text-muted">History, visual results, and private service context in one place.</p>
          </div>
          <button type="button" onClick={() => setCustomizingWorkspace(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-lumina-border bg-lumina-surface px-4 text-[12px] font-medium text-lumina-text transition hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"><Settings2 size={15} aria-hidden="true" /> Customize workspace</button>
        </div>
        <div className="mt-4 grid gap-6 min-[1360px]:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] min-[1360px]:items-start min-[1360px]:gap-7">
          <div className="min-w-0" aria-label="Primary client workspace modules">
            {primarySections.map((section) => renderSection(section))}
          </div>
          <aside className="min-w-0" aria-label="Supporting client workspace modules">
            {supportingSections.map((section) => renderSection(section))}
          </aside>
        </div>
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

function MobileSectionTab({ active, emphasized = false, label, onClick }: { active: boolean; emphasized?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative min-h-10 shrink-0 px-3 text-[12px] transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text ${active ? "font-semibold text-lumina-text" : emphasized ? "font-medium text-lumina-text/75" : "font-normal text-lumina-text-muted/80"}`}
    >
      {label}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-lumina-black" />}
    </button>
  );
}

function MobileOverviewRow({ label, value, detail }: { label: string; value: string; detail: string | null }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">{label}</dt>
      <dd className="min-w-0 text-right">
        <p className="text-[13px] font-semibold text-lumina-text">{value}</p>
        {detail && <p className="mt-0.5 truncate text-[11px] text-lumina-text-muted">{detail}</p>}
      </dd>
    </div>
  );
}

function MobilePreviewBlock({ title, value, empty, actionLabel, onOpen }: { title: string; value: string; empty: string; actionLabel: string; onOpen: () => void }) {
  return (
    <section className="border-t border-lumina-border/50 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium text-lumina-text-muted">{title}</h2>
          <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-lumina-text-muted">{value || empty}</p>
        </div>
        <button type="button" onClick={onOpen} className="shrink-0 text-[11px] font-medium text-lumina-text-muted underline decoration-lumina-border underline-offset-4 transition hover:text-lumina-text">
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function PageMessage({ message, showBack = false }: { message: string; showBack?: boolean }) {
  return <div className="bg-lumina-surface text-lumina-text"><section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">{showBack && <BackToClients />}<div className={`${showBack ? "mt-8" : ""} rounded-[22px] bg-lumina-surface-soft p-6 text-[14px] text-lumina-text-muted`}>{message}</div></section></div>;
}

function HistoryField({ label, children, mobile = false }: { label: string; children: React.ReactNode; mobile?: boolean }) {
  return <div><p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted ${mobile ? "" : "md:hidden"}`}>{label}</p><div className="text-[14px] leading-[1.5]">{children}</div></div>;
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

function ManualIdentityEditor({ draft, message, onChange, onSave }: { draft: { name: string; phone: string; email: string }; message: string; onChange: (draft: { name: string; phone: string; email: string }) => void; onSave: () => void }) {
  return <div className="mt-3 grid gap-2.5 sm:grid-cols-3"><label className="grid gap-1 text-[10px] font-medium text-lumina-text-muted">Name<input value={draft.name} maxLength={120} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="min-h-10 rounded-[11px] border border-lumina-border bg-lumina-surface px-3 text-[12px] text-lumina-text outline-none" /></label><label className="grid gap-1 text-[10px] font-medium text-lumina-text-muted">Phone<input type="tel" value={draft.phone} maxLength={40} onChange={(event) => onChange({ ...draft, phone: event.target.value })} className="min-h-10 rounded-[11px] border border-lumina-border bg-lumina-surface px-3 text-[12px] text-lumina-text outline-none" /></label><label className="grid gap-1 text-[10px] font-medium text-lumina-text-muted">Email<input type="email" value={draft.email} maxLength={254} onChange={(event) => onChange({ ...draft, email: event.target.value })} className="min-h-10 rounded-[11px] border border-lumina-border bg-lumina-surface px-3 text-[12px] text-lumina-text outline-none" /></label><div className="flex items-center gap-3 sm:col-span-3"><button type="button" onClick={onSave} className="min-h-9 rounded-full bg-lumina-black px-4 text-[11px] font-medium text-white">Save contact</button><p aria-live="polite" className="text-[10px] text-lumina-text-muted">{message}</p></div></div>;
}
