"use client";

import { loadWorkspaceUser, runWorkspaceLoad } from "@/lib/workspace-load-recovery";

import { queueVisibilityConfirmation } from "@/lib/profile-visibility-confirmation";
import { useProfessionalReadiness } from "@/components/ProfessionalReadinessProvider";
import { useEffect, useRef, useState } from "react";
import { useProfessionalActionTarget } from "@/lib/use-professional-action-target";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProfessionalOnboardingContext from "@/components/ProfessionalOnboardingContext";
import MobileManagementSheet from "@/components/MobileManagementSheet";
import ProfessionalSettingsOverview from "@/components/ProfessionalSettingsOverview";
import {
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
  const { status: activationStatus, verification, refresh: refreshReadiness } = useProfessionalReadiness();
  const isVisible = Boolean(activationStatus?.is_active);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [verificationForm, setVerificationForm] = useState(
    emptyVerificationForm
  );
  const [savedVerificationForm, setSavedVerificationForm] = useState(emptyVerificationForm);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const savedFormRef = useRef(emptyVerificationForm);
  const [onboardingMode, setOnboardingMode] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"email" | "password" | "verification" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      setLoadError(false);
      const user = await loadWorkspaceUser(() => supabase.auth.getUser());
      if (cancelled) return;

      if (!user) {
        router.push("/login");
        return;
      }

      const isLicenseOnboarding = new URLSearchParams(window.location.search).get("onboarding") === "license";
      setOnboardingMode(isLicenseOnboarding);
      if (isLicenseOnboarding) setMobileSheet("verification");

      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .select("is_active, name")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (artistError) throw artistError;
      if (!artist) {
        router.push("/account");
        return;
      }

      setEmail(user.email || "");
      const nextVerificationForm = {
        ...emptyVerificationForm,
        legal_professional_name: user.user_metadata?.full_name || artist.name || "",
        business_name: user.user_metadata?.business_name || "",
      };
      savedFormRef.current = nextVerificationForm;
      setVerificationForm(nextVerificationForm);
      setSavedVerificationForm(nextVerificationForm);

    };

    void runWorkspaceLoad(loadSettings, {
      isCurrent: () => !cancelled,
      onError: (error) => {
        console.error("Settings load failed:", error);
        setLoadError(true);
      },
      onSettled: () => setLoading(false),
    });
    return () => { cancelled = true; };
  }, [router, loadAttempt]);

  useEffect(() => {
    if (loading || !verification) return;
    const next = {
      legal_professional_name: verification.legal_professional_name,
      license_number: verification.license_number,
      license_jurisdiction: verification.license_jurisdiction,
      license_type: verification.license_type,
      business_name: verification.business_name || "",
    };
    const previous = savedFormRef.current;
    // Status refreshes must not erase license details currently being edited.
    setVerificationForm((draft) => JSON.stringify(draft) === JSON.stringify(previous) ? next : draft);
    savedFormRef.current = next;
    setSavedVerificationForm(next);
  }, [verification, loading]);

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

  useProfessionalActionTarget("settings", !loading, () => {
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileSheet("verification");
  });

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

    const { error } = await setProfessionalProfileVisibility(
      nextVisibility
    );

    setVisibilityLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshReadiness();
    queueVisibilityConfirmation(user.id, nextVisibility);
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
        "Resubmitting changed license information will return your verification to Pending review and hide your public profile until verification is approved and you explicitly choose Go live again. Continue?"
      )
    ) {
      return;
    }

    setSubmittingVerification(true);
    const { error } = await supabase.rpc(
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

    const nextVerificationForm = {
      legal_professional_name: legalName,
      license_number: licenseNumber,
      license_jurisdiction: jurisdiction,
      license_type: licenseType,
      business_name: businessName,
    };
    setVerificationForm(nextVerificationForm);
    setSavedVerificationForm(nextVerificationForm);
    savedFormRef.current = nextVerificationForm;
    setMobileSheet(null);
    await refreshReadiness();

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
      <ProfessionalSettingsOverview
        email={email}
        loading={loading}
        loadError={loadError}
        isVisible={isVisible}
        activationReady={Boolean(activationStatus?.activation_ready)}
        visibilityLoading={visibilityLoading}
        sendingPasswordReset={sendingPasswordReset}
        signingOutOthers={signingOutOthers}
        verification={verification}
        onboardingMode={onboardingMode}
        onboardingContext={onboardingMode && <ProfessionalOnboardingContext step="license" title="Submit license verification" />}
        onRetry={() => setLoadAttempt((current) => current + 1)}
        onToggleVisibility={() => void updateVisibility()}
        onEditEmailMobile={() => setMobileSheet("email")}
        onEditEmailDesktop={() => setShowEmailChange(true)}
        onPasswordMobile={() => setMobileSheet("password")}
        onPasswordDesktop={() => void sendPasswordReset()}
        onEditLicenseMobile={() => setMobileSheet("verification")}
        onSignOutOthers={() => void signOutOtherDevices()}
        onSignOut={() => void signOut()}
        desktopEmailEditor={showEmailChange && (
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
        desktopLicenseEditor={<>
                <p className="mt-3 text-[12px] text-lumina-text-muted">License details are separate from your public professional name and business profile.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-[12px] text-lumina-text-muted">
                    Legal / professional name
                  </span>
                  <input
                    data-professional-focus="license"
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

        </>}
      />
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
          {([ ["legal_professional_name", "Legal / professional name"], ["license_number", "License number"], ["license_jurisdiction", "License jurisdiction / state"], ["license_type", "License type"], ["business_name", "Business name (optional)"] ] as const).map(([key, label]) => <label key={key} className="block text-[12px] text-lumina-text-muted">{label}<input data-professional-focus={key === "legal_professional_name" ? "license" : undefined} value={verificationForm[key]} maxLength={key === "license_number" || key === "license_jurisdiction" ? 100 : key === "license_type" ? 120 : 160} autoComplete={key === "license_number" ? "off" : undefined} onChange={(event) => setVerificationForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-[14px] border border-lumina-border bg-lumina-surface px-4 py-3 text-[14px] text-lumina-text outline-none focus:border-lumina-text-muted" /></label>)}
        </div>
        {verification?.submitted_at && <p className="mt-3 text-[11px] text-lumina-text-muted">Last submitted {new Date(verification.submitted_at).toLocaleString()}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeVerificationEditor} disabled={submittingVerification} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px]">Cancel</button><button type="button" onClick={() => void submitLicenseVerification()} disabled={submittingVerification} className="min-h-11 rounded-full bg-lumina-black px-5 text-[13px] text-white disabled:opacity-50">{submittingVerification ? "Submitting…" : onboardingMode ? "Submit and continue" : verification ? "Resubmit for review" : "Submit for review"}</button></div>
      </MobileManagementSheet>

    </div>
  );
}
