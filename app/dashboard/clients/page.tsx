"use client";

/* eslint-disable @next/next/no-img-element -- Client avatars may come from authenticated profile storage URLs. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfessionalClientListControls from "@/components/ProfessionalClientListControls";
import ProfessionalClientRowMenu from "@/components/ProfessionalClientRowMenu";
import {
  applyProfessionalClientControls,
  buildProfessionalClientSummaries,
  formatProfessionalClientDate,
  type ProfessionalClientArchiveState,
  type ProfessionalClientFilter,
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
  const [clientFilter, setClientFilter] =
    useState<ProfessionalClientFilter>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [changingClientId, setChangingClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadClients = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!cancelled) setArtistId(user.id);

      const { data: requestData, error: requestError } = await supabase
        .from("client_requests")
        .select(
          "id, client_id, client_name, service_requested, preferred_date, preferred_time, proposed_date, proposed_time, scheduled_for, booking_status, completed_at, created_at"
        )
        .eq("artist_id", user.id)
        .not("client_id", "is", null)
        .order("created_at", { ascending: false });

      if (requestError) {
        if (!cancelled) {
          setErrorMessage("We couldn't load your clients. Please try again.");
          setLoading(false);
        }
        return;
      }

      const requests = (requestData || []) as ProfessionalClientRequest[];
      const clientIds = [...new Set(requests.map((request) => request.client_id))];
      let profiles: ProfessionalClientProfile[] = [];
      let archiveStates: ProfessionalClientArchiveState[] = [];

      if (clientIds.length > 0) {
        const [profileResult, archiveResult] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", clientIds),
          supabase
            .from("artist_client_cards")
            .select("client_id, archived_at")
            .eq("artist_id", user.id)
            .in("client_id", clientIds),
        ]);

        if (profileResult.error) {
          console.log("Client profile fetch error:", profileResult.error);
        } else {
          profiles = (profileResult.data || []) as ProfessionalClientProfile[];
        }

        if (archiveResult.error) {
          if (!cancelled) {
            setErrorMessage("We couldn't load your client organization. Please try again.");
            setLoading(false);
          }
          return;
        } else {
          archiveStates = (archiveResult.data || []) as ProfessionalClientArchiveState[];
        }
      }

      if (!cancelled) {
        setClients(
          buildProfessionalClientSummaries(requests, profiles, archiveStates)
        );
        setLoading(false);
      }
    };

    void loadClients();

    return () => {
      cancelled = true;
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

  const changeArchiveState = async (clientId: string, archived: boolean) => {
    if (!artistId || changingClientId) return;

    setChangingClientId(clientId);
    setActionError("");

    const archivedAt = archived ? new Date().toISOString() : null;
    const { error } = await supabase.from("artist_client_cards").upsert(
      {
        artist_id: artistId,
        client_id: clientId,
        archived_at: archivedAt,
      },
      { onConflict: "artist_id,client_id" }
    );

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

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
        <div className="max-w-[720px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
            Professional dashboard
          </p>
          <h1
            className="mt-3 text-[42px] font-semibold leading-[1.02] md:text-[56px]"
            style={{ fontFamily: "Georgia, Times New Roman, serif" }}
          >
            Clients
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-lumina-text-muted">
            A simple view of the clients who have connected with you through Lumina.
          </p>
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
            filter={clientFilter}
            onFilterChange={setClientFilter}
          />
        )}

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-medium">
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
                Clients will appear here after they send you a request through Lumina.
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
              <div className="hidden overflow-hidden rounded-[24px] border border-lumina-border xl:block">
                <div role="region" aria-label="Client list" tabIndex={0} className="max-h-[65dvh] min-h-[220px] overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted">
                  <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,1.6fr)_minmax(140px,1.2fr)_minmax(110px,1fr)_minmax(160px,1.25fr)_80px] gap-5 border-b border-lumina-surface/15 bg-lumina-black/85 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-pearl backdrop-blur-[12px]">
                    <span>Client</span>
                    <span>Last service</span>
                    <span>Last visit</span>
                    <span>Next appointment</span>
                    <span>Visits</span>
                  </div>

                  <div className="divide-y divide-lumina-border">
                    {visibleClients.map((client) => (
                      <div key={client.clientId} className="relative bg-lumina-surface">
                        <Link
                          href={`/dashboard/clients/${client.clientId}`}
                          aria-label={`Open ${client.name}'s client card`}
                          className="grid grid-cols-[minmax(180px,1.6fr)_minmax(140px,1.2fr)_minmax(110px,1fr)_minmax(160px,1.25fr)_80px] items-center gap-5 bg-lumina-surface px-6 py-5 pr-[74px] transition hover:bg-lumina-surface-soft/70 focus-visible:relative focus-visible:z-[1] focus-visible:bg-lumina-blush/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted"
                        >
                          <ClientIdentity client={client} />
                          <p className="text-[14px] text-lumina-text">{client.lastService || "No completed visits yet"}</p>
                          <p className="text-[14px] text-lumina-text">{formatProfessionalClientDate(client.lastVisit) || "—"}</p>
                          <NextAppointment client={client} />
                          <p className="text-[15px] font-medium">{client.totalCompletedVisits}</p>
                        </Link>
                        <div className="absolute right-4 top-1/2 z-[2] -translate-y-1/2">
                          <ProfessionalClientRowMenu
                            clientName={client.name}
                            archived={!!client.archivedAt}
                            changing={changingClientId === client.clientId}
                            onOpen={() => router.push(`/dashboard/clients/${client.clientId}`)}
                            onArchiveChange={(archived) =>
                              changeArchiveState(client.clientId, archived)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div role="region" aria-label="Client list" tabIndex={0} className="max-h-[70dvh] overflow-y-auto overscroll-contain pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text-muted xl:hidden">
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleClients.map((client) => (
                    <div key={client.clientId} className="relative">
                      <Link
                        href={`/dashboard/clients/${client.clientId}`}
                        aria-label={`Open ${client.name}'s client card`}
                        className="block rounded-[20px] border border-lumina-border bg-lumina-surface p-5 pr-14 transition hover:border-lumina-text-muted/40 hover:bg-lumina-surface-soft/55 focus-visible:bg-lumina-blush/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lumina-text-muted"
                      >
                        <ClientIdentity client={client} />
                        <dl className="mt-5 divide-y divide-lumina-border/65 border-t border-lumina-border/65">
                          <ClientCardDetail label="Last service" value={client.lastService || "No completed visits yet"} />
                          <ClientCardDetail label="Last visit" value={formatProfessionalClientDate(client.lastVisit) || "—"} />
                          <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 py-3">
                            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">Next appointment</dt>
                            <dd className="text-right"><NextAppointment client={client} compact /></dd>
                          </div>
                          <ClientCardDetail label="Completed visits" value={String(client.totalCompletedVisits)} />
                        </dl>
                      </Link>
                      <div className="absolute right-3 top-3 z-[2]">
                        <ProfessionalClientRowMenu
                          clientName={client.name}
                          archived={!!client.archivedAt}
                          changing={changingClientId === client.clientId}
                          onOpen={() => router.push(`/dashboard/clients/${client.clientId}`)}
                          onArchiveChange={(archived) =>
                            changeArchiveState(client.clientId, archived)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ClientIdentity({ client }: { client: ProfessionalClientSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lumina-pearl text-[15px] font-medium text-lumina-text">
        {client.profileImageUrl ? (
          <img src={client.profileImageUrl} alt={client.name} className="h-full w-full object-cover" />
        ) : (
          client.name.charAt(0).toUpperCase()
        )}
      </div>
      <p className="truncate text-[16px] font-medium">{client.name}</p>
    </div>
  );
}

function NextAppointment({ client, compact = false }: { client: ProfessionalClientSummary; compact?: boolean }) {
  if (!client.nextAppointment) {
    return <p className={`${compact ? "text-[12px]" : "text-[14px]"} text-lumina-text-muted`}>None scheduled</p>;
  }

  return (
    <div>
      <p className={`${compact ? "text-[12px]" : "text-[14px]"} font-medium text-lumina-text`}>{formatProfessionalClientDate(client.nextAppointment)}</p>
      {client.nextAppointmentTime && <p className="mt-1 text-[12px] text-lumina-text-muted">{client.nextAppointmentTime}</p>}
    </div>
  );
}

function ClientCardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lumina-text-muted">{label}</dt>
      <dd className="break-words text-right text-[12px] leading-[1.5] text-lumina-text">{value}</dd>
    </div>
  );
}
