// Review checkpoint: do not run until disposable SQL rehearsal is approved.
// No network, credentials, Supabase connection, or persistent database is used.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.env.LUMINA_PGLITE_MODULE ? pathToFileURL(process.env.LUMINA_PGLITE_MODULE).href : '@electric-sql/pglite');
const migration = readFileSync(new URL('../../supabase/migrations/20261002190000_professional_reminders_v1.sql', import.meta.url), 'utf8');
const cardMigration = readFileSync(new URL('../../supabase/migrations/20260915130000_add_manual_client_cards_v1.sql', import.meta.url), 'utf8');
const guard = cardMigration.slice(cardMigration.indexOf('create or replace function public.validate_artist_client_note_v1()'), cardMigration.indexOf('create or replace function public.can_manage_artist_client_note('));
const cardAccess = cardMigration.slice(cardMigration.indexOf('create or replace function public.can_manage_artist_client_card('), cardMigration.indexOf('create or replace function public.validate_artist_client_card_relationship()'));
const notePolicies = cardMigration.slice(cardMigration.indexOf('drop policy if exists "Professionals can read their own Client Notes"'), cardMigration.indexOf('create or replace function public.validate_artist_client_note_attachment_v1()'));
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('professional reminder lifecycle in isolated PostgreSQL', async t => {
 const db = new PGlite();
 const q = (s, p=[]) => db.query(s,p);
 const one = async (s,p=[]) => (await q(s,p)).rows[0];
 const worker = async () => (await one('select deliver_professional_reminders_v1() as n')).n;
 const owner = async (s,p=[], who=1) => {
  await db.exec('begin; set local role authenticated;');
  try { await q("select set_config('request.jwt.claim.sub',$1,true)",[id(who)]); const out=await q(s,p); await db.exec('commit'); return out; }
  catch(e) { await db.exec('rollback'); throw e; }
 };
 const create = async (n, extras='') => q(`insert into artist_client_notes(id,artist_id,client_card_id,note_type,reminder_due_on,reminder_due_time,reminder_timezone) values($1,$2,$3,'reminder',(now() at time zone 'UTC')::date - 2,'12:00','UTC') ${extras}`,[id(n),id(1),id(10)]);
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated;
   create table artist_client_cards(id uuid primary key,artist_id uuid,client_id uuid,archived_at timestamptz);
   create table client_requests(id uuid primary key,artist_id uuid,client_id uuid);
   create table artist_client_note_attachments(note_id uuid);
   create table artist_client_notes(id uuid primary key default gen_random_uuid(),artist_id uuid not null,client_id uuid,client_card_id uuid not null references artist_client_cards(id) on delete cascade,request_id uuid,note_type text,title text default '',body text default '',is_pinned boolean default false,reminder_due_on date,reminder_due_time time,reminder_completed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
   create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null,request_id uuid,title text,message text,is_read boolean default false,created_at timestamptz default now());
   alter table artist_client_notes enable row level security;
   alter table artist_client_notes force row level security;
   grant select,insert,update,delete on artist_client_notes to authenticated;
   -- Deliberately permissive INSERT grant proves reminder guard is independent of legacy policy.
   grant select,insert,update on notifications to authenticated;
  `);
  await db.exec(cardAccess);
  await db.exec(notePolicies);
  await db.exec(guard);
  await db.exec('create trigger validate_artist_client_note_v1_trigger before insert or update on artist_client_notes for each row execute function validate_artist_client_note_v1();');
  await q('insert into artist_client_cards values($1,$2,null,null),($3,$4,null,null)',[id(10),id(1),id(20),id(2)]);
  await q("insert into artist_client_notes(id,artist_id,client_card_id,note_type,reminder_due_on,reminder_due_time) values($1,$2,$3,'reminder',(now() at time zone 'UTC')::date - 365,'12:00')",[id(100),id(1),id(10)]);
  await q("insert into notifications(user_id,title) values($1,'Reminder due')",[id(1)]);
  // Model Supabase default grants so the migration must explicitly close them.
  await db.exec('alter default privileges grant all on tables to anon, authenticated, service_role; alter default privileges grant all on functions to anon, authenticated, service_role;');
  await db.exec(migration);
  await t.test('legacy reminders remain unarmed after install and content edits',async()=>{
   assert.equal((await one('select count(*)::int n from notifications')).n,1);
   assert.equal((await one('select event_type from notifications limit 1')).event_type,null);
   assert.equal(await worker(),0);
   await owner("update artist_client_notes set title='Edited' where id=$1",[id(100)]);
   await owner('update artist_client_notes set reminder_completed_at=now() where id=$1',[id(100)]);
   await owner('update artist_client_notes set reminder_completed_at=null where id=$1',[id(100)]);
   assert.equal(await worker(),0);
   const legacy=await one('select reminder_due_at,reminder_alert_armed from artist_client_notes where id=$1',[id(100)]);
   assert.equal(legacy.reminder_due_at,null);assert.equal(legacy.reminder_alert_armed,false);
   assert.equal((await one('select reminder_schedule_version from artist_client_notes where id=$1',[id(100)])).reminder_schedule_version,0);
  });
  await t.test('due delivery, repeated runs, and notification deletion retain one occurrence',async()=>{
   await create(101);assert.equal(await worker(),1);assert.equal(await worker(),0);
   const note=await one('select *, reminder_due_on::text as expected_due_day from artist_client_notes where id=$1',[id(101)]);
   assert.equal(new Date(note.reminder_due_at).toISOString(),`${note.expected_due_day}T12:00:00.000Z`);
   const event=await one('select * from notifications where reminder_id=$1',[id(101)]);
   assert.equal(event.event_type,'professional_reminder_due');assert.equal(event.user_id,id(1));assert.equal(event.request_id,null);
   await q('delete from notifications where reminder_id=$1',[id(101)]);assert.equal(await worker(),0);
  });
  await t.test('Reminder identity is immutable; inserts retain their identifier',async()=>{
   assert.equal((await one('select id from artist_client_notes where id=$1',[id(101)])).id,id(101));
   await assert.rejects(owner('update artist_client_notes set id=$1 where id=$2',[id(999),id(101)]),/identity cannot be changed/);
   await assert.rejects(owner('update artist_client_notes set id=$1 where id=$2',[id(999),id(100)]),/identity cannot be changed/);
   await owner("update artist_client_notes set note_type='general',reminder_due_on=null,reminder_due_time=null where id=$1",[id(101)]);
   await assert.rejects(owner('update artist_client_notes set id=$1 where id=$2',[id(999),id(101)]),/identity cannot be changed/);
   await owner("update artist_client_notes set note_type='reminder' where id=$1",[id(101)]);
  });
  await t.test('ordinary Notes never receive a reminder version; trigger is invoker',async()=>{
   await owner("insert into artist_client_notes(id,artist_id,client_card_id,note_type) values($1,$2,$3,'general')",[id(108),id(1),id(10)]);
   await owner("update artist_client_notes set title='Ordinary edit',note_type='follow_up' where id=$1",[id(108)]);
   assert.equal((await one('select reminder_schedule_version from artist_client_notes where id=$1',[id(108)])).reminder_schedule_version,0);
   assert.equal((await one("select prosecdef from pg_proc where oid='prepare_professional_reminder_v1()'::regprocedure")).prosecdef,false);
  });
  await t.test('future fixture is unambiguously future across UTC day boundaries',async()=>{
   await create(109);await owner("update artist_client_notes set reminder_due_on=(now() at time zone 'UTC')::date + 2 where id=$1",[id(109)]);
   assert.equal(await worker(),0);
   assert.equal((await one('select reminder_due_at > now() future from artist_client_notes where id=$1',[id(109)])).future,true);
   await q('delete from artist_client_notes where id=$1',[id(109)]);
  });
  await t.test('machine event identity never reserves legacy title or changes legacy writes',async()=>{
   await owner("insert into notifications(user_id,title) values($1,'Reminder due')",[id(1)]);
   assert.equal((await one("select event_type from notifications where title='Reminder due' and reminder_id is null limit 1")).event_type,null);
   await assert.rejects(owner("insert into notifications(user_id,title,event_type,reminder_id,reminder_schedule_version) values($1,'Anything','professional_reminder_due',$2,1)",[id(1),id(101)]),/worker/);
   await assert.rejects(q("insert into notifications(user_id,title,reminder_id,reminder_schedule_version) values($1,'Anything',$2,1)",[id(1),id(101)]),/reminder_notification_identity/);
   for(const role of ['anon','authenticated','service_role']) {
    for(const fn of ['deliver_professional_reminders_v1()','prepare_professional_reminder_v1()','guard_professional_reminder_notification_v1()']) {
     assert.equal((await one("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,fn])).allowed,false);
    }
    assert.equal((await one("select has_table_privilege($1,'professional_reminder_deliveries','INSERT') allowed",[role])).allowed,false);
   }
  });
  await t.test('completion before delivery and reopen never rearm; explicit reschedule does',async()=>{
   await create(102);await owner('update artist_client_notes set reminder_completed_at=now() where id=$1',[id(102)]);
   await owner('update artist_client_notes set reminder_completed_at=null where id=$1',[id(102)]);assert.equal(await worker(),0);
   await owner("update artist_client_notes set reminder_due_time='13:00' where id=$1",[id(102)]);assert.equal(await worker(),1);assert.equal(await worker(),0);
  });
  await t.test('invalid zone and DST gap are rejected; overlap uses standard-time occurrence',async()=>{
   await create(103);
   await owner("update artist_client_notes set reminder_timezone='America/Chicago' where id=$1",[id(103)]);
   await assert.rejects(owner("update artist_client_notes set reminder_timezone='not/a-zone' where id=$1",[id(103)]),/timezone/);
   await assert.rejects(owner("update artist_client_notes set reminder_due_on='2026-03-08',reminder_due_time='02:30' where id=$1",[id(103)]),/does not exist/);
   await owner("update artist_client_notes set reminder_due_on='2026-11-01',reminder_due_time='01:30' where id=$1",[id(103)]);
   assert.equal(new Date((await one('select reminder_due_at from artist_client_notes where id=$1',[id(103)])).reminder_due_at).toISOString(),'2026-11-01T07:30:00.000Z');
   // Isolate fixed DST examples from later worker assertions, even after 2026.
   await q('delete from artist_client_notes where id=$1',[id(103)]);
  });
  await t.test('private ownership, client-card guard, worker grants, and spoof prevention',async()=>{
   assert.equal((await owner('select * from artist_client_notes where id=$1',[id(101)],2)).rows.length,0);
   assert.equal((await owner("update artist_client_notes set title='Cross-owner' where id=$1 returning id",[id(101)],2)).rows.length,0);
   await assert.rejects(owner("insert into artist_client_notes(artist_id,client_card_id,note_type) values($1,$2,'reminder')",[id(1),id(10)],2),/row-level security/);
   await assert.rejects(owner('update artist_client_notes set client_card_id=$1 where id=$2',[id(20),id(101)]),/ownership/);
   await assert.rejects(owner('select deliver_professional_reminders_v1()'),/permission/);
   await assert.rejects(owner("insert into notifications(user_id,title,reminder_id,reminder_schedule_version) values($1,'Reminder due',$2,1)",[id(1),id(101)]),/worker/);
   await owner('update artist_client_notes set reminder_due_at=now(),reminder_schedule_version=999,reminder_alert_armed=true where id=$1',[id(100)]);
   assert.equal((await one('select reminder_alert_armed from artist_client_notes where id=$1',[id(100)])).reminder_alert_armed,false);
  });
  await t.test('failed notification insert rolls back the claim and can be retried',async()=>{
   await create(104);
   await db.exec(`create function fail_reminder_test() returns trigger language plpgsql as $$ begin raise exception 'test failure'; end $$;
    create trigger fail_reminder_test before insert on notifications for each row execute function fail_reminder_test();`);
   await assert.rejects(worker(),/test failure/);
   assert.equal((await one('select count(*)::int n from professional_reminder_deliveries where note_id=$1',[id(104)])).n,0);
   await db.exec('drop trigger fail_reminder_test on notifications');
   assert.equal(await worker(),1);assert.equal(await worker(),0);
  });
  await t.test('partial due index eligibility follows scheduling, completion and reschedule',async()=>{
   const eligible=async(n)=>(await one("select (note_type='reminder' and reminder_alert_armed and reminder_completed_at is null and reminder_due_at is not null) eligible from artist_client_notes where id=$1",[id(n)])).eligible;
   const definition=(await one("select pg_get_indexdef('professional_reminders_due_v1'::regclass) definition")).definition;
   assert.match(definition,/note_type/);assert.match(definition,/reminder_due_at IS NOT NULL/);
   await create(110);assert.equal(await eligible(110),true);assert.equal(await worker(),1);
   // Delivered rows remain in this index; the permanent ledger excludes dispatch retries.
   assert.equal(await eligible(110),true);assert.equal(await worker(),0);
   await owner('update artist_client_notes set reminder_completed_at=now() where id=$1',[id(110)]);assert.equal(await eligible(110),false);
   await owner('update artist_client_notes set reminder_completed_at=null where id=$1',[id(110)]);assert.equal(await eligible(110),false);
   await owner("update artist_client_notes set reminder_due_time='13:00' where id=$1",[id(110)]);assert.equal(await eligible(110),true);assert.equal(await worker(),1);
  });
  await t.test('date-only, unscheduled, archived-card, and deleted reminders',async()=>{
   await create(105);await owner('update artist_client_notes set reminder_due_time=null where id=$1',[id(105)]);assert.equal(await worker(),0);
   await owner('update artist_client_notes set reminder_due_on=null where id=$1',[id(105)]);assert.equal(await worker(),0);
   await create(106);await q('update artist_client_cards set archived_at=now() where id=$1',[id(10)]);assert.equal(await worker(),1);
   await create(107);await owner('delete from artist_client_notes where id=$1',[id(107)]);assert.equal(await worker(),0);
  });
 } finally { await db.close(); }
});
