"use client";

import Link from "next/link";
import { useState } from "react";
import ProfessionalActionLink from "@/components/ProfessionalActionLink";
import ProfessionalActivationPanel from "@/components/ProfessionalActivationPanel";
import { useProfessionalReadiness } from "@/components/ProfessionalReadinessProvider";
import { setProfessionalProfileVisibility } from "@/lib/professional-activation-client";

export default function ProfessionalOnboardingPage() {
  const { status, error, refresh } = useProfessionalReadiness();
  const [saving, setSaving] = useState(false);
  const activate = async () => {
    setSaving(true);
    try {
      const result = await setProfessionalProfileVisibility(true);
      if (result.error || !result.data) throw result.error || new Error("Please try again.");
      await refresh();
    } catch { alert("We couldn't activate your profile. Check your required setup and try again."); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto max-w-[1120px] px-5 py-8 text-lumina-text md:px-10">
    <p className="text-xs uppercase tracking-[0.16em] text-lumina-text-muted">Professional onboarding</p>
    <h1 className="mt-3 font-serif text-[36px] leading-tight md:text-[48px]">Get ready to go live.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lumina-text-muted">Complete the essentials, then choose when to publish.</p>
    {error ? <div role="alert" className="mt-6">We couldn&apos;t load your setup. <button className="underline" onClick={() => void refresh()}>Try again</button></div> : status ? <>
      <div id="activation"><ProfessionalActivationPanel presentation="onboarding" status={status} onActivate={() => void activate()} saving={saving} /></div>
      <aside className="mt-8 border-t border-lumina-border pt-6" aria-label="Optional profile enrichment">
        <h2 className="font-serif text-2xl">Improve your profile · optional</h2>
        <p className="mt-2 text-sm leading-relaxed text-lumina-text-muted">These details help clients get to know your work. They never block going live.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ["Profile photo", "/dashboard/profile?focus=photo", status.profile_photo_ready],
            ["Bio", "/dashboard/profile?focus=bio", status.bio_ready],
            ["Availability", "/dashboard/profile?focus=availability", status.availability_ready],
            ["Portfolio / Results", "/dashboard/portfolio", status.portfolio_ready],
            ["Cover image", "/dashboard/profile?focus=cover", null],
          ].map(([label, href, present]) => <ProfessionalActionLink key={String(label)} href={String(href)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-lumina-border px-4 py-3 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-black"><span>{label}</span><span className="text-[12px] text-lumina-text-muted">{present ? "Edit" : "Explore"} →</span></ProfessionalActionLink>)}
        </div>
      </aside>
      <p className="mt-6 text-sm text-lumina-text-muted">Requests start a conversation. Agree on service details and appointment timing with each client.</p>
    </> : <p className="mt-6">Loading your setup…</p>}
    <Link className="mt-8 inline-flex min-h-11 items-center text-sm underline" href="/dashboard">Finish later</Link>
  </section>;
}
