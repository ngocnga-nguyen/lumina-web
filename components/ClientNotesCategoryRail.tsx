import type { ReactNode } from "react";
import { Pin } from "lucide-react";
import styles from "./LocalClientNoteOrganization.module.css";

// Shared visual rail. Optional category controls are supplied only by the local experiment.
// Production supplies no category tabs or Add control until real persistence exists.
export default function ClientNotesCategoryRail({ view, noteCount, pinnedCount, onViewChange, children }: {
  view: string;
  noteCount: number;
  pinnedCount: number;
  onViewChange: (view: "all" | "pinned") => void;
  children?: ReactNode;
}) {
  return <nav className={styles.rail} aria-label="Note categories">
    <button type="button" className={styles.pin} aria-pressed={view === "pinned"} aria-label={`Pinned notes, ${pinnedCount}`} title="Pinned notes" onClick={() => onViewChange("pinned")}><Pin size={15} strokeWidth={1.5} aria-hidden="true" /></button>
    <button type="button" className={styles.all} aria-pressed={view === "all"} onClick={() => onViewChange("all")}>All <span>{noteCount}</span></button>
    {children}
  </nav>;
}
