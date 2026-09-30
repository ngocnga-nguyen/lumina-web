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

test("desktop and dashboard match Step 8.8A; shared media editor stays unchanged", () => {
  const unchanged = {
    "components/ProfessionalDashboardDesktopHome.tsx": "95b4d0fce58d67f994fa266fa243b8a287b52de4d77639341e0f3bcecd234bca",
    "app/dashboard/page.tsx": "a8443f19c1409ae18508661aad24fd2ec127e1d67bc64cd2b1bcfed224274ae5",
    "components/ProfessionalProfileMediaEditor.tsx": "d6cd4395cbc7d874287a31054ec350b9f77ca114859019c663be2a48e214586c",
  };
  for (const [path, expected] of Object.entries(unchanged)) assert.equal(hash(read(path)), expected, path);
});
