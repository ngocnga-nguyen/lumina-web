"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, NotebookPen, Plus, X } from "lucide-react";
import ClientNoteCard from "@/components/ClientNoteCard";
import ClientNoteEditor, { type ClientNoteDraft } from "@/components/ClientNoteEditor";
import {
  CLIENT_NOTE_IMAGE_BUCKET,
  CLIENT_NOTE_TYPES,
  CLIENT_NOTE_TYPE_LABELS,
  type ClientNote,
  type ClientNoteAttachment,
  type ClientNoteType,
  getClientNoteImageExtension,
  getClientNoteReminderTransition,
  isClientNoteType,
  sortClientNotes,
} from "@/lib/client-notes";
import { attachSignedClientNoteImageUrls } from "@/lib/client-note-images";
import { formatRequestServiceSummary } from "@/lib/request-services";
import { supabase } from "@/lib/supabase";

type NoteRequest = {
  id: string;
  client_name: string | null;
  service_requested: string | null;
  requested_services: unknown;
  preferred_date: string | null;
  proposed_date: string | null;
  scheduled_for: string | null;
  created_at: string;
};

type Filter = "all" | "pinned" | ClientNoteType;

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
  ...CLIENT_NOTE_TYPES.map((type) => ({ value: type, label: CLIENT_NOTE_TYPE_LABELS[type] })),
];

const NOTE_SELECT = "id, artist_id, client_id, client_card_id, request_id, note_type, title, body, is_pinned, reminder_due_on, reminder_due_time, reminder_completed_at, created_at, updated_at";
const ATTACHMENT_SELECT = "id, note_id, storage_path, caption, sort_order, created_at";

const NOTE_CREATION_COPY: Record<ClientNoteType, { action: string; emptyTitle: string; emptyCopy: string }> = {
  general: {
    action: "Add general note",
    emptyTitle: "No general notes yet",
    emptyCopy: "Keep useful client context and details for future visits.",
  },
  service_note: {
    action: "Add service note",
    emptyTitle: "No service notes yet",
    emptyCopy: "Record service details and optionally connect them to a request or appointment.",
  },
  follow_up: {
    action: "Add follow-up",
    emptyTitle: "No follow-ups yet",
    emptyCopy: "Keep track of context you want to revisit with this client.",
  },
  inspiration: {
    action: "Add inspiration",
    emptyTitle: "No inspiration saved yet",
    emptyCopy: "Add reference photos, ideas, or visual notes for this client.",
  },
  aftercare: {
    action: "Add aftercare note",
    emptyTitle: "No aftercare notes yet",
    emptyCopy: "Keep aftercare guidance and service-specific details easy to reference.",
  },
  reminder: {
    action: "Add reminder",
    emptyTitle: "No reminders yet",
    emptyCopy: "Keep track of follow-ups or things to remember for future visits.",
  },
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRequestLabel(request: NoteRequest) {
  const services = formatRequestServiceSummary(request) || "Service request";
  const date = request.scheduled_for || request.proposed_date || request.preferred_date || request.created_at;
  return `${services} · ${formatDate(date)}`;
}

function getCreationActionSizing(noteType: ClientNoteType) {
  return noteType === "inspiration" ? "min-h-11 gap-2.5 px-6" : "min-h-10 gap-2 px-4";
}

export default function ClientNotesWorkspacePage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const [artistId, setArtistId] = useState<string | null>(null);
  const [clientCardId, setClientCardId] = useState<string | null>(null);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("Lumina client");
  const [requests, setRequests] = useState<NoteRequest[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [attachmentsByNote, setAttachmentsByNote] = useState<Record<string, ClientNoteAttachment[]>>({});
  const [reminderNow, setReminderNow] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [newNoteType, setNewNoteType] = useState<ClientNoteType>("general");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<ClientNote | null>(null);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const mobileTypePickerRef = useRef<HTMLDivElement>(null);
  const newNoteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      setLoading(true);
      setErrorMessage("");
      setUnavailable(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(`/dashboard/clients/${clientId}/notes`)}`);
        return;
      }

      const { data: cardData, error: cardError } = await supabase
        .from("artist_client_cards")
        .select("id, client_id, source, manual_name")
        .eq("artist_id", user.id)
        .or(`id.eq.${clientId},client_id.eq.${clientId}`)
        .maybeSingle();

      if (cancelled) return;
      if (cardError) {
        setErrorMessage("We couldn't load this client relationship. Please try again.");
        setLoading(false);
        return;
      }
      if (!cardData) {
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const card = cardData as { id: string; client_id: string | null; source: "lumina_request" | "manual"; manual_name: string | null };
      const requestResponse = card.client_id
        ? await supabase
            .from("client_requests")
            .select("id, client_name, service_requested, requested_services, preferred_date, proposed_date, scheduled_for, created_at")
            .eq("artist_id", user.id)
            .eq("client_id", card.client_id)
            .order("created_at", { ascending: false })
        : { data: [], error: null };
      if (cancelled) return;
      if (requestResponse.error) {
        setErrorMessage("We couldn't load this client relationship. Please try again.");
        setLoading(false);
        return;
      }
      const relatedRequests = (requestResponse.data || []) as NoteRequest[];

      const [{ data: profileData }, { data: noteData, error: notesError }] = await Promise.all([
        card.client_id
          ? supabase.from("profiles").select("full_name").eq("id", card.client_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from("artist_client_notes").select(NOTE_SELECT).eq("client_card_id", card.id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (notesError) {
        console.error("Client Notes load failed:", notesError);
        setErrorMessage("We couldn't load the private notes workspace. Please try again.");
        setLoading(false);
        return;
      }

      const loadedNotes = sortClientNotes((noteData || []) as ClientNote[]);
      let loadedAttachments: ClientNoteAttachment[] = [];
      if (loadedNotes.length > 0) {
        const { data: attachmentData, error: attachmentError } = await supabase
          .from("artist_client_note_attachments")
          .select(ATTACHMENT_SELECT)
          .in("note_id", loadedNotes.map((note) => note.id))
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        if (attachmentError) {
          console.error("Client Note attachment load failed:", attachmentError);
          setErrorMessage("The notes loaded, but private reference images are temporarily unavailable.");
        } else {
          loadedAttachments = await attachSignedClientNoteImageUrls((attachmentData || []) as ClientNoteAttachment[]);
        }
      }
      const profileName = typeof profileData?.full_name === "string" ? profileData.full_name.trim() : "";
      const fallbackName = relatedRequests.find((request) => request.client_name?.trim())?.client_name?.trim();

      setArtistId(user.id);
      setClientCardId(card.id);
      setLinkedClientId(card.client_id);
      setRequests(relatedRequests);
      setNotes(loadedNotes);
      setAttachmentsByNote(loadedAttachments.reduce<Record<string, ClientNoteAttachment[]>>((grouped, attachment) => {
        (grouped[attachment.note_id] ||= []).push(attachment);
        return grouped;
      }, {}));
      setClientName(profileName || card.manual_name?.trim() || fallbackName || "Lumina client");
      setLoading(false);

      const query = new URLSearchParams(window.location.search);
      const editId = query.get("edit");
      const requestedNewType = query.get("new");
      if (isClientNoteType(requestedNewType)) {
        setNewNoteType(requestedNewType);
        setEditingNote(null);
        setEditorOpen(true);
      } else if (requestedNewType === "1") {
        setTypePickerOpen(true);
      } else if (editId) {
        const requestedNote = loadedNotes.find((note) => note.id === editId);
        if (requestedNote) {
          setEditingNote(requestedNote);
          setEditorOpen(true);
        }
      }
    };

    if (clientId) void loadNotes();
    return () => { cancelled = true; };
  }, [clientId, router]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        typePickerRef.current && !typePickerRef.current.contains(target)
        && (!mobileTypePickerRef.current || !mobileTypePickerRef.current.contains(target))
      ) setTypePickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && typePickerOpen) {
        setTypePickerOpen(false);
        newNoteButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [typePickerOpen]);

  useEffect(() => {
    if (!typePickerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const menu = window.matchMedia("(min-width: 640px)").matches
        ? typePickerRef.current?.querySelector<HTMLElement>('[role="menu"]')
        : mobileTypePickerRef.current;
      menu?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [typePickerOpen]);

  useEffect(() => {
    const refreshNow = () => setReminderNow(new Date());
    const handleVisibility = () => { if (document.visibilityState === "visible") refreshNow(); };
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", handleVisibility);

    const now = new Date();
    const nextTransition = notes
      .map((note) => getClientNoteReminderTransition(note, now)?.getTime() || Number.POSITIVE_INFINITY)
      .reduce((nearest, value) => Math.min(nearest, value), Number.POSITIVE_INFINITY);
    const timeout = Number.isFinite(nextTransition)
      ? window.setTimeout(refreshNow, Math.min(Math.max(nextTransition - now.getTime() + 250, 250), 2_147_000_000))
      : null;

    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [notes, reminderNow]);

  const requestOptions = useMemo(
    () => requests.map((request) => ({ id: request.id, label: getRequestLabel(request) })),
    [requests]
  );
  const requestLabelById = useMemo(
    () => new Map(requestOptions.map((request) => [request.id, request.label])),
    [requestOptions]
  );

  const matchingNotes = useMemo(() => {
    if (filter === "all") return sortClientNotes(notes);
    if (filter === "pinned") return sortClientNotes(notes.filter((note) => note.is_pinned));
    return sortClientNotes(notes.filter((note) => note.note_type === filter));
  }, [filter, notes]);

  const pinnedNotes = filter === "all" ? matchingNotes.filter((note) => note.is_pinned) : [];
  const remainingNotes = filter === "all" ? matchingNotes.filter((note) => !note.is_pinned) : matchingNotes;

  const clearEditorQuery = () => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  };

  const openNewNote = (noteType: ClientNoteType) => {
    setNewNoteType(noteType);
    setEditingNote(null);
    setEditorError("");
    setTypePickerOpen(false);
    setEditorOpen(true);
  };

  const openEditNote = (note: ClientNote) => {
    setNewNoteType(note.note_type);
    setEditingNote(note);
    setEditorError("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNote(null);
    setEditorError("");
    clearEditorQuery();
  };

  const filteredNoteType = isClientNoteType(filter) ? filter : null;
  const filteredCreation = filteredNoteType ? NOTE_CREATION_COPY[filteredNoteType] : null;

  const removeAttachments = async (attachments: ClientNoteAttachment[]) => {
    if (attachments.length === 0) return;
    const { error: storageError } = await supabase.storage
      .from(CLIENT_NOTE_IMAGE_BUCKET)
      .remove(attachments.map((attachment) => attachment.storage_path));
    if (storageError) throw storageError;
    const { error: metadataError } = await supabase
      .from("artist_client_note_attachments")
      .delete()
      .in("id", attachments.map((attachment) => attachment.id));
    if (metadataError) throw metadataError;
  };

  const addAttachments = async (
    noteId: string,
    existing: ClientNoteAttachment[],
    images: ClientNoteDraft["new_images"]
  ) => {
    if (!artistId || !clientCardId || images.length === 0) return [];
    const usedSlots = new Set(existing.map((attachment) => attachment.sort_order));
    const created: ClientNoteAttachment[] = [];

    try {
      for (const image of images) {
        const sortOrder = [0, 1, 2, 3].find((slot) => !usedSlots.has(slot));
        if (sortOrder === undefined) throw new Error("An Inspiration note can include up to 4 images.");
        usedSlots.add(sortOrder);

        const storagePath = `${artistId}/${clientCardId}/${noteId}/${crypto.randomUUID()}.${getClientNoteImageExtension(image.file)}`;
        const { data: metadata, error: metadataError } = await supabase
          .from("artist_client_note_attachments")
          .insert({ note_id: noteId, storage_path: storagePath, caption: image.caption || null, sort_order: sortOrder })
          .select(ATTACHMENT_SELECT)
          .single();
        if (metadataError) throw metadataError;

        const attachment = metadata as ClientNoteAttachment;
        const { error: uploadError } = await supabase.storage
          .from(CLIENT_NOTE_IMAGE_BUCKET)
          .upload(storagePath, image.file, { contentType: image.file.type, upsert: false });
        if (uploadError) {
          await supabase.from("artist_client_note_attachments").delete().eq("id", attachment.id);
          throw uploadError;
        }
        created.push(attachment);
      }
    } catch (error) {
      if (created.length > 0) {
        await supabase.storage.from(CLIENT_NOTE_IMAGE_BUCKET).remove(created.map((attachment) => attachment.storage_path));
        await supabase.from("artist_client_note_attachments").delete().in("id", created.map((attachment) => attachment.id));
      }
      throw error;
    }

    return attachSignedClientNoteImageUrls(created);
  };

  const saveNote = async (draft: ClientNoteDraft) => {
    if (!artistId || !clientCardId) return;
    setSaving(true);
    setEditorError("");

    const payload = {
      note_type: draft.note_type,
      title: draft.title,
      body: draft.body,
      request_id: draft.request_id,
      reminder_due_on: draft.note_type === "reminder" ? draft.reminder_due_on : null,
      reminder_due_time: draft.note_type === "reminder" ? draft.reminder_due_time : null,
      reminder_completed_at: draft.note_type === "reminder" ? editingNote?.reminder_completed_at || null : null,
    };
    const originalAttachments = editingNote ? attachmentsByNote[editingNote.id] || [] : [];
    const attachmentsToRemove = originalAttachments.filter((attachment) => draft.removed_attachment_ids.includes(attachment.id));
    const changingAwayFromInspiration = editingNote?.note_type === "inspiration" && draft.note_type !== "inspiration";
    let createdNoteId: string | null = null;

    try {
      if (changingAwayFromInspiration) await removeAttachments(attachmentsToRemove);

      const response = editingNote
        ? await supabase.from("artist_client_notes").update(payload).eq("id", editingNote.id).eq("artist_id", artistId).select(NOTE_SELECT).single()
        : await supabase.from("artist_client_notes").insert({ artist_id: artistId, client_id: linkedClientId, client_card_id: clientCardId, ...payload }).select(NOTE_SELECT).single();
      if (response.error) throw response.error;

      const saved = response.data as ClientNote;
      if (!editingNote) createdNoteId = saved.id;
      if (!changingAwayFromInspiration) await removeAttachments(attachmentsToRemove);

      const retainedAttachments = originalAttachments.filter((attachment) => !draft.removed_attachment_ids.includes(attachment.id));
      const captionUpdates = draft.existing_attachments.filter((item) => {
        const original = retainedAttachments.find((attachment) => attachment.id === item.id);
        return original && (original.caption || "") !== item.caption;
      });
      for (const update of captionUpdates) {
        const { error } = await supabase.from("artist_client_note_attachments").update({ caption: update.caption || null }).eq("id", update.id);
        if (error) throw error;
      }

      const retainedWithCaptions = retainedAttachments.map((attachment) => {
        const update = draft.existing_attachments.find((item) => item.id === attachment.id);
        return update ? { ...attachment, caption: update.caption || null } : attachment;
      });
      const addedAttachments = draft.note_type === "inspiration"
        ? await addAttachments(saved.id, retainedWithCaptions, draft.new_images)
        : [];
      const nextAttachments = [...retainedWithCaptions, ...addedAttachments].sort((a, b) => a.sort_order - b.sort_order);

      setNotes((current) => sortClientNotes(editingNote ? current.map((note) => note.id === saved.id ? saved : note) : [saved, ...current]));
      setAttachmentsByNote((current) => ({ ...current, [saved.id]: nextAttachments }));
      setSaving(false);
      closeEditor();
    } catch (error) {
      console.error("Client Note save failed:", error);
      if (createdNoteId) await supabase.from("artist_client_notes").delete().eq("id", createdNoteId).eq("artist_id", artistId);
      setSaving(false);
      setEditorError("This note or its private images couldn't be saved. Please try again.");
    }
  };

  const togglePin = async (note: ClientNote) => {
    if (!artistId) return;
    setBusyNoteId(note.id);
    const { data, error } = await supabase.from("artist_client_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id).eq("artist_id", artistId).select(NOTE_SELECT).single();
    setBusyNoteId(null);
    if (error) {
      console.error("Client Note pin update failed:", error);
      setErrorMessage("The pinned state couldn't be updated. Please try again.");
      return;
    }
    const updated = data as ClientNote;
    setNotes((current) => sortClientNotes(current.map((item) => item.id === updated.id ? updated : item)));
  };

  const toggleReminderComplete = async (note: ClientNote) => {
    if (!artistId || note.note_type !== "reminder") return;
    setBusyNoteId(note.id);
    const { data, error } = await supabase
      .from("artist_client_notes")
      .update({ reminder_completed_at: note.reminder_completed_at ? null : new Date().toISOString() })
      .eq("id", note.id)
      .eq("artist_id", artistId)
      .select(NOTE_SELECT)
      .single();
    setBusyNoteId(null);
    if (error) {
      console.error("Client Note reminder update failed:", error);
      setErrorMessage("The reminder status couldn't be updated. Please try again.");
      return;
    }
    const updated = data as ClientNote;
    setNotes((current) => sortClientNotes(current.map((item) => item.id === updated.id ? updated : item)));
    setReminderNow(new Date());
  };

  const deleteNote = async () => {
    if (!noteToDelete || !artistId) return;
    setBusyNoteId(noteToDelete.id);
    const noteAttachments = attachmentsByNote[noteToDelete.id] || [];
    try {
      await removeAttachments(noteAttachments);
    } catch (error) {
      setBusyNoteId(null);
      console.error("Client Note image cleanup failed:", error);
      setErrorMessage("The private images couldn't be removed, so the note was kept. Please try again.");
      return;
    }
    const { error } = await supabase.from("artist_client_notes").delete().eq("id", noteToDelete.id).eq("artist_id", artistId);
    setBusyNoteId(null);
    if (error) {
      console.error("Client Note delete failed:", error);
      setErrorMessage("This note couldn't be deleted. Please try again.");
      return;
    }
    setNotes((current) => current.filter((note) => note.id !== noteToDelete.id));
    setAttachmentsByNote((current) => {
      const next = { ...current };
      delete next[noteToDelete.id];
      return next;
    });
    setNoteToDelete(null);
  };

  if (loading) return <PageState message="Loading notes..." />;
  if (unavailable) return <PageState message="This client workspace is unavailable for your professional account." clientId={clientId} />;
  if (errorMessage && notes.length === 0) return <PageState message={errorMessage} clientId={clientId} />;

  const renderNotes = (items: ClientNote[]) => (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((note) => <ClientNoteCard key={note.id} note={note} attachments={attachmentsByNote[note.id] || []} requestLabel={note.request_id ? requestLabelById.get(note.request_id) : undefined} now={reminderNow} busy={busyNoteId === note.id} onEdit={() => openEditNote(note)} onDelete={() => setNoteToDelete(note)} onTogglePin={() => void togglePin(note)} onToggleReminderComplete={() => void toggleReminderComplete(note)} />)}
    </div>
  );

  return (
    <div className="bg-lumina-surface text-lumina-text">
      <section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">
        <Link href={`/dashboard/clients/${clientId}`} className="inline-flex items-center gap-2 text-[13px] font-medium text-lumina-text-muted transition hover:text-lumina-text"><ArrowLeft size={16} /> Back to client card</Link>

        <header className="relative z-40 mt-7 overflow-visible rounded-[24px] border border-lumina-glass-border bg-lumina-glass p-6 shadow-[0_16px_42px_rgba(39,36,40,0.045)] backdrop-blur-[14px] md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-lumina-text-muted">Private notes workspace</p>
              <h1 className="mt-2 text-[36px] font-semibold leading-[1.08] text-lumina-text font-serif md:text-[46px]">{clientName}</h1>
              <p className="mt-3 max-w-[640px] text-[13px] leading-[1.6] text-lumina-text-muted">Keep service details, follow-up context, aftercare, and ideas organized for future visits.</p>
              <p className="mt-2 text-[11px] text-lumina-text-muted">{notes.length} {notes.length === 1 ? "private note" : "private notes"}</p>
            </div>
            <div ref={typePickerRef} className="relative z-50 shrink-0">
              <button ref={newNoteButtonRef} type="button" aria-haspopup="menu" aria-expanded={typePickerOpen} onClick={() => setTypePickerOpen((open) => !open)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white transition hover:bg-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text"><Plus size={15} aria-hidden="true" /> New note <ChevronDown size={14} className={`transition-transform ${typePickerOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button>
              {typePickerOpen && (
                <div role="menu" aria-label="Choose note type" className="absolute right-0 top-full z-[110] mt-2 hidden w-[320px] max-w-[calc(100vw-2.5rem)] rounded-[18px] border border-lumina-glass-border bg-lumina-glass p-2 shadow-[0_18px_45px_rgba(39,36,40,0.10)] backdrop-blur-[16px] sm:block">
                  {CLIENT_NOTE_TYPES.map((noteType) => <button key={noteType} role="menuitem" type="button" onClick={() => openNewNote(noteType)} className="flex min-h-11 w-full items-center justify-between rounded-[12px] px-3.5 text-left text-[13px] font-medium text-lumina-text transition hover:bg-lumina-surface/85 focus-visible:bg-lumina-surface focus-visible:outline-none"><span>{CLIENT_NOTE_TYPE_LABELS[noteType]}</span><Plus size={14} className="text-lumina-text-muted" aria-hidden="true" /></button>)}
                </div>
              )}
            </div>
          </div>
        </header>

        <nav aria-label="Filter client notes" className="mt-5 overflow-x-auto pb-1">
          <div className="flex w-max min-w-full gap-2 rounded-[18px] border border-lumina-glass-border bg-lumina-glass p-2 backdrop-blur-[12px]">
            {filters.map((item) => {
              const selected = filter === item.value;
              return <button key={item.value} type="button" aria-pressed={selected} onClick={() => setFilter(item.value)} className={`min-h-10 whitespace-nowrap rounded-full px-4 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text ${selected ? "bg-lumina-black text-white" : "border border-transparent text-lumina-text-muted hover:border-lumina-border hover:bg-lumina-surface/80 hover:text-lumina-text"}`}>{item.label}</button>;
            })}
          </div>
        </nav>

        {filteredNoteType && filteredCreation && matchingNotes.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-lumina-border/60 pb-5">
            <p className="text-[11px] text-lumina-text-muted">{matchingNotes.length} {matchingNotes.length === 1 ? "note" : "notes"} in this view</p>
            <button type="button" onClick={() => openNewNote(filteredNoteType)} className={`inline-flex items-center rounded-full border border-lumina-border bg-lumina-surface text-[12px] font-medium text-lumina-text transition hover:border-lumina-text-muted hover:bg-lumina-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text ${getCreationActionSizing(filteredNoteType)}`}><Plus size={14} className="shrink-0" aria-hidden="true" /> <span>{filteredCreation.action}</span></button>
          </div>
        )}

        {errorMessage && <p aria-live="polite" className="mt-4 text-[12px] text-lumina-attention">{errorMessage}</p>}

        <div className="mt-8 space-y-9">
          {pinnedNotes.length > 0 && <section><div className="mb-4 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lumina-blush" /><h2 className="text-[18px] font-semibold text-lumina-text">Pinned notes</h2></div>{renderNotes(pinnedNotes)}</section>}
          {remainingNotes.length > 0 && <section><h2 className="mb-4 text-[18px] font-semibold text-lumina-text">{filter === "all" ? "All notes" : filters.find((item) => item.value === filter)?.label}</h2>{renderNotes(remainingNotes)}</section>}
          {matchingNotes.length === 0 && <section className="rounded-[20px] border border-lumina-border/65 bg-lumina-surface p-6"><NotebookPen size={20} className="text-lumina-text-muted" aria-hidden="true" /><h2 className="mt-4 text-[16px] font-medium">{filteredCreation?.emptyTitle || (notes.length === 0 ? "No notes yet" : "No notes in this view")}</h2><p className="mt-1 text-[13px] leading-[1.6] text-lumina-text-muted">{filteredCreation?.emptyCopy || (notes.length === 0 ? "Choose a note type to keep client context and follow-up details organized." : "Choose another filter to view this client's notes.")}</p>{filteredNoteType && filteredCreation ? <button type="button" onClick={() => openNewNote(filteredNoteType)} className={`mt-4 inline-flex items-center rounded-full bg-lumina-black text-[12px] font-medium text-white ${getCreationActionSizing(filteredNoteType)}`}><Plus size={14} className="shrink-0" aria-hidden="true" /> <span>{filteredCreation.action}</span></button> : notes.length === 0 && <button type="button" onClick={() => openNewNote("general")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-lumina-black px-5 text-[12px] font-medium text-white"><Plus size={14} aria-hidden="true" /> Add general note</button>}</section>}
        </div>

        {editorOpen && <ClientNoteEditor note={editingNote} initialType={newNoteType} attachments={editingNote ? attachmentsByNote[editingNote.id] || [] : []} requests={requestOptions} saving={saving} errorMessage={editorError} onSave={(draft) => void saveNote(draft)} onClose={closeEditor} />}

        {typePickerOpen && (
          <div className="fixed inset-0 z-[105] flex items-end bg-lumina-black/15 p-4 backdrop-blur-[2px] sm:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setTypePickerOpen(false); }}>
            <div ref={mobileTypePickerRef} role="menu" aria-label="Choose note type" className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[22px] border border-lumina-glass-border bg-lumina-glass p-3 shadow-[0_18px_45px_rgba(39,36,40,0.12)] backdrop-blur-[16px]">
              <div className="flex items-center justify-between px-2 pb-2"><p className="text-[13px] font-medium text-lumina-text">Choose note type</p><button type="button" onClick={() => setTypePickerOpen(false)} aria-label="Close note type picker" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-lumina-border bg-lumina-surface text-lumina-text-muted"><X size={15} /></button></div>
              {CLIENT_NOTE_TYPES.map((noteType) => <button key={noteType} role="menuitem" type="button" onClick={() => openNewNote(noteType)} className="flex min-h-12 w-full items-center justify-between rounded-[13px] px-4 text-left text-[14px] font-medium text-lumina-text transition active:bg-lumina-surface focus-visible:bg-lumina-surface focus-visible:outline-none"><span>{CLIENT_NOTE_TYPE_LABELS[noteType]}</span><Plus size={15} className="text-lumina-text-muted" aria-hidden="true" /></button>)}
            </div>
          </div>
        )}

        {noteToDelete && <div className="fixed inset-0 z-[95] flex items-end justify-center bg-lumina-black/20 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && busyNoteId !== noteToDelete.id) setNoteToDelete(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-client-note-title" className="w-full rounded-t-[24px] border border-lumina-border bg-lumina-surface p-5 shadow-[0_24px_70px_rgba(17,17,17,0.14)] sm:max-w-[460px] sm:rounded-[24px] sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-lumina-attention">Delete note</p><h2 id="delete-client-note-title" className="mt-1 text-[23px] font-semibold font-serif">Delete “{noteToDelete.title.trim() || CLIENT_NOTE_TYPE_LABELS[noteToDelete.note_type]}”?</h2></div><button type="button" onClick={() => setNoteToDelete(null)} disabled={busyNoteId === noteToDelete.id} aria-label="Close delete confirmation" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lumina-border text-lumina-text-muted"><X size={16} /></button></div><p className="mt-3 text-[13px] leading-[1.6] text-lumina-text-muted">This permanently removes the private note. Client history and linked requests are not changed.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setNoteToDelete(null)} disabled={busyNoteId === noteToDelete.id} className="min-h-11 rounded-full border border-lumina-border px-5 text-[13px] font-medium">Cancel</button><button type="button" onClick={() => void deleteNote()} disabled={busyNoteId === noteToDelete.id} className="min-h-11 rounded-full bg-lumina-attention px-5 text-[13px] font-medium text-white disabled:opacity-50">{busyNoteId === noteToDelete.id ? "Deleting..." : "Delete note"}</button></div></section></div>}
      </section>
    </div>
  );
}

function PageState({ message, clientId }: { message: string; clientId?: string }) {
  return <div className="bg-lumina-surface text-lumina-text"><section className="mx-auto max-w-[1280px] px-5 py-10 md:px-10 md:py-14">{clientId && <Link href={`/dashboard/clients/${clientId}`} className="inline-flex items-center gap-2 text-[13px] font-medium text-lumina-text-muted"><ArrowLeft size={16} /> Back to client card</Link>}<div className={`${clientId ? "mt-7" : ""} rounded-[20px] border border-lumina-border/65 p-6 text-[14px] text-lumina-text-muted`}>{message}</div></section></div>;
}
