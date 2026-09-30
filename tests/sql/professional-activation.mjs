import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
const { PGlite } = await import(process.env.LUMINA_PGLITE_MODULE ? pathToFileURL(process.env.LUMINA_PGLITE_MODULE).href : '@electric-sql/pglite');
const read = (name) => readFileSync(new URL('../../supabase/migrations/' + name, import.meta.url),'utf8');
const old = read('20260906120000_add_professional_onboarding_activation_v1.sql');
const migration = read('20260930120000_minimum_professional_activation_v2.sql');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('activation migration and protected lifecycle in isolated PostgreSQL (never Supabase)', async t => {
 const db = new PGlite();
 const q = (sql,p=[]) => db.query(sql,p);
 const one = async (sql,p) => (await q(sql,p)).rows[0];
 const status = async (n=1) => (await one('select professional_activation_readiness($1) as s',[id(n)])).s;
 const owner = async (sql,p=[],n=1) => {
   await db.exec('begin; set local role authenticated;');
   try { await q("select set_config('request.jwt.claim.sub',$1,true)",[id(n)]); const result=await q(sql,p); await db.exec('commit'); return result; }
   catch (e) { await db.exec('rollback'); throw e; }
 };
 const activate = () => owner('select set_professional_profile_visibility(true)');

 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated;
   create table artists(id uuid primary key,name text,category text,location text,profile_image_url text,bio text,availability text,is_active boolean default false,
    location_type text default 'salon',city text,region text,service_area text,cover_image_url text,business_name text,phone text,social_link text,years_experience numeric);
   create table services(id uuid primary key default gen_random_uuid(),artist_id uuid references artists(id),service_name text,price numeric);
   create table portfolio_images(artist_id uuid references artists(id),image_url text);
   create table professional_license_verifications(artist_id uuid primary key references artists(id),status text,decision_message text);
   alter table artists enable row level security;
   create policy owner_select on artists for select to authenticated using(id=auth.uid() or is_active);
   create policy owner_insert on artists for insert to authenticated with check(id=auth.uid());
   create policy owner_update on artists for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
   grant select,insert,update on artists to authenticated;
  `);
  for (const n of [1,2,3]) await q('insert into auth.users values($1,now())',[id(n)]);
  for (const n of [1,2]) {
   await q("insert into artists(id,name,category,location,city,region,profile_image_url,bio,availability,is_active) values($1,'Alex Artist','Hair','Tulsa, OK','Tulsa','OK','photo','Bio','Weekdays',$2)",[id(n),n===2]);
   await q("insert into services(artist_id,service_name,price) values($1,'Haircut',0)",[id(n)]);
   await q("insert into professional_license_verifications values($1,'verified',null)",[id(n)]);
   await q("insert into portfolio_images values($1,'portfolio')",[id(n)]);
  }
  await q("update artists set name='Hong Pham',category='Nail Technician' where id=$1",[id(2)]);
  await db.exec(old);
  // Rehearse an old-ineligible, minimum-only profile becoming eligible at installation.
  await q("update artists set bio=null,profile_image_url=null,availability=null where id=$1",[id(1)]);
  await q('delete from portfolio_images where artist_id=$1',[id(1)]);
  assert.equal((await status()).activation_ready,false);
  const before = (await q('select id,is_active from artists order by id')).rows;
  await db.exec(migration);
  await t.test('migration preserves existing visibility and ownership policies', async () => {
   assert.deepEqual((await q('select id,is_active from artists order by id')).rows,before);
   assert.equal((await one("select count(*)::int n from pg_policies where tablename='artists'")).n,3);
   assert.equal((await status(2)).activation_ready,true);
   assert.equal((await status()).activation_ready,true);
   assert.equal((await status()).is_active,false);
   assert.equal((await one("select count(*)::int n from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal")).n,0);
   assert.equal((await one("select count(*)::int n from pg_trigger where tgname='deactivate_professional_after_portfolio_change_v1'")).n,0);
  });
  await q("update artists set profile_image_url=null,bio=null,availability=null where id=$1",[id(1)]);
  await q('delete from portfolio_images where artist_id=$1',[id(1)]);
  await t.test('minimum-only confirmed profile with zero-dollar service is ready and stays inactive',async()=>{
   const s=await status(); assert.equal(s.activation_ready,true); assert.equal(s.is_active,false);
   for(const flag of ['profile_photo_ready','bio_ready','availability_ready','portfolio_ready']) assert.equal(s[flag],false);
  });
  // Per-case transactions below roll back fixture mutations.
  async function scenario(name,fn) { await t.test(name,async()=>{ await db.exec('begin'); try { await fn(); } finally { await db.exec('rollback'); } }); }
  for(const [field,value] of [['name',''],['category','Beauty Professional'],['category','Service category'],['city',''],['region','state']]) {
   await scenario(`${field}=${JSON.stringify(value)} independently blocks readiness`,async()=>{await q(`update artists set ${field}=$1 where id=$2`,[value,id(1)]);assert.equal((await status()).activation_ready,false);});
  }
  await t.test('unconfirmed initialized owner is marketplace-ready but cannot explicitly activate',async()=>{
   await q('update auth.users set email_confirmed_at=null where id=$1',[id(1)]);
   assert.equal((await status()).activation_ready,true);
   assert.equal('account_ready' in (await status()),false);
   await assert.rejects(activate(),/Confirm your email/);
   assert.equal((await status()).is_active,false);
   await q('update auth.users set email_confirmed_at=now() where id=$1',[id(1)]);
   assert.equal((await status()).is_active,false);
  });
  await t.test('explicit activation requires an authenticated identity',async()=>{
   await assert.rejects(q('select set_professional_profile_visibility(true)'),/Authentication is required/);
  });
  await scenario('Hong production-equivalent active fixture passes all five marketplace gates',async()=>{
   assert.equal((await status(2)).activation_ready,true);
   assert.equal((await status(2)).is_active,true);
   const requirements=await one('select professional_activation_requirements_v2(a) as flags from artists a where id=$1',[id(2)]);
   assert.equal(Object.keys(requirements.flags).length,5);
   assert.ok(Object.values(requirements.flags).every(Boolean));
  });
  await scenario('Mina readiness-equivalent fixture needs only a real category, never automatic publication',async()=>{
   await q("update artists set name='Mina Nguyen',category='Beauty Professional',bio=null where id=$1",[id(1)]);
   assert.equal((await status()).activation_ready,false);
   assert.equal((await status()).category_ready,false);
   await q("update artists set category='Nail Technician' where id=$1",[id(1)]);
   assert.equal((await status()).activation_ready,true);
   assert.equal((await status()).bio_ready,false);
   assert.equal((await status()).is_active,false);
  });
  for(const price of ['-1','NaN','Infinity','-Infinity',null]) await scenario(`price ${price} is ineligible`,async()=>{await q('update services set price=$1 where artist_id=$2',[price,id(1)]);assert.equal((await status()).services_ready,false);});
  await scenario('invalid numeric input is rejected by PostgreSQL',async()=>{await db.exec('savepoint invalid_price');await assert.rejects(q("update services set price='invalid' where artist_id=$1",[id(1)]));await db.exec('rollback to invalid_price');});
  await scenario('meaningful service name required',async()=>{await q("update services set service_name='service name' where artist_id=$1",[id(1)]);assert.equal((await status()).services_ready,false);});
  for(const type of ['salon','home_studio','travels','mobile_salon']) await scenario(`${type} structured location rules`,async()=>{
   await q('update artists set location_type=$1,location=null where id=$2',[type,id(1)]);assert.equal((await status()).location_ready,true);
   await q("update artists set city=null,region=null,service_area='Tulsa metro' where id=$1",[id(1)]);assert.equal((await status()).location_ready,['travels','mobile_salon'].includes(type));
   await q("update artists set service_area='service area' where id=$1",[id(1)]);assert.equal((await status()).location_ready,false);
  });
  await t.test('ordinary authenticated owner cannot insert active profile, even with a forged operation marker',async()=>{
   await assert.rejects(owner("insert into artists(id,name,is_active) values($1,'Attacker',true)",[id(3)],3),/inactive profile/);
   await assert.rejects(owner("with marker as (select set_config('lumina.profile_activation_operation','protected_activation',true)) insert into artists(id,name,is_active) select $1,'Attacker',true from marker",[id(3)],3),/inactive profile/);
  });
  await t.test('direct active UPDATE is denied by existing column privileges',async()=>{await assert.rejects(owner('update artists set is_active=true where id=$1',[id(1)]),/permission denied/);});
  await t.test('null-safe trigger denies unauthorized activation even in a privileged direct update',async()=>{await assert.rejects(q('update artists set is_active=true where id=$1',[id(1)]),/protected activation/);});
  await t.test('cross-user insert and activation attempts fail',async()=>{
   await assert.rejects(owner("insert into artists(id,name) values($1,'Imposter')",[id(3)]),/row-level security/);
   await assert.rejects(owner('update artists set is_active=true where id=$1',[id(2)]),/permission denied/);
   await assert.rejects(owner('select set_professional_profile_visibility(true)',[],3),/not found/);
   assert.equal((await status(2)).is_active,true);
  });
  await t.test('eligible owner activates only through RPC; intent marker is restored',async()=>{await activate();assert.equal((await status()).is_active,true);});
  await t.test('later administrative deconfirmation does not affect live readiness or visibility',async()=>{
   await q('update auth.users set email_confirmed_at=null where id=$1',[id(1)]);
   assert.equal((await status()).activation_ready,true);
   assert.equal((await status()).is_active,true);
   // Even a subsequent profile/service recheck must ignore confirmation state.
   await q("update artists set bio='Optional edit' where id=$1",[id(1)]);
   await q("update services set price=0 where artist_id=$1",[id(1)]);
   assert.equal((await status()).is_active,true);
   await assert.rejects(activate(),/Confirm your email/);
   await q('update auth.users set email_confirmed_at=now() where id=$1',[id(1)]);
   assert.equal((await status()).is_active,true);
  });
  for(const [field,invalid,valid] of [['name','','Alex Artist'],['category','Beauty Professional','Hair']]) {
   await t.test(`losing ${field} deactivates; restoring it does not publish`,async()=>{
    await q(`update artists set ${field}=$1 where id=$2`,[invalid,id(1)]);
    assert.equal((await status()).is_active,false);
    await q(`update artists set ${field}=$1 where id=$2`,[valid,id(1)]);
    assert.equal((await status()).activation_ready,true);
    assert.equal((await status()).is_active,false);
    await activate();
   });
  }
  await t.test('optional removals preserve live visibility',async()=>{
   await q("update artists set bio='Optional bio',profile_image_url='photo',cover_image_url='cover',availability='Weekdays',business_name='Studio',phone='555',social_link='https://example.test',years_experience=2 where id=$1",[id(1)]);
   await q("insert into portfolio_images values($1,'optional-work')",[id(1)]);
   assert.equal((await status()).is_active,true);
   await q("update artists set bio=null,profile_image_url=null,cover_image_url=null,availability=null,business_name=null,phone=null,social_link=null,years_experience=null where id=$1",[id(1)]);
   await q('delete from portfolio_images where artist_id=$1',[id(1)]); assert.equal((await status()).is_active,true);
  });
  await t.test('losing structured location deactivates; restoring it does not publish',async()=>{
   await q("update artists set city='' where id=$1",[id(1)]);assert.equal((await status()).is_active,false);
   await q("update artists set city='Tulsa' where id=$1",[id(1)]);assert.equal((await status()).is_active,false);await activate();
  });
  await t.test('losing final service deactivates; ineligible RPC fails; restoring never publishes',async()=>{
   await q('delete from services where artist_id=$1',[id(1)]);assert.equal((await status()).is_active,false);
   await assert.rejects(activate(),/required setup/);
   await q("insert into services(artist_id,service_name,price) values($1,'Haircut',0)",[id(1)]);assert.equal((await status()).is_active,false);await activate();
  });
  await t.test('license resubmission deactivates; approval never republishes',async()=>{
   await q("update professional_license_verifications set status='pending' where artist_id=$1",[id(1)]);assert.equal((await status()).is_active,false);
   await assert.rejects(activate(),/required setup/);
   await q("update professional_license_verifications set status='verified' where artist_id=$1",[id(1)]);assert.equal((await status()).is_active,false);
  });
  await t.test('explicit hide persists distinct owner intent without affecting eligibility',async()=>{
   await owner('select set_professional_profile_visibility(false)');assert.equal((await status()).activation_hidden_by_owner,true);assert.equal((await status()).activation_ready,true);
   await q('update auth.users set email_confirmed_at=null where id=$1',[id(1)]);
   await assert.rejects(activate(),/Confirm your email/);
   await q("update professional_license_verifications set status='pending' where artist_id=$1",[id(1)]);
   await q("update professional_license_verifications set status='verified' where artist_id=$1",[id(1)]);
   await q('update auth.users set email_confirmed_at=now() where id=$1',[id(1)]);
   assert.equal((await status()).activation_ready,true);
   assert.equal((await status()).activation_hidden_by_owner,true);
   assert.equal((await status()).is_active,false);
   await activate();assert.equal((await status()).activation_hidden_by_owner,false);assert.equal((await status()).is_active,true);
  });
 } finally {await db.close();}
});
