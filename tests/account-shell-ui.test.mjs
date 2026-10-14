import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as visibility from "../lib/professional-profile-visibility.ts";
import * as confirmation from "../lib/profile-visibility-confirmation.ts";
import { getClientWorkspaceActionCounts } from "../lib/request-completion.ts";
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
function load(path) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    if (id.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (id === "@/components/IdentityAvatar") return { default: ({ name }) => React.createElement("span", null, name) };
    if (id === "@/lib/professional-profile-visibility") return visibility;
    if (id === "@/lib/profile-visibility-confirmation") return confirmation;
    return require(id);
  } });
  return exports;
}
const { VisibilityConfirmationBanner } = load("components/ProfessionalVisibilityConfirmation.tsx");
test("visibility confirmations are dismissible and do not imply account deactivation", () => {
  for (const isVisible of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(VisibilityConfirmationBanner, { isVisible, onDismiss() {} }));
    assert.match(html, /aria-label="Dismiss visibility confirmation"/);
    assert.match(html, isVisible ? /Visible to clients/ : /Hidden from clients/);
    assert.match(html, isVisible ? /Your profile can be discovered across Lumina\./ : /Your profile is no longer shown in Discover, search, or map\./);
    assert.doesNotMatch(html, /disabled|verified|circle-check|account is hidden/i);
  }
});
test("client settings presents client-specific identity and account actions", () => {
  const Overview = load("components/ClientSettingsOverview.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Overview, {
    name: "Sample Client", email: "client@example.test", imageUrl: "", editing: false,
    showEmailChange: false, sendingPasswordReset: false, signingOutOthers: false,
  }));
  for (const text of ["Profile &amp; account", "Account &amp; security", "Edit profile", "Change email", "Change password", "Sign out others", "Change profile photo"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /license|verification|visibility|Professional/);
});
test("review badge counts eligible unreviewed appointments, independent of opening a page", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const request = { id: "eligible", status: "accepted", client_status: "confirmed", booking_status: "booked", completion_protocol_version: 3, appointment_confirmed_at: "2026-10-01T10:00:00Z", scheduled_for: "2026-10-01T10:00:00Z", expected_end_at: "2026-10-01T11:00:00Z" };
  assert.equal(getClientWorkspaceActionCounts([request], new Set(), now).reviews, 1);
  assert.equal(getClientWorkspaceActionCounts([request], new Set(), now).reviews, 1);
  assert.equal(getClientWorkspaceActionCounts([request], new Set(["eligible"]), now).reviews, 0);
  assert.equal(getClientWorkspaceActionCounts([], new Set(["old-reviewed-appointment"]), now).reviews, 0);
});
test("both navigation shells use the same actionable Reviews source", () => {
  for (const path of ["components/ClientWorkspaceShell.tsx", "components/AuthenticatedWorkspaceRail.tsx"]) {
    const source = read(path);
    assert.match(source, /count: actionCounts.reviews/);
    assert.match(source, /label: "review-ready appointment"/);
    assert.doesNotMatch(source, /count: clientNotifications.reviewUnreadCount/);
  }
});
