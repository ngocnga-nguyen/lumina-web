import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as visibility from "../lib/professional-profile-visibility.ts";
import * as verification from "../lib/professional-license-verification.ts";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/ProfessionalSettingsOverview.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const ErrorView = () => null;
const exports = {};
vm.runInNewContext(code, { exports, require(id) {
  if (id === "next/link") return { default: Link };
  if (id.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
  if (id === "@/lib/professional-profile-visibility") return visibility;
  if (id === "@/lib/professional-license-verification") return verification;
  if (id === "@/components/WorkspaceLoadError") return { default: ErrorView };
  return require(id);
} });
const Overview = exports.default;
const nodes = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
function props(patch = {}) {
  return { email: "artist@example.com", loading: false, loadError: false, isVisible: true, activationReady: true,
    visibilityLoading: false, sendingPasswordReset: false, signingOutOthers: false,
    verification: { status: "verified", submitted_at: "fixture", decision_message: null }, onboardingMode: false,
    desktopEmailEditor: React.createElement("input", { "data-testid": "existing-email-form" }),
    desktopLicenseEditor: React.createElement("input", { "data-testid": "existing-license-form" }),
    onRetry() {}, onToggleVisibility() {}, onEditEmailMobile() {}, onEditEmailDesktop() {}, onPasswordMobile() {}, onPasswordDesktop() {}, onEditLicenseMobile() {}, onSignOutOthers() {}, onSignOut() {}, ...patch };
}

test("compact controls retain every supplied account action without invoking it during render", () => {
  const calls = [];
  const handlers = Object.fromEntries(["onToggleVisibility", "onEditEmailMobile", "onEditEmailDesktop", "onPasswordMobile", "onPasswordDesktop", "onEditLicenseMobile", "onSignOutOthers", "onSignOut"].map(name => [name, () => calls.push(name)]));
  const p = props(handlers);
  const tree = Overview(p);
  assert.equal(calls.length, 0);
  for (const [name, handler] of Object.entries(handlers)) {
    const controls = nodes(tree).filter(node => node.type === "button" && node.props.onClick === handler);
    assert.equal(controls.length, 1, name);
    controls[0].props.onClick();
  }
  assert.deepEqual(calls, Object.keys(handlers));
  assert.ok(nodes(tree).some(node => node === p.desktopEmailEditor));
  assert.ok(nodes(tree).some(node => node === p.desktopLicenseEditor));
});

test("visibility and security busy states preserve the existing disabling rules", () => {
  for (const [patch, disabled] of [[{ isVisible: false, activationReady: false }, true], [{ isVisible: false, activationReady: true }, false], [{ isVisible: true, activationReady: false }, false], [{ visibilityLoading: true }, true]]) {
    const p = props(patch);
    const toggle = nodes(Overview(p)).find(node => node.props?.onClick === p.onToggleVisibility);
    assert.equal(toggle.props.disabled, disabled);
    assert.equal(toggle.props["aria-pressed"], p.isVisible);
  }
  const p = props({ sendingPasswordReset: true, signingOutOthers: true });
  for (const handler of [p.onPasswordDesktop, p.onSignOutOthers]) assert.equal(nodes(Overview(p)).find(node => node.props?.onClick === handler).props.disabled, true);
});

test("visibility and verified license remain independent; explanations stay disclosed on demand", () => {
  const p = props({ isVisible: false });
  const tree = Overview(p);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Hidden/);
  assert.match(html, /Verified/);
  assert.match(html, /Your profile is hidden from client discovery\./);
  assert.match(html, /professional account and workspace remain available/);
  assert.doesNotMatch(html, />Live</);
  assert.ok(nodes(tree).filter(node => node.type === "details").every(node => !node.props.open));
  const onboarding = nodes(Overview(props({ onboardingMode: true }))).filter(node => node.type === "details" && node.props.open);
  assert.equal(onboarding.length, 1);
  assert.ok(nodes(onboarding[0]).some(node => node.props?.["data-testid"] === "existing-license-form"));
});

test("loading and recovery retain their route-owned retry action", () => {
  assert.equal(nodes(Overview(props({ loading: true }))).filter(node => node.type === "button").length, 0);
  const p = props({ loadError: true });
  const error = nodes(Overview(p)).find(node => node.type === ErrorView);
  assert.equal(error.props.onRetry, p.onRetry);
});
