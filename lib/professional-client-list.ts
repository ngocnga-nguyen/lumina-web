export type ProfessionalClientRequest = {
  id: string;
  client_id: string;
  client_name: string | null;
  service_requested: string | null;
  requested_services?: unknown;
  preferred_date: string | null;
  preferred_time: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  scheduled_for: string | null;
  booking_status: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ProfessionalClientProfile = {
  id: string;
  full_name: string | null;
};

export type ProfessionalClientArchiveState = {
  client_id: string;
  archived_at: string | null;
};

export type ProfessionalClientSummary = {
  clientId: string;
  name: string;
  profileImageUrl: string | null;
  lastService: string | null;
  lastVisit: string | null;
  lastVisitTimestamp: number | null;
  completedVisitTimestamps: number[];
  nextAppointment: string | null;
  nextAppointmentTime: string | null;
  nextAppointmentTimestamp: number | null;
  nextAppointmentService: string | null;
  newestRequestTimestamp: number | null;
  newestRequestService: string | null;
  serviceNames: string[];
  totalCompletedVisits: number;
  archivedAt: string | null;
};

export type ProfessionalClientView = "active" | "archived";
export type ProfessionalClientSort =
  | "most-recent"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "most-visits";
export type ProfessionalClientFilter =
  | "all"
  | "upcoming"
  | "no-upcoming"
  | "visited-month"
  | "visited-year";

export const PROFESSIONAL_CLIENT_SORT_OPTIONS: ReadonlyArray<{
  value: ProfessionalClientSort;
  label: string;
}> = [
  { value: "most-recent", label: "Most recent visit" },
  { value: "oldest", label: "Oldest visit" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "most-visits", label: "Most visits" },
];

export const PROFESSIONAL_CLIENT_FILTER_OPTIONS: ReadonlyArray<{
  value: ProfessionalClientFilter;
  label: string;
}> = [
  { value: "all", label: "All clients" },
  { value: "upcoming", label: "Has upcoming appointment" },
  { value: "no-upcoming", label: "No upcoming appointment" },
  { value: "visited-month", label: "Visited this month" },
  { value: "visited-year", label: "Visited this year" },
];

export function parseProfessionalClientDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatProfessionalClientDate(value: string | null) {
  const parsed = parseProfessionalClientDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getHistoricalVisitDate(request: ProfessionalClientRequest) {
  return (
    request.scheduled_for ||
    request.proposed_date ||
    request.completed_at ||
    request.created_at
  );
}

function getAppointmentDate(request: ProfessionalClientRequest) {
  return request.scheduled_for || request.proposed_date || request.preferred_date;
}

function getClientRequestServiceNames(request: ProfessionalClientRequest) {
  if (Array.isArray(request.requested_services)) {
    const names = request.requested_services
      .map((service) => {
        if (!service || typeof service !== "object") return "";
        const value = service as Record<string, unknown>;
        return typeof value.service_name === "string"
          ? value.service_name.trim()
          : "";
      })
      .filter(Boolean);
    if (names.length > 0) return names;
  }

  const legacyName = request.service_requested?.trim();
  return legacyName ? [legacyName] : [];
}

function formatClientRequestServiceSummary(request: ProfessionalClientRequest) {
  return getClientRequestServiceNames(request).join(", ");
}

function parseLegacyAppointmentTimestamp(
  dateValue: string,
  timeValue: string | null
) {
  if (dateValue.includes("T")) {
    return parseProfessionalClientDate(dateValue)?.getTime() ?? null;
  }

  const base = parseProfessionalClientDate(dateValue);
  if (!base) return null;

  if (timeValue) {
    const twentyFourHour = timeValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    const twelveHour = timeValue.match(
      /^(\d{1,2}):(\d{2})\s*(am|pm)$/i
    );

    if (twentyFourHour) {
      const hours = Number(twentyFourHour[1]);
      const minutes = Number(twentyFourHour[2]);
      if (hours <= 23 && minutes <= 59) {
        base.setHours(hours, minutes, 0, 0);
        return base.getTime();
      }
    } else if (twelveHour) {
      let hours = Number(twelveHour[1]) % 12;
      const minutes = Number(twelveHour[2]);
      if (twelveHour[3].toLowerCase() === "pm") hours += 12;
      if (minutes <= 59) {
        base.setHours(hours, minutes, 0, 0);
        return base.getTime();
      }
    }
  }

  // A legacy date with no reliable time remains upcoming through that day.
  base.setHours(23, 59, 59, 999);
  return base.getTime();
}

function getUpcomingAppointmentTimestamp(
  request: ProfessionalClientRequest,
  now: Date
) {
  if (request.booking_status !== "booked") return null;

  const date = getAppointmentDate(request);
  if (!date) return null;

  const timestamp = request.scheduled_for
    ? parseProfessionalClientDate(request.scheduled_for)?.getTime() ?? null
    : parseLegacyAppointmentTimestamp(
        date,
        request.proposed_time || request.preferred_time
      );

  return timestamp !== null && timestamp >= now.getTime() ? timestamp : null;
}

export function buildProfessionalClientSummaries(
  requests: ProfessionalClientRequest[],
  profiles: ProfessionalClientProfile[],
  archiveStates: ProfessionalClientArchiveState[] = [],
  now = new Date()
) {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const archiveByClientId = new Map(
    archiveStates.map((state) => [state.client_id, state.archived_at])
  );
  const requestsByClient = new Map<string, ProfessionalClientRequest[]>();

  requests.forEach((request) => {
    if (!request.client_id) return;
    const current = requestsByClient.get(request.client_id) || [];
    current.push(request);
    requestsByClient.set(request.client_id, current);
  });

  return Array.from(requestsByClient.entries()).map(
    ([clientId, clientRequests]) => {
      const completedRequests = clientRequests
        .filter((request) => request.booking_status === "completed")
        .sort((first, second) => {
          const firstTimestamp =
            parseProfessionalClientDate(getHistoricalVisitDate(first))?.getTime() ||
            0;
          const secondTimestamp =
            parseProfessionalClientDate(getHistoricalVisitDate(second))?.getTime() ||
            0;
          return secondTimestamp - firstTimestamp;
        });
      const upcomingRequests = clientRequests
        .map((request) => ({
          request,
          timestamp: getUpcomingAppointmentTimestamp(request, now),
        }))
        .filter(
          (
            appointment
          ): appointment is {
            request: ProfessionalClientRequest;
            timestamp: number;
          } => appointment.timestamp !== null
        )
        .sort((first, second) => first.timestamp - second.timestamp);

      const latestCompleted = completedRequests[0] || null;
      const nextAppointment = upcomingRequests[0] || null;
      const newestRequest = [...clientRequests].sort(
        (first, second) =>
          (parseProfessionalClientDate(second.created_at)?.getTime() || 0) -
          (parseProfessionalClientDate(first.created_at)?.getTime() || 0)
      )[0] || null;
      const profile = profileById.get(clientId);
      const fallbackName = clientRequests.find((request) =>
        request.client_name?.trim()
      )?.client_name;
      const lastVisit = latestCompleted
        ? getHistoricalVisitDate(latestCompleted)
        : null;
      const completedVisitTimestamps = completedRequests
        .map(
          (request) =>
            parseProfessionalClientDate(getHistoricalVisitDate(request))?.getTime() ||
            0
        )
        .filter((timestamp) => timestamp > 0);
      const serviceNames = Array.from(
        new Set(clientRequests.flatMap(getClientRequestServiceNames))
      );

      return {
        clientId,
        name:
          profile?.full_name?.trim() ||
          fallbackName?.trim() ||
          "Lumina client",
        profileImageUrl: null,
        lastService: latestCompleted
          ? formatClientRequestServiceSummary(latestCompleted) || null
          : null,
        lastVisit,
        lastVisitTimestamp: completedVisitTimestamps[0] || null,
        completedVisitTimestamps,
        nextAppointment: nextAppointment
          ? getAppointmentDate(nextAppointment.request)
          : null,
        nextAppointmentTime: nextAppointment
          ? nextAppointment.request.proposed_time ||
            nextAppointment.request.preferred_time ||
            null
          : null,
        nextAppointmentTimestamp: nextAppointment?.timestamp || null,
        nextAppointmentService: nextAppointment
          ? formatClientRequestServiceSummary(nextAppointment.request) || null
          : null,
        newestRequestTimestamp: newestRequest
          ? parseProfessionalClientDate(newestRequest.created_at)?.getTime() || null
          : null,
        newestRequestService: newestRequest
          ? formatClientRequestServiceSummary(newestRequest) || null
          : null,
        serviceNames,
        totalCompletedVisits: completedRequests.length,
        archivedAt: archiveByClientId.get(clientId) || null,
      } satisfies ProfessionalClientSummary;
    }
  );
}

function compareNullableTimestamps(
  first: number | null,
  second: number | null,
  direction: "asc" | "desc"
) {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return direction === "asc" ? first - second : second - first;
}

function hasVisitInPeriod(
  client: ProfessionalClientSummary,
  filter: "visited-month" | "visited-year",
  now: Date
) {
  return client.completedVisitTimestamps.some((timestamp) => {
    const visit = new Date(timestamp);
    if (visit.getFullYear() !== now.getFullYear()) return false;
    return filter === "visited-year" || visit.getMonth() === now.getMonth();
  });
}

export function applyProfessionalClientControls(
  clients: ProfessionalClientSummary[],
  options: {
    view: ProfessionalClientView;
    searchQuery: string;
    filter: ProfessionalClientFilter;
    sort: ProfessionalClientSort;
    now?: Date;
  }
) {
  const now = options.now || new Date();
  const query = options.searchQuery.trim().toLocaleLowerCase();

  return clients
    .filter((client) =>
      options.view === "archived" ? !!client.archivedAt : !client.archivedAt
    )
    .filter((client) => {
      if (!query) return true;
      return (
        client.name.toLocaleLowerCase().includes(query) ||
        client.serviceNames.some((service) =>
          service.toLocaleLowerCase().includes(query)
        )
      );
    })
    .filter((client) => {
      switch (options.filter) {
        case "upcoming":
          return client.nextAppointmentTimestamp !== null;
        case "no-upcoming":
          return client.nextAppointmentTimestamp === null;
        case "visited-month":
        case "visited-year":
          return hasVisitInPeriod(client, options.filter, now);
        default:
          return true;
      }
    })
    .sort((first, second) => {
      let result = 0;

      switch (options.sort) {
        case "oldest":
          result = compareNullableTimestamps(
            first.lastVisitTimestamp,
            second.lastVisitTimestamp,
            "asc"
          );
          break;
        case "name-asc":
          return first.name.localeCompare(second.name);
        case "name-desc":
          return second.name.localeCompare(first.name);
        case "most-visits":
          result = second.totalCompletedVisits - first.totalCompletedVisits;
          if (result === 0) {
            result = compareNullableTimestamps(
              first.lastVisitTimestamp,
              second.lastVisitTimestamp,
              "desc"
            );
          }
          break;
        default:
          result = compareNullableTimestamps(
            first.lastVisitTimestamp,
            second.lastVisitTimestamp,
            "desc"
          );
      }

      return result || first.name.localeCompare(second.name);
    });
}

export function orderProfessionalClientsForMobile(
  clients: ProfessionalClientSummary[]
) {
  return [...clients].sort((first, second) => {
    const firstUpcoming = first.nextAppointmentTimestamp;
    const secondUpcoming = second.nextAppointmentTimestamp;

    if (firstUpcoming !== null || secondUpcoming !== null) {
      if (firstUpcoming === null) return 1;
      if (secondUpcoming === null) return -1;
      const upcomingOrder = firstUpcoming - secondUpcoming;
      if (upcomingOrder !== 0) return upcomingOrder;
    }

    const visitOrder = compareNullableTimestamps(
      first.lastVisitTimestamp,
      second.lastVisitTimestamp,
      "desc"
    );
    if (visitOrder !== 0) return visitOrder;

    const requestOrder = compareNullableTimestamps(
      first.newestRequestTimestamp,
      second.newestRequestTimestamp,
      "desc"
    );
    return requestOrder || first.name.localeCompare(second.name);
  });
}
