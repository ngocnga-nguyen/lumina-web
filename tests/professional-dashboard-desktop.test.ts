import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../app/dashboard/page.tsx", import.meta.url),
  "utf8"
);
const desktopHome = readFileSync(
  new URL("../components/ProfessionalDashboardDesktopHome.tsx", import.meta.url),
  "utf8"
);
const shell = readFileSync(
  new URL("../components/ProfessionalDashboardShell.tsx", import.meta.url),
  "utf8"
);

test("desktop presentation receives existing dashboard data and activation handlers", () => {
  assert.match(dashboard, /<ProfessionalDashboardDesktopHome/);
  for (const prop of [
    "artist={artist}",
    "services={services}",
    "portfolioCount={portfolioCount}",
    "activationStatus={activationStatus}",
    "onActivateProfile={() => void activateProfile()}",
    "onDismissActivePanel={dismissActivePanel}",
  ]) {
    assert.ok(dashboard.includes(prop), `missing ${prop}`);
  }
  assert.match(desktopHome, /hidden max-w-\[1240px\] lg:block/);
  assert.match(desktopHome, /xl:grid-cols-/);
});

test("attention uses shell-owned counts and hides the entire section at zero", () => {
  assert.match(shell, /requestActionCount: actionCounts\.requests/);
  assert.match(shell, /messageUnreadCount,/);
  assert.match(desktopHome, /useProfessionalWorkspace\(\)/);
  assert.match(desktopHome, /requestActionCount > 0 \|\| messageUnreadCount > 0/);
  assert.match(desktopHome, /\{hasAttention && \(/);
  assert.match(desktopHome, /\{requestActionCount > 0 && \(/);
  assert.match(desktopHome, /\{messageUnreadCount > 0 && \(/);
  assert.match(desktopHome, /requestIssueCount > 0/);
  assert.doesNotMatch(desktopHome, /supabase|useWorkspaceActionCounts|useWorkspaceMessageUnreadCount|\.channel\(/);
});

test("activation guidance is conditional and active dismissal stays in the identity header", () => {
  for (const mode of ["incomplete", "verification_pending", "ready"]) {
    assert.match(desktopHome, new RegExp(`showProfilePanel && panelMode === "${mode}"`));
  }
  assert.match(desktopHome, /panelMode === "active" && showProfilePanel/);
  assert.match(desktopHome, /onClick={onDismissActivePanel}/);
  assert.match(desktopHome, /onClick={onActivateProfile}/);
  assert.doesNotMatch(desktopHome, /View public profile[\s\S]*View public profile/);
});

test("business links, media actions, snapshot, and short service preview retain destinations", () => {
  assert.match(desktopHome, /getProfessionalWorkspaceNavigation/);
  for (const id of ["clients", "services", "portfolio", "reviews", "settings"]) {
    assert.match(desktopHome, new RegExp(`"${id}"`));
  }
  assert.match(desktopHome, /onClick={onEditAvatar}/);
  assert.match(desktopHome, /onClick={onEditCover}/);
  assert.match(desktopHome, /href=\{`\/artist\/\$\{artist\.id\}`\}/);
  assert.match(desktopHome, /href="\/dashboard\/profile"/);
  assert.match(desktopHome, /portfolioCount/);
  assert.match(desktopHome, /artist\.availability/);
  assert.match(desktopHome, /services\.slice\(0, 3\)/);
  assert.match(desktopHome, /Manage services/);
  assert.match(desktopHome, /Professional workspace/);
  assert.match(desktopHome, /View my profile/);
});
