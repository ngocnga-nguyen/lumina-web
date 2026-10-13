"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import WorkspaceLoadError from "@/components/WorkspaceLoadError";
import { getProfessionalProfileVisibility } from "@/lib/professional-profile-visibility";
import { professionalVerificationStatusLabels, type ProfessionalLicenseVerification } from "@/lib/professional-license-verification";
import styles from "./ProfessionalSettingsOverview.module.css";

type Props = {
  email: string;
  loading: boolean;
  loadError: boolean;
  isVisible: boolean;
  activationReady: boolean;
  visibilityLoading: boolean;
  sendingPasswordReset: boolean;
  signingOutOthers: boolean;
  verification: ProfessionalLicenseVerification | null;
  onboardingMode: boolean;
  onboardingContext?: ReactNode;
  desktopEmailEditor?: ReactNode;
  desktopLicenseEditor: ReactNode;
  onRetry: () => void;
  onToggleVisibility: () => void;
  onEditEmailMobile: () => void;
  onEditEmailDesktop: () => void;
  onPasswordMobile: () => void;
  onPasswordDesktop: () => void;
  onEditLicenseMobile: () => void;
  onSignOutOthers: () => void;
  onSignOut: () => void;
};

// Presentation only. The Settings route owns all account state, forms and actions.
export default function ProfessionalSettingsOverview(props: Props) {
  const { email, loading, loadError, isVisible, activationReady, visibilityLoading, sendingPasswordReset, signingOutOthers, verification, onboardingMode } = props;
  const visibility = getProfessionalProfileVisibility(isVisible);
  const licenseLabel = verification?.status === "verified" ? "Verified" : verification ? professionalVerificationStatusLabels[verification.status] : "Unverified";
  const licenseStatus = <span className={[styles.licenseStatus, verification?.status === "verified" ? styles.verified : ""].join(" ")}>{licenseLabel}</span>;
  const licenseAction = verification ? "Edit license" : "Add license";
  return <section className={styles.page} aria-label="Professional settings">
    {props.onboardingContext}
    <header className={styles.header}><h1>Settings</h1><p>Manage your profile, security, and verification.</p></header>
    {loading ? <p className={styles.loading}>Loading settings…</p> : loadError ? <WorkspaceLoadError message="Settings couldn’t be loaded. Please try again." onRetry={props.onRetry} /> : <div className={styles.grid}>
      <section className={styles.profile} aria-labelledby="settings-profile-heading">
        <h2 id="settings-profile-heading">Profile &amp; visibility</h2>
        <div className={styles.row}>
          <div className={styles.main}><div className={styles.labelLine}><span className={styles.label}>Profile visibility</span><span className={styles.visibilityStatus} title={visibility.title}>{isVisible ? <span className={styles.sageDot} aria-hidden="true" /> : <EyeOff size={13} strokeWidth={1.5} aria-hidden="true" />}{visibility.label}</span></div><p className={styles.value}>{isVisible ? "Clients can discover you on Lumina." : "Your profile is hidden from client discovery."}</p></div>
          <button type="button" className={styles.toggle} onClick={props.onToggleVisibility} disabled={visibilityLoading || (!isVisible && !activationReady)} aria-label="Professional profile visibility" aria-pressed={isVisible}><span className={[styles.toggleTrack, isVisible ? styles.toggleOn : ""].join(" ")}><span /></span></button>
        </div>
        {!isVisible && !activationReady && <Link href="/dashboard/onboarding" className={styles.action}>Continue profile setup</Link>}
        <div className={styles.row}><span className={styles.label}>Professional profile</span><Link href="/dashboard/profile" className={styles.action}>Edit profile</Link></div>
        <details className={styles.explanation}><summary>About visibility</summary><p>Visibility only controls client discovery. Your professional account and workspace remain available.</p></details>
      </section>
      <section className={styles.security} aria-labelledby="settings-security-heading">
        <h2 id="settings-security-heading">Account &amp; security</h2>
        <div className={styles.row}><div className={styles.main}><span className={styles.label}>Email</span><p className={styles.value}>{email}</p></div><button type="button" className={[styles.action, styles.mobileOnly].join(" ")} aria-label="Change email" onClick={props.onEditEmailMobile}>Change</button><button type="button" className={[styles.action, styles.desktopOnly].join(" ")} aria-label="Change email" onClick={props.onEditEmailDesktop}>Change</button></div>
        {props.desktopEmailEditor && <div className={styles.desktopOnly}>{props.desktopEmailEditor}</div>}
        <div className={styles.row}><span className={styles.label}>Password</span><button type="button" className={[styles.action, styles.mobileOnly].join(" ")} aria-label="Change password" onClick={props.onPasswordMobile}>Change</button><button type="button" className={[styles.action, styles.desktopOnly].join(" ")} aria-label="Change password" onClick={props.onPasswordDesktop} disabled={sendingPasswordReset}>{sendingPasswordReset ? "Sending…" : "Change"}</button></div>
        <div className={styles.row}><span className={styles.label}>Other devices</span><button type="button" className={styles.action} onClick={props.onSignOutOthers} disabled={signingOutOthers}>{signingOutOthers ? "Signing out…" : "Sign out others"}</button></div>
      </section>
      <section className={styles.verification} aria-labelledby="settings-verification-heading">
        <h2 id="settings-verification-heading">Professional verification</h2>
        <div id="license-verification-mobile" className={styles.mobileOnly}><div className={styles.row}><div className={styles.labelLine}><span className={styles.label}>Professional license</span>{licenseStatus}</div><button type="button" className={styles.action} aria-label={verification ? "Edit license information" : "Add license information"} onClick={props.onEditLicenseMobile}>{licenseAction}</button></div></div>
        <div id="license-verification-desktop" className={styles.desktopOnly}><details key={verification?.submitted_at || "not-submitted"} open={onboardingMode || undefined} className={styles.licenseEditor}><summary className={styles.row}><span className={styles.labelLine}><span className={styles.label}>Professional license</span>{licenseStatus}</span><span className={styles.action}>{licenseAction}</span></summary>{verification?.status === "rejected" && verification.decision_message && <p className={styles.reviewNote}>Needs correction: {verification.decision_message}</p>}{props.desktopLicenseEditor}</details></div>
        {verification?.status === "pending" && <p className={styles.note}>Submitted for Lumina review.</p>}
        {verification?.status === "rejected" && <p className={styles.note}>Review the requested corrections in your license information.</p>}
        <details className={styles.explanation}><summary>About license verification</summary><p>Lumina reviews professional-license details. This does not verify identity, insurance, background, or service quality.</p></details>
      </section>
      <section className={styles.account} aria-labelledby="settings-account-heading"><h2 id="settings-account-heading">Account</h2><div className={styles.row}><button type="button" className={[styles.action, styles.signOut].join(" ")} onClick={props.onSignOut}>Sign out</button></div></section>
    </div>}
  </section>;
}
