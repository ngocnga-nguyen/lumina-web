"use client";

import ProfessionalActionLink from "@/components/ProfessionalActionLink";
import { professionalActionHrefs } from "@/lib/professional-action-targets";
import { ArrowRight, Check, CircleAlert, Clock3, EyeOff } from "lucide-react";
import {
  getActivationRequirements,
  getProfessionalProfilePanelMode,
  type ProfessionalActivationStatus,
} from "@/lib/professional-activation";

// Copy only: completion and destinations come from the existing readiness helpers.
const requirementCopy: Record<string, { title: string; detail: string; action: string; done: string }> = {
  name: { title: "Professional name", detail: "Use the name you want clients to know you by.", action: "Add name", done: "Name added" },
  category: { title: "Professional category", detail: "Tell clients what type of beauty professional you are.", action: "Choose category", done: "Category selected" },
  location: { title: "Location or service area", detail: "Let clients know where you offer your services.", action: "Add location", done: "Location added" },
  services: { title: "Services", detail: "Add a named service and its starting price.", action: "Add service", done: "Services added" },
  license: { title: "Professional license", detail: "Submit your professional license for verification.", action: "Verify license", done: "License verified" },
};
// Scoped semantic accents; existing global attention/success tokens stay unchanged.
const statusStyles = {
  action: "bg-lumina-attention-soft text-lumina-attention",
  review: "bg-[#f5efe3] text-[#765c31]",
  correction: "bg-[#f7eae5] text-[#8a5145]",
  ready: "bg-lumina-success-soft/60 text-lumina-success",
  live: "bg-lumina-success-soft text-lumina-success",
  hidden: "bg-lumina-pearl text-lumina-text-muted",
};
const actionClass = "inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full px-5 py-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-black focus-visible:ring-offset-2 sm:w-auto sm:shrink-0";

export default function ProfessionalDashboardReadinessPanel({ status, onActivate, saving = false, detailed = false }: {
  status: ProfessionalActivationStatus;
  onActivate?: () => void;
  saving?: boolean;
  detailed?: boolean;
}) {
  const requirements = getActivationRequirements(status);
  const missing = requirements.filter((item) => !item.complete);
  const completed = requirements.filter((item) => item.complete);
  const pending = missing.some((item) => item.id === "license") && status.license_status === "pending";
  const actions = missing.filter((item) => !(item.id === "license" && pending));
  const mode = getProfessionalProfilePanelMode(status);
  const correctionOnly = actions.length === 1 && actions[0].id === "license" && status.license_status === "rejected";
  const waitingOnly = pending && actions.length === 0;
  const ready = mode === "ready";
  const hidden = mode === "hidden";

  if (mode === "active") {
    return (
      <section aria-label="Professional activation status" className="my-5 flex flex-col items-start gap-2 rounded-2xl border border-lumina-success/20 bg-lumina-success-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-4">
        <h2 className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusStyles.live}`}>
          <Check size={18} strokeWidth={2} aria-hidden="true" />Live
        </h2>
        <p className="text-[13px] text-lumina-text-muted">Your profile is visible to clients.</p>
      </section>
    );
  }

  const eyebrow = ready ? "Ready" : hidden ? "Profile hidden" : waitingOnly ? "License review" : correctionOnly ? "License action needed" : "Action required";
  const tone = ready ? "ready" : hidden ? "hidden" : waitingOnly ? "review" : correctionOnly ? "correction" : "action";
  const title = ready ? "Ready to go live" : hidden ? "Hidden" : waitingOnly ? "License verification pending" : correctionOnly ? "Update license information" : "Setup needed";
  const remaining = pending
    ? actions.length > 0 ? `${actions.length} ${actions.length === 1 ? "action" : "actions"} left · 1 review pending` : "1 review pending before you can go live."
    : `${missing.length} ${missing.length === 1 ? "thing" : "things"} left before you can go live.`;

  return (
    <section aria-label="Professional activation status" className="my-6 overflow-hidden rounded-[20px] border border-lumina-border/70 bg-lumina-bg">
      <div className="p-4 sm:p-6">
        <p className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusStyles[tone]}`}>
          {waitingOnly ? <Clock3 size={14} aria-hidden="true" /> : correctionOnly ? <CircleAlert size={14} aria-hidden="true" /> : hidden ? <EyeOff size={14} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
          {eyebrow}
        </p>
        <h2 className="mt-1 font-serif text-[28px] leading-tight sm:mt-2 sm:text-[30px]">{title}</h2>
        {ready || hidden ? (
          <div className="mt-2 text-sm leading-relaxed sm:mt-3 text-lumina-text-muted">
            <p>{hidden ? "You have hidden your profile. Your required setup is complete." : "Your required setup is complete."}</p>
            <p>Your profile is still private until you choose to publish it.</p>
          </div>
        ) : (
          <p className="mt-1 text-sm font-medium text-lumina-text sm:mt-2">{remaining}</p>
        )}

        {actions.length > 0 && (
          <>
          {detailed && <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumina-text-muted">Required setup</h3>}
          <ol aria-label="Setup actions" className="mt-3 space-y-3 sm:mt-5">
            {actions.map((item, index) => {
              const copy = requirementCopy[item.id];
              const correction = item.id === "license" && status.license_status === "rejected";
              return (
                <li key={item.id} className="rounded-2xl border border-lumina-border bg-lumina-surface p-3 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lumina-border text-xs font-medium" aria-hidden="true">{index + 1}</span>
                      <div className="min-w-0">
                        <h3 className={`text-[15px] font-medium leading-6 ${correction ? "text-[#8a5145]" : ""}`}>{correction ? "License information" : copy.title}</h3>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-lumina-text-muted sm:mt-1">{correction ? "Review the feedback and update your license details." : copy.detail}</p>
                      </div>
                    </div>
                    <ProfessionalActionLink href={professionalActionHrefs[item.id] || item.href} className={`${actionClass} ${index === 0 ? "bg-lumina-black text-white hover:opacity-85" : "border border-lumina-border bg-lumina-surface text-lumina-text hover:bg-lumina-surface-soft"}`}>
                      {correction ? "Review license" : copy.action} <ArrowRight size={15} aria-hidden="true" />
                    </ProfessionalActionLink>
                  </div>
                  {correction && status.license_decision_message && <p className="mt-3 whitespace-pre-line border-t border-lumina-border pt-3 text-[13px] leading-relaxed text-lumina-text-muted">{status.license_decision_message}</p>}
                </li>
              );
            })}
          </ol>
          </>
        )}

        {pending && (
          <div className={`mt-4 ${waitingOnly ? "" : "flex gap-3 rounded-xl border border-[#765c31]/20 bg-[#f5efe3]/50 p-3 sm:p-4"}`}>
            {!waitingOnly && <Clock3 size={16} className="mt-0.5 shrink-0 text-[#765c31]" aria-hidden="true" />}
            <div>
              {!waitingOnly && <p className="text-[13px] font-medium text-[#765c31]">License verification pending</p>}
              <p className="text-[13px] leading-relaxed text-lumina-text-muted">We’ll let you know when your license review is complete.</p>
            </div>
          </div>
        )}

        {status.activation_ready && !status.is_active && onActivate && (
          <button type="button" onClick={onActivate} disabled={saving} className={`${actionClass} mt-4 sm:mt-5 bg-lumina-black text-white hover:opacity-85 disabled:cursor-wait disabled:opacity-50`}>
            {saving ? "Going live…" : "Go live"}<ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {missing.length > 0 && completed.length > 0 && (
        <div className="border-t border-lumina-border/70 px-4 py-2.5 sm:px-6 sm:py-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-lumina-text-muted">Already complete</p>
          <ul aria-label="Completed essentials" className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 sm:mt-2 sm:gap-y-2">
            {completed.map((item) => <li key={item.id} className="flex items-center gap-1.5 text-[12px] text-lumina-text-muted"><Check size={13} className="shrink-0" aria-hidden="true" />{requirementCopy[item.id].done}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
