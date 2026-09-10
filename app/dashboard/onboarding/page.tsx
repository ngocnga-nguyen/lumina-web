"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  areNonLicenseRequirementsComplete,
  getActivationCompletionPercent,
  getFirstIncompleteOnboardingStep,
  isOnboardingStepComplete,
  isProfessionalOnboardingStep,
  professionalOnboardingSteps,
  type ProfessionalActivationStatus,
  type ProfessionalOnboardingStep,
} from "@/lib/professional-activation";
import {
  loadMyProfessionalActivationStatus,
  setProfessionalProfileVisibility,
} from "@/lib/professional-activation-client";

const editorLinks: Partial<Record<ProfessionalOnboardingStep, string>> = {
  about: "/dashboard/profile?onboarding=about",
  services: "/dashboard/services?onboarding=services",
  portfolio: "/dashboard/portfolio?onboarding=portfolio",
  availability:
    "/dashboard/profile?onboarding=availability#availability",
  license:
    "/dashboard/settings?onboarding=license#license-verification",
};

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProfessionalActivationStatus | null>(null);
  const [currentStep, setCurrentStep] =
    useState<ProfessionalOnboardingStep>("about");
  const [loading, setLoading] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const result = await loadMyProfessionalActivationStatus();
      if (cancelled) return;

      if (result.error || !result.data) {
        console.log("Onboarding readiness fetch error:", result.error);
        setLoading(false);
        return;
      }

      const requestedStep = new URLSearchParams(window.location.search).get(
        "step"
      );
      setStatus(result.data);
      setCurrentStep(
        isProfessionalOnboardingStep(requestedStep)
          ? requestedStep
          : getFirstIncompleteOnboardingStep(result.data)
      );
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentIndex = professionalOnboardingSteps.findIndex(
    (step) => step.id === currentStep
  );
  const progress = status ? getActivationCompletionPercent(status) : 0;
  const nonLicenseReady = status
    ? areNonLicenseRequirementsComplete(status)
    : false;

  const stepComplete = useMemo(
    () => (status ? isOnboardingStepComplete(status, currentStep) : false),
    [currentStep, status]
  );

  const goToStep = (step: ProfessionalOnboardingStep) => {
    setCurrentStep(step);
    router.replace(`/dashboard/onboarding?step=${step}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    const previous = professionalOnboardingSteps[currentIndex - 1];
    if (previous) goToStep(previous.id);
  };

  const goNext = () => {
    const next = professionalOnboardingSteps[currentIndex + 1];
    if (next) goToStep(next.id);
  };

  const activateProfile = async () => {
    setSavingVisibility(true);
    const result = await setProfessionalProfileVisibility(true);
    setSavingVisibility(false);

    if (result.error || !result.data) {
      alert(
        result.error?.message ||
          "Complete every activation requirement before activating your profile."
      );
      return;
    }

    setStatus(result.data);
  };

  if (loading) {
    return (
      <section className="px-5 py-10 md:px-10">
        <div className="max-w-[980px] rounded-[24px] bg-lumina-surface-soft p-6 text-[14px] text-lumina-text-muted">
          Loading your setup…
        </div>
      </section>
    );
  }

  if (!status) {
    return (
      <section className="px-5 py-10 md:px-10">
        <div className="max-w-[720px] rounded-[24px] border border-lumina-border p-6">
          <h1 className="text-[32px] font-semibold [font-family:Georgia,'Times_New_Roman',serif]">
            We couldn&apos;t load your setup
          </h1>
          <p className="mt-3 text-[14px] text-lumina-text-muted">
            Refresh the page or return to your dashboard and try again.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-8 md:px-10 md:py-10">
      <div className="max-w-[1120px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-lumina-text-muted">
              Professional onboarding
            </p>
            <h1 className="mt-3 text-[38px] font-semibold leading-[1.04] md:text-[52px] [font-family:Georgia,'Times_New_Roman',serif]">
              Get your profile ready.
            </h1>
            <p className="mt-4 max-w-[650px] text-[15px] leading-[1.65] text-lumina-text-muted">
              Work at your own pace. Lumina recognizes everything you have
              already completed in your professional workspace.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="w-fit rounded-full border border-lumina-border px-5 py-2.5 text-[13px] text-lumina-text-muted transition hover:border-lumina-text-muted/35 hover:text-lumina-text"
          >
            Finish later
          </Link>
        </div>

        <div className="mt-8 max-w-[760px]">
          <div className="flex items-center justify-between text-[12px] text-lumina-text-muted">
            <span>{progress}% activation ready</span>
            <span>{status.is_active ? "Profile active" : "Not active yet"}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-lumina-pearl">
            <div
              className="h-full rounded-full bg-lumina-black transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-7 lg:grid-cols-[280px_minmax(0,720px)]">
          <nav
            aria-label="Professional onboarding steps"
            className="space-y-1 rounded-[22px] border border-lumina-border bg-lumina-surface-soft p-3"
          >
            {professionalOnboardingSteps.map((step, index) => {
              const complete = isOnboardingStepComplete(status, step.id);
              const selected = step.id === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  aria-current={selected ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[13px] transition ${
                    selected
                      ? "bg-lumina-glass text-lumina-text ring-1 ring-inset ring-lumina-glass-border"
                      : "text-lumina-text-muted hover:bg-lumina-surface"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      complete
                        ? "border-lumina-black bg-lumina-black text-white"
                        : "border-lumina-text-muted/35 bg-lumina-surface text-lumina-text-muted"
                    }`}
                  >
                    {complete ? <Check size={13} strokeWidth={2} /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-[26px] border border-lumina-border bg-lumina-surface p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
              Step {currentIndex + 1} of {professionalOnboardingSteps.length}
            </p>

            {currentStep === "about" && (
              <StepContent
                title="About your business"
                description="Add a real professional name, specialty, profile photo, bio, and a location clients can understand. A business name is optional."
                complete={stepComplete}
                actionHref={editorLinks.about}
                actionLabel={stepComplete ? "Review profile details" : "Complete profile details"}
              />
            )}

            {currentStep === "services" && (
              <StepContent
                title="Add your services"
                description="List at least one service with a clear name and price. Add a useful duration when you can describe it reliably."
                complete={stepComplete}
                actionHref={editorLinks.services}
                actionLabel={stepComplete ? "Review services" : "Add your first service"}
              />
            )}

            {currentStep === "portfolio" && (
              <StepContent
                title="Show representative work"
                description="Portfolio photos show finished work. Structured Results pair Before and After images with the service and outcome. Either can satisfy this setup step."
                complete={stepComplete}
                actionHref={editorLinks.portfolio}
                actionLabel={stepComplete ? "Review your work" : "Add portfolio work"}
              />
            )}

            {currentStep === "availability" && (
              <StepContent
                title="Share basic availability"
                description="Give clients a useful sense of your usual working days and hours. You can still discuss exact timing in each request."
                complete={stepComplete}
                actionHref={editorLinks.availability}
                actionLabel={stepComplete ? "Review availability" : "Add availability"}
              />
            )}

            {currentStep === "license" && (
              <div>
                <h2 className="text-[30px] font-semibold leading-tight md:text-[36px] [font-family:Georgia,'Times_New_Roman',serif]">
                  License verification
                </h2>
                <LicenseState status={status} />
                {status.license_status !== "pending" &&
                  status.license_status !== "verified" && (
                    <Link
                      href={editorLinks.license || "/dashboard/settings"}
                      className="mt-6 inline-flex rounded-full bg-lumina-black px-6 py-3 text-[13px] text-white transition hover:opacity-85"
                    >
                      {status.license_status === "rejected"
                        ? "Update verification details"
                        : "Complete verification"}
                    </Link>
                  )}
              </div>
            )}

            {currentStep === "requests" && (
              <div>
                <h2 className="text-[30px] font-semibold leading-tight md:text-[36px] [font-family:Georgia,'Times_New_Roman',serif]">
                  How Requests work
                </h2>
                <div className="mt-6 space-y-4 text-[14px] leading-[1.6] text-lumina-text-muted">
                  <RequestStep number="1" text="A client selects one or more of your services and may include a Consultation Snapshot." />
                  <RequestStep number="2" text="You review the request and send one proposal with the appointment time, duration, final price, and an optional message." />
                  <RequestStep number="3" text="The client confirms the appointment in Lumina. Any external booking or payment link remains optional logistics." />
                  <RequestStep number="4" text="After the expected service end, Lumina can invite the client to share their experience." />
                </div>
                <p className="mt-6 rounded-[16px] bg-lumina-surface-soft p-4 text-[12px] leading-[1.6] text-lumina-text-muted">
                  Conversations, proposals, appointment status, and exceptions
                  stay together under Requests.
                </p>
              </div>
            )}

            {currentStep === "ready" && (
              <ReadyState
                status={status}
                nonLicenseReady={nonLicenseReady}
                saving={savingVisibility}
                onActivate={() => void activateProfile()}
                onReturnToMissing={() =>
                  goToStep(getFirstIncompleteOnboardingStep(status))
                }
              />
            )}

            <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-lumina-border pt-5">
              <button
                type="button"
                onClick={goBack}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 rounded-full px-4 py-2.5 text-[13px] text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text disabled:invisible"
              >
                <ChevronLeft size={15} /> Back
              </button>
              {currentStep !== "ready" && (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1 rounded-full border border-lumina-border px-5 py-2.5 text-[13px] text-lumina-text transition hover:border-lumina-text-muted/35 hover:text-lumina-text"
                >
                  Continue <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepContent({
  title,
  description,
  complete,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  complete: boolean;
  actionHref?: string;
  actionLabel: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[30px] font-semibold leading-tight md:text-[36px] [font-family:Georgia,'Times_New_Roman',serif]">
          {title}
        </h2>
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
            complete
              ? "border-lumina-border bg-lumina-surface-soft text-lumina-text-muted"
              : "border-lumina-glass-border bg-lumina-glass text-lumina-text"
          }`}
        >
          {complete ? "Complete" : "Action required"}
        </span>
      </div>
      <p className="mt-5 max-w-[600px] text-[14px] leading-[1.7] text-lumina-text-muted">
        {description}
      </p>
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-full bg-lumina-black px-6 py-3 text-[13px] text-white transition hover:opacity-85"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function LicenseState({ status }: { status: ProfessionalActivationStatus }) {
  const details =
    status.license_status === "verified"
      ? {
          label: "License verified",
          text: "Lumina has reviewed and approved your professional-license submission.",
          className: "border-lumina-border bg-lumina-surface-soft text-lumina-text",
        }
      : status.license_status === "pending"
        ? {
            label: "Verification pending",
            text: "Lumina is reviewing your submitted license details. You can continue using your dashboard while you wait.",
            className:
              "border-lumina-glass-border bg-lumina-glass text-lumina-text",
          }
        : status.license_status === "rejected"
          ? {
              label: "Needs correction",
              text:
                status.license_decision_message ||
                "Update your verification details and submit them again.",
              className: "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention",
            }
          : {
              label: "Action required",
              text: "Submit your professional-license details for Lumina review. Your profile cannot become active until the license is verified.",
              className:
                "border-lumina-glass-border bg-lumina-glass text-lumina-text",
            };

  return (
    <div className={`mt-6 rounded-[18px] border p-5 ${details.className}`}>
      <p className="text-[13px] font-semibold">{details.label}</p>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.65] text-lumina-text-muted">
        {details.text}
      </p>
    </div>
  );
}

function RequestStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lumina-black text-[10px] text-white">
        {number}
      </span>
      <p>{text}</p>
    </div>
  );
}

function ReadyState({
  status,
  nonLicenseReady,
  saving,
  onActivate,
  onReturnToMissing,
}: {
  status: ProfessionalActivationStatus;
  nonLicenseReady: boolean;
  saving: boolean;
  onActivate: () => void;
  onReturnToMissing: () => void;
}) {
  if (status.is_active) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
          Profile active
        </p>
        <h2 className="mt-3 text-[34px] font-semibold leading-tight [font-family:Georgia,'Times_New_Roman',serif]">
          Your profile is live.
        </h2>
        <p className="mt-4 max-w-[580px] text-[14px] leading-[1.7] text-lumina-text-muted">
          Clients can discover your profile across Lumina. You can deactivate it
          from Settings whenever you need to.
        </p>
        <Link
          href={`/artist/${status.artist_id}`}
          className="mt-6 inline-flex rounded-full bg-lumina-black px-6 py-3 text-[13px] text-white"
        >
          View active profile
        </Link>
      </div>
    );
  }

  if (status.activation_ready) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
          Ready to activate
        </p>
        <h2 className="mt-3 text-[34px] font-semibold leading-tight [font-family:Georgia,'Times_New_Roman',serif]">
          Everything is ready.
        </h2>
        <p className="mt-4 max-w-[580px] text-[14px] leading-[1.7] text-lumina-text-muted">
          Your required profile information is complete and your license is
          verified. Activate when you are ready to appear in Lumina discovery.
        </p>
        <button
          type="button"
          onClick={onActivate}
          disabled={saving}
          className="mt-6 rounded-full bg-lumina-black px-6 py-3 text-[13px] text-white transition hover:opacity-85 disabled:opacity-50"
        >
          {saving ? "Activating…" : "Activate profile"}
        </button>
      </div>
    );
  }

  if (nonLicenseReady && status.license_status === "pending") {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
          Verification pending
        </p>
        <h2 className="mt-3 text-[34px] font-semibold leading-tight [font-family:Georgia,'Times_New_Roman',serif]">
          Your setup is complete.
        </h2>
        <p className="mt-4 max-w-[580px] text-[14px] leading-[1.7] text-lumina-text-muted">
          Lumina is reviewing your license details. Your workspace remains
          available, but the profile cannot be activated until approval.
        </p>
        <Link
          href="/dashboard/settings#license-verification"
          className="mt-6 inline-flex rounded-full border border-lumina-border px-6 py-3 text-[13px] text-lumina-text"
        >
          View verification status
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
        Setup incomplete
      </p>
      <h2 className="mt-3 text-[34px] font-semibold leading-tight [font-family:Georgia,'Times_New_Roman',serif]">
        A few requirements remain.
      </h2>
      <p className="mt-4 max-w-[580px] text-[14px] leading-[1.7] text-lumina-text-muted">
        Return to the first incomplete step. Your existing work is saved and
        you can keep using the dashboard at any time.
      </p>
      <button
        type="button"
        onClick={onReturnToMissing}
        className="mt-6 rounded-full bg-lumina-black px-6 py-3 text-[13px] text-white"
      >
        Continue setup
      </button>
    </div>
  );
}
