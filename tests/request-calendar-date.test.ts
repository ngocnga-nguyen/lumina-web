import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const helperUrl = new URL("../lib/request-calendar-date.ts", import.meta.url).href;

for (const timeZone of ["America/Chicago", "America/Los_Angeles", "UTC", "Asia/Tokyo"]) {
  test(`request calendar dates retain their day in ${timeZone}`, () => {
    // A separate process makes each timezone explicit without mutating test globals.
    execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import { formatRequestCalendarDate as format } from ${JSON.stringify(helperUrl)};
      const long = { weekday: 'long', month: 'short', day: 'numeric' };
      assert.equal(format('2026-10-02', long), 'Friday, Oct 2');
      assert.equal(format('2026-10-02', { weekday: 'short', month: 'short', day: 'numeric' }), 'Fri, Oct 2');
      assert.equal(format('2026-10-02', { month: 'short', day: 'numeric' }), 'Oct 2');
      assert.equal(format('2026-03-08', long), 'Sunday, Mar 8');
      assert.equal(format('2026-11-01', long), 'Sunday, Nov 1');
      assert.equal(format('2026-01-01', long), 'Thursday, Jan 1');
      assert.equal(format('2028-02-29', long), 'Tuesday, Feb 29');
      assert.equal(format(null, long), null);
      assert.equal(format('', long), null);
      assert.equal(format('not-a-date', long), null);
      for (const stamp of ['2026-10-02T00:30:00Z', '2026-10-02T00:30:00+09:00']) {
        assert.equal(format(stamp, long), new Date(stamp).toLocaleDateString('en-US', long));
      }
      if (${JSON.stringify(timeZone)} === 'America/Chicago') {
        assert.equal(new Date('2026-10-02').toLocaleDateString('en-US', long), 'Thursday, Oct 1');
        assert.equal(format('2026-10-02T00:30:00Z', long), 'Thursday, Oct 1');
      }
    `], { env: { ...process.env, TZ: timeZone }, stdio: "pipe" });
  });
}

test("request summaries, expanded proposals, and chat proposals share calendar-date rendering", () => {
  const page = readFileSync(new URL("../app/my-requests/page.tsx", import.meta.url), "utf8");
  const bubble = readFileSync(new URL("../components/ProposalBubble.tsx", import.meta.url), "utf8");
  assert.match(page, /formatRequestCalendarDate\(date,/);
  assert.match(page, /formatRequestCalendarDate\(proposedDate,/);
  assert.match(page, /latestUpdate\?\.proposed_date \?\? request\.proposed_date/);
  assert.match(page, /proposedDate \|\| request\.preferred_date/);
  assert.match(bubble, /formatRequestCalendarDate\(date,/);
  assert.doesNotMatch(page, /new Date\(proposedDate\)/);
  assert.doesNotMatch(bubble, /new Date\(date\)/);
  // Existing timestamp/time-only paths and scheduling calculations stay intact.
  assert.match(page, /new Date\(scheduledFor\)/);
  assert.match(page, /new Date\(request\.created_at\)/);
  assert.match(page, /new Date\(proposedExpectedEndAt\)/);
  assert.match(bubble, /new Date\(expectedEndAt\)/);
  assert.match(bubble, /new Date\(`\$\{date\.slice\(0, 10\)\}T\$\{time\}`\)/);
});
