"use client";

import ProfessionalActionLink from "@/components/ProfessionalActionLink";
import { professionalActionHrefs } from "@/lib/professional-action-targets";
import ProfessionalDashboardReadinessPanel from "@/components/ProfessionalDashboardReadinessPanel";
import { getActivationRequirements, getProfessionalActivationLabel, type ProfessionalActivationStatus } from "@/lib/professional-activation";

export default function ProfessionalActivationPanel({ status, onActivate, saving = false, presentation }: {
  status: ProfessionalActivationStatus; onActivate?: () => void; saving?: boolean; presentation?: "dashboard" | "onboarding";
}) {
  if (presentation === "dashboard" || presentation === "onboarding") {
    return <ProfessionalDashboardReadinessPanel status={status} onActivate={onActivate} saving={saving} detailed={presentation === "onboarding"} />;
  }
  const blockers = getActivationRequirements(status).filter((item) => !item.complete);
  return <section className="my-6 rounded-[20px] border border-lumina-border bg-lumina-surface-soft p-5 sm:p-6" aria-label="Professional activation status">
    <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">Your Lumina profile</p>
    <h2 className="mt-2 font-serif text-[28px] leading-tight">{getProfessionalActivationLabel(status)}</h2>
    <p className="mt-3 text-sm leading-relaxed text-lumina-text-muted">{status.is_active ? "Your profile is visible to clients. Optional profile details are yours to add or remove." : status.activation_ready ? status.activation_hidden_by_owner ? "You have hidden your profile. Go live again whenever you choose." : "Your minimum setup is complete. Your profile stays hidden until you choose Go live." : "Your profile stays hidden while you complete the required setup. Your workspace remains available."}</p>
    {blockers.length > 0 && <ul className="mt-4 space-y-3 text-sm">{blockers.map((item) => <li key={item.id}><ProfessionalActionLink className="inline-flex min-h-10 items-center underline decoration-lumina-border underline-offset-4" href={professionalActionHrefs[item.id] || item.href}>{item.label}</ProfessionalActionLink></li>)}</ul>}
    {status.license_status === "rejected" && status.license_decision_message && <p className="mt-3 whitespace-pre-line rounded-xl bg-lumina-attention-soft p-3 text-sm">{status.license_decision_message}</p>}
    {status.activation_ready && !status.is_active && onActivate && <button type="button" onClick={onActivate} disabled={saving} className="mt-5 min-h-11 rounded-full bg-lumina-black px-6 py-3 text-sm text-white disabled:opacity-50">{saving ? "Going live…" : "Go live"}</button>}
  </section>;
}
