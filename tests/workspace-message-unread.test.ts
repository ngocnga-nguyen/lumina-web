import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const unreadHookSource = readFile(
  new URL("../lib/use-workspace-message-unread-count.ts", import.meta.url),
  "utf8"
);
const conversationSource = readFile(
  new URL("../lib/request-conversations.ts", import.meta.url),
  "utf8"
);
const clientShellSource = readFile(
  new URL("../components/ClientWorkspaceShell.tsx", import.meta.url),
  "utf8"
);
const professionalShellSource = readFile(
  new URL("../components/ProfessionalDashboardShell.tsx", import.meta.url),
  "utf8"
);
const publicRailSource = readFile(
  new URL("../components/AuthenticatedWorkspaceRail.tsx", import.meta.url),
  "utf8"
);
const clientRequestsSource = readFile(
  new URL("../app/my-requests/page.tsx", import.meta.url),
  "utf8"
);
const professionalRequestsSource = readFile(
  new URL("../app/dashboard/requests/page.tsx", import.meta.url),
  "utf8"
);

test("workspace count is database-derived, participant-specific, and excludes hidden and deleted activity", async () => {
  const source = await unreadHookSource;

  assert.match(source, /\.eq\(ownerColumn, userId\)/);
  assert.match(source, /\.or\(`\$\{hiddenColumn\}\.eq\.false,\$\{hiddenColumn\}\.is\.null`\)/);
  assert.match(source, /\.neq\("sender_type", role\)/);
  assert.match(source, /\.eq\(readColumn, false\)/);
  assert.match(source, /\.or\("is_deleted\.eq\.false,is_deleted\.is\.null"\)/);
  assert.doesNotMatch(source, /booking_status/);
  assert.doesNotMatch(source, /client_status/);
});

test("shared mark-read updates only unread incoming non-deleted rows and publishes a DB-confirmed count", async () => {
  const source = await conversationSource;

  assert.match(source, /\.neq\("sender_type", role\)/);
  assert.match(source, /\.eq\(readColumn, false\)/);
  assert.match(source, /\.or\("is_deleted\.eq\.false,is_deleted\.is\.null"\)/);
  assert.match(source, /\.select\("id"\)/);
  assert.match(source, /markedReadCount: result\.data\?\.length \|\| 0/);
});

test("one shell-level unread source feeds client, professional, public, and mobile navigation", async () => {
  const [clientShell, professionalShell, publicRail] = await Promise.all([
    clientShellSource,
    professionalShellSource,
    publicRailSource,
  ]);

  assert.match(clientShell, /useWorkspaceMessageUnreadCount\("client", accountId\)/);
  assert.match(professionalShell, /useWorkspaceMessageUnreadCount\([\s\S]*?"artist"/);
  assert.match(publicRail, /itemId === "messages"/);
  assert.match(clientShell, /label: "unread message"/);
  assert.match(professionalShell, /label: "unread message"/);
  assert.match(publicRail, /role && !excludedRoute \? accountId : null/);
});

test("Messages and both Requests views use the same persistent mark-read helper", async () => {
  const [clientRequests, professionalRequests] = await Promise.all([
    clientRequestsSource,
    professionalRequestsSource,
  ]);

  assert.match(clientRequests, /markRequestConversationRead\(update\.request_id, "client"\)/);
  assert.match(professionalRequests, /markRequestConversationRead\(update\.request_id, "artist"\)/);
  assert.doesNotMatch(
    clientRequests,
    /update\(\{ is_read_by_client: true \}\)\s*\.eq\("id", update\.id\)/
  );
  assert.doesNotMatch(
    professionalRequests,
    /update\(\{ is_read_by_artist: true \}\)\s*\.eq\("id", update\.id\)/
  );
});

test("count rechecks on realtime changes, read completion, focus, and visibility return", async () => {
  const source = await unreadHookSource;

  assert.match(source, /table: "request_updates"/);
  assert.match(source, /table: "client_requests"/);
  assert.match(source, /REQUEST_MESSAGE_READ_STATE_EVENT/);
  assert.match(source, /window\.addEventListener\("focus", refreshOnFocus\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", refreshOnVisibility\)/);
  assert.match(
    source,
    /applyDatabaseConfirmedReadCount\(current, detail\.markedReadCount \|\| 0\)/
  );
});
