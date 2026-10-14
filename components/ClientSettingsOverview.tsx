"use client";

import type { ReactNode } from "react";
import { Camera } from "lucide-react";
import IdentityAvatar from "@/components/IdentityAvatar";
import controls from "./ProfessionalSettingsOverview.module.css";
import styles from "./ClientSettingsOverview.module.css";

type Props = {
  name: string; email: string | null; imageUrl: string;
  profileEditor: ReactNode; emailEditor: ReactNode;
  editing: boolean; showEmailChange: boolean;
  sendingPasswordReset: boolean; signingOutOthers: boolean;
  onEditProfileDesktop: () => void; onEditProfileMobile: () => void;
  onEditEmailDesktop: () => void; onEditEmailMobile: () => void;
  onPasswordDesktop: () => void; onPasswordMobile: () => void;
  onSignOutOthers: () => void; onSignOut: () => void;
};

export default function ClientSettingsOverview(props: Props) {
  const editProfile = () => window.matchMedia("(max-width: 1023px)").matches
    ? props.onEditProfileMobile() : props.onEditProfileDesktop();
  const email = props.email || "Loading…";
  return <div className={styles.page}>
    <header className={styles.header}><h1>Profile &amp; settings</h1><p>Manage your profile and account.</p></header>
    <div className={styles.grid}>
      <section className={styles.profile} aria-label="Client profile and account">
        <h2>Profile &amp; account</h2>
        <div className={`${styles.identity} ${props.editing ? styles.hideDesktop : ""}`}>
          <div className={styles.avatarWrap}>
            <IdentityAvatar name={props.name || props.email || "Client"} imageUrl={props.imageUrl} className={styles.avatar} fallbackClassName={styles.initials} />
            <button type="button" onClick={editProfile} className={styles.photoAction} aria-label="Change profile photo"><span><Camera size={13} strokeWidth={1.5} aria-hidden="true" /></span></button>
          </div>
          <div className={styles.identityText}><p className={styles.name}>{props.name || "Your profile"}</p><p className={styles.email}>{email}</p></div>
        </div>
        <div className={`${styles.profileAction} ${props.editing ? styles.hideDesktop : ""}`}><button type="button" className={controls.action} onClick={editProfile}>Edit profile</button></div>
        {props.editing && <div className={styles.desktopOnly}>{props.profileEditor}</div>}
      </section>
      <section className={styles.security} aria-label="Account and security">
        <h2>Account &amp; security</h2>
        <div className={styles.row}><div className={styles.main}><span className={styles.label}>Email</span><p className={styles.value}>{email}</p></div><button type="button" aria-label="Change email" className={`${controls.action} ${styles.desktopOnly}`} onClick={props.onEditEmailDesktop}>Change</button><button type="button" aria-label="Change email" className={`${controls.action} ${styles.mobileOnly}`} onClick={props.onEditEmailMobile}>Change</button></div>
        {props.showEmailChange && <div className={styles.desktopOnly}>{props.emailEditor}</div>}
        <div className={styles.row}><span className={styles.label}>Password</span><button type="button" aria-label="Change password" disabled={props.sendingPasswordReset || !props.email} className={`${controls.action} ${styles.desktopOnly}`} onClick={props.onPasswordDesktop}>{props.sendingPasswordReset ? "Sending…" : "Change"}</button><button type="button" aria-label="Change password" className={`${controls.action} ${styles.mobileOnly}`} onClick={props.onPasswordMobile}>Change</button></div>
        <div className={styles.row}><span className={styles.label}>Other devices</span><button type="button" disabled={props.signingOutOthers} className={controls.action} onClick={props.onSignOutOthers}>{props.signingOutOthers ? "Signing out…" : "Sign out others"}</button></div>
      </section>
      <section className={styles.account} aria-label="Account"><h2>Account</h2><button type="button" className={`${controls.action} ${controls.signOut}`} onClick={props.onSignOut}>Sign out</button></section>
    </div>
  </div>;
}
