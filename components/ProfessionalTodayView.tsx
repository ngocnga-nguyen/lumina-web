"use client";
import { getCompletionState, getCompletionStateLabel } from "@/lib/request-completion";
import { professionalToday, type ProfessionalReminder, type ProfessionalTaskSnapshot } from "@/lib/professional-tasks";

export default function ProfessionalTodayView({ snapshot, now, timeZone, busy, error, onComplete }: {
  snapshot: ProfessionalTaskSnapshot; now: Date; timeZone: string; busy: string | null; error: string | null;
  onComplete: (note: ProfessionalReminder) => void;
}) {
  const today = professionalToday(snapshot, now, timeZone);
  const time = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
  const reminderRow = (note: ProfessionalReminder, label?: string) => <li key={note.id} className="flex flex-wrap items-center gap-3 border-t border-lumina-border py-4">
    <div className="min-w-0 w-full sm:w-auto sm:flex-1"><p className="text-[11px] text-lumina-text-muted">{label || note.reminder_due_on || "No due date"} · Reminder</p><p className="break-words text-[14px] font-medium">{note.title || "Client reminder"}</p><p className="text-[12px] text-lumina-text-muted">{note.client_label}</p></div>
    <a className="inline-flex min-h-11 items-center text-[12px] underline" href={`/dashboard/clients/${encodeURIComponent(note.client_card_id || "")}/notes?edit=${encodeURIComponent(note.id)}`}>Open client reminder</a>
    <button className="min-h-11 rounded-full border border-lumina-border px-4 text-[12px] disabled:opacity-50" disabled={busy !== null} onClick={() => onComplete(note)}>{busy === note.id ? "Saving…" : "Complete"}</button>
  </li>;
  return <section aria-labelledby="professional-today-title" className="my-6 rounded-[22px] border border-lumina-border bg-lumina-surface p-5 text-lumina-text sm:p-6">
    <h2 id="professional-today-title" className="font-serif text-[26px]">Today · {new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(now)}</h2>
    <p className="mt-1 text-[12px] text-lumina-text-muted">{today.appointmentCount} appointments · {today.reminderCount} reminders · {timeZone}</p>
    {error && <p role="alert" className="mt-3 text-[13px] text-lumina-attention">{error}</p>}
    <ul className="mt-4">{today.timeline.map((item) => item.kind === "reminder" ? reminderRow(item.reminder, time(item.at!)) : <li key={item.appointment.id} className="flex flex-wrap items-center gap-3 border-t border-lumina-border py-4"><div className="min-w-0 w-full sm:w-auto sm:flex-1"><p className="text-[11px] text-lumina-text-muted">{time(item.at)} · Appointment</p><p className="text-[14px] font-medium">{item.appointment.client_name || "Client"}</p><p className="text-[12px] text-lumina-text-muted">{item.appointment.service_requested || "Service"} · {getCompletionStateLabel(getCompletionState(item.appointment, now))}</p></div><a className="inline-flex min-h-11 items-center text-[12px] underline" href={`/dashboard/requests?request=${encodeURIComponent(item.appointment.id)}&view=active`}>Open appointment</a></li>)}</ul>
    {today.dueToday.length > 0 && <><h3 className="mt-4 text-[14px] font-medium">Due today</h3><ul>{today.dueToday.map((note) => reminderRow(note))}</ul></>}
    {today.appointmentCount + today.reminderCount === 0 && <p className="py-4 text-[14px] text-lumina-text-muted">No confirmed appointments or reminders due today.</p>}
    {today.overdue.length > 0 && <><h3 className="mt-4 text-[14px] font-medium">Overdue · {today.overdue.length}</h3><ul>{today.overdue.map((note) => reminderRow(note))}</ul></>}
    {today.unscheduled.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-3 text-[14px]">Unscheduled · {today.unscheduled.length}</summary><ul>{today.unscheduled.map((note) => reminderRow(note))}</ul></details>}
  </section>;
}
