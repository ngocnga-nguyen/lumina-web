type PortfolioReference = { id: string; image_url: string; service_name?: string | null; caption?: string | null };
type ServiceReference = { id: string; service_name: string };
export type DiscoveryRequestReference = { id: string; title: string; image: string; serviceId: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function discoveryRequestHref(look: { id: string; artistId: string; demo?: boolean }) {
  if (look.demo || !uuid.test(look.id) || !uuid.test(look.artistId)) return null;
  return `/artist/${look.artistId}?requestLook=${look.id}`;
}

// The caller supplies the existing portfolio query scoped to the current professional.
// Query parameters provide only an ID, never trusted image, service, title or price data.
export function resolveDiscoveryRequestReference(id: string | null, portfolio: PortfolioReference[], services: ServiceReference[]): DiscoveryRequestReference | null {
  if (!id || !uuid.test(id)) return null;
  const look = portfolio.find(item => item.id === id);
  if (!look?.image_url) return null;
  const serviceName = look.service_name?.trim().toLowerCase();
  const matches = serviceName ? services.filter(service => service.service_name.trim().toLowerCase() === serviceName) : [];
  return { id: look.id, image: look.image_url, title: look.service_name?.trim() || look.caption?.trim().slice(0, 70) || "Portfolio look", serviceId: matches.length === 1 ? matches[0].id : null };
}

export function discoveryReferenceText(id: string, origin: string) {
  if (!uuid.test(id)) return "";
  const base = new URL(origin);
  if (base.protocol !== "https:" && base.protocol !== "http:") return "";
  return `Look reference: ${new URL(`/discover?look=${id}`, base.origin).href}`;
}

export function appendDiscoveryReference(notes: string, reference: string) {
  if (!reference || notes.includes(reference)) return notes;
  return notes ? `${notes}\n\n${reference}` : reference;
}
