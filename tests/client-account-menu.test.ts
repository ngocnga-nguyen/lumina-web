import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const menu = read("components/AccountMenu.tsx");
const storefront = read("app/artist/[slug]/page.tsx");

test("both client dropdowns reuse the existing local-session sign-out handler", () => {
  assert.match(menu, /export const handleSignOut = async \(\) => \{\s*await supabase\.auth\.signOut\(\{ scope: "local" \}\);\s*window\.location\.href = "\/login";\s*\};/);
  assert.equal((menu.match(/supabase\.auth\.signOut\(/g) || []).length, 1);
  assert.match(storefront, /import \{ handleSignOut \} from "@\/components\/AccountMenu"/);
  assert.match(storefront, /onClick=\{handleSignOut\}/);
  assert.doesNotMatch(storefront, /supabase\.auth\.signOut\(/);
});

test("client actions are Profile & settings, divider, Sign out", () => {
  const sharedClient = menu.slice(menu.indexOf(') : accountRole === "client" ? ('), menu.indexOf('          {isLuminaAdmin &&'));
  const publicClient = storefront.slice(storefront.indexOf('          ) : (', storefront.indexOf('{accountArtistProfile ? (')), storefront.indexOf('          {isLuminaAdmin &&'));
  for (const source of [sharedClient, publicClient]) {
    assert.match(source, /href="\/account"/);
    assert.match(source, /Profile &amp; settings/);
    assert.doesNotMatch(source, /href="\/(client|saved|my-requests)"/);
  }
  for (const source of [menu, publicClient]) assert.match(source, /border-t border-lumina-border[\s\S]*onClick=\{handleSignOut\}[\s\S]*Sign out/);
});

test("both professional dropdown branches are byte-for-byte unchanged", () => {
  assert.equal(hash(menu.slice(menu.indexOf('{workspace === "professional" || accountRole === "professional" ? ('), menu.indexOf(') : accountRole === "client" ? ('))), "be489603642b543b6b391c96deece9b2289354555b97e0f25dc4fe3eeb2daf87");
  assert.equal(hash(storefront.slice(storefront.indexOf('{accountArtistProfile ? ('), storefront.indexOf('          ) : (', storefront.indexOf('{accountArtistProfile ? (')))), "53ec64ac2bf07fae5b68859ad9035a44ce7d34049d5f51fbc66a531f0dd5a11e");
});

test("Profile & Settings, other-device handling, workspace shells and mobile navigation are untouched", () => {
  const unchanged = {
    "app/account/page.tsx": "2085682f484a32e819b843a3252b2a750f0feb3fcf56a7fddd4bc7f12e30bdeb",
    "components/ClientWorkspaceShell.tsx": "346efa0085663d58fa053b98d6e2a701cdf949eb607bc60e501c0fad92a42b32",
    "components/ProfessionalDashboardShell.tsx": "fbc8a1b270bbe3a007622c71a37ba1206c7c1e69547587f67916a290b28b2fec",
  };
  for (const [path, expected] of Object.entries(unchanged)) assert.equal(hash(read(path)), expected, path);
});
