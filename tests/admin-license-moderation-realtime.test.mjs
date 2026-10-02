import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { startAdminLicenseModerationSync } from '../lib/admin-license-moderation-sync.ts';

const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r)); };
const row = (id = 'mina', status = 'pending') => ({ artist_id:id, professional_name:id, legal_professional_name:id, status, license_number:'FIXTURE', license_jurisdiction:'OK', license_type:'Cosmetologist', business_name:null, submitted_at:'2026-10-01T12:00:00Z', updated_at:'2026-10-01T12:00:00Z', last_reviewed_at:null, last_reviewed_by:null, decision_message:null });
function transport() {
  const browser = new EventTarget(), visibility = Object.assign(new EventTarget(), { visibilityState:'visible' });
  const channels = [], calls = [], redirects = [], states = [];
  let user = {id:'admin'}, admin = true, rows = [], queueError = null, queueLoad, authHandler, unsubscribed = false;
  const client = {
    auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange(fn){authHandler=fn;return{data:{subscription:{unsubscribe(){unsubscribed=true;}}}};}},
    async rpc(name, args) {
      calls.push({name,args});
      if(name==='is_lumina_admin')return{data:admin,error:null};
      if(name==='get_professional_license_verification_queue')return queueLoad ? queueLoad() : {data:structuredClone(rows),error:queueError};
      if(name==='moderate_professional_license_verification') {
        rows=rows.map(item=>item.artist_id===args.p_artist_id ? {...item,status:args.p_decision==='verify'?'verified':'rejected',decision_message:args.p_correction_message,last_reviewed_by:user.id,last_reviewed_at:'2026-10-02T12:00:00Z'}:item);
        event(); return{data:null,error:null};
      }
      throw Error('Unexpected RPC '+name);
    },
    channel(topic) { const ch={topic,handlers:[],removed:false,on(kind,filter,fn){this.handlers.push({kind,filter,fn});return this;},subscribe(fn){this.status=fn;return this;}};channels.push(ch);return ch; },
    removeChannel(ch){ch.removed=true;},
  };
  function event(eventType='UPDATE', table='professional_license_verifications') {
    for(const c of channels.filter(c=>!c.removed)) for(const h of c.handlers) if(h.filter.event===eventType) h.fn({schema:'public',table,eventType,new:{status:'fabricated'}});
  }
  return {client,browser,visibility,channels,calls,redirects,states,event,
    setRows:r=>rows=r,setAdmin:a=>admin=a,setError:e=>queueError=e,setLoad:f=>queueLoad=f,
    auth:u=>{user=u;authHandler('SIGNED_IN',u?{user:u}:null);},
    start(){return startAdminLicenseModerationSync({client,topic:'test-admin',browser,visibility,publish:s=>states.push(s),denied:d=>redirects.push(d)});},
    get state(){return states.at(-1);},get unsubscribed(){return unsubscribed;},
    get reads(){return calls.filter(c=>c.name==='get_professional_license_verification_queue').length;},
  };
}
const counts = items => Object.fromEntries(['pending','verified','rejected'].map(status=>[status,items.filter(i=>i.status===status).length]));

for(const [label,from,to,event] of [
 ['initial submission',null,'pending','INSERT'],['resubmission','rejected','pending','UPDATE'],
 ['other admin verifies','pending','verified','UPDATE'],['other admin requests correction','pending','rejected','UPDATE'],
]) test(`${label} replaces authoritative lists and counts`, async()=>{
 const h=transport();h.setRows(from?[row('mina',from)]:[]);const sync=h.start();await settle();
 h.setRows([row('mina',to)]);h.event(event);await settle();assert.deepEqual(h.state.items,[row('mina',to)]);assert.equal(counts(h.state.items)[to],1);assert.equal(h.reads,2);sync.dispose();
});
test('one subscription with INSERT/UPDATE is created only after admin authorization',async()=>{
 const h=transport();const sync=h.start();assert.equal(h.channels.length,0);await settle();assert.equal(h.channels.length,1);
 assert.deepEqual(h.channels[0].handlers.map(x=>x.filter),['INSERT','UPDATE'].map(event=>({event,schema:'public',table:'professional_license_verifications'})));sync.dispose();
});
test('unrelated table/schema events and payload status never become queue authority',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();h.event('UPDATE','notifications');h.channels[0].handlers[0].fn({schema:'other',table:'professional_license_verifications',eventType:'INSERT'});await settle();assert.equal(h.reads,1);assert.equal(h.state.items[0].status,'pending');sync.dispose();
});
test('rapid duplicate events, local decision and focus cannot duplicate a row',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();
 await h.client.rpc('moderate_professional_license_verification',{p_artist_id:'mina',p_decision:'verify',p_correction_message:null});
 h.event();h.event();h.browser.dispatchEvent(new Event('focus'));await sync.refresh();await settle();
 assert.equal(h.state.items.length,1);assert.equal(h.state.items[0].status,'verified');assert.deepEqual(counts(h.state.items),{pending:0,verified:1,rejected:0});sync.dispose();
});
test('stale successful response cannot overwrite newer state',async()=>{
 const h=transport();const sync=h.start();await settle();const waiting=[];h.setLoad(()=>new Promise(resolve=>waiting.push(resolve)));
 const first=sync.refresh();await settle();const second=sync.refresh();await settle();waiting[1]({data:[row('mina','verified')],error:null});await second;waiting[0]({data:[row()],error:null});await first;assert.equal(h.state.items[0].status,'verified');sync.dispose();
});
test('stale failure cannot replace a newer successful result',async()=>{
 const h=transport();const sync=h.start();await settle();const waiting=[];h.setLoad(()=>new Promise(resolve=>waiting.push(resolve)));
 const first=sync.refresh();await settle();const second=sync.refresh();await settle();waiting[1]({data:[row()],error:null});await second;waiting[0]({data:null,error:{message:'old error'}});await first;assert.equal(h.state.errorMessage,'');sync.dispose();
});
test('reconnect, focus, visible return and online all reload authority',async()=>{
 const h=transport();const sync=h.start();await settle();h.setRows([row()]);h.channels[0].status('CHANNEL_ERROR');h.visibility.visibilityState='hidden';h.visibility.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(h.reads,1);
 h.channels[0].status('SUBSCRIBED');await settle();h.browser.dispatchEvent(new Event('focus'));await settle();h.visibility.visibilityState='visible';h.visibility.dispatchEvent(new Event('visibilitychange'));await settle();h.browser.dispatchEvent(new Event('online'));await settle();assert.equal(h.reads,5);assert.equal(h.state.items.length,1);assert.equal(h.channels.length,1);sync.dispose();
});
test('failed refresh shows error, retains last queue and a retry recovers',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();h.setError({message:'Offline'});await sync.refresh();assert.equal(h.state.errorMessage,'Offline');assert.equal(h.state.items.length,1);h.setError(null);h.setRows([]);await sync.refresh();assert.deepEqual(h.state.items,[]);assert.equal(h.state.errorMessage,'');sync.dispose();
});
for(const [label,user,admin,redirect] of [['anonymous',null,false,'/login'],['professional',{id:'artist'},false,'/']])test(`${label} cannot subscribe or read moderation state`,async()=>{
 const h=transport();h.setAdmin(admin);const original=h.client.auth.getUser;h.client.auth.getUser=async()=>({data:{user},error:null});const sync=h.start();await settle();assert.equal(h.channels.length,0);assert.equal(h.reads,0);assert.deepEqual(h.state.items,[]);assert.equal(h.state.authorized,false);assert.equal(h.redirects.at(-1),redirect);sync.dispose();h.client.auth.getUser=original;
});
test('admin revocation clears private queue and removes channel',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();h.setAdmin(false);h.event();await settle();assert.equal(h.state.authorized,false);assert.deepEqual(h.state.items,[]);assert.equal(h.channels[0].removed,true);assert.equal(h.redirects.at(-1),'/');sync.dispose();
});
test('queue RPC authorization denial clears private state even after precheck',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();h.setError({code:'42501',message:'Denied'});await sync.refresh();assert.equal(h.state.authorized,false);assert.deepEqual(h.state.items,[]);assert.equal(h.channels[0].removed,true);sync.dispose();
});
test('sign-out clears immediately and ignores pending response, callbacks and focus after disposal',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();let resolve;h.setLoad(()=>new Promise(r=>resolve=r));const pending=sync.refresh();await settle();h.auth(null);assert.deepEqual(h.state.items,[]);assert.equal(h.state.authorized,false);resolve({data:[row()],error:null});await pending;assert.deepEqual(h.state.items,[]);sync.dispose();const reads=h.reads;h.browser.dispatchEvent(new Event('focus'));h.visibility.dispatchEvent(new Event('visibilitychange'));h.event();h.channels[0].status('SUBSCRIBED');await sync.refresh();await settle();assert.equal(h.reads,reads);assert.equal(h.unsubscribed,true);
});
test('account switch invalidates old responses and cannot expose admin rows to professional',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();let resolve;h.setLoad(()=>new Promise(r=>resolve=r));const pending=sync.refresh();await settle();h.setAdmin(false);h.auth({id:'artist'});assert.deepEqual(h.state.items,[]);await settle();resolve({data:[row()],error:null});await pending;assert.equal(h.state.authorized,false);assert.deepEqual(h.state.items,[]);assert.equal(h.channels.filter(c=>!c.removed).length,0);sync.dispose();
});

// Exercise the actual page and hook together with an isolated React effect/transport harness.
const require=createRequire(import.meta.url);
function pageHarness(h) {
 let cursor=0,tree;const values=[],deps=[],effects=[],cleanups=[];
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){const i=cursor++;return values[i]??={current:initial};},useCallback(fn,d){const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){deps[i]=d;values[i]=fn;}return values[i];},useEffect(fn,d){const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){deps[i]=d;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}};
 const router={replace:d=>h.redirects.push(d)};const cache={};
 function load(path) {
  if(cache[path])return cache[path];const exports={};cache[path]=exports;
  const src=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,window:Object.assign(h.browser,{confirm:()=>true}),document:h.visibility,require(id){
   if(id==='react')return hooks;if(id==='next/navigation')return{useRouter:()=>router};if(id==='next/link')return{default:'a'};
   if(id==='@/lib/supabase')return{supabase:h.client};
   if(id==='@/lib/admin-license-moderation-sync')return {startAdminLicenseModerationSync,initialAdminModerationState:{items:[],loading:true,authorized:false,errorMessage:''}};
   if(id==='@/lib/realtime-channel')return{createRealtimeChannelTopic:()=> 'fixture'};
   if(id.startsWith('@/'))return load(id.slice(2)+(id.includes('useAdmin')?'.ts':'.ts'));
   return require(id);
  }});return exports;
 }
 const Page=load('app/admin/verifications/page.tsx').default;
 function render(){cursor=0;tree=Page();for(const effect of effects.splice(0))effect();return tree;}
 const all=node=>node==null?[]:Array.isArray(node)?node.flatMap(n=>all(n)):typeof node==='object'?[node,...all(node.props?.children)]:[];
 const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(' '):typeof node==='object'?text(node.props?.children):String(node);
 return{render,all:()=>all(tree),text:()=>text(tree),button:label=>all(tree).find(n=>n.type==='button'&&text(n)===label),dispose:()=>cleanups.forEach(fn=>fn?.())};
}
test('actual page tabs share one owner; verify and correction keep exact RPC/audit inputs and authoritative movement',async()=>{
 const h=transport();h.setRows([row()]);const p=pageHarness(h);p.render();await settle();p.render();assert.match(p.text(),/mina/);
 for(let i=0;i<3;i++){p.button('All submissions').props.onClick();p.render();p.button('Pending').props.onClick();p.render();}assert.equal(h.channels.length,1);
 await p.button('Verify').props.onClick();await settle();p.render();assert.match(p.text(),/No verification submissions here/);p.button('All submissions').props.onClick();p.render();assert.match(p.text(),/License verified/);
 p.button('Needs correction').props.onClick();p.render();p.all().find(n=>n.type==='textarea').props.onChange({target:{value:'  Check jurisdiction  '}});p.render();p.button('Save Needs correction').props.onClick();await settle();p.render();assert.match(p.text(),/Needs correction/);
 assert.deepEqual(h.calls.filter(c=>c.name==='moderate_professional_license_verification').map(c=>structuredClone(c.args)),[{p_artist_id:'mina',p_decision:'verify',p_correction_message:null},{p_artist_id:'mina',p_decision:'reject',p_correction_message:'Check jurisdiction'}]);
 assert.equal(h.state,undefined);assert.equal(h.channels.length,1);p.dispose();assert.equal(h.channels[0].removed,true);
});

test('temporary auth/admin network failures preserve queue and recover without redirect',async()=>{
 const h=transport();h.setRows([row()]);const sync=h.start();await settle();
 const getUser=h.client.auth.getUser, rpc=h.client.rpc;
 h.client.auth.getUser=async()=>({data:{user:null},error:{name:'AuthRetryableFetchError',status:0}});
 await sync.refresh();assert.equal(h.redirects.length,0);assert.equal(h.state.items.length,1);assert.ok(h.state.errorMessage);assert.equal(h.channels[0].removed,false);
 h.client.auth.getUser=getUser;h.client.rpc=async name=>name==='is_lumina_admin'?{error:{message:'offline'}}:rpc(name);
 await sync.refresh();assert.equal(h.redirects.length,0);assert.equal(h.state.items.length,1);
 h.client.rpc=rpc;h.setRows([row('mina','verified')]);h.browser.dispatchEvent(new Event('online'));await settle();assert.equal(h.state.errorMessage,'');assert.equal(h.state.items[0].status,'verified');sync.dispose();
});
test('expired session clears private data; initial network failure never subscribes',async()=>{
 const h=transport();h.client.auth.getUser=async()=>({data:{user:null},error:{name:'AuthRetryableFetchError',status:0}});const sync=h.start();await settle();assert.equal(h.channels.length,0);assert.equal(h.state.authorized,false);assert.ok(h.state.errorMessage);sync.dispose();
 const a=transport();a.setRows([row()]);const owned=a.start();await settle();a.client.auth.getUser=async()=>({data:{user:null},error:{status:401}});await owned.refresh();assert.deepEqual(a.state.items,[]);assert.equal(a.channels[0].removed,true);assert.equal(a.redirects.at(-1),'/login');owned.dispose();
});
test('unmount alone discards pending queue response and removes all event handlers',async()=>{
 const h=transport();const sync=h.start();await settle();let resolve;h.setLoad(()=>new Promise(r=>resolve=r));const pending=sync.refresh();await settle();const state=h.state;sync.dispose();resolve({data:[row()],error:null});await pending;h.browser.dispatchEvent(new Event('focus'));h.visibility.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(h.state,state);assert.equal(h.channels[0].removed,true);assert.equal(h.unsubscribed,true);
});
