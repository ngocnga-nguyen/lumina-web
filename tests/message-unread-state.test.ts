import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDatabaseConfirmedReadCount,
  getIncomingUnreadMessageCount,
} from "../lib/message-unread.ts";

type Row = Parameters<typeof getIncomingUnreadMessageCount>[0][number];

function row(overrides: Partial<Row> = {}): Row {
  return {
    sender_type: "artist",
    is_read_by_client: false,
    is_read_by_artist: true,
    is_deleted: false,
    ...overrides,
  };
}

test("incoming unread state is participant-specific and excludes deleted activity", () => {
  const history = [
    row(),
    row({
      sender_type: "client",
      is_read_by_client: true,
      is_read_by_artist: false,
    }),
    row({ is_deleted: true }),
  ];

  assert.equal(getIncomingUnreadMessageCount(history, "client"), 1);
  assert.equal(getIncomingUnreadMessageCount(history, "artist"), 1);
});

test("database-confirmed read state persists until a genuinely new incoming row exists", () => {
  const incoming = row();
  assert.equal(getIncomingUnreadMessageCount([incoming], "client"), 1);

  const immediateBadgeCount = applyDatabaseConfirmedReadCount(1, 1);
  assert.equal(immediateBadgeCount, 0);

  const persistedRead = { ...incoming, is_read_by_client: true };
  assert.equal(getIncomingUnreadMessageCount([persistedRead], "client"), 0);
  assert.equal(getIncomingUnreadMessageCount([persistedRead], "client"), 0);

  const nextIncoming = row();
  assert.equal(
    getIncomingUnreadMessageCount([persistedRead, nextIncoming], "client"),
    1
  );
});

test("sender activity never creates unread count for the sender", () => {
  assert.equal(
    getIncomingUnreadMessageCount(
      [row({ sender_type: "client", is_read_by_client: false })],
      "client"
    ),
    0
  );
});

test("confirmed count subtraction is bounded and cannot create a negative badge", () => {
  assert.equal(applyDatabaseConfirmedReadCount(3, 2), 1);
  assert.equal(applyDatabaseConfirmedReadCount(1, 5), 0);
  assert.equal(applyDatabaseConfirmedReadCount(1, -2), 1);
});
