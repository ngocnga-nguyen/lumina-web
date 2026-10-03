import assert from "node:assert/strict";
import test from "node:test";
import { professionalToday, type ProfessionalReminder, type ProfessionalAppointment } from "../lib/professional-tasks.ts";
import { getClientNoteReminderStatus, getClientNoteReminderTransition } from "../lib/client-notes.ts";
const reminder = (values: Partial<ProfessionalReminder> = {}): ProfessionalReminder => ({ id: "note", artist_id: "pro", client_id: null, client_card_id: "manual-card", request_id: null, note_type: "reminder", title: "Check retention", body: "", is_pinned: false, reminder_due_on: "2026-10-02", reminder_due_time: null, reminder_completed_at: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", client_label: "Maya", ...values });
const appointment = (values: Partial<ProfessionalAppointment> = {}): ProfessionalAppointment => ({ id: "appt", client_name: "Lena", service_requested: "Lash refill", status: "accepted", client_status: "confirmed", booking_status: "booked", scheduled_for: "2026-10-02T15:00:00Z", ...values });
const now = new Date("2026-10-02T17:00:00Z");
test("authoritative reminder due instant does not shift with browser timezone", () => {
 const note = reminder({ reminder_due_time: "09:00", reminder_timezone: "America/Los_Angeles", reminder_due_at: "2026-10-02T16:00:00Z" });
 assert.equal(getClientNoteReminderStatus(note, new Date("2026-10-02T15:59:00Z")), "upcoming");
 assert.equal(getClientNoteReminderStatus(note, now), "due");
 assert.equal(getClientNoteReminderTransition(note, new Date("2026-10-02T15:00:00Z"))?.toISOString(), "2026-10-02T16:00:00.000Z");
});
test("date-only reminder follows saved zone through midnight without inventing an alert", () => {
 const note = reminder({ reminder_timezone: "America/Los_Angeles" });
 assert.equal(getClientNoteReminderStatus(note, new Date("2026-10-03T01:00:00Z")), "due_today");
 assert.equal(getClientNoteReminderStatus(note, new Date("2026-10-03T08:00:00Z")), "due");
 assert.equal(note.reminder_due_at, undefined);
});
test("Today combines time-sorted reminders and confirmed appointments with distinct kinds", () => {
 const model = professionalToday({ reminders: [reminder({ reminder_due_time: "09:00", reminder_due_at: "2026-10-02T14:00:00Z" })], appointments: [appointment()] }, now, "America/Chicago");
 assert.deepEqual(model.timeline.map((item) => item.kind), ["reminder", "appointment"]);
 assert.equal(model.appointmentCount, 1); assert.equal(model.reminderCount, 1);
});
test("completion excludes only the reminder, without changing the appointment", () => {
 const appt = appointment();
 const model = professionalToday({ reminders: [reminder({ reminder_completed_at: now.toISOString() })], appointments: [appt] }, now, "America/Chicago");
 assert.equal(model.reminderCount, 0); assert.equal(model.appointmentCount, 1); assert.equal(appt.booking_status, "booked");
});
test("proposals, declined, completed and exception appointments are excluded", () => {
 const excluded: Partial<ProfessionalAppointment>[] = [{ status: "pending" }, { client_status: "declined" }, { booking_status: "completed" }, { appointment_exception_reason: "no_show" }, { scheduled_for: null }];
 for (const values of excluded) {
  assert.equal(professionalToday({ reminders: [], appointments: [appointment(values)] }, now, "America/Chicago").appointmentCount, 0);
 }
});
test("overdue, date-only, old local-time, unscheduled and future reminders remain distinct", () => {
 const model = professionalToday({ reminders: [reminder(), reminder({ id: "old", reminder_due_time: "10:00" }), reminder({ id: "late", reminder_due_on: "2026-10-01" }), reminder({ id: "none", reminder_due_on: null }), reminder({ id: "future", reminder_due_on: "2026-10-03" })], appointments: [] }, now, "America/Chicago");
 assert.equal(model.dueToday.length, 2); assert.equal(model.timeline.length, 0); assert.equal(model.overdue.length, 1); assert.equal(model.unscheduled.length, 1);
});
test("manual client linkage survives Today projection", () => {
 const model = professionalToday({ reminders: [reminder()], appointments: [] }, now, "America/Chicago");
 assert.equal(model.dueToday[0].client_card_id, "manual-card"); assert.equal(model.dueToday[0].client_id, null);
});
test("travel changes timeline display day without changing the saved due instant", () => {
 const note = reminder({ reminder_due_at: "2026-10-03T01:00:00Z", reminder_timezone: "America/Chicago", reminder_due_time: "20:00" });
 assert.equal(professionalToday({ reminders: [note], appointments: [] }, now, "America/Chicago").reminderCount, 1);
 assert.equal(professionalToday({ reminders: [note], appointments: [] }, now, "Asia/Tokyo").reminderCount, 1);
 assert.equal(note.reminder_due_at, "2026-10-03T01:00:00Z");
});
