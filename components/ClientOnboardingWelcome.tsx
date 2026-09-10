"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  GitCompareArrows,
  Search,
  Send,
} from "lucide-react";

type ClientOnboardingWelcomeProps = {
  onDismiss: () => Promise<unknown> | void;
};

const ideas = [
  {
    title: "Discover",
    body: "Browse, search, filter, and use Map.",
    icon: Search,
  },
  {
    title: "Save & compare",
    body: "Save professionals and compare options.",
    icon: GitCompareArrows,
  },
  {
    title: "Request with clarity",
    body: "Select one or multiple services and optionally add a Consultation Snapshot.",
    icon: Send,
  },
  {
    title: "Confirm & follow up",
    body: "Review the proposal, confirm in Lumina, and leave a verified review after an eligible service.",
    icon: CalendarCheck,
  },
];

export default function ClientOnboardingWelcome({
  onDismiss,
}: ClientOnboardingWelcomeProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const dismiss = async (browse = false) => {
    setBusy(true);
    await onDismiss();
    setBusy(false);
    if (browse) router.push("/browse");
  };

  return (
    <section className="mt-8 rounded-[26px] border border-lumina-glass-border bg-lumina-glass p-5 text-lumina-text shadow-sm backdrop-blur-[14px] md:p-7">
      <div className="max-w-[720px]">
        <p className="inline-flex rounded-full bg-lumina-blush px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-lumina-text-muted">
          Start here
        </p>
        <h2
          className="mt-2 text-[30px] font-semibold leading-tight text-lumina-text md:text-[36px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Welcome to Lumina
        </h2>
        <p className="mt-3 text-[14px] leading-[1.65] text-lumina-text-muted">
          Discover professionals, understand their services before committing,
          and manage the request process in one place.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ideas.map(({ title, body, icon: Icon }, index) => (
          <div
            key={title}
            className="group rounded-[18px] border border-lumina-border/75 bg-lumina-surface/90 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-lumina-glass-border bg-lumina-surface/70 text-lumina-text shadow-sm backdrop-blur-[8px] transition group-hover:bg-lumina-blush/25">
                <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="text-[10px] text-lumina-text-muted">0{index + 1}</span>
            </div>
            <h3 className="mt-4 text-[14px] font-medium text-lumina-text">
              {title}
            </h3>
            <p className="mt-1.5 text-[12px] leading-[1.55] text-lumina-text-muted">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => void dismiss(true)}
          disabled={busy}
          className="rounded-full bg-lumina-black px-5 py-3 text-[13px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
        >
          Browse professionals
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy}
          className="rounded-full border border-lumina-border bg-lumina-surface/90 px-5 py-3 text-[13px] text-lumina-text transition hover:border-lumina-text-muted hover:text-lumina-black disabled:opacity-50"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy}
          className="px-3 py-2 text-left text-[12px] text-lumina-text-muted transition hover:text-lumina-black disabled:opacity-50 sm:ml-1"
        >
          Skip for now
        </button>
      </div>
    </section>
  );
}
