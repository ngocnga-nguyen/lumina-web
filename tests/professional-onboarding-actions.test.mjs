import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as targets from "../lib/professional-action-targets.ts";
import * as activation from "../lib/professional-activation.ts";
const require = createRequire(import.meta.url);
const Link = ({ children, ...props }) => React.createElement("a", props, children);
function load(path, overrides = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, ...globals, require(id) {
    if (id in overrides) return overrides[id];
    if (id === "next/link" || id === "@/components/ProfessionalActionLink") return { default: Link };
    if (id === "@/lib/professional-action-targets") return targets;
    if (id === "@/lib/professional-activation") return activation;
    if (id === "@/components/ProfessionalDashboardReadinessPanel") return { default: Panel };
    if (id === "@/components/ProfessionalActivationPanel") return { default: SharedPanel };
    if (id === "@/lib/professional-activation-client") return {};
    return require(id);
  } });
  return exports.default;
}
const Panel = load("components/ProfessionalDashboardReadinessPanel.tsx");
const SharedPanel = load("components/ProfessionalActivationPanel.tsx");
const ready = { artist_id: "fixture", name_ready: true, category_ready: true, profile_information_ready: true,
  location_ready: true, services_ready: true, license_verified: true, license_status: "verified", activation_ready: true,
  is_active: false, activation_hidden_by_owner: false, profile_photo_ready: false, bio_ready: false, availability_ready: false,
  portfolio_ready: false, license_decision_message: null };
function renderOnboarding(patch = {}) {
  const Page = load("app/dashboard/onboarding/page.tsx", { react: { ...React, useState: () => [false, () => {}] }, "@/components/ProfessionalReadinessProvider": { useProfessionalReadiness: () => ({ status: { ...ready, ...patch }, error: false, refresh() {} }) } });
  return renderToStaticMarkup(React.createElement(Page));
}

test("required action destinations resolve to explicit controls on the matching surface", () => {
  for (const [id, target, surface] of [["name", "identity", "profile"], ["category", "category", "profile"], ["location", "location", "profile"], ["services", "service", "services"], ["license", "license", "settings"]]) {
    const url = new URL(targets.professionalActionHrefs[id], "https://lumina.test");
    assert.equal(url.pathname, "/dashboard/" + surface);
    assert.equal(targets.getProfessionalActionTarget(url.search, surface), target);
  }
});

test("focus targets are whitelisted per editor, including optional enrichment", () => {
  for (const bad of ["", "?focus=unknown", "?focus=category%22%5D", "?focus=__proto__", "?focus=javascript:alert(1)"]) {
    assert.equal(targets.getProfessionalActionTarget(bad, "profile"), null);
  }
  assert.equal(targets.getProfessionalActionTarget("?focus=category", "settings"), null);
  assert.equal(targets.getProfessionalActionTarget("?focus=license", "services"), null);
  for (const value of ["photo", "cover", "bio", "availability"]) assert.equal(targets.getProfessionalActionTarget("?focus=" + value, "profile"), value);
});

test("onboarding shows category once as an action, completed essentials quietly, and no generic review rows", () => {
  const html = renderOnboarding({ category_ready: false, activation_ready: false });
  assert.match(html, /1 thing left/);
  assert.equal((html.match(/Choose category/g) || []).length, 1);
  assert.match(html, /Required setup/);
  assert.match(html, /Name added/); assert.match(html, /Location added/);
  assert.doesNotMatch(html, /Professional onboarding steps|>Review<|Add location|Add service|Verify license/);
});

test("four-blocker onboarding shows all and only actual required actions", () => {
  const html = renderOnboarding({ category_ready: false, location_ready: false, services_ready: false, license_verified: false, license_status: "unverified", activation_ready: false });
  assert.match(html, /4 things left/);
  for (const label of ["Choose category", "Add location", "Add service", "Verify license"]) assert.equal(html.split(label).length - 1, 1);
  assert.doesNotMatch(html, /Location added|Services added|License verified/);
});

test("pending and correction preserve their different license actions", () => {
  const pending = renderOnboarding({ license_verified: false, license_status: "pending", activation_ready: false });
  assert.match(pending, /License review/); assert.doesNotMatch(pending, /Verify license|Review license|>Go live/);
  const correction = renderOnboarding({ license_verified: false, license_status: "rejected", activation_ready: false });
  assert.match(correction, /License action needed/); assert.match(correction, /Review license/);
});

test("optional content absence never blocks ready; ready/hidden have one explicit button and live has none", () => {
  for (const patch of [{}, { activation_hidden_by_owner: true }]) {
    const html = renderOnboarding(patch);
    assert.equal((html.match(/>Go live</g) || []).length, 1);
    assert.match(html, /still private until you choose to publish/);
    assert.match(html, /Improve your profile · optional/);
    assert.match(html, /They never block going live/);
    assert.doesNotMatch(html, /Setup actions|things left/);
  }
  const live = renderOnboarding({ is_active: true });
  assert.match(live, /visible to clients/); assert.doesNotMatch(live, />Go live</);
});

test("existing optional content is presented as editable, not missing", () => {
  const html = renderOnboarding({ profile_photo_ready: true, bio_ready: true, availability_ready: true, portfolio_ready: true });
  assert.equal((html.match(/>Edit →</g) || []).length, 4);
  assert.doesNotMatch(html, /Add a photo|Add a bio|Missing/);
});

test("same-page action replays arrival even at the identical URL; modifier and cross-page clicks retain normal link behavior", () => {
  const calls = [], events = [];
  const ActionLink = load("components/ProfessionalActionLink.tsx", { "next/navigation": { useRouter: () => ({ push: (...args) => calls.push(args) }) } }, {
    URL, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: { location: { origin: "https://lumina.test", pathname: "/dashboard/settings" }, dispatchEvent: event => events.push(event) },
  });
  let prevented = 0;
  const click = { button: 0, preventDefault: () => prevented++ };
  const link = ActionLink({ href: targets.professionalActionHrefs.license, children: "Review license" });
  link.props.onClick(click); link.props.onClick(click);
  assert.equal(prevented, 2); assert.equal(calls.length, 2); assert.equal(events.length, 2);
  assert.equal(events[0].type, targets.professionalActionEvent);
  assert.equal(events[0].detail, "?onboarding=license&focus=license");
  link.props.onClick({ ...click, ctrlKey: true });
  ActionLink({ href: targets.professionalActionHrefs.category }).props.onClick(click);
  assert.equal(calls.length, 2); assert.equal(prevented, 2);
});
