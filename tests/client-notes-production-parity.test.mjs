import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/ClientNotesCategoryRail.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require(id) {
  if (id.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
  return require(id);
} });
const Rail = exports.default;

test("production rail exposes pin first and All selected, without pretend categories or Add", () => {
  const html = renderToStaticMarkup(React.createElement(Rail, { view: "all", noteCount: 3, pinnedCount: 1, onViewChange() {} }));
  assert.equal((html.match(/<button /g) || []).length, 2);
  assert.ok(html.indexOf('aria-label="Pinned notes, 1"') < html.indexOf('class="all"'));
  assert.match(html, /class="all" aria-pressed="true"/);
  assert.doesNotMatch(html, />Pinned<|General|Service|Follow-up|Ideas|Aftercare|Add category/);
});

test("pin and All remain view controls without invoking any note mutation", () => {
  const changes = [];
  const tree = Rail({ view: "pinned", noteCount: 3, pinnedCount: 1, onViewChange: view => changes.push(view) });
  const [pin, all] = tree.props.children;
  assert.equal(pin.props["aria-pressed"], true);
  assert.equal(all.props["aria-pressed"], false);
  assert.deepEqual(changes, []);
  pin.props.onClick();
  all.props.onClick();
  assert.deepEqual(changes, ["pinned", "all"]);
});

test("real Notes route uses the same safe rail in local and production builds", () => {
  const page = readFileSync(new URL("../app/dashboard/clients/[clientId]/notes/page.tsx", import.meta.url), "utf8");
  const production = page.split('<ClientNotesCategoryRail view=')[1]?.split('{editorOpen &&')[0];
  assert.ok(production);
  assert.match(page, /<ClientNotesCategoryRail view=\{filter\}/);
  assert.doesNotMatch(page, /NODE_ENV|import LocalClientNoteOrganization from|<LocalClientNoteOrganization/);
  assert.doesNotMatch(production, /filters\.map|Add category|initialCategories|LOCAL_NOTE_CATEGORY_EXAMPLES/);
  assert.match(production, /Organize notes into categories that fit your workflow\./);
  assert.match(production, /<Pin size=\{13\} strokeWidth=\{1\.5\}/);
  assert.match(page, /<ClientNoteCard[^\n]+onTogglePin=\{\(\) => void togglePin\(note\)\}/);
});
