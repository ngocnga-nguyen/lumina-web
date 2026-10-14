"use client";

import Link from "next/link";
import { ArrowUpRight, EyeOff, Inbox, MessageCircle, Pencil } from "lucide-react";
import ProfessionalActivationPanel from "@/components/ProfessionalActivationPanel";
import IdentityAvatar from "@/components/IdentityAvatar";
import ProfessionalVisibilityConfirmation from "@/components/ProfessionalVisibilityConfirmation";
import { getWorkspaceIndicatorLabel } from "@/components/WorkspaceNavigationIndicator";
import { useProfessionalWorkspace } from "@/components/ProfessionalWorkspaceContext";
import { type ProfessionalActivationStatus, type ProfessionalProfilePanelMode } from "@/lib/professional-activation";
import { getProfessionalWorkspaceNavigation } from "@/lib/workspace-navigation";
import { getProfessionalProfileVisibility } from "@/lib/professional-profile-visibility";
import styles from "./ProfessionalDashboardHome.module.css";

type Artist = {
  id: string;
  name: string;
  category: string;
  availability?: string | null;
  profile_image_url?: string | null;
};

type Service = {
  id: string;
  service_name: string;
  price: number | null;
  duration: string | null;
  description: string | null;
};

type Props = {
  artist: Artist;
  services: Service[];
  portfolioCount: number;
  activationStatus: ProfessionalActivationStatus | null;
  panelMode: ProfessionalProfilePanelMode | null;
  showProfilePanel: boolean;
  profileStatus: string | null;
  activatingProfile: boolean;
  onActivateProfile: () => void;
  onDismissActivePanel: () => void;
  onEditAvatar: () => void;
  onEditCover: () => void;
};

const businessShortcutOrder = ["clients", "services", "portfolio", "reviews"] as const;

// Shared responsive presentation. Data and activation authority remain in the existing route/shell.
export default function ProfessionalDashboardDesktopHome({ artist, services, portfolioCount, activationStatus, showProfilePanel, activatingProfile, onActivateProfile, onEditAvatar, onEditCover }: Props) {
  const { requestActionCount, requestIssueCount, messageUnreadCount } = useProfessionalWorkspace();
  const navigation = getProfessionalWorkspaceNavigation(artist.id);
  const businessShortcuts = businessShortcutOrder.map(id => navigation.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const settingsItem = navigation.find(item => item.id === "settings");
  const visibility = activationStatus ? getProfessionalProfileVisibility(activationStatus.is_active) : null;
  const hasAttention = requestActionCount > 0 || messageUnreadCount > 0;
  return <div className={styles.page}>
    <header className={styles.identity}>
      <button type="button" onClick={onEditAvatar} aria-label="Change profile photo" className={styles.avatarButton}>
        <IdentityAvatar name={artist.name} imageUrl={artist.profile_image_url} className={styles.avatar} fallbackClassName={styles.monogram} />
        <span className={styles.editPhoto}><Pencil size={12} strokeWidth={1.5} aria-hidden="true" /></span>
      </button>
      <div className={styles.identityText}><p className={styles.eyebrow}>Professional workspace</p><h1>{artist.name}</h1><div className={`${styles.meta} ${visibility ? styles.visibilityMeta : ""}`}><span>{artist.category || "Lumina professional"}</span>{visibility && <span className={visibility.isVisible ? styles.live : styles.status}>{visibility.isVisible ? <span className={styles.liveDot} aria-hidden="true" /> : <EyeOff size={13} strokeWidth={1.5} aria-hidden="true" />}{visibility.label}</span>}</div>
      </div>
      <div className={styles.profileActions}><Link href={`/artist/${artist.id}`} className={styles.primary}>View profile <ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" /></Link><Link href="/dashboard/profile" className={styles.secondary}>Edit</Link><button type="button" onClick={onEditCover} className={styles.textAction}><Pencil size={12} strokeWidth={1.7} aria-hidden="true" />Edit cover</button></div>
    </header>
    {visibility && <ProfessionalVisibilityConfirmation artistId={artist.id} isVisible={visibility.isVisible} />}
    {showProfilePanel && activationStatus && !activationStatus.is_active && !activationStatus.activation_ready && <ProfessionalActivationPanel presentation="dashboard" status={activationStatus} onActivate={onActivateProfile} saving={activatingProfile} />}
    <section className={styles.operating} aria-label="Professional workspace overview">
      <div className={styles.operatingHead}><div><p className={styles.eyebrow}>Professional workspace</p><h2>Your business.</h2></div><div className={styles.summary}><Link href="/dashboard/requests"><strong>{requestActionCount}</strong><span>{requestActionCount === 1 ? "request to review" : "requests to review"}</span></Link><Link href="/dashboard/messages"><strong>{messageUnreadCount}</strong><span>unread {messageUnreadCount === 1 ? "message" : "messages"}</span></Link></div></div>
      {/* The Reminder/Today task feed remains mounted only behind the existing route flag.
          No reminder counts, pending-schema queries or synthetic schedule enter this presentation. */}
      {hasAttention && <section className={styles.attention} aria-label="Needs attention">
        <h2>Needs attention</h2>
        {requestActionCount > 0 && <Link href="/dashboard/requests" aria-label={getWorkspaceIndicatorLabel(requestActionCount, "request action", requestIssueCount)} className={styles.attentionRow}><Inbox size={15} strokeWidth={1.5} aria-hidden="true" /><span><small>{requestIssueCount > 0 ? "Action required" : "Request"}</small><strong>{requestActionCount} client {requestActionCount === 1 ? "request" : "requests"} waiting</strong></span><span className={styles.rowAction}>Review</span></Link>}
        {messageUnreadCount > 0 && <Link href="/dashboard/messages" aria-label={getWorkspaceIndicatorLabel(messageUnreadCount, "unread message")} className={styles.attentionRow}><MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" /><span><small>Unread message</small><strong>{messageUnreadCount} client {messageUnreadCount === 1 ? "conversation" : "conversations"}</strong></span><span className={styles.rowAction}>Reply</span></Link>}
      </section>}
    </section>
    <div className={styles.businessGrid}>
      <section aria-label="Manage your business"><h2>Manage your business</h2><div className={styles.manageLinks}>{businessShortcuts.map(item => { const Icon = item.icon; return <Link key={item.id} href={item.href}><Icon size={16} strokeWidth={1.5} aria-hidden="true" /><span>{item.label}</span></Link>; })}{settingsItem && <Link href={settingsItem.href} className={styles.settings}><settingsItem.icon size={16} strokeWidth={1.5} aria-hidden="true" /><span>Business settings</span></Link>}</div></section>
      <aside className={styles.snapshot} aria-label="Business snapshot"><h2>Business snapshot</h2><dl><div><dt>Services</dt><dd>{services.length}</dd></div><div><dt>Portfolio {portfolioCount === 1 ? "result" : "results"}</dt><dd>{portfolioCount}</dd></div></dl><div className={styles.availability}><p className={styles.eyebrow}>Availability</p><p>{artist.availability || "Availability coming soon."}</p><Link href="/dashboard/profile" className={styles.textAction}>Edit availability</Link></div></aside>
    </div>
  </div>;
}
