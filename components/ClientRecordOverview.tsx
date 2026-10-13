"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, MessageCircle, MoreHorizontal, Settings2 } from "lucide-react";
import IdentityAvatar from "@/components/IdentityAvatar";
import styles from "./ClientRecordOverview.module.css";
import type { ClientCardSectionId } from "@/lib/client-card-workspace";

type Appointment = { id: string; title: string; date: string; time: string | null; href: string };
type Result = { image: string; title: string; date: string };
type Props = {
  name: string; avatarUrl: string | null; status: string; visits: number;
  messageHref: string | null; requestsHref: string | null;
  appointment: Appointment | null; lastService: { title: string; date: string } | null;
  appointments: ReactNode; nextTime: string; notesHref: string;
  preferences: string; onEditPreferences: () => void; result: Result | null; visibleSections: ClientCardSectionId[];
  renderSection: (section: ClientCardSectionId) => ReactNode;
  privateDetails: ReactNode; workspace: ReactNode; onCustomize: () => void;
};
const tabs = [
  { id: "overview", label: "Overview" }, { id: "appointments", label: "Appointments" },
  { id: "service_history", label: "History" }, { id: "notes", label: "Notes" },
  { id: "results", label: "Photos" }, { id: "preferences", label: "Preferences" },
] as const;
type View = typeof tabs[number]["id"] | "consultation" | "details" | "workspace";

// Presentation only: the route owns all reads, mutations, privacy and workspace preferences.
export default function ClientRecordOverview(props: Props) {
  const [requestedView, setView] = useState<View>("overview");
  const visibleTabs = tabs.filter(t => t.id === "overview" || t.id === "appointments" || props.visibleSections.includes(t.id));
  const view = requestedView === "details" || requestedView === "workspace" || requestedView === "overview" || requestedView === "appointments" || props.visibleSections.includes(requestedView) ? requestedView : "overview";
  const openView = (next: View) => setView(next);
  const showNotes = props.visibleSections.includes("notes");
  const showPreferences = props.visibleSections.includes("preferences");
  const showResults = props.visibleSections.includes("results");
  const preferences = props.preferences.split(/\n|·/).map(p => p.trim()).filter(Boolean);
  return <div className={styles.page}>
    <Link href="/dashboard/clients" className={styles.textAction}><ArrowLeft size={15} aria-hidden="true" />Back to clients</Link>
    <header className={styles.header}>
      <div className={styles.identity}>
        <IdentityAvatar name={props.name} imageUrl={props.avatarUrl} className={styles.avatar} />
        <div><h1>{props.name}</h1><p>{props.status} <span aria-hidden="true">·</span> {props.visits} {props.visits === 1 ? "visit" : "visits"}</p></div>
      </div>
      <div className={styles.dock} role="group" aria-label="Client actions">
        {props.messageHref && <Link href={props.messageHref} className={styles.primary}><MessageCircle size={15} aria-hidden="true" />Message</Link>}
        {props.requestsHref && <Link href={props.requestsHref} className={styles.utility}><Inbox size={14} aria-hidden="true" />Requests</Link>}
        <details className={styles.more}><summary aria-label="More client actions"><MoreHorizontal size={18} aria-hidden="true" /></summary>
          <div className={styles.menu} onClick={event => { if ((event.target as HTMLElement).closest("button")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
            <button type="button" onClick={() => openView("details")}>Client details & tags</button>
            {props.visibleSections.includes("consultation") && <button type="button" onClick={() => openView("consultation")}>Consultation</button>}
            <button type="button" onClick={() => openView("workspace")}>Workspace modules</button>
            <button type="button" onClick={props.onCustomize}><Settings2 size={14} aria-hidden="true" />Customize workspace</button>
          </div>
        </details>
      </div>
    </header>
    <nav className={styles.tabs} role="tablist" aria-label="Client detail views">
      {visibleTabs.map((t, index) => <button key={t.id} id={`client-tab-${t.id}`} type="button" role="tab" aria-selected={view === t.id} aria-controls="client-record-panel" tabIndex={view === t.id || (!visibleTabs.some(tab => tab.id === view) && index === 0) ? 0 : -1} onClick={() => openView(t.id)} onKeyDown={event => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % visibleTabs.length;
        else if (event.key === "ArrowLeft") next = (index + visibleTabs.length - 1) % visibleTabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = visibleTabs.length - 1;
        else return;
        event.preventDefault(); openView(visibleTabs[next].id);
        (event.currentTarget.parentElement?.querySelectorAll("button")[next] as HTMLButtonElement)?.focus();
      }}>{t.label}</button>)}
    </nav>
    <div id="client-record-panel" role={visibleTabs.some(t => t.id === view) ? "tabpanel" : "region"} aria-labelledby={visibleTabs.some(t => t.id === view) ? `client-tab-${view}` : undefined} aria-label={view === "details" ? "Client details" : view === "workspace" ? "Workspace modules" : undefined}>
      {view === "overview" ? <>
        <div className={styles.glance}>
          <section><p className={styles.eyebrow}>Next appointment</p>
            {props.appointment ? <div className={styles.appointment}><h2>{props.appointment.date}{props.appointment.time ? ` · ${props.appointment.time}` : ""}</h2><p>{props.appointment.title}</p><span className={styles.success}>Confirmed</span><Link className={styles.textAction} href={props.appointment.href}>View appointment</Link></div> : <p className={styles.empty}>None scheduled.</p>}
          </section>
          <section className={styles.last}><p className={styles.eyebrow}>Last service</p>{props.lastService ? <><h2>{props.lastService.title}</h2><p>{props.lastService.date}</p><span className={styles.success}>Completed</span></> : <p className={styles.empty}>No completed visits yet.</p>}</section>
        </div>
        {/* Reminder-dependent attention/Complete controls stay in the existing Notes flow.
            This Overview does not mount the pending Step 8.8B task feed or require its schema. */}
        <div className={styles.context}>
          {showNotes && <section><SectionHead title="Next time" action={<Link href={props.notesHref} className={styles.textAction}>View notes</Link>} /><p className={styles.note}>{props.nextTime || "No private notes yet."}</p></section>}
          <div>
            {showPreferences && <section><SectionHead title="Preferences" action={<button type="button" className={styles.textAction} onClick={() => { props.onEditPreferences(); openView("preferences"); }}>Edit</button>} /><div className={styles.preferences}>{preferences.length ? preferences.map((p,i) => <span key={`${i}-${p}`}>{p}</span>) : <p className={styles.empty}>No service preferences saved yet.</p>}</div></section>}
            {showResults && <section className={styles.results}><SectionHead title="Results" action={<button type="button" className={styles.textAction} onClick={() => openView("results")}>View all</button>} />{props.result ? <button type="button" className={styles.result} onClick={() => openView("results")}><img src={props.result.image} alt={props.result.title} /><span><strong>{props.result.title}</strong><span>{props.result.date}</span></span></button> : <p className={styles.empty}>No results linked yet.</p>}</section>}
          </div>
        </div>
      </> : view === "appointments" ? props.appointments : view === "details" ? props.privateDetails : view === "workspace" ? props.workspace : props.renderSection(view)}
      {view !== "overview" && <button type="button" className={styles.textAction} onClick={() => openView("overview")}>Back to overview</button>}
    </div>
  </div>;
}
function SectionHead({ title, action }: { title: string; action: ReactNode }) { return <div className={styles.sectionHead}><h2>{title}</h2>{action}</div>; }
