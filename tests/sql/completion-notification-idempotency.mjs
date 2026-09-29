// Isolated PostgreSQL integration checks; never connects to Supabase.
// Install @electric-sql/pglite in a temporary directory, then run:
// LUMINA_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/sql/completion-notification-idempotency.mjs
// Or run directly when @electric-sql/pglite is already available locally.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const { PGlite } = await import(process.env.LUMINA_PGLITE_MODULE
  ? pathToFileURL(process.env.LUMINA_PGLITE_MODULE).href
  : "@electric-sql/pglite");
const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const lifecycle = read("supabase/migrations/20260904140000_add_booking_lite_v3.sql");
const migration = read("supabase/migrations/20260929150000_guard_completion_notifications_v1.sql");
function existingFunction(name) {
  const start = lifecycle.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0);
  return lifecycle.slice(start, lifecycle.indexOf("$$;", start) + 3);
}
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const artist = id(900), client = id(901);

test("migration applies to a clean notification history and duplicate plain INSERTs are successful no-ops", async () => {
  const db = new PGlite();
  try {
    // The base schema exists, as it does before this incremental migration in Supabase.
    // No notification history, guard table, function or trigger exists yet.
    await db.exec(`
      create role anon; create role authenticated;
      create table public.notifications (
        id uuid primary key default gen_random_uuid(), request_id uuid, user_id uuid,
        title text, message text not null, is_read boolean default false,
        created_at timestamptz default clock_timestamp()
      );
      alter default privileges in schema public grant all on tables to anon, authenticated;
    `);
    await db.exec(migration);
    assert.equal((await db.query("select count(*)::int as n from appointment_completed_notification_keys")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from notifications")).rows[0].n, 0);
    // The application uses a plain insert, not single(), so a suppressed insert
    // is successful with zero affected rows rather than a cardinality error.
    const sql = "insert into notifications(request_id,user_id,title,message) values ($1,$2,'Appointment Completed','complete')";
    assert.equal((await db.query(sql,[id(1),client])).affectedRows, 1);
    for (let retry=0; retry<3; retry++) {
      assert.equal((await db.query(sql,[id(1),client])).affectedRows, 0);
    }
    assert.equal((await db.query("select count(*)::int as n from notifications")).rows[0].n, 1);
  } finally { await db.close(); }
});

test("completion notification idempotency against isolated PostgreSQL", async (t) => {
  const db = new PGlite();
  const query = (sql, values = []) => db.query(sql, values);
  const rows = async (sql, values) => (await query(sql, values)).rows;
  const count = async (request, recipient = client) => (await rows(
    "select count(*)::int as n from notifications where request_id=$1 and user_id=$2 and title='Appointment Completed'", [id(request), recipient]))[0].n;
  const notify = (request, recipient = client, title = "Appointment Completed", message = "Your professional marked the service complete. You can now share your experience.") => query(
    "insert into notifications (request_id,user_id,title,message) values ($1,$2,$3,$4) returning id", [id(request), recipient, title, message]);
  const complete = async (request) => {
    await query("select set_config('request.jwt.claim.sub',$1,false)", [artist]);
    return (await rows("select (public.record_booking_lite_artist_outcome($1,'completed',null)).*", [id(request)]))[0];
  };
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      grant usage on schema auth to authenticated, anon;
      create table public.notifications (
        id uuid primary key default gen_random_uuid(), request_id uuid, user_id uuid,
        title text, message text not null, is_read boolean default false,
        created_at timestamptz default clock_timestamp()
      );
      alter table public.notifications enable row level security;
      create policy insert_authenticated on public.notifications for insert to authenticated
        with check (auth.uid() is not null);
      create policy own_read on public.notifications for select to authenticated using (auth.uid()=user_id);
      create policy own_update on public.notifications for update to authenticated using (auth.uid()=user_id);
      grant select,insert,update on public.notifications to authenticated;
      create table public.client_requests (
        id uuid primary key, client_id uuid, artist_id uuid, completion_protocol_version int default 3,
        status text default 'accepted', client_status text default 'confirmed', client_confirmed boolean default true,
        booking_status text default 'booked', scheduled_for timestamptz default '2020-01-01T12:00:00Z',
        appointment_confirmed_at timestamptz default '2019-12-01T12:00:00Z',
        proposed_date date default '2020-01-01', proposed_time text default '12:00', proposed_price numeric default 50,
        requested_services jsonb, service_requested text,
        artist_completion_response text, artist_completion_responded_at timestamptz,
        client_completion_response text, client_completion_responded_at timestamptz,
        completed_at timestamptz, completed_by uuid, updated_at timestamptz,
        appointment_exception_reason text, appointment_exception_note text, client_exception_note text
      );
    `);
    for (const request of [1, 2, 3, 4, 10]) {
      await query("insert into client_requests (id,client_id,artist_id) values ($1,$2,$3)", [id(request),client,artist]);
    }
    await query("update client_requests set completion_protocol_version=2 where id=$1",[id(10)]);
    // Use the actual, unmodified lifecycle trigger and RPC, not a simulated completion implementation.
    await db.exec(existingFunction("protect_request_completion"));
    await db.exec(existingFunction("record_booking_lite_artist_outcome"));
    await db.exec("create trigger protect_request_completion before update on client_requests for each row execute function protect_request_completion()");
    let historical;
    await t.test("baseline: two successful completion calls plus existing inserts reproduce the duplicate", async () => {
      const first = await complete(1); assert.equal(first.booking_status, "completed"); await notify(1);
      const replay = await complete(1); assert.equal(replay.booking_status, "completed"); await notify(1);
      assert.equal(await count(1), 2);
      assert.equal(new Date(first.completed_at).toISOString(), new Date(replay.completed_at).toISOString());
      await query("update notifications set is_read=true where id=(select id from notifications order by created_at limit 1)");
      historical = await rows("select * from notifications order by created_at");
    });
    // Model broad Supabase default table grants: the migration must revoke them
    // explicitly on its new private ledger rather than rely on local defaults.
    await db.exec("alter default privileges in schema public grant all on tables to anon, authenticated");
    await db.exec(migration);
    await t.test("migration preserves duplicate history, IDs, messages, timestamps and mixed read flags", async () => {
      assert.deepEqual(await rows("select * from notifications order by created_at"), historical);
      assert.equal((await rows("select count(*)::int as n from appointment_completed_notification_keys"))[0].n, 1);
      await complete(1); await notify(1);
      assert.deepEqual(await rows("select * from notifications order by created_at"), historical);
    });
    await t.test("repeated completion calls emit only one new completion event and leave lifecycle integrity unchanged", async () => {
      const first = await complete(2); await notify(2);
      for (let retry = 0; retry < 4; retry++) { await complete(2); assert.equal((await notify(2)).rows.length, 0); }
      assert.equal(await count(2), 1);
      const current = (await rows("select * from client_requests where id=$1", [id(2)]))[0];
      const { updated_at: firstUpdate, ...initialIntegrity } = first;
      const { updated_at: lastUpdate, ...currentIntegrity } = current;
      assert.ok(firstUpdate && lastUpdate);
      assert.deepEqual(currentIntegrity, initialIntegrity);
    });
    await t.test("separate completed requests each notify the same recipient", async () => {
      await complete(3); await notify(3);
      assert.equal(await count(2), 1); assert.equal(await count(3), 1);
    });
    await t.test("each intended recipient has an independent event key", async () => {
      await notify(2, artist); await notify(2, artist);
      assert.equal(await count(2, artist), 1); assert.equal(await count(2), 1);
    });
    await t.test("two-party client confirmation retries keep completion intact and notify its professional once", async () => {
      await query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);
      const pending = await rows("update client_requests set artist_completion_response='confirmed' where id=$1 returning booking_status",[id(10)]);
      assert.equal(pending[0].booking_status,"booked");
      await query("select set_config('request.jwt.claim.sub',$1,false)",[client]);
      for (let retry=0; retry<3; retry++) {
        const completed = await rows("update client_requests set client_completion_response='confirmed',updated_at=clock_timestamp() where id=$1 returning booking_status",[id(10)]);
        assert.equal(completed[0].booking_status,"completed");
        await notify(10,artist,"Appointment Completed","Both you and your client confirmed the service. The appointment is complete.");
      }
      assert.equal(await count(10,artist),1);
      await query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);
    });
    await t.test("retry never resets acknowledged read state or replaces the first message", async () => {
      await query("update notifications set is_read=true where request_id=$1", [id(2)]);
      const before = await rows("select * from notifications where request_id=$1 order by user_id", [id(2)]);
      await notify(2, client, "Appointment Completed", "Retry must not replace original content");
      assert.deepEqual(await rows("select * from notifications where request_id=$1 order by user_id", [id(2)]), before);
    });
    await t.test("multi-row duplicate inserts are arbitrated by the same unique key", async () => {
      await query("insert into notifications(request_id,user_id,title,message) select $1,$2,'Appointment Completed','batch' from generate_series(1,10)", [id(5),client]);
      assert.equal(await count(5), 1);
    });
    await t.test("other notification types and legacy unlinked rows retain existing behavior", async () => {
      const keysBefore = await rows("select * from appointment_completed_notification_keys order by request_id,user_id");
      for (const title of ["New Message", "New Proposal", "Request Accepted", "Request Declined", "Appointment Needs Attention", "Completion Confirmation Needed", "Client Confirmed Service"]) {
        await notify(2,client,title); await notify(2,client,title);
        assert.equal((await rows("select count(*)::int as n from notifications where request_id=$1 and title=$2",[id(2),title]))[0].n,2);
      }
      await query("insert into notifications(user_id,title,message) select $1,'Appointment Completed','legacy' from generate_series(1,2)",[client]);
      assert.equal((await rows("select count(*)::int as n from notifications where request_id is null"))[0].n,2);
      assert.deepEqual(await rows("select * from appointment_completed_notification_keys order by request_id,user_id"),keysBefore);
    });
    await t.test("existing exception RPC still creates its own notification", async () => {
      await query("select public.record_booking_lite_artist_outcome($1,'did_not_take_place',null)",[id(4)]);
      assert.equal((await rows("select title from notifications where request_id=$1",[id(4)]))[0].title,"Appointment Needs Attention");
    });
    await t.test("failed notification insert rolls back its key so a valid retry succeeds", async () => {
      await assert.rejects(notify(6,client,"Appointment Completed",null), /null value/);
      await notify(6); assert.equal(await count(6),1);
    });
    await t.test("rolled-back transaction does not consume the event key", async () => {
      await db.exec("begin"); await notify(7); await db.exec("rollback");
      await notify(7); assert.equal(await count(7),1);
    });
    await t.test("client roles cannot read/write/delete keys or execute the guard directly", async () => {
      assert.equal((await rows("select relrowsecurity from pg_class where oid='public.appointment_completed_notification_keys'::regclass"))[0].relrowsecurity,true);
      for (const role of ["anon","authenticated"]) {
        await db.exec(`set role ${role}`);
        for (const statement of [
          "select * from appointment_completed_notification_keys",
          `insert into appointment_completed_notification_keys values ('${id(8)}','${client}')`,
          `update appointment_completed_notification_keys set user_id='${artist}'`,
          "delete from appointment_completed_notification_keys",
          "truncate appointment_completed_notification_keys",
          "select guard_appointment_completed_notification_v1()",
        ]) await assert.rejects(db.exec(statement), /permission denied/);
        await db.exec("reset role");
      }
    });
    await t.test("authenticated insert still works through the trigger; notification RLS remains authoritative", async () => {
      await query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);
      await db.exec("set role authenticated");
      // Match the real professional writer: insert for the other participant,
      // with no RETURNING/SELECT requirement on that participant's private row.
      const insert = "insert into notifications(request_id,user_id,title,message) values ($1,$2,'Appointment Completed','complete')";
      assert.equal((await query(insert,[id(8),client])).affectedRows,1);
      assert.equal((await query(insert,[id(8),client])).affectedRows,0);
      assert.equal(await count(8),0);
      await query("select set_config('request.jwt.claim.sub',$1,false)",[client]);
      assert.equal(await count(8),1);
      await query("update notifications set is_read=true where request_id=$1",[id(8)]);
      assert.equal((await rows("select is_read from notifications where request_id=$1",[id(8)]))[0].is_read,true);
      await query("select set_config('request.jwt.claim.sub',$1,false)",[artist]);
      assert.equal((await rows("select id from notifications where request_id=$1",[id(8)])).length,0);
      assert.equal((await query("update notifications set is_read=false where request_id=$1 returning id",[id(8)])).rows.length,0);
      await db.exec("reset role");
    });
    await t.test("RLS-rejected inserts do not poison the key for a subsequent valid insert", async () => {
      await query("select set_config('request.jwt.claim.sub','',false)");
      await db.exec("set role authenticated");
      await assert.rejects(notify(9), /row-level security/);
      await db.exec("reset role");
      await notify(9); assert.equal(await count(9),1);
    });
  } finally { await db.close(); }
});
