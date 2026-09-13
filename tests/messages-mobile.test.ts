import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inbox = readFileSync(
  new URL("../components/RequestInbox.tsx", import.meta.url),
  "utf8"
);
const conversation = readFileSync(
  new URL("../components/RequestConversationPanel.tsx", import.meta.url),
  "utf8"
);
const messageBubble = readFileSync(
  new URL("../components/MessageBubble.tsx", import.meta.url),
  "utf8"
);
const clientRoute = readFileSync(
  new URL("../app/client/messages/page.tsx", import.meta.url),
  "utf8"
);
const professionalRoute = readFileSync(
  new URL("../app/dashboard/messages/page.tsx", import.meta.url),
  "utf8"
);

test("client and professional routes retain one shared role-aware inbox", () => {
  assert.match(clientRoute, /<RequestInbox role="client" \/>/);
  assert.match(professionalRoute, /<RequestInbox role="artist" \/>/);
  assert.doesNotMatch(clientRoute, /request_updates|postgres_changes/);
  assert.doesNotMatch(professionalRoute, /request_updates|postgres_changes/);
});

test("mobile conversation uses the dynamic workspace viewport while desktop keeps split view", () => {
  assert.match(inbox, /h-\[calc\(100dvh-68px\)\]/);
  assert.match(inbox, /h-full rounded-none border-0 shadow-none/);
  assert.match(inbox, /lg:grid-cols-\[minmax\(300px,370px\)_minmax\(0,1fr\)\]/);
  assert.match(inbox, /lg:h-\[min\(720px,calc\(100vh-240px\)\)\]/);
});

test("mobile composer respects safe areas and grows only to its bounded height", () => {
  assert.match(conversation, /env\(safe-area-inset-bottom\)/);
  assert.match(conversation, /const maxHeight = 116/);
  assert.match(conversation, /Math\.min\(input\.scrollHeight, maxHeight\)/);
  assert.match(conversation, /input\.style\.overflowY/);
  assert.match(conversation, /max-h-\[116px\]/);
  assert.match(conversation, /className="flex items-end gap-2 md:gap-3"/);
  assert.match(conversation, /text-lumina-text-muted lg:block/);
});

test("new updates follow the latest message only while the reader remains near the bottom", () => {
  assert.match(conversation, /shouldFollowLatestRef/);
  assert.match(conversation, /distanceFromBottom < 96/);
  assert.match(conversation, /if \(!shouldFollowLatestRef\.current\) return/);
  assert.match(conversation, /overscroll-contain/);
});

test("mobile bubbles and message images remain inside the viewport", () => {
  assert.match(messageBubble, /w-fit/);
  assert.match(messageBubble, /max-w-\[min\(74vw,286px\)\]/);
  assert.match(messageBubble, /max-w-\[min\(78vw,300px\)\]/);
  assert.match(messageBubble, /max-w-full/);
  assert.match(messageBubble, /object-contain/);
  assert.match(messageBubble, /lg:max-w-\[320px\]/);
});
