import type { ProfessionalClientSummary } from "@/lib/professional-client-list";

export type ManualClientDraft = {
  name: string;
  phone: string;
  email: string;
};

export function normalizeManualClientName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeManualClientPhone(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/[^0-9]/g, "") : "";
}

export function normalizeManualClientEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function findPossibleManualClientMatches(
  clients: ProfessionalClientSummary[],
  draft: ManualClientDraft
) {
  const name = normalizeManualClientName(draft.name).toLocaleLowerCase();
  const phone = normalizeManualClientPhone(draft.phone);
  const email = normalizeManualClientEmail(draft.email);

  return clients.filter((client) => {
    if (email && normalizeManualClientEmail(client.manualEmail || "") === email) return true;
    if (phone && normalizeManualClientPhone(client.manualPhone || "") === phone) return true;
    return Boolean(name && client.name.trim().toLocaleLowerCase() === name);
  });
}

export function validateManualClientDraft(draft: ManualClientDraft) {
  const name = normalizeManualClientName(draft.name);
  const phone = draft.phone.trim();
  const email = normalizeManualClientEmail(draft.email);

  if (!name) return "Add the client's name.";
  if (name.length > 120) return "Client name must be 120 characters or fewer.";
  if (phone.length > 40) return "Phone must be 40 characters or fewer.";
  if (email && (email.length > 254 || !email.includes("@"))) {
    return "Enter a valid email address or leave it blank.";
  }
  return null;
}
