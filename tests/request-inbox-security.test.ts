import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inboxHook = readFileSync(
  new URL("../lib/use-request-inbox.ts", import.meta.url),
  "utf8"
);
const messaging = readFileSync(
  new URL("../lib/request-messaging.ts", import.meta.url),
  "utf8"
);
const navigation = readFileSync(
  new URL("../lib/workspace-navigation.ts", import.meta.url),
  "utf8"
);

test("inbox requests are scoped to the authenticated role owner", () => {
  assert.match(inboxHook, /const ownerColumn = role === "client" \? "client_id" : "artist_id"/);
  assert.match(inboxHook, /\.eq\(ownerColumn, user\.id\)/);
  assert.match(inboxHook, /\.in\("request_id", requestIds\)/);
  assert.match(inboxHook, /requestIdsRef\.current\.has\(requestId\)/);
});

test("message writes preserve request linkage and role-specific read state", () => {
  assert.match(messaging, /request_id: requestId/);
  assert.match(messaging, /sender_type: senderRole/);
  assert.match(messaging, /is_read_by_client: true, is_read_by_artist: false/);
  assert.match(messaging, /is_read_by_artist: true, is_read_by_client: false/);
  assert.doesNotMatch(messaging, /service[_-]?role|service[_-]?key/i);
});

test("workspace navigation exposes role-specific inbox routes", () => {
  assert.match(navigation, /href: "\/dashboard\/messages"/);
  assert.match(navigation, /href: "\/client\/messages"/);
  assert.doesNotMatch(navigation, /Messages[\s\S]{0,100}In Requests/);
});
