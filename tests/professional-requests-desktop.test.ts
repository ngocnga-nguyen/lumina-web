import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../app/dashboard/requests/page.tsx", import.meta.url),
  "utf8"
);

test("desktop request summary keeps one derived status, contextual timing, and relevant action", () => {
  assert.match(page, /desktopStatusLabel = desktopIsConfirmed \? "Confirmed" : mobileStatus\.label/);
  assert.match(page, /desktopTimingKind =/);
  assert.match(page, /"Requested"/);
  assert.match(page, /"Proposed"/);
  assert.match(page, /"Appointment"/);
  assert.match(page, /request\.proposed_price != null/);
  assert.match(page, /mobileStatus\.action\.label/);
  assert.match(page, /unreadMessages > 0/);
  assert.match(page, /aria-expanded=\{expandedRequestId === request\.id\}/);
  assert.doesNotMatch(page, /statusLabel\(request\.status\)/);
});

test("desktop polish leaves request ordering and inline actions intact", () => {
  assert.match(page, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(page, /visibleRequests\.map\(\(request\) =>/);
  assert.match(page, /lg:order-none/);
  assert.match(page, /submitArtistCompletionResponse\(request, "confirmed"\)/);
  assert.match(page, /submitArtistCompletionResponse\(request, "disputed"\)/);
  assert.match(page, /updateRequest\(request\.id, "accepted"\)/);
  assert.match(page, /updateRequest\(request\.id, "declined"\)/);
  assert.match(page, /setRequestHidden\(request\.id, requestView !== "archived"\)/);
  assert.match(page, /professional-request-details-\$\{request\.id\}/);
});
