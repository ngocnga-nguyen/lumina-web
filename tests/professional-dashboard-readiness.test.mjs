import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as activation from "../lib/professional-activation.ts";

const require = createRequire(import.meta.url);
const Link = ({ children, ...props }) => React.createElement("a", props, children);
function loadComponent(name) {
  const source = readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(id) {
    if (id === "next/link") return { default: Link };
    if (id === "@/lib/professional-activation") return activation;
    if (id === "@/components/ProfessionalDashboardReadinessPanel") return { default: Panel };
    return require(id);
  } });
  return exports.default;
}
const Panel = loadComponent("ProfessionalDashboardReadinessPanel");
const SharedPanel = loadComponent("ProfessionalActivationPanel");
const ready = {
  artist_id: "fixture", name_ready: true, category_ready: true,
  profile_information_ready: true, location_ready: true, services_ready: true,
  license_status: "verified", license_verified: true, license_decision_message: null,
  activation_ready: true, is_active: false, activation_hidden_by_owner: false,
  profile_photo_ready: false, bio_ready: false, portfolio_ready: false, availability_ready: false,
};
const nodes = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node)
  ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = (node) => typeof node === "string" || typeof node === "number" ? String(node)
  : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
function render(patch = {}, props = {}) {
  const tree = Panel({ status: { ...ready, ...patch }, ...props });
  return { tree, html: renderToStaticMarkup(tree), links: nodes(tree).filter(n => n.type === Link), buttons: nodes(tree).filter(n => n.type === "button") };
}

test("Mina-equivalent has one category action and quiet completed essentials", () => {
  const { html, links } = render({ category_ready: false, profile_information_ready: false, activation_ready: false });
  assert.match(html, /Action required/);
  assert.match(html, /1 thing left before you can go live/);
  assert.deepEqual(links.map(text), ["Choose category "]);
  assert.equal(links[0].props.href, "/dashboard/profile?onboarding=about");
  for (const label of ["Name added", "Location added", "Services added", "License verified"]) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Add location|Add service|Verify license|Go live/);
});

test("multiple blockers render only actual missing steps in next-action order", () => {
  const { html, links } = render({ category_ready: false, location_ready: false, services_ready: false, activation_ready: false });
  assert.match(html, /3 things left before you can go live/);
  assert.deepEqual(links.map(text), ["Choose category ", "Add location ", "Add service "]);
  assert.deepEqual(links.map(n => n.props.href), ["/dashboard/profile?onboarding=about", "/dashboard/profile?onboarding=location#location", "/dashboard/services?onboarding=services"]);
  assert.match(links[0].props.className, /bg-lumina-black/);
  assert.doesNotMatch(links[1].props.className, /bg-lumina-black/);
});

for (const [flag, label] of [["name_ready", "Add name "], ["category_ready", "Choose category "], ["location_ready", "Add location "], ["services_ready", "Add service "], ["license_verified", "Verify license "]]) {
  test(`${flag} independently drives its own action from shared blocker data`, () => {
    const { links } = render({ [flag]: false, activation_ready: false, ...(flag === "license_verified" ? { license_status: "unverified" } : {}) });
    assert.deepEqual(links.map(text), [label]);
  });
}

test("license pending is waiting, with no resubmission CTA or action-required label", () => {
  const { html, links, buttons } = render({ license_verified: false, license_status: "pending", activation_ready: false });
  assert.match(html, /License review/);
  assert.match(html, /License verification pending/);
  assert.match(html, /1 review pending/);
  assert.doesNotMatch(html, /Action required|Setup actions/);
  assert.equal(links.length, 0); assert.equal(buttons.length, 0);
});

test("a pending license stays separate when other actions remain", () => {
  const { html, links } = render({ category_ready: false, license_verified: false, license_status: "pending", activation_ready: false });
  assert.match(html, /1 action left · 1 review pending/);
  assert.deepEqual(links.map(text), ["Choose category "]);
  assert.match(html, /License verification pending/);
});

test("license correction has a review action and escaped reviewer feedback", () => {
  const { html, links } = render({ license_verified: false, license_status: "rejected", activation_ready: false, license_decision_message: "Check <jurisdiction> & resubmit." });
  assert.match(html, /License action needed/);
  assert.match(html, /Update license information/);
  assert.match(html, /Check &lt;jurisdiction&gt; &amp; resubmit/);
  assert.deepEqual(links.map(text), ["Review license "]);
  assert.equal(links[0].props.href, "/dashboard/settings#license-verification");
});

test("ready and hidden use the supplied activation handler without redefining authority", () => {
  for (const hidden of [false, true]) {
    let calls = 0;
    const { html, buttons } = render({ activation_hidden_by_owner: hidden }, { onActivate: () => calls++ });
    assert.match(html, /Your profile is still private until you choose to publish it/);
    assert.match(html, hidden ? /You have hidden your profile/ : /Ready to go live/);
    assert.equal(buttons.length, 1); assert.equal(text(buttons[0]), "Go live");
    assert.equal(calls, 0); buttons[0].props.onClick(); assert.equal(calls, 1);
  }
  assert.equal(render({}, { onActivate() {}, saving: true }).buttons[0].props.disabled, true);
  assert.equal(text(render({}, { onActivate() {}, saving: true }).buttons[0]), "Going live…");
  assert.equal(render().buttons.length, 0);
  assert.equal(render({ activation_ready: false, category_ready: false }, { onActivate() {} }).buttons.length, 0);
});

test("live is quiet and respects existing dismissal logic", () => {
  const { html, links, buttons } = render({ is_active: true });
  assert.match(html, /Live/);
  assert.doesNotMatch(html, /Action required|Setup actions|Completed essentials|Go live/);
  assert.equal(links.length + buttons.length, 0);
  assert.equal(activation.shouldShowProfessionalProfilePanel({ ...ready, is_active: true }, true), false);
});

test("dashboard presentation is opt-in; onboarding and settings keep the original panel", () => {
  const status = { ...ready, category_ready: false, activation_ready: false };
  const original = renderToStaticMarkup(React.createElement(SharedPanel, { status }));
  const dashboard = renderToStaticMarkup(React.createElement(SharedPanel, { status, presentation: "dashboard" }));
  assert.match(original, /Your Lumina profile/); assert.doesNotMatch(original, /Action required/);
  assert.match(dashboard, /Action required/); assert.doesNotMatch(dashboard, /Your Lumina profile/);
});

test("semantic labels distinguish ready, live, review, correction and intentional privacy without color", () => {
  for (const [patch, label] of [
    [{}, "Ready"],
    [{ is_active: true }, "Live"],
    [{ activation_hidden_by_owner: true }, "Profile hidden"],
    [{ license_verified: false, license_status: "pending", activation_ready: false }, "License review"],
    [{ license_verified: false, license_status: "rejected", activation_ready: false }, "License action needed"],
    [{ category_ready: false, activation_ready: false }, "Action required"],
  ]) {
    const { tree } = render(patch);
    assert.ok(nodes(tree).some(n => ["p", "h2"].includes(n.type) && text(n) === label), label);
  }
});

test("license correction among other blockers retains all actions and review feedback", () => {
  const { html, links } = render({ category_ready: false, license_verified: false, license_status: "rejected", activation_ready: false, license_decision_message: "Update your jurisdiction." });
  assert.match(html, /2 things left/);
  assert.match(html, /Update your jurisdiction/);
  assert.deepEqual(links.map(text), ["Choose category ", "Review license "]);
});
