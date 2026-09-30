"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfessionalActivationPanel from "@/components/ProfessionalActivationPanel";
import { getFirstIncompleteOnboardingStep, isOnboardingStepComplete, professionalOnboardingSteps, type ProfessionalActivationStatus } from "@/lib/professional-activation";
import { loadMyProfessionalActivationStatus, setProfessionalProfileVisibility } from "@/lib/professional-activation-client";

const editors: Record<string, string> = { about: "/dashboard/profile?onboarding=about", location: "/dashboard/profile?onboarding=location#location", services: "/dashboard/services?onboarding=services", license: "/dashboard/settings?onboarding=license#license-verification", ready: "#activation" };
export default function ProfessionalOnboardingPage() {
  const [status, setStatus] = useState<ProfessionalActivationStatus | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadMyProfessionalActivationStatus().then((result) => {
      if (!cancelled) { setError(Boolean(result.error || !result.data)); setStatus(result.data); }
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  const activate = async () => {
    setSaving(true);
    try {
      const result = await setProfessionalProfileVisibility(true);
      if (result.error || !result.data) throw result.error || new Error("Please try again.");
      setStatus(result.data);
    } catch { alert("We couldn't activate your profile. Check your required setup and try again."); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto max-w-[1120px] px-5 py-8 text-lumina-text md:px-10">
    <p className="text-xs uppercase tracking-[0.16em] text-lumina-text-muted">Professional onboarding</p>
    <h1 className="mt-3 font-serif text-[36px] leading-tight md:text-[48px]">Get ready to go live.</h1>
    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lumina-text-muted">Complete the essentials, then choose when to publish. Photos, bio, portfolio, and availability are optional.</p>
    {error ? <div role="alert" className="mt-6">We couldn&apos;t load your setup. <button className="underline" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</button></div> : status ? <>
      <div id="activation"><ProfessionalActivationPanel status={status} onActivate={() => void activate()} saving={saving} /></div>
      <nav aria-label="Professional onboarding steps" className="grid gap-3 sm:grid-cols-2">{professionalOnboardingSteps.map((step) => <Link key={step.id} href={editors[step.id]} aria-current={getFirstIncompleteOnboardingStep(status) === step.id ? "step" : undefined} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-lumina-border p-4 text-sm"><span>{step.label}</span><span className="text-xs text-lumina-text-muted">{isOnboardingStepComplete(status, step.id) ? "Ready" : "Review"}</span></Link>)}</nav>
      <aside className="mt-8 border-t border-lumina-border pt-6"><h2 className="font-serif text-2xl">Improve your profile · optional</h2><p className="mt-2 text-sm text-lumina-text-muted">These details can help clients learn about your work. They never block going live.</p><div className="mt-4 flex flex-wrap gap-4 text-sm underline"><Link href="/dashboard/profile">Photo, bio &amp; availability</Link><Link href="/dashboard/portfolio">Portfolio / Results</Link></div></aside>
      <p className="mt-6 text-sm text-lumina-text-muted">Requests start a conversation. Agree on service details and appointment timing with each client.</p>
    </> : <p className="mt-6">Loading your setup…</p>}
    <Link className="mt-8 inline-flex min-h-11 items-center text-sm underline" href="/dashboard">Finish later</Link>
  </section>;
}
