import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const dashboard = readSource("../app/dashboard/page.tsx");
const mobileHome = readSource(
  "../components/ProfessionalDashboardMobileHome.tsx"
);
const shell = readSource("../components/ProfessionalDashboardShell.tsx");
const workspaceContext = readSource(
  "../components/ProfessionalWorkspaceContext.tsx"
);

test("mobile dashboard remains isolated below lg while the desktop home is separate", () => {
  assert.match(dashboard, /<ProfessionalDashboardMobileSummary/);
  assert.match(dashboard, /<ProfessionalDashboardMobileWorkspace/);
  assert.match(dashboard, /<ProfessionalDashboardDesktopHome/);
  assert.match(mobileHome, /lg:hidden/);
  assert.match(mobileHome, /portfolioEntryCount/);
  assert.match(mobileHome, /Manage services/);
  assert.match(
    dashboard,
    /panelMode === "incomplete"[\s\S]*lg:hidden/
  );
});

test("profile actions use the existing public and editing routes", () => {
  assert.match(mobileHome, /href=\{`\/artist\/\$\{professional\.id\}`\}/);
  assert.match(mobileHome, />\s*View my profile/);
  assert.match(mobileHome, /href="\/dashboard\/profile"/);
  assert.match(mobileHome, />\s*Edit profile/);
  assert.match(mobileHome, /onEditAvatar/);
});

test("mobile home reuses shell-owned counts without subscriptions or queries", () => {
  assert.match(shell, /ProfessionalWorkspaceProvider/);
  assert.match(shell, /requestActionCount: actionCounts\.requests/);
  assert.match(shell, /messageUnreadCount/);
  assert.match(workspaceContext, /requestActionCount: number/);
  assert.match(workspaceContext, /messageUnreadCount: number/);
  assert.doesNotMatch(mobileHome, /useWorkspaceActionCounts/);
  assert.doesNotMatch(mobileHome, /useWorkspaceMessageUnreadCount/);
  assert.doesNotMatch(mobileHome, /from\("client_requests"\)|supabase\.channel/);
});

test("attention cards render only for genuine nonzero counts", () => {
  assert.match(
    mobileHome,
    /requestActionCount > 0 \|\| messageUnreadCount > 0/
  );
  assert.match(mobileHome, /\{requestActionCount > 0 && \(/);
  assert.match(mobileHome, /\{messageUnreadCount > 0 && \(/);
  assert.match(mobileHome, /requestIssueCount > 0/);
});

test("overview metrics and lighter business destinations preserve approved routes", () => {
  assert.match(mobileHome, /overviewMetrics/);
  assert.match(mobileHome, /label: "Requests"/);
  assert.match(mobileHome, /label: "Unread"/);
  assert.match(mobileHome, /label: "Services"/);

  for (const id of ["clients", "services", "portfolio", "reviews"]) {
    assert.match(mobileHome, new RegExp(`"${id}"`));
  }
  assert.match(mobileHome, /getProfessionalWorkspaceNavigation/);
  assert.match(mobileHome, /Your business/);
  assert.match(mobileHome, /settingsItem/);
});
