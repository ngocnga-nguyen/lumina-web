export type RequestedServiceSnapshot = {
  service_id: string | null;
  service_name: string;
  listed_price: number | null;
  listed_duration_minutes: number | null;
};

export type RequestServicesSource = {
  requested_services?: unknown;
  service_requested?: string | null;
};

export function getRequestServices(
  request: RequestServicesSource
): RequestedServiceSnapshot[] {
  if (Array.isArray(request.requested_services)) {
    const structuredServices = request.requested_services
      .map((service) => {
        if (!service || typeof service !== "object") return null;

        const value = service as Record<string, unknown>;
        const serviceName =
          typeof value.service_name === "string" ? value.service_name.trim() : "";

        if (!serviceName) return null;

        return {
          service_id:
            typeof value.service_id === "string" ? value.service_id : null,
          service_name: serviceName,
          listed_price:
            typeof value.listed_price === "number" &&
            Number.isFinite(value.listed_price)
              ? value.listed_price
              : null,
          listed_duration_minutes:
            typeof value.listed_duration_minutes === "number" &&
            Number.isInteger(value.listed_duration_minutes) &&
            value.listed_duration_minutes > 0 &&
            value.listed_duration_minutes <= 24 * 60
              ? value.listed_duration_minutes
              : null,
        } satisfies RequestedServiceSnapshot;
      })
      .filter(
        (service): service is RequestedServiceSnapshot => service !== null
      );

    if (structuredServices.length > 0) return structuredServices;
  }

  const legacyService = request.service_requested?.trim();
  return legacyService
    ? [
        {
          service_id: null,
          service_name: legacyService,
          listed_price: null,
          listed_duration_minutes: null,
        },
      ]
    : [];
}

export function getRequestServiceNames(request: RequestServicesSource) {
  return getRequestServices(request).map((service) => service.service_name);
}

export function formatRequestServiceSummary(request: RequestServicesSource) {
  return getRequestServiceNames(request).join(", ");
}

export function getSuggestedRequestDurationMinutes(
  request: RequestServicesSource
) {
  const services = getRequestServices(request);

  if (
    services.length === 0 ||
    services.some((service) => service.listed_duration_minutes == null)
  ) {
    return null;
  }

  const total = services.reduce(
    (sum, service) => sum + (service.listed_duration_minutes || 0),
    0
  );

  return total > 0 && total <= 24 * 60 ? total : null;
}

export function formatDurationMinutes(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.round(value);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min`;
}
