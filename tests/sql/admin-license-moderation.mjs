import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.env.LUMINA_PGLITE_MODULE ? pathToFileURL(process.env.LUMINA_PGLITE_MODULE).href : '@electric-sql/pglite');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('existing license RPCs and RLS in isolated PostgreSQL only',async t=>{
 const db=new PGlite();
 const as=async(n,sql,args=[],role='authenticated')=>{
  await db.exec(`begin; set local role ${role};`);
  try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[n?id(n):'']);const result=await db.query(sql,args);await db.exec('commit');return result.rows;}
  catch(error){await db.exec('rollback');throw error;}
 };
 const submit=n=>as(n,"select (submit_professional_license_verification('Fixture Professional','TEST-ONLY','OK','Cosmetologist',null)).*");
 const decision=(n,kind,msg=null)=>as(9,'select (moderate_professional_license_verification($1,$2,$3)).*',[id(n),kind,msg]);
 const queue=()=>as(9,'select get_professional_license_verification_queue() as items');
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;
   create table artists(id uuid primary key,name text);
   create function is_lumina_admin() returns boolean language sql stable security definer as $$select auth.uid()='${id(9)}'::uuid$$;
  `);
  for(const n of [1,2])await db.query('insert into artists values($1,$2)',[id(n),'Fixture '+n]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20260905170000_add_professional_license_verification_v1.sql',import.meta.url),'utf8'));
  await t.test('initial submission inserts Pending with no decision audit',async()=>{
   const [r]=await submit(1);assert.equal(r.status,'pending');assert.equal(r.last_reviewed_by,null);assert.equal((await queue())[0].items.length,1);
  });
  await t.test('second professional submission is visible to authenticated admin',async()=>{await submit(2);assert.equal((await queue())[0].items.length,2);assert.equal((await as(9,'select * from professional_license_verifications')).length,2);});
  await t.test('professional SELECT sees only their own row',async()=>{const rows=await as(1,'select * from professional_license_verifications');assert.equal(rows.length,1);assert.equal(rows[0].artist_id,id(1));});
  await t.test('anonymous cannot select license rows',async()=>{await assert.rejects(as(null,'select * from professional_license_verifications',[],'anon'),{code:'42501'});});
  await t.test('professional cannot call moderation queue or decision RPC',async()=>{
   await assert.rejects(as(1,'select get_professional_license_verification_queue()'),{code:'42501'});
   await assert.rejects(as(1,"select moderate_professional_license_verification($1,'verify')",[id(1)]),{code:'42501'});
  });
  await t.test('correction requires a message',async()=>{await assert.rejects(decision(1,'reject',' '),{code:'23514'});});
  let previous;
  await t.test('correction preserves submitted fields and records admin/message/audit',async()=>{
   [previous]=await decision(1,'reject','  Correct the jurisdiction  ');assert.equal(previous.status,'rejected');assert.equal(previous.decision_message,'Correct the jurisdiction');assert.equal(previous.last_reviewed_by,id(9));assert.ok(previous.last_reviewed_at);assert.equal(previous.license_number,'TEST-ONLY');
  });
  await t.test('resubmission updates same row to Pending and preserves review audit',async()=>{
   const [r]=await submit(1);assert.equal(r.status,'pending');assert.equal(r.last_reviewed_by,previous.last_reviewed_by);assert.deepEqual(r.last_reviewed_at,previous.last_reviewed_at);assert.equal(r.decision_message,previous.decision_message);assert.equal((await queue())[0].items.length,2);
  });
  await t.test('verify updates authority, clears correction message and preserves row identity',async()=>{
   const [r]=await decision(1,'verify');assert.equal(r.status,'verified');assert.equal(r.decision_message,null);assert.equal(r.artist_id,id(1));const items=(await queue())[0].items;assert.equal(items.filter(i=>i.status==='pending').length,1);assert.equal(items.filter(i=>i.status==='verified').length,1);
  });
  await t.test('direct authenticated mutation remains forbidden',async()=>{await assert.rejects(as(9,"update professional_license_verifications set status='verified'"),{code:'42501'});});
 }finally{await db.close();}
});
