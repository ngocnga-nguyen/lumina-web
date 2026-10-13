import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as visibility from "../lib/professional-profile-visibility.ts";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/ProfessionalDashboardDesktopHome.tsx");
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
} }).outputText;
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const Setup = () => React.createElement("section", null, "Existing setup guidance");
const exports = {};
vm.runInNewContext(code, { exports, require(id) {
  if (id === "next/link") return { default: Link };
  if (id.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
  if (id === "@/lib/professional-profile-visibility") return visibility;
  if (id === "@/components/ProfessionalActivationPanel") return { default: Setup };
  if (id === "@/components/IdentityAvatar") return { default: () => null };
  if (id === "@/components/WorkspaceNavigationIndicator") return { getWorkspaceIndicatorLabel: () => "" };
  if (id === "@/components/ProfessionalWorkspaceContext") return { useProfessionalWorkspace: () => ({ requestActionCount: 0, requestIssueCount: 0, messageUnreadCount: 0 }) };
  if (id === "@/lib/workspace-navigation") return { getProfessionalWorkspaceNavigation: () => [] };
  return require(id);
} });
const Dashboard = exports.default;
function render(isActive, ready = true) {
  return renderToStaticMarkup(Dashboard({
    artist: { id: "local-render-fixture", name: "Preview", category: "Nail Technician" },
    services: [], portfolioCount: 0,
    activationStatus: { is_active: isActive, activation_ready: ready },
    // Deliberately conflicting readiness labels cannot determine public visibility.
    panelMode: isActive ? "incomplete" : "active", profileStatus: isActive ? "Setup needed" : "Live",
    showProfilePanel: true, activatingProfile: false,
    onActivateProfile: () => { throw new Error("render must not write visibility"); },
    onEditAvatar() {}, onEditCover() {},
  }));
}

test("ON uses visibility directly even when setup labels differ", () => {
  const html = render(true, false);
  assert.match(html, />Live<\/span>/);
  assert.match(html, /Visible to clients/);
  assert.match(html, /Your profile can be discovered across Lumina\./);
  assert.match(html, /class="liveDot"/);
  assert.doesNotMatch(html, /lucide-eye-off|>·<|Hidden from clients|Setup needed/);
});

test("OFF overrides stale Live labels without disabling the workspace", () => {
  const html = render(false);
  assert.match(html, />Hidden<\/span>/);
  assert.match(html, /Hidden from clients/);
  assert.match(html, /Your profile is not visible in Discover, search, or map\./);
  assert.match(html, /hiddenBanner/);
  assert.equal((html.match(/lucide-eye-off/g) || []).length, 2);
  assert.doesNotMatch(html, />Live<\/span>|class="liveDot"|Existing setup guidance|disabled/);
  for (const title of ["Your business.", "Manage your business", "Business snapshot"]) assert.ok(html.includes(title));
});

test("incomplete hidden profiles keep existing setup guidance", () => {
  const html = render(false, false);
  assert.match(html, /Hidden from clients/);
  assert.match(html, /Existing setup guidance/);
});

test("Settings shares visibility state and semantics through one responsive presentation", () => {
  const settings = read("app/dashboard/settings/page.tsx");
  const overview = read("components/ProfessionalSettingsOverview.tsx");
  assert.match(settings, /const isVisible = Boolean\(activationStatus\?\.is_active\)/);
  assert.match(settings, /isVisible=\{isVisible\}/);
  assert.match(overview, /getProfessionalProfileVisibility\(isVisible\)/);
  assert.match(overview, /visibility\.label/);
  assert.match(overview, /title=\{visibility\.title\}/);
  assert.match(overview, /aria-pressed=\{isVisible\}/);
  assert.match(overview, /Your professional account and workspace remain available\./);
  assert.match(settings, /const nextVisibility = !isVisible/);
  assert.match(settings, /setProfessionalProfileVisibility\(\s*nextVisibility\s*\)/);
  assert.match(settings, /await refreshReadiness\(\)/);
});
