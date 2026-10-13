import type { ReactNode } from "react";
import styles from "./ClientNotesQuietChrome.module.css";

// Presentation only; the route retains the existing type picker and note actions.
export default function ClientNotesWorkspaceHeader({ clientName, noteCount, newNoteControl }: {
  clientName: string; noteCount: number; newNoteControl: ReactNode;
}) {
  return <header data-notes-header className={styles.workspaceHeader}>
    <div className={styles.headerIdentity}>
      <p className={styles.headerEyebrow}>Private notes workspace</p>
      <div className={styles.headerTitle}><h1>{clientName}</h1><span>{noteCount} {noteCount === 1 ? "note" : "notes"}</span></div>
      <p className={styles.headerContext}>Private service context for future visits.</p>
    </div>
    <div className={styles.headerActions}>{newNoteControl}</div>
  </header>;
}
