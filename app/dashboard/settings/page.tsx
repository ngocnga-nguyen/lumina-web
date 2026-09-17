"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProfessionalOnboardingContext from "@/components/ProfessionalOnboardingContext";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import MobileSettingsRow from "@/components/MobileSettingsRow";
import {
  professionalVerificationStatusLabels,
  type ProfessionalLicenseVerification,
} from "@/lib/professional-license-verification";
import type { ProfessionalActivationStatus } from "@/lib/professional-activation";
import {
  loadMyProfessionalActivationStatus,
  setProfessionalProfileVisibility,
} from "@/lib/professional-activation-client";

const emptyVerificationForm = {
  legal_professional_name: "",
  license_number: "",
  license_jurisdiction: "",
  license_type: "",
  business_name: "",
};

export default function ArtistSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [verification, setVerification] =
    useState<ProfessionalLicenseVerification | null>(null);
  const [verificationForm, setVerificationForm] = useState(
    emptyVerificationForm
  );
  const [savedVerificationForm, setSavedVerificationForm] = useState(emptyVerificationForm);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [activationStatus, setActivationStatus] =
    useState<ProfessionalActivationStatus | null>(null);
  const [onboardingMode, setOnboardingMode] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"email" | "password" | "verification" | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const isLicenseOnboarding = new URLSearchParams(window.location.search).get("onboarding") === "license";
      setOnboardingMode(isLicenseOnboarding);
      if (isLicenseOnboarding) setMobileSheet("verification");

      const { data: artist } = await supabase
        .from("artists")
        .select("is_active, name")
        .eq("id", user.id)
        .maybeSingle();

      if (!artist) {
        router.push("/account");
        return;
      }

      setEmail(user.email || "");
      setIsVisible(artist.is_active ?? false);

      const activationResult = await loadMyProfessionalActivationStatus();
      if (activationResult.error) {
        console.log(
          "Professional activation status fetch error:",
          activationResult.error
        );
      } else if (activationResult.data) {
        setActivationStatus(activationResult.data);
        setIsVisible(activationResult.data.is_active);
      }

      const { data: verificationData, error: verificationError } =
        await supabase
          .from("professional_license_verifications")
          .select("*")
          .eq("artist_id", user.id)
          .maybeSingle();

      if (verificationError) {
        console.log("License verification fetch error:", verificationError);
      } else if (verificationData) {
        const savedVerification =
          verificationData as ProfessionalLicenseVerification;
        setVerification(savedVerification);
        const nextVerificationForm = {
          legal_professional_name: savedVerification.legal_professional_name,
          license_number: savedVerification.license_number,
          license_jurisdiction: savedVerification.license_jurisdiction,
          license_type: savedVerification.license_type,
          business_name: savedVerification.business_name || "",
        };
        setVerificationForm(nextVerificationForm);
        setSavedVerificationForm(nextVerificationForm);
      } else {
        const nextVerificationForm = {
          ...emptyVerificationForm,
          legal_professional_name:
            user.user_metadata?.full_name || artist.name || "",
          business_name: user.user_metadata?.business_name || "",
        };
        setVerificationForm(nextVerificationForm);
        setSavedVerificationForm(nextVerificationForm);
      }

      setLoading(false);
    };

    void loadSettings();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const scrollToVerification = () => {
      if (window.location.hash !== "#license-verification") return;
      const target = window.matchMedia("(max-width: 1023px)").matches
        ? "license-verification-mobile"
        : "license-verification-desktop";
      document.getElementById(target)?.scrollIntoView({ block: "start" });
    };
    scrollToVerification();
    window.addEventListener("hashchange", scrollToVerification);
    return () => window.removeEventListener("hashchange", scrollToVerification);
  }, [loading]);

  const requestEmailChange = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (cleanEmail === email.toLowerCase()) {
      alert("That is already your current email.");
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: cleanEmail });
    setChangingEmail(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNewEmail("");
    setShowEmailChange(false);
    setMobileSheet(null);
    alert(
      "Verification sent. Check your inbox and follow the link to finish changing your email."
    );
  };

  const sendPasswordReset = async () => {
    if (!email) return;

    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password?role=professional`,
    });
    setSendingPasswordReset(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset link sent. Check your email to continue.");
  };

  const updateVisibility = async () => {
    const nextVisibility = !isVisible;
    setVisibilityLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await setProfessionalProfileVisibility(
      nextVisibility
    );

    setVisibilityLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setActivationStatus(data);
    setIsVisible(Boolean(data?.is_active));
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  const submitLicenseVerification = async () => {
    const legalName = verificationForm.legal_professional_name.trim();
    const licenseNumber = verificationForm.license_number.trim();
    const jurisdiction = verificationForm.license_jurisdiction.trim();
    const licenseType = verificationForm.license_type.trim();
    const businessName = verificationForm.business_name.trim();

    if (!legalName || !licenseNumber || !jurisdiction || !licenseType) {
      alert("Please complete your professional name, license number, jurisdiction, and license type.");
      return;
    }

    if (
      verification?.status === "verified" &&
      !window.confirm(
        "Resubmitting changed license information will return your verification to Pending review and temporarily remove the public License verified label. Continue?"
      )
    ) {
      return;
    }

    setSubmittingVerification(true);
    const { data, error } = await supabase.rpc(
      "submit_professional_license_verification",
      {
        p_legal_professional_name: legalName,
        p_license_number: licenseNumber,
        p_license_jurisdiction: jurisdiction,
        p_license_type: licenseType,
        p_business_name: businessName || null,
      }
    );
    setSubmittingVerification(false);

    if (error) {
      alert(error.message || "We couldn't submit your license information.");
      return;
    }

    setVerification(data as ProfessionalLicenseVerification);
    const nextVerificationForm = {
      legal_professional_name: legalName,
      license_number: licenseNumber,
      license_jurisdiction: jurisdiction,
      license_type: licenseType,
      business_name: businessName,
    };
    setVerificationForm(nextVerificationForm);
    setSavedVerificationForm(nextVerificationForm);
    setMobileSheet(null);
    const activationResult = await loadMyProfessionalActivationStatus();
    if (activationResult.data) {
      setActivationStatus(activationResult.data);
      setIsVisible(activationResult.data.is_active);
    }

    if (onboardingMode) {
      router.push("/dashboard/onboarding?step=requests");
      return;
    }
    alert("License information submitted for Lumina review.");
  };

  const signOutOtherDevices = async () => {
    if (!window.confirm("Sign out of Lumina on all other devices? You will stay signed in here.")) return;
    setSigningOutOthers(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setSigningOutOthers(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Other devices have been signed out. You are still signed in on this device.");
  };

  const closeVerificationEditor = () => {
    setVerificationForm(savedVerificationForm);
    setMobileSheet(null);
  };

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-2xl px-5 pb-10 pt-5 lg:hidden">
        {onboardingMode && <ProfessionalOnboardingContext step="license" title="Submit license verification" />}
        <p className="text-[11px] uppercase tracking-[0.16em] text-lumina-text-muted">Professional workspace</p>
        <h1 className="mt-2 font-serif text-[31px] font-semibold leading-[1.05]">Settings</h1>
        <p className="mt-2 text-[13px] text-lumina-text-muted">Account, verification, and privacy.</p>
        {loading ? <p className="mt-7 rounded-[18px] bg-lumina-surface-soft p-4 text-[13px] text-lumina-text-muted">Loading settings…</p> : <>
          <section className="mt-7 rounded-[18px] bg-lumina-surface-soft/75 p-4" aria-label="Public profile visibility">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[14px] font-medium">Public profile</p><p className="mt-1 text-[12px] leading-relaxed text-lumina-text-muted">{isVisible ? "Visible to clients in browse, search, and map." : activationStatus?.activation_ready ? "Ready to become visible when you choose." : "Hidden until activation and license verification are complete."}</p></div>
              <button type="button" onClick={() => void updateVisibility()} disabled={visibilityLoading || (!isVisible && !activationStatus?.activation_ready)} aria-label="Professional profile visibility" aria-pressed={isVisible} className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${isVisible ? "bg-lumina-black" : "bg-lumina-pearl"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-lumina-surface transition ${isVisible ? "left-6" : "left-1"}`} /></button>
            </div>
            {!isVisible && !activationStatus?.activation_ready && <Link href="/dashboard/onboarding" className="mt-3 inline-block text-[12px] underline decoration-lumina-border underline-offset-4">Continue profile setup</Link>}
          </section>
          <section className="mt-7" aria-label="Account and security"><h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Account &amp; security</h2><div className="mt-2 border-t border-lumina-border/70">
            <MobileSettingsRow title="Email" detail={email} onClick={() => setMobileSheet("email")} />
            <MobileSettingsRow title="Password & security" detail="Get a secure reset link" onClick={() => setMobileSheet("password")} />
            <MobileSettingsRow title="Other signed-in devices" detail="Keep this device signed in" onClick={() => void signOutOtherDevices()} disabled={signingOutOthers} />
          </div></section>
          <section id="license-verification-mobile" className="mt-7 scroll-mt-24" aria-label="Professional verification"><h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lumina-text-muted">Professional verification</h2><div className="mt-2 border-t border-lumina-border/70"><MobileSettingsRow title="License verification" detail={verification ? professionalVerificationStatusLabels[verification.status] : "Not submitted"} onClick={() => setMobileSheet("verification")} /></div>
            {verification?.status === "rejected" && verification.decision_message && <p className="mt-2 rounded-[14px] bg-lumina-attention-soft p-3 text-[12px] leading-relaxed text-lumina-text-muted">Needs correction: {verification.decision_message}</p>}
          </section>
          <Link href="/dashboard/profile" className="mt-7 inline-flex min-h-10 items-center text-[12px] text-lumina-text-muted underline decoration-lumina-border underline-offset-4">View and edit public profile</Link>
          <button type="button" onClick={() => void signOut()} className="mt-5 min-h-11 w-full border-t border-lumina-border/70 pt-4 text-left text-[13px] text-lumina-text-muted">Sign out</button>
        </>}
      </section>

      <MobileManagementSheet open={mobileSheet === "email"} title="Change email" busy={changingEmail} onClose={() => { setMobileSheet(null); setNewEmail(""); }}>
        <label className="block text-[13px]">New email address<input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[15px] outline-none focus:border-lumina-text-muted" /></label>
        <p className="mt-2 text-[12px] text-lumina-text-muted">Your current email remains active until verification.</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setMobileSheet(null); setNewEmail(""); }} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button><button type="button" onClick={() => void requestEmailChange()} disabled={changingEmail} className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{changingEmail ? "Sending…" : "Send verification"}</button></div>
      </MobileManagementSheet>
      <MobileManagementSheet open={mobileSheet === "password"} title="Password & security" onClose={() => setMobileSheet(null)}>
        <p className="text-[13px] leading-relaxed text-lumina-text-muted">We’ll email a secure link to {email} to change your password.</p>
        <button type="button" onClick={() => void sendPasswordReset()} disabled={sendingPasswordReset || !email} className="mt-5 min-h-11 w-full rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{sendingPasswordReset ? "Sending…" : "Send reset link"}</button>
      </MobileManagementSheet>
      <MobileManagementSheet open={mobileSheet === "verification"} title="License verification" busy={submittingVerification} onClose={closeVerificationEditor}>
        <p className="text-[12px] leading-relaxed text-lumina-text-muted">Submit professional-license details for Lumina review. This does not verify identity, insurance, background, or service quality.</p>
        {verification?.status === "rejected" && verification.decision_message && <p className="mt-3 rounded-[14px] bg-lumina-attention-soft p-3 text-[12px]">Needs correction: {verification.decision_message}</p>}
        <div className="mt-4 space-y-3">
          {([ ["legal_professional_name", "Legal / professional name"], ["license_number", "License number"], ["license_jurisdiction", "License jurisdiction / state"], ["license_type", "License type"], ["business_name", "Business name (optional)"] ] as const).map(([key, label]) => <label key={key} className="block text-[12px] text-lumina-text-muted">{label}<input value={verificationForm[key]} maxLength={key === "license_number" || key === "license_jurisdiction" ? 100 : key === "license_type" ? 120 : 160} autoComplete={key === "license_number" ? "off" : undefined} onChange={(event) => setVerificationForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none focus:border-lumina-text-muted" /></label>)}
        </div>
        {verification?.submitted_at && <p className="mt-3 text-[11px] text-lumina-text-muted">Last submitted {new Date(verification.submitted_at).toLocaleString()}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeVerificationEditor} disabled={submittingVerification} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button><button type="button" onClick={() => void submitLicenseVerification()} disabled={submittingVerification} className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{submittingVerification ? "Submitting…" : onboardingMode ? "Submit and continue" : verification ? "Resubmit for review" : "Submit for review"}</button></div>
      </MobileManagementSheet>

      <section className="mx-auto hidden max-w-2xl px-5 py-10 md:px-10 md:py-14 lg:block">
        {onboardingMode && (
          <ProfessionalOnboardingContext
            step="license"
            title="Submit license verification"
          />
        )}
        <h1
          className="text-[42px] font-semibold leading-[1.02] md:text-[56px]"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Settings &amp; Privacy
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-lumina-text-muted">
          Manage your professional account, security, and visibility.
        </p>

        {loading ? (
          <div className="mt-8 rounded-[22px] bg-lumina-surface-soft p-5 text-[14px] text-lumina-text-muted">
            Loading settings…
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <section className="rounded-[24px] border border-lumina-border p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                Account &amp; security
              </p>

              <div className="mt-5">
                <p className="text-[13px] text-lumina-text-muted">Sign-in email</p>
                <p className="mt-1 text-[15px]">{email}</p>
                <p className="mt-2 text-[12px] text-lumina-text-muted">
                  Used for sign-in and account recovery.
                </p>

                {!showEmailChange ? (
                  <button
                    onClick={() => setShowEmailChange(true)}
                    className="mt-3 text-[13px] font-medium underline decoration-lumina-border underline-offset-4"
                  >
                    Change email
                  </button>
                ) : (
                  <div className="mt-4 rounded-[16px] bg-lumina-surface-soft p-4">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="New email address"
                      className="w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] outline-none transition placeholder:text-lumina-text-muted/75 focus:border-lumina-text-muted/60"
                    />
                    <p className="mt-2 text-[11px] text-lumina-text-muted">
                      Your current email remains active until verification.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowEmailChange(false);
                          setNewEmail("");
                        }}
                        disabled={changingEmail}
                        className="rounded-full border border-lumina-border px-4 py-2 text-[12px] text-lumina-text-muted"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void requestEmailChange()}
                        disabled={changingEmail}
                        className="rounded-full bg-lumina-black px-5 py-2 text-[12px] text-white disabled:bg-lumina-pearl disabled:text-lumina-text-muted"
                      >
                        {changingEmail ? "Sending…" : "Send verification"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-lumina-border pt-5">
                <p className="text-[13px] font-medium">Password</p>
                <p className="mt-1 text-[12px] text-lumina-text-muted">
                  Receive a secure link at your verified email.
                </p>
                <button
                  onClick={() => void sendPasswordReset()}
                  disabled={sendingPasswordReset}
                  className="mt-3 rounded-full border border-lumina-border px-4 py-2 text-[12px] text-lumina-text-muted disabled:opacity-50"
                >
                  {sendingPasswordReset ? "Sending…" : "Change password"}
                </button>
              </div>

              <div className="mt-6 border-t border-lumina-border pt-5">
                <p className="text-[13px] font-medium">Other devices</p>
                <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">End every other Lumina session while keeping this device signed in.</p>
                <button
                  onClick={() => void signOutOtherDevices()}
                  disabled={signingOutOthers}
                  className="mt-3 rounded-full border border-lumina-border px-4 py-2 text-[12px] text-lumina-text-muted disabled:opacity-50"
                >
                  {signingOutOthers ? "Signing out…" : "Sign out of other devices"}
                </button>
              </div>
            </section>

            <section
              id="license-verification-desktop"
              className="scroll-mt-24 rounded-[24px] border border-lumina-border p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                    Professional license verification
                  </p>
                  <p className="mt-2 max-w-[520px] text-[12px] leading-[1.6] text-lumina-text-muted">
                    Submit your professional-license details for manual Lumina
                    review. This does not verify identity, insurance, background,
                    or service quality.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                    verification?.status === "verified"
                      ? "border-lumina-success/25 bg-lumina-success-soft text-lumina-success"
                      : verification?.status === "rejected"
                        ? "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention"
                        : "border-lumina-border bg-lumina-surface-soft text-lumina-text-muted"
                  }`}
                >
                  {verification
                    ? professionalVerificationStatusLabels[verification.status]
                    : "Not submitted"}
                </span>
              </div>

              {verification?.status === "rejected" &&
                verification.decision_message && (
                  <div className="mt-5 rounded-[16px] border border-lumina-attention/30 bg-lumina-attention-soft p-4">
                    <p className="text-[12px] font-medium text-lumina-attention">
                      Needs correction
                    </p>
                    <p className="mt-2 whitespace-pre-line text-[12px] leading-[1.6] text-lumina-text-muted">
                      {verification.decision_message}
                    </p>
                  </div>
                )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    Legal / professional name
                  </span>
                  <input
                    value={verificationForm.legal_professional_name}
                    maxLength={160}
                    onChange={(event) =>
                      setVerificationForm((current) => ({
                        ...current,
                        legal_professional_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    License number
                  </span>
                  <input
                    value={verificationForm.license_number}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(event) =>
                      setVerificationForm((current) => ({
                        ...current,
                        license_number: event.target.value,
                      }))
                    }
                    className="w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    License jurisdiction / state
                  </span>
                  <input
                    value={verificationForm.license_jurisdiction}
                    maxLength={100}
                    onChange={(event) =>
                      setVerificationForm((current) => ({
                        ...current,
                        license_jurisdiction: event.target.value,
                      }))
                    }
                    placeholder="For example, Illinois"
                    className="w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    License type
                  </span>
                  <input
                    value={verificationForm.license_type}
                    maxLength={120}
                    onChange={(event) =>
                      setVerificationForm((current) => ({
                        ...current,
                        license_type: event.target.value,
                      }))
                    }
                    placeholder="For example, Cosmetologist"
                    className="w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    Business name <span className="text-lumina-text-muted">(optional)</span>
                  </span>
                  <input
                    value={verificationForm.business_name}
                    maxLength={160}
                    onChange={(event) =>
                      setVerificationForm((current) => ({
                        ...current,
                        business_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-[14px] border border-lumina-border px-4 py-3 text-[14px] outline-none transition focus:border-lumina-text-muted/50"
                  />
                </label>
              </div>

              {verification?.submitted_at && (
                <p className="mt-4 text-[11px] text-lumina-text-muted">
                  Last submitted {new Date(verification.submitted_at).toLocaleString()}
                </p>
              )}

              <button
                type="button"
                onClick={() => void submitLicenseVerification()}
                disabled={submittingVerification}
                className="mt-5 rounded-full bg-lumina-black px-5 py-2.5 text-[12px] text-white transition hover:bg-lumina-text disabled:opacity-50"
              >
                {submittingVerification
                  ? "Submitting…"
                  : onboardingMode
                    ? "Submit and continue"
                  : verification
                    ? "Resubmit for review"
                    : "Submit for review"}
              </button>
            </section>

            <section className="rounded-[24px] border border-lumina-border p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                Privacy &amp; visibility
              </p>
              <div className="mt-5 flex items-center justify-between gap-5">
                <div>
                  <p className="text-[14px] font-medium">
                    Professional profile visibility
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.5] text-lumina-text-muted">
                    {isVisible
                      ? "Clients can find your profile in browse, search, and map."
                      : activationStatus?.activation_ready
                        ? "Your profile is ready. Turn visibility on when you want clients to discover it."
                        : "Your profile is hidden until every activation requirement is complete, including license verification."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void updateVisibility()}
                  disabled={
                    visibilityLoading ||
                    (!isVisible && !activationStatus?.activation_ready)
                  }
                  aria-pressed={isVisible}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                    isVisible ? "bg-lumina-black" : "bg-lumina-pearl"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-lumina-surface transition ${
                      isVisible ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
              {!isVisible && !activationStatus?.activation_ready && (
                <Link
                  href="/dashboard/onboarding"
                  className="mt-4 inline-flex text-[12px] font-medium underline decoration-lumina-border underline-offset-4"
                >
                  Continue profile setup
                </Link>
              )}
            </section>

            <section className="rounded-[24px] border border-lumina-border p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-lumina-text-muted">
                Professional profile
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-lumina-text-muted">
                Public business details, services, photos, pricing, and booking links are managed separately.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-4 inline-block rounded-full bg-lumina-black px-5 py-2.5 text-[12px] text-white"
              >
                Edit professional profile
              </Link>
            </section>

            <button
              onClick={() => void signOut()}
              className="w-full rounded-[18px] border border-lumina-border px-5 py-4 text-left text-[13px] text-lumina-text-muted transition hover:bg-lumina-surface-soft hover:text-lumina-text"
            >
              Sign out
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
