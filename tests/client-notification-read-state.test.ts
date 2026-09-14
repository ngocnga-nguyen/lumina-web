import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("client notifications use one shell-level authoritative source", () => {
  const shell = source("../components/ClientWorkspaceShell.tsx");
  const hook = source("../lib/use-client-notifications.ts");
  const requests = source("../app/my-requests/page.tsx");

  assert.match(shell, /useClientNotifications\(accountId\)/);
  assert.match(shell, /count: clientNotifications\.reviewUnreadCount/);
  assert.match(shell, /reviewReadyCount: actionCounts\.reviews/);
  assert.doesNotMatch(
    shell,
    /item\.id === "reviews"[\s\S]{0,120}count: actionCounts\.reviews/
  );
  assert.match(shell, /<ClientNotificationCenter/);
  assert.match(
    hook,
    /createRealtimeChannelTopic\(`client-notifications-\$\{userId\}`\)/
  );
  assert.match(hook, /refreshSequence === refreshSequenceRef\.current/);
  assert.doesNotMatch(
    requests,
    /table: "notifications"|setNotifications|showNotifications/
  );
});

test("opening Client Reviews persists acknowledgement without resolving eligibility", () => {
  const reviews = source("../components/ClientReviewsWorkspace.tsx");
  const notifications = source("../lib/client-notifications.ts");
  const hook = source("../lib/use-client-notifications.ts");

  assert.match(reviews, /isClientReviewNotification\(notification\)/);
  assert.match(
    reviews,
    /acknowledgeNotifications\(\{\s*notificationIds: unreadReviewNotificationIds/
  );
  assert.match(notifications, /\.eq\("user_id", user\.id\)/);
  assert.match(notifications, /query = query\.in\("id", notificationIds\)/);
  assert.match(hook, /reviewUnreadCount/);
  assert.match(
    hook,
    /!notification\.is_read && isClientReviewNotification\(notification\)/
  );
  assert.match(reviews, /getReviewReadyRequests\(requests, reviews\)/);
});

test("persisted acknowledgement is scoped to the signed-in client", () => {
  const notifications = source("../lib/client-notifications.ts");

  assert.match(notifications, /\.update\(\{ is_read: true \}\)/);
  assert.match(notifications, /\.eq\("user_id", user\.id\)/);
  assert.match(notifications, /is_read\.eq\.false,is_read\.is\.null/);
  assert.match(notifications, /kind === "message"/);
  assert.match(notifications, /\.eq\("title", "New Message"\)/);
  assert.match(notifications, /kind === "action"/);
  assert.match(notifications, /CLIENT_NOTIFICATION_READ_STATE_EVENT/);
});

test("request acknowledgement does not resolve its business action", () => {
  const requests = source("../app/my-requests/page.tsx");

  assert.match(requests, /hasUnreadClientActionNotification/);
  assert.match(requests, /hasUnreadActionAttention/);
  assert.match(requests, /kind: "action"/);
  assert.match(requests, /getClientRequestActionState/);
  assert.match(requests, /actionState\.cta/);
  assert.doesNotMatch(
    source("../lib/client-notifications.ts"),
    /client_status|booking_status|reviews\)/
  );
});

test("messages acknowledge both participant read state and matching notification", () => {
  const inbox = source("../lib/use-request-inbox.ts");
  const requests = source("../app/my-requests/page.tsx");

  assert.match(inbox, /markRequestConversationRead/);
  assert.match(inbox, /markClientNotificationsRead/);
  assert.match(inbox, /kind: "message"/);
  assert.match(requests, /markRequestConversationRead\(requestId, "client"\)/);
  assert.match(requests, /kind: "message"/);
});

test("hidden requests are excluded and Overview links to exact request events", () => {
  const hook = source("../lib/use-client-notifications.ts");
  const overview = source("../components/ClientOverviewMobileHome.tsx");
  const overviewPage = source("../app/client/page.tsx");

  assert.match(hook, /client_hidden\.eq\.false,client_hidden\.is\.null/);
  assert.match(overview, /my-requests\?request=\$\{nextRequest\.id\}/);
  assert.match(overview, /my-requests\?request=\$\{request\.id\}/);
  assert.match(overviewPage, /my-requests\?request=\$\{request\.id\}/);
  assert.match(overviewPage, /my-requests\?request=\$\{upcomingRequest\.id\}/);
});
