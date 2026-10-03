import type { ClientNote } from "./client-notes";

import type { CompletionRequestLike } from "./request-completion";

export type ProfessionalAppointment = CompletionRequestLike & {
  id: string; client_name: string | null; service_requested: string | null;
  status: string | null; client_status: string | null; booking_status: string | null;
  scheduled_for: string | null;
};
export type ProfessionalReminder = ClientNote & { client_label: string };
export type ProfessionalTaskSnapshot = { reminders: ProfessionalReminder[]; appointments: ProfessionalAppointment[] };
export type TodayItem = { kind: "reminder"; reminder: ProfessionalReminder; at: string | null }
  | { kind: "appointment"; appointment: ProfessionalAppointment; at: string };
export function dayInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
}
export function professionalToday(snapshot: ProfessionalTaskSnapshot, now: Date, timeZone: string) {
  const today = dayInZone(now, timeZone);
  const timeline: TodayItem[] = [];
  const dueToday: ProfessionalReminder[] = [], overdue: ProfessionalReminder[] = [], unscheduled: ProfessionalReminder[] = [];
  for (const reminder of snapshot.reminders) {
    if (reminder.note_type !== "reminder" || reminder.reminder_completed_at) continue;
    if (!reminder.reminder_due_on) { unscheduled.push(reminder); continue; }
    const dueDay = reminder.reminder_due_at ? dayInZone(new Date(reminder.reminder_due_at), timeZone) : reminder.reminder_due_on;
    // Date-only reminders follow their saved timezone throughout the day.
    const referenceDay = !reminder.reminder_due_at && reminder.reminder_timezone ? dayInZone(now, reminder.reminder_timezone) : today;
    if (dueDay < referenceDay) overdue.push(reminder);
    else if (dueDay === referenceDay) {
      if (reminder.reminder_due_at) timeline.push({ kind: "reminder", reminder, at: reminder.reminder_due_at });
      else dueToday.push(reminder);
    }
  }
  for (const appointment of snapshot.appointments) {
    if (appointment.status !== "accepted" || appointment.client_status !== "confirmed" || appointment.booking_status !== "booked" || appointment.appointment_exception_reason || !appointment.scheduled_for) continue;
    if (dayInZone(new Date(appointment.scheduled_for), timeZone) === today) timeline.push({ kind: "appointment", appointment, at: appointment.scheduled_for });
  }
  timeline.sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!));
  overdue.sort((a, b) => (a.reminder_due_on || "").localeCompare(b.reminder_due_on || ""));
  return { today, timeline, dueToday, overdue, unscheduled,
    appointmentCount: timeline.filter((item) => item.kind === "appointment").length,
    reminderCount: timeline.filter((item) => item.kind === "reminder").length + dueToday.length };
}
