import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const mobile = read("components/ProfessionalDashboardMobileHome.tsx");

test("only phone-only presentation classes change in the mobile dashboard", () => {
  assert.equal(hash(mobile.replace(/ max-sm:[^\s"]+/g, "")), "a6a8ed2a6399709c8b0391132c5ab80ed9de4c0b8caec5eff2d64aec383df7f6");
});

test("avatar remains the 64px edit target while its smaller badge is not clipped", () => {
  assert.match(mobile, /onClick=\{onEditAvatar\}/);
  assert.match(mobile, /h-16 w-16[^\n]*max-sm:overflow-visible/);
  assert.match(mobile, /aria-label="Change profile photo"/);
  assert.match(mobile, /object-cover max-sm:rounded-full/);
  assert.match(mobile, /max-sm:-bottom-0\.5 max-sm:-right-0\.5 max-sm:h-5 max-sm:w-5 max-sm:shadow-none/);
  assert.match(mobile, /<Pencil size=\{11\}/);
});

test("desktop, dashboard data/actions, and shared media editor remain untouched", () => {
  const unchanged = {
    "components/ProfessionalDashboardDesktopHome.tsx": "11c86d7e31447cb5b5f0ad4b9476e94101a642d6c1743215aafe56224c7257f7",
    "app/dashboard/page.tsx": "353904949885364a69c152c539415c81972d0e9c8c105057a66b6e85fc9c6a1d",
    "components/ProfessionalProfileMediaEditor.tsx": "d6cd4395cbc7d874287a31054ec350b9f77ca114859019c663be2a48e214586c",
  };
  for (const [path, expected] of Object.entries(unchanged)) assert.equal(hash(read(path)), expected, path);
});
