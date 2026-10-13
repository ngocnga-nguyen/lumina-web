import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const dashboard = readSource("../app/dashboard/page.tsx");
const mobileHome = readSource(
  "../components/ProfessionalDashboardDesktopHome.tsx"
);
const shell = readSource("../components/ProfessionalDashboardShell.tsx");
const workspaceContext = readSource(
  "../components/ProfessionalWorkspaceContext.tsx"
);

test("mobile and desktop share the retained presentation and one activation panel", () => {
  assert.match(dashboard, /<ProfessionalDashboardDesktopHome/);
  assert.doesNotMatch(dashboard, /<ProfessionalDashboardMobileSummary|<ProfessionalDashboardMobileWorkspace/);
  assert.match(mobileHome, /ProfessionalDashboardHome.module.css/);
  assert.match(mobileHome, /portfolioCount/);
  assert.match(dashboard, /artist && PROFESSIONAL_REMINDERS_ENABLED && <ProfessionalToday/);
});

test("profile actions use the existing public and editing routes", () => {
  assert.match(mobileHome, /href=\{`\/artist\/\$\{artist\.id\}`\}/);
  assert.match(mobileHome, />\s*View profile/);
  assert.match(mobileHome, /href="\/dashboard\/profile"/);
  assert.match(mobileHome, />\s*Edit</);
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
  assert.match(mobileHome, /\{requestActionCount > 0 &&/);
  assert.match(mobileHome, /\{messageUnreadCount > 0 &&/);
  assert.match(mobileHome, /requestIssueCount > 0/);
});

test("business destinations and real summary counts preserve approved routes", () => {
  assert.match(mobileHome, /requestActionCount/);
  assert.match(mobileHome, /messageUnreadCount/);
  for (const id of ["clients", "services", "portfolio", "reviews"]) assert.match(mobileHome, new RegExp(`"${id}"`));
  assert.match(mobileHome, /getProfessionalWorkspaceNavigation/);
  assert.match(mobileHome, /Your business/);
  assert.match(mobileHome, /settingsItem/);
});
