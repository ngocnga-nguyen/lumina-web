import assert from "node:assert/strict";
import test from "node:test";
import { getAccountMenuPosition } from "../lib/account-menu-position.ts";

for (const viewportWidth of [390, 1024, 1440]) {
  test(`account dropdown preserves its right edge and original gap at ${viewportWidth}px`, () => {
    const anchor = { top: 14, right: viewportWidth - (viewportWidth < 768 ? 16 : 32) };
    const position = getAccountMenuPosition(anchor, 220, 288, { width: viewportWidth, height: 900 });
    assert.equal(position.top, 62);
    assert.equal(position.left + 220, anchor.right);
    assert.ok(position.left >= 12);
  });
}

test("public mobile dropdown preserves the same top-12 offset with its 190px width", () => {
  assert.deepEqual(getAccountMenuPosition({ top: 13, right: 378 }, 190, 112, { width: 390, height: 844 }), { top: 61, left: 188 });
});

test("dropdown stays inside left and right viewport edges", () => {
  assert.equal(getAccountMenuPosition({ top: 14, right: 80 }, 220, 288, { width: 390, height: 844 }).left, 12);
  assert.equal(getAccountMenuPosition({ top: 14, right: 450 }, 220, 288, { width: 390, height: 844 }).left, 158);
});

test("short viewports move the dropdown upward without clipping its bottom", () => {
  const position = getAccountMenuPosition({ top: 150, right: 374 }, 220, 240, { width: 390, height: 300 });
  assert.equal(position.top, 48);
  assert.equal(position.top + 240, 288);
});

test("a scrolled anchor cannot place the menu above the viewport", () => {
  assert.equal(getAccountMenuPosition({ top: -100, right: 374 }, 220, 288, { width: 390, height: 844 }).top, 12);
});
