"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Pin, Plus } from "lucide-react";
import { sortClientNotes, type ClientNote } from "@/lib/client-notes";
import { LOCAL_NOTE_CATEGORY_EXAMPLES, filterLocalCategoryNotes, validateLocalCategoryName, type LocalNoteCategory } from "@/lib/local-note-organization";
import styles from "./LocalClientNoteOrganization.module.css";

// Development-only organization experiment. No storage, network, persistence, or plan logic.
// Note purpose/type, editor, attachment handling and existing pin mutations stay with the route.
export default function LocalClientNoteOrganization({ notes, renderNotes, initialCategories = LOCAL_NOTE_CATEGORY_EXAMPLES, initialAssignments = {} }: {
  notes: ClientNote[];
  renderNotes: (notes: ClientNote[], categoryControl: (note: ClientNote) => ReactNode) => ReactNode;
  initialCategories?: LocalNoteCategory[];
  initialAssignments?: Record<string, string>;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [view, setView] = useState("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [edges, setEdges] = useState({ before: false, after: false });
  const railRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const updateEdges = () => setEdges({ before: rail.scrollLeft > 2, after: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2 });
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    rail.addEventListener("scroll", updateEdges, { passive: true });
    return () => { observer.disconnect(); rail.removeEventListener("scroll", updateEdges); };
  }, [categories.length]);
  if (process.env.NODE_ENV !== "development") return null;

  const matching = sortClientNotes(filterLocalCategoryNotes(notes, view, assignments));
  const pinned = view === "all" ? matching.filter(note => note.is_pinned) : [];
  const remaining = view === "all" ? matching.filter(note => !note.is_pinned) : matching;
  const viewName = view === "all" ? "All notes" : view === "pinned" ? "Pinned notes" : categories.find(category => category.id === view)?.name;
  const closeAdd = () => { setAdding(false); setName(""); setError(""); addRef.current?.focus(); };
  const categoryControl = (note: ClientNote) => <label className={styles.categoryControl}>
    <span className="sr-only">Category for {note.title || "untitled note"} (local preview)</span>
    <select value={assignments[note.id] || ""} onChange={event => {
      setAssignments(current => ({ ...current, [note.id]: event.target.value }));
      setAnnouncement("Category changed for this local preview only.");
    }}>
      <option value="">Uncategorized</option>
      {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select><ChevronDown size={11} aria-hidden="true" />
  </label>;
  return <div className={styles.organization}>
    <nav className={styles.rail} aria-label="Note categories">
      <button type="button" className={styles.all} aria-pressed={view === "all"} onClick={() => setView("all")}>All <span>{notes.length}</span></button>
      <button type="button" className={styles.pin} aria-pressed={view === "pinned"} aria-label={`Pinned notes, ${notes.filter(note => note.is_pinned).length}`} title="Pinned notes" onClick={() => setView("pinned")}><Pin size={15} strokeWidth={1.5} aria-hidden="true" /></button>
      <div ref={railRef} data-more-left={edges.before} data-more-right={edges.after} className={styles.categoryRail} tabIndex={0} role="group" aria-label="Custom categories; scroll horizontally for more">
        {categories.map(category => <button key={category.id} type="button" aria-pressed={view === category.id} onClick={() => setView(category.id)}>{category.name}</button>)}
      </div>
      <button ref={addRef} type="button" className={styles.add} aria-label="Add category" title="Add category" aria-expanded={adding} aria-controls="local-category-form" onClick={() => { setAdding(value => !value); setError(""); }}><Plus size={18} aria-hidden="true" /></button>
    </nav>
    <p className={styles.localHint}>Local category preview · resets when you leave.</p>
    {adding && <form id="local-category-form" className={styles.addForm} onSubmit={event => {
      event.preventDefault();
      const result = validateLocalCategoryName(name, categories);
      if (result.error) { setError(result.error); return; }
      // This is the single category-creation boundary for any future plan limit; none applies now.
      setCategories(current => [...current, { id: `local-${crypto.randomUUID()}`, name: result.name }]);
      setAnnouncement(`Added ${result.name} for this local preview only.`);
      closeAdd();
    }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeAdd(); } }}>
      <label>Category name<input ref={inputRef} value={name} maxLength={40} onChange={event => { setName(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "local-category-error" : undefined} /></label>
      <div><button type="submit">Add category</button><button type="button" onClick={closeAdd}>Cancel</button></div>
      {error && <p id="local-category-error" role="alert">{error}</p>}
    </form>}
    <span role="status" className="sr-only">{announcement}</span>
    <div className={styles.notes}>
      {pinned.length > 0 && <section><h2><Pin size={13} strokeWidth={1.5} aria-hidden="true" />Pinned notes</h2>{renderNotes(pinned, categoryControl)}</section>}
      {remaining.length > 0 && <section><h2>{view === "pinned" && <Pin size={13} strokeWidth={1.5} aria-hidden="true" />}{viewName}</h2>{renderNotes(remaining, categoryControl)}</section>}
      {matching.length === 0 && <section className={styles.empty}><h2>{view === "all" ? "No notes yet" : view === "pinned" ? "No pinned notes yet" : `No notes in ${viewName}`}</h2><p>{notes.length === 0 ? "Choose New note to keep private context for future visits." : view === "pinned" ? "Pin an existing note to keep it close at hand." : "Choose a category on a note in All to try organizing it locally."}</p>{view !== "all" && <button type="button" onClick={() => setView("all")}>View all notes</button>}</section>}
    </div>
  </div>;
}
