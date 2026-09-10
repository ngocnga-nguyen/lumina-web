import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RealtimeClient } from "@supabase/realtime-js";

const readSource = (path: string) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("Supabase reuses a realtime channel object when topics collide", () => {
  const realtime = new RealtimeClient("ws://127.0.0.1:65535/socket", {
    params: { apikey: "test" },
  });

  const first = realtime.channel("route-transition-test");
  const duplicate = realtime.channel("route-transition-test");
  const isolated = realtime.channel("route-transition-test-next-mount");

  assert.equal(duplicate, first);
  assert.notEqual(isolated, first);
});

test("every route-mounted realtime source uses a mount-specific topic", async () => {
  const [actionCounts, unreadCounts, inbox, clientRequests, artistRequests] =
    await Promise.all([
      readSource("../lib/use-workspace-action-counts.ts"),
      readSource("../lib/use-workspace-message-unread-count.ts"),
      readSource("../lib/use-request-inbox.ts"),
      readSource("../app/my-requests/page.tsx"),
      readSource("../app/dashboard/requests/page.tsx"),
    ]);

  for (const source of [
    actionCounts,
    unreadCounts,
    inbox,
    clientRequests,
    artistRequests,
  ]) {
    assert.match(source, /createRealtimeChannelTopic\(/);
  }
});

test("realtime channel topics are fresh for every subscription mount", async () => {
  const { createRealtimeChannelTopic } = await import(
    "../lib/realtime-channel.ts"
  );
  const topics = new Set(
    Array.from({ length: 100 }, () =>
      createRealtimeChannelTopic("route-transition-test")
    )
  );

  assert.equal(topics.size, 100);
});

test("hidden public rail subscriptions are disabled inside authenticated workspaces", async () => {
  const publicRail = await readSource(
    "../components/AuthenticatedWorkspaceRail.tsx"
  );

  assert.match(
    publicRail,
    /const workspaceAccountId = role && !excludedRoute \? accountId : null/
  );
  assert.match(
    publicRail,
    /useWorkspaceActionCounts\([\s\S]*?workspaceAccountId/
  );
  assert.match(
    publicRail,
    /useWorkspaceMessageUnreadCount\([\s\S]*?workspaceAccountId/
  );
});

test("workspace auth failures stay contained and can be retried", async () => {
  const [clientShell, professionalShell] = await Promise.all([
    readSource("../components/ClientWorkspaceShell.tsx"),
    readSource("../components/ProfessionalDashboardShell.tsx"),
  ]);

  for (const shell of [clientShell, professionalShell]) {
    assert.match(shell, /error: authError/);
    assert.match(shell, /if \(authError\) throw authError/);
    assert.match(shell, /setAccountLoadError\(true\)/);
    assert.match(shell, /setAccountLoadAttempt\(\(current\) => current \+ 1\)/);
  }
});

test("route-local realtime callbacks stop committing after cleanup", async () => {
  const [inbox, clientRequests, artistRequests] = await Promise.all([
    readSource("../lib/use-request-inbox.ts"),
    readSource("../app/my-requests/page.tsx"),
    readSource("../app/dashboard/requests/page.tsx"),
  ]);

  for (const source of [inbox, clientRequests, artistRequests]) {
    assert.match(source, /cancelled = true/);
    assert.match(source, /if \(cancelled\) return/);
    assert.match(source, /removeChannel\(channel\)/);
  }
});

test("account and affected route loaders contain recoverable failures", async () => {
  const [accountMenu, overview, saved, portfolio, requestInbox] =
    await Promise.all([
      readSource("../components/AccountMenu.tsx"),
      readSource("../app/client/page.tsx"),
      readSource("../app/saved/page.tsx"),
      readSource("../app/dashboard/portfolio/page.tsx"),
      readSource("../components/RequestInbox.tsx"),
    ]);

  assert.match(accountMenu, /let cancelled = false/);
  assert.match(accountMenu, /if \(cancelled\) return/);

  for (const source of [overview, saved, portfolio]) {
    assert.match(source, /\.catch\(\(error\) =>/);
    assert.match(source, /Try again/);
  }

  assert.match(requestInbox, /onClick=\{\(\) => void inbox\.refresh\(\)\}/);
});
