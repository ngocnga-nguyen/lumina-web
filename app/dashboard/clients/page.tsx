"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfessionalClientListControls from "@/components/ProfessionalClientListControls";
import ProfessionalClientRowMenu from "@/components/ProfessionalClientRowMenu";
import ProfessionalClientsMobileList from "@/components/ProfessionalClientsMobileList";
import AddProfessionalClientDialog from "@/components/AddProfessionalClientDialog";
import IdentityAvatar from "@/components/IdentityAvatar";
import {
  normalizeManualClientEmail,
  normalizeManualClientName,
  type ManualClientDraft,
} from "@/lib/artist-client-records";
import { loadRelatedClientIdentities } from "@/lib/client-identity-query";
import {
  applyProfessionalClientControls,
  buildProfessionalClientSummaries,
  formatProfessionalClientDate,
  orderProfessionalClientsForMobile,
  type ProfessionalClientCardRecord,
  type ProfessionalClientFilter,
  type ProfessionalManualServiceEntry,
  type ProfessionalClientProfile,
  type ProfessionalClientRequest,
  type ProfessionalClientSort,
  type ProfessionalClientSummary,
  type ProfessionalClientView,
} from "@/lib/professional-client-list";
import { supabase } from "@/lib/supabase";

export default function DashboardClientsPage() {
  const router = useRouter();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [clients, setClients] = useState<ProfessionalClientSummary[]>([]);
  const [clientView, setClientView] = useState<ProfessionalClientView>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSort, setClientSort] =
    useState<ProfessionalClientSort>("most-recent");
  const [useMobileDefaultOrder, setUseMobileDefaultOrder] = useState(true);
  const [clientFilter, setClientFilter] =
    useState<ProfessionalClientFilter>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [changingClientId, setChangingClientId] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [addClientError, setAddClientError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let loadSequence = 0;

    const loadClients = async () => {
      const sequence = ++loadSequence;
      const canCommit = () => !cancelled && sequence === loadSequence;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!canCommit()) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      setArtistId(user.id);

      const [requestResult, cardResult, manualServiceResult] = await Promise.all([
        supabase
          .from("client_requests")
          .select(
            "id, client_id, client_name, service_requested, requested_services, preferred_date, preferred_time, proposed_date, proposed_time, scheduled_for, booking_status, completed_at, created_at"
          )
          .eq("artist_id", user.id)
          .not("client_id", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_client_cards")
          .select("id, client_id, source, manual_name, manual_phone, manual_email, archived_at, created_at")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_client_service_entries")
          .select("id, client_card_id, service_name, service_date, price, created_at")
          .order("service_date", { ascending: false }),
      ]);

      if (requestResult.error || cardResult.error || manualServiceResult.error) {
        if (canCommit()) {
          setErrorMessage("We couldn't load your clients. Please try again.");
          setLoading(false);
        }
        return;
      }

      const requests = (requestResult.data || []) as ProfessionalClientRequest[];
      const cards = (cardResult.data || []) as ProfessionalClientCardRecord[];
      const manualServices = (manualServiceResult.data || []) as ProfessionalManualServiceEntry[];
      const clientIds = [...new Set(cards.map((card) => card.client_id).filter((id): id is string => Boolean(id)))];
      let profiles: ProfessionalClientProfile[] = [];

      if (clientIds.length > 0) {
        const profileResult = await loadRelatedClientIdentities(clientIds);

        if (!canCommit()) return;
        if (profileResult.error) {
          console.log("Client profile fetch error:", profileResult.error);
        } else {
          profiles = (profileResult.data || []) as ProfessionalClientProfile[];
        }

      }

      if (canCommit()) {
        setClients(
          buildProfessionalClientSummaries(requests, profiles, cards, new Date(), manualServices)
        );
        setErrorMessage("");
        setLoading(false);
      }
    };

    void loadClients();
    const handleFocus = () => void loadClients();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadClients();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      loadSequence += 1;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  const activeCount = useMemo(
    () => clients.filter((client) => !client.archivedAt).length,
    [clients]
  );
  const archivedCount = clients.length - activeCount;
  const visibleClients = useMemo(
    () =>
      applyProfessionalClientControls(clients, {
        view: clientView,
        searchQuery,
        filter: clientFilter,
        sort: clientSort,
      }),
    [clientFilter, clientSort, clientView, clients, searchQuery]
  );
  const mobileVisibleClients = useMemo(
    () =>
      useMobileDefaultOrder
        ? orderProfessionalClientsForMobile(visibleClients)
        : visibleClients,
    [useMobileDefaultOrder, visibleClients]
  );

  const changeArchiveState = async (clientId: string, archived: boolean) => {
    if (!artistId || changingClientId) return;

    setChangingClientId(clientId);
    setActionError("");

    const archivedAt = archived ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("artist_client_cards")
      .update({ archived_at: archivedAt })
      .eq("id", clientId)
      .eq("artist_id", artistId);

    if (error) {
      console.error("Client archive update failed:", error);
      setActionError(
        `We couldn't ${archived ? "archive" : "restore"} this client. Please try again.`
      );
    } else {
      setClients((current) =>
        current.map((client) =>
          client.clientId === clientId
            ? { ...client, archivedAt }
            : client
        )
      );
    }

    setChangingClientId(null);
  };

  const createManualClient = async (draft: ManualClientDraft) => {
    if (!artistId || addingClient) return;
    setAddingClient(true);
    setAddClientError("");
    const { data, error } = await supabase
      .from("artist_client_cards")
      .insert({
        artist_id: artistId,
        client_id: null,
        source: "manual",
        manual_name: normalizeManualClientName(draft.name),
        manual_phone: draft.phone.trim() || null,
        manual_email: normalizeManualClientEmail(draft.email) || null,
      })
      .select("id, client_id, source, manual_name, manual_phone, manual_email, archived_at, created_at")
      .single();
    setAddingClient(false);

    if (error) {
      setAddClientError("We couldn't add this client. Please try again.");
      return;
    }

    const [created] = buildProfessionalClientSummaries(
      [],
      [],
      [data as ProfessionalClientCardRecord]
    );
    setClients((current) => [created, ...current]);
    setAddClientOpen(false);
    router.push(`/dashboard/clients/${created.clientId}`);
  };

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-[1280px] px-5 py-6 md:px-10 md:py-9 lg:py-14">
        <div className="flex items-end justify-between gap-4">
        <div className="max-w-[720px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted lg:text-[11px] lg:tracking-[0.16em]">
            Professional workspace
          </p>
          <h1
            className="mt-2 text-[34px] font-semibold leading-[1.04] lg:mt-1.5 lg:text-[36px] lg:leading-[1.1]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Clients
          </h1>
          <p className="mt-2.5 text-[14px] leading-[1.55] text-lumina-text-muted lg:mt-2 lg:text-[13px] lg:leading-[1.6]">
            Keep Lumina-linked and off-platform client relationships organized in one private workspace.
          </p>
        </div>
          <button
            type="button"
            onClick={() => { setAddClientError(""); setAddClientOpen(true); }}
            className="mb-0.5 inline-flex min-h-10 shrink-0 items-center rounded-full bg-lumina-black px-4 text-[12px] font-medium text-white lg:min-h-11 lg:px-5 lg:text-[13px]"
          >
            Add client
          </button>
        </div>

        {!loading && !errorMessage && clients.length > 0 && (
          <ProfessionalClientListControls
            view={clientView}
            onViewChange={setClientView}
            activeCount={activeCount}
            archivedCount={archivedCount}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            sort={clientSort}
            onSortChange={setClientSort}
            mobileSortValue={useMobileDefaultOrder ? "mobile-default" : clientSort}
            onMobileSortChange={(value) => {
              if (value === "mobile-default") {
                setUseMobileDefaultOrder(true);
                return;
              }
              setUseMobileDefaultOrder(false);
              setClientSort(value);
            }}
            filter={clientFilter}
            onFilterChange={setClientFilter}
          />
        )}

        <div className="mt-6 lg:mt-8">
          <div className="mb-2.5 flex items-center justify-between gap-4 lg:mb-4">
            <h2 className="text-[15px] font-medium lg:text-[18px]">
              {clientView === "active" ? "Active clients" : "Archived clients"}
            </h2>
            {!loading && !errorMessage && (
              <p className="text-[13px] text-lumina-text-muted">
                {visibleClients.length} {visibleClients.length === 1 ? "client" : "clients"}
              </p>
            )}
          </div>

          {actionError && (
            <div
              role="alert"
              className="mb-4 rounded-[16px] border border-lumina-attention/30 bg-lumina-attention-soft px-4 py-3 text-[13px] text-lumina-attention"
            >
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="rounded-[22px] bg-lumina-surface-soft p-6 text-[14px] text-lumina-text-muted">
              Loading clients...
            </div>
          ) : errorMessage ? (
            <div className="rounded-[22px] border border-lumina-border p-6 text-[14px] text-lumina-text-muted">
              {errorMessage}
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-[22px] border border-lumina-border bg-lumina-surface p-6">
              <h2 className="text-[16px] font-medium text-lumina-text">No clients yet</h2>
              <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
                Add an off-platform client or wait for a client to connect through Lumina.
              </p>
            </div>
          ) : visibleClients.length === 0 ? (
            <div className="rounded-[22px] border border-lumina-border bg-lumina-surface p-6">
              <h2 className="text-[16px] font-medium text-lumina-text">
                {clientView === "archived" && archivedCount === 0
                  ? "No archived clients"
                  : "No matching clients"}
              </h2>
              <p className="mt-1 text-[14px] leading-[1.55] text-lumina-text-muted">
                {clientView === "archived" && archivedCount === 0
                  ? "Clients you archive will remain available here with all of their history."
                  : "Try another name, filter, or list view."}
              </p>
            </div>
          ) : (
            <>
              <ProfessionalClientsMobileList
                clients={mobileVisibleClients}
                changingClientId={changingClientId}
                onOpen={(clientId) => router.push(`/dashboard/clients/${clientId}`)}
                onArchiveChange={changeArchiveState}
              />

              <div className="hidden lg:block">
                <div role="region" aria-label="Client list" tabIndex={0} className="max-h-[70dvh] min-h-[160px] overflow-y-auto overscroll-contain border-y border-lumina-border/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted">
                  <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(105px,0.45fr)] gap-6 border-b border-lumina-border/70 bg-lumina-surface/95 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-lumina-text-muted backdrop-blur-[8px] xl:grid">
                    <span>Client</span>
                    <span>Relationship</span>
                    <span>History</span>
                  </div>
                  <div className="divide-y divide-lumina-border/60">
                    {visibleClients.map((client) => (
                      <div key={client.clientId} className="relative bg-lumina-surface">
                        <Link
                          href={`/dashboard/clients/${client.clientId}`}
                          aria-label={`Open ${client.name}'s client card`}
                          className="grid min-h-[90px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-5 py-4 pl-2 pr-14 transition hover:bg-lumina-surface-soft/65 focus-visible:relative focus-visible:z-[1] focus-visible:bg-lumina-blush/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(105px,0.45fr)] xl:gap-6 xl:px-5 xl:pr-14"
                        >
                          <ClientIdentity client={client} />
                          <ClientRelationship client={client} />
                          <ClientHistory client={client} />
                        </Link>
                        <div className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 xl:right-3">
                          <ProfessionalClientRowMenu
                            clientName={client.name}
                            archived={!!client.archivedAt}
                            changing={changingClientId === client.clientId}
                            onOpen={() => router.push(`/dashboard/clients/${client.clientId}`)}
                            onArchiveChange={(archived) => changeArchiveState(client.clientId, archived)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      <AddProfessionalClientDialog
        key={addClientOpen ? "add-client-open" : "add-client-closed"}
          open={addClientOpen}
          clients={clients}
          saving={addingClient}
          errorMessage={addClientError}
          onClose={() => setAddClientOpen(false)}
          onOpenExisting={(cardId) => router.push(`/dashboard/clients/${cardId}`)}
          onCreate={createManualClient}
        />
      </section>
    </div>
  );
}

function ClientIdentity({ client }: { client: ProfessionalClientSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <IdentityAvatar
        name={client.name}
        imageUrl={client.profileImageUrl}
        className="flex h-12 w-12 shrink-0 rounded-full bg-lumina-pearl text-[15px] font-medium text-lumina-text"
      />
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-medium">{client.name}</span>
        <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">
          {client.source === "manual" ? "Added manually" : "Lumina client"}
        </span>
      </span>
    </div>
  );
}

function ClientRelationship({ client }: { client: ProfessionalClientSummary }) {
  const label = client.nextAppointment
    ? "Upcoming appointment"
    : client.lastVisit
      ? "Most recent service"
      : client.newestRequestTimestamp
        ? "Latest request"
        : null;
  const service = client.nextAppointment
    ? client.nextAppointmentService
    : client.lastVisit
      ? client.lastService
      : client.newestRequestService;
  const date = client.nextAppointment
    ? formatProfessionalClientDate(client.nextAppointment)
    : client.lastVisit
      ? formatProfessionalClientDate(client.lastVisit)
      : client.newestRequestTimestamp
        ? new Date(client.newestRequestTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null;

  return (
    <div className="min-w-0">
      {label ? <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-lumina-text-muted">{label}</p> : null}
      <p className={`mt-1 truncate text-[13px] leading-snug ${service ? "font-medium text-lumina-text" : "text-lumina-text-muted"}`}>
        {service || (client.nextAppointment ? "Appointment" : client.lastVisit ? "Completed service" : "No activity yet")}
      </p>
      {date && <p className="mt-1 text-[11px] text-lumina-text-muted">{date}{client.nextAppointment && client.nextAppointmentTime ? ` · ${client.nextAppointmentTime}` : ""}</p>}
    </div>
  );
}

function ClientHistory({ client }: { client: ProfessionalClientSummary }) {
  if (client.totalCompletedVisits === 0) return <span className="hidden xl:block" />;
  return (
    <p className="hidden text-[11px] text-lumina-text-muted xl:block">
      <span className="text-[14px] font-medium text-lumina-text">{client.totalCompletedVisits}</span> completed {client.totalCompletedVisits === 1 ? "visit" : "visits"}
    </p>
  );
}
