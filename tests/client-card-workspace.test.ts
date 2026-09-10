import assert from "node:assert/strict";
import test from "node:test";

import {
  addClientCardTag,
  CLIENT_CARD_SECTION_IDS,
  moveClientCardSection,
  moveClientCardSectionWithinColumn,
  parseClientCardWorkspacePreferences,
  toggleClientCardSection,
} from "../lib/client-card-workspace.ts";

test("legacy Client Cards receive a complete V1 workspace without a backfill", () => {
  const preferences = parseClientCardWorkspacePreferences(null);
  assert.equal(preferences.version, 1);
  assert.equal(preferences.template, "general");
  assert.deepEqual(preferences.order, [...CLIENT_CARD_SECTION_IDS]);
  assert.deepEqual(preferences.collapsed, []);
  assert.deepEqual(preferences.hidden, []);
});

test("unknown, duplicate, or missing section IDs are normalized safely", () => {
  const preferences = parseClientCardWorkspacePreferences({
    version: 1,
    order: ["results", "results", "unknown", "notes"],
    hidden: ["service_history", "results", "unknown"],
    collapsed: ["consultation", "consultation", "unknown"],
    template: "not-a-template",
  });

  assert.deepEqual(preferences.order, [
    "results",
    "notes",
    "service_history",
    "consultation",
    "preferences",
  ]);
  assert.deepEqual(preferences.hidden, ["results"]);
  assert.deepEqual(preferences.collapsed, ["consultation"]);
  assert.equal(preferences.template, "general");
});

test("Service History may collapse and reorder but cannot be hidden", () => {
  const initial = parseClientCardWorkspacePreferences(null);
  const moved = moveClientCardSection(initial, "service_history", 1);
  const collapsed = toggleClientCardSection(moved, "service_history", "collapsed");
  const hidden = toggleClientCardSection(collapsed, "service_history", "hidden");

  assert.equal(moved.order[1], "service_history");
  assert.deepEqual(collapsed.collapsed, ["service_history"]);
  assert.deepEqual(hidden.hidden, []);
});

test("modular grid reordering moves sections within their visual column", () => {
  const initial = parseClientCardWorkspacePreferences(null);
  const movedMain = moveClientCardSectionWithinColumn(initial, "consultation", -1);
  const movedSide = moveClientCardSectionWithinColumn(movedMain, "preferences", -1);

  assert.deepEqual(
    movedMain.order.filter((section) => ["service_history", "results", "consultation"].includes(section)),
    ["service_history", "consultation", "results"]
  );
  assert.deepEqual(
    movedSide.order.filter((section) => ["notes", "preferences"].includes(section)),
    ["preferences", "notes"]
  );
});

test("hiding a module changes presentation metadata only", () => {
  const initial = parseClientCardWorkspacePreferences(null);
  const hidden = toggleClientCardSection(initial, "consultation", "hidden");
  assert.deepEqual(hidden.hidden, ["consultation"]);
  assert.deepEqual(hidden.order, initial.order);
});

test("tags are trimmed and reject case-insensitive duplicates", () => {
  const added = addClientCardTag([], "  Prefers   evenings  ");
  assert.deepEqual(added, { tags: ["Prefers evenings"], error: "" });

  const duplicate = addClientCardTag(added.tags, "prefers evenings");
  assert.match(duplicate.error, /already/);
  assert.deepEqual(duplicate.tags, added.tags);
});
