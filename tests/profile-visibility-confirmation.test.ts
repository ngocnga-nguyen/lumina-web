import assert from "node:assert/strict";
import test from "node:test";
import {
  readVisibilityConfirmation, writeVisibilityConfirmation,
  reconcileVisibilityConfirmation,
} from "../lib/profile-visibility-confirmation.ts";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("dismissal survives reload for the same artist and visibility, separately from profile state", () => {
  const store = storage();
  writeVisibilityConfirmation("artist-a", { visible: true, dismissed: true }, store);
  assert.deepEqual(reconcileVisibilityConfirmation(readVisibilityConfirmation("artist-a", store), true), { visible: true, dismissed: true });
  assert.equal(readVisibilityConfirmation("artist-b", store), null);
});
test("both visibility transitions reopen confirmation, including a return to the earlier state", () => {
  let notice = reconcileVisibilityConfirmation({ visible: true, dismissed: true }, false);
  assert.deepEqual(notice, { visible: false, dismissed: false });
  notice = reconcileVisibilityConfirmation({ ...notice, dismissed: true }, true);
  assert.deepEqual(notice, { visible: true, dismissed: false });
});
test("missing or malformed preferences safely show the current confirmation once", () => {
  assert.deepEqual(reconcileVisibilityConfirmation(null, false), { visible: false, dismissed: false });
  assert.equal(readVisibilityConfirmation("invalid", { getItem: () => '{"visible":"true"}', setItem() {} }), null);
});
test("blocked browser storage preserves tab-local dismissal without failing the Dashboard", () => {
  const blocked = { getItem(): string { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  writeVisibilityConfirmation("blocked-artist", { visible: false, dismissed: true }, blocked);
  assert.deepEqual(readVisibilityConfirmation("blocked-artist", blocked), { visible: false, dismissed: true });
});
