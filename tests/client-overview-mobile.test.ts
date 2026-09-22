import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getClientFirstName } from "../lib/client-overview-name.ts";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const overviewPage = readSource("../app/client/page.tsx");
const mobileOverview = readSource(
  "../components/ClientOverviewMobileHome.tsx"
);
const desktopOverview = readSource(
  "../components/ClientOverviewDesktopHome.tsx"
);
const onboarding = readSource("../components/ClientOnboardingWelcome.tsx");
const shell = readSource("../components/ClientWorkspaceShell.tsx");
const workspaceContext = readSource(
  "../components/ClientWorkspaceContext.tsx"
);

test("mobile overview preserves the approved information order", () => {
  const welcome = mobileOverview.indexOf("Your Lumina");
  const nextUp = mobileOverview.indexOf("Next up");
  const activity = mobileOverview.indexOf("Client activity summary");
  const recent = mobileOverview.indexOf("Recent requests");
  const discover = mobileOverview.lastIndexOf("Browse professionals");

  assert.ok(welcome >= 0);
  assert.ok(nextUp > welcome);
  assert.ok(activity > nextUp);
  assert.ok(recent > activity);
  assert.ok(discover > recent);
});

test("mobile and desktop overview presentations stay breakpoint-isolated", () => {
  assert.match(overviewPage, /<ClientOverviewMobileHome/);
  assert.match(overviewPage, /<ClientOverviewDesktopHome/);
  assert.match(desktopOverview, /hidden max-w-\[1240px\].*lg:block/);
  assert.match(mobileOverview, /lg:hidden/);
  assert.match(mobileOverview, /Nothing confirmed yet/);
  assert.match(mobileOverview, /View request/);
});

test("mobile first name handles whitespace without retaining a second name", () => {
  assert.equal(getClientFirstName("Nga Setting"), "Nga");
  assert.equal(getClientFirstName("  Nga   Setting  "), "Nga");
  assert.equal(getClientFirstName(""), "");
  assert.match(mobileOverview, /getClientFirstName\(clientName\)/);
});

test("desktop prioritizes next up, compact activity, recent requests, then browse", () => {
  const nextUp = desktopOverview.indexOf("Next up");
  const activity = desktopOverview.indexOf("Client activity summary");
  const recent = desktopOverview.indexOf("Recent requests");
  const browse = desktopOverview.lastIndexOf("Browse professionals");
  assert.ok(nextUp >= 0 && activity > nextUp && recent > activity && browse > recent);
  assert.match(desktopOverview, /nextRequest \? \(/);
  assert.match(desktopOverview, /Nothing confirmed yet/);
  assert.match(desktopOverview, /reviewReadyCount/);
  assert.doesNotMatch(desktopOverview, /supabase|useWorkspaceActionCounts/);
});

test("review-ready metric reuses the shell-owned authoritative count", () => {
  assert.match(shell, /ClientWorkspaceProvider/);
  assert.match(shell, /reviewReadyCount: actionCounts\.reviews/);
  assert.match(workspaceContext, /reviewReadyCount: number/);
  assert.match(mobileOverview, /useClientWorkspace/);
  assert.match(mobileOverview, /reviewReadyCount/);
  assert.doesNotMatch(mobileOverview, /useWorkspaceActionCounts|supabase/);
});

test("mobile onboarding is compact automatically and expands on manual reopen", () => {
  assert.match(onboarding, /variant\?: "default" \| "mobile-compact"/);
  assert.match(onboarding, /initiallyExpanded/);
  assert.match(onboarding, /Show steps/);
  assert.match(onboarding, /Hide steps/);
  assert.match(mobileOverview, /initiallyExpanded=\{welcomeManuallyOpen\}/);
  assert.match(overviewPage, /shouldShowClientWelcome/);
});

test("recent requests and metrics reuse existing overview data", () => {
  assert.match(overviewPage, /activeRequestCount=\{activeRequests\.length\}/);
  assert.match(overviewPage, /savedCount=\{savedCount\}/);
  assert.match(overviewPage, /recentRequests=\{mobileRecentRequests\}/);
  assert.match(overviewPage, /dateLabel: formatDate\(recentRequests\[index\]\.created_at\)/);
  assert.match(overviewPage, /recentRequests=\{desktopRecentRequests\}/);
  assert.match(mobileOverview, /recentRequests\.map/);
  assert.match(mobileOverview, /grid grid-cols-3/);
});
