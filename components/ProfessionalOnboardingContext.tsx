import Link from "next/link";
import type { ProfessionalOnboardingStep } from "@/lib/professional-activation";

type Props = {
  step: ProfessionalOnboardingStep;
  title: string;
};

export default function ProfessionalOnboardingContext({ step, title }: Props) {
  return (
    <div className="mb-7 flex flex-col gap-3 rounded-[18px] border border-lumina-glass-border bg-lumina-glass px-4 py-3 backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">
          Professional onboarding
        </p>
        <p className="mt-1 text-[13px] text-lumina-text">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/onboarding?step=${step}`}
          className="rounded-full border border-lumina-border bg-lumina-surface/70 px-4 py-2 text-[12px] text-lumina-text-muted transition hover:border-lumina-text-muted/35 hover:text-lumina-text"
        >
          Back
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-[12px] text-lumina-text-muted transition hover:bg-lumina-surface/70 hover:text-lumina-text"
        >
          Finish later
        </Link>
      </div>
    </div>
  );
}
