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
  assert.match(inbox, /placeholder="Search conversations"/);
  assert.match(inbox, /filterRequestConversations\([\s\S]*searchQuery/);
});

test("mobile conversation uses the dynamic workspace viewport while desktop keeps split view", () => {
  assert.match(inbox, /h-\[calc\(100dvh-68px\)\]/);
  assert.match(inbox, /h-full rounded-none border-0 shadow-none/);
  assert.match(inbox, /lg:grid-cols-\[280px_minmax\(0,1fr\)\]/);
  assert.match(inbox, /xl:grid-cols-\[330px_minmax\(0,1fr\)\]/);
  assert.match(inbox, /lg:h-\[calc\(100dvh-230px\)\]/);
});

test("desktop inbox controls reuse the existing state while retaining the mobile placement", () => {
  assert.match(inbox, /const inboxControls =/);
  assert.equal((inbox.match(/\{inboxControls\}/g) || []).length, 2);
  assert.match(inbox, /className="lg:hidden">\{inboxControls\}/);
  assert.match(inbox, /className="hidden shrink-0 px-4 pb-3 pt-4 lg:block">\{inboxControls\}/);
  assert.equal((inbox.match(/useRequestInbox\(role\)/g) || []).length, 1);
  assert.equal((inbox.match(/onChange=\{\(event\) => setSearchQuery/g) || []).length, 1);
});

test("desktop thread polish is opt-in for Messages and leaves the request overlay on its default", () => {
  const chatModal = readFileSync(
    new URL("../components/ChatModal.tsx", import.meta.url),
    "utf8"
  );
  assert.match(inbox, /<RequestConversationPanel\s+presentation="inbox"/);
  assert.match(conversation, /presentation = "overlay"/);
  assert.doesNotMatch(chatModal, /presentation=/);
  assert.match(conversation, /presentation === "inbox" \? "lg:/);
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
