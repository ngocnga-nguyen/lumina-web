// DEVELOPMENT VISUAL PROTOTYPE ONLY. Categories and assignments live in React memory.
// These are private organization examples, never database note_type values or saved fields.
// Aftercare belongs to a future client-facing feature, not private Notes category examples.
export type LocalNoteCategory = { id: string; name: string };
export const LOCAL_NOTE_CATEGORY_EXAMPLES: LocalNoteCategory[] = [
  { id: "local-retention", name: "Retention" },
  { id: "local-ideas", name: "Ideas" },
  { id: "local-preferences", name: "Client preferences" },
  { id: "local-color", name: "Color formulas" },
];
export type LocalNoteView = "all" | "pinned" | string;
export function validateLocalCategoryName(value: string, categories: LocalNoteCategory[]) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return { name, error: "Enter a category name." };
  if (name.length > 40) return { name, error: "Use 40 characters or fewer." };
  if (["all", "pinned", ...categories.map(category => category.name)].some(label => label.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return { name, error: "That name is already in use." };
  }
  return { name, error: "" };
}
export function filterLocalCategoryNotes<T extends { id: string; is_pinned: boolean }>(
  notes: T[], view: LocalNoteView, assignments: Record<string, string>,
): T[] {
  if (view === "all") return notes;
  if (view === "pinned") return notes.filter(note => note.is_pinned);
  return notes.filter(note => assignments[note.id] === view);
}
