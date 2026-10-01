import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {createProfessionalReadinessSync} from '../lib/professional-readiness-sync.ts';
const require=createRequire(import.meta.url);
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const snapshot=(license='pending',patch={})=>({status:{artist_id:'owner',name_ready:true,category_ready:true,location_ready:true,services_ready:true,license_status:license,license_verified:license==='verified',license_decision_message:license==='rejected'?'Check jurisdiction':null,activation_ready:license==='verified',is_active:false,activation_hidden_by_owner:false,...patch},verification:{artist_id:'owner',status:license,decision_message:license==='rejected'?'Check jurisdiction':null}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(initial=snapshot()) {
 let data=initial,calls=0;const states=[];
 const sync=createProfessionalReadinessSync({userId:'owner',load:async()=>{calls++;return data;},publish:s=>states.push(s)});
 return {sync,states,set:x=>data=x,get calls(){return calls;}};
}
for(const [from,to,message] of [['pending','verified','License verified.'],['pending','rejected','License review needs your attention.'],['rejected','pending','License resubmitted for review.'],['rejected','verified','License verified.'],['verified','pending','License resubmitted for review.']])test(`${from} → ${to} reloads authority and announces the transition`,async()=>{
 const f=fixture(snapshot(from));await f.sync.refresh();assert.equal(f.states.at(-1).announcement,'');
 f.set(snapshot(to));f.sync.changed({new:{artist_id:'owner',status:'untrusted-payload'}});await settle();
 assert.equal(f.states.at(-1).snapshot.status.license_status,to);assert.equal(f.states.at(-1).announcement,message);
 assert.equal(f.states.at(-1).snapshot.status.is_active,false);assert.equal(f.calls,2);
});
test('last license blocker becomes ready without publishing; remaining category blocker stays intact',async()=>{
 const f=fixture();await f.sync.refresh();f.set(snapshot('verified'));f.sync.changed({new:{artist_id:'owner'}});await settle();
 assert.equal(f.states.at(-1).snapshot.status.activation_ready,true);assert.equal(f.states.at(-1).snapshot.status.is_active,false);
 f.set(snapshot('verified',{category_ready:false,activation_ready:false}));await f.sync.refresh();assert.equal(f.states.at(-1).snapshot.status.category_ready,false);assert.equal(f.states.at(-1).snapshot.status.activation_ready,false);
});
test('live deactivation and hidden state come exclusively from returned database state',async()=>{
 const f=fixture(snapshot('verified',{is_active:true}));await f.sync.refresh();
 f.set(snapshot('pending',{is_active:false,activation_hidden_by_owner:false}));f.sync.changed({new:{artist_id:'owner',is_active:true}});await settle();assert.equal(f.states.at(-1).snapshot.status.is_active,false);
 f.set(snapshot('verified',{is_active:false,activation_hidden_by_owner:true}));await f.sync.refresh();assert.equal(f.states.at(-1).snapshot.status.is_active,false);assert.equal(f.states.at(-1).snapshot.status.activation_hidden_by_owner,true);
});
test('unrelated and missing owner events are ignored',async()=>{const f=fixture();await f.sync.refresh();f.sync.changed({new:{artist_id:'other'}});f.sync.changed({});await settle();assert.equal(f.calls,1);});
test('each SUBSCRIBED/reconnect reloads; connection errors do not fabricate state',async()=>{const f=fixture();await f.sync.refresh();f.sync.subscribed('CHANNEL_ERROR');assert.equal(f.calls,1);f.set(snapshot('verified'));f.sync.subscribed('SUBSCRIBED');await settle();assert.equal(f.calls,2);assert.equal(f.states.at(-1).snapshot.status.license_status,'verified');});
test('older async response cannot replace newer snapshot',async()=>{
 const pending=[],states=[];const sync=createProfessionalReadinessSync({userId:'owner',load:()=>new Promise(resolve=>pending.push(resolve)),publish:s=>states.push(s)});
 const first=sync.refresh(),second=sync.refresh();pending[1](snapshot('verified'));await second;pending[0](snapshot('pending'));await first;assert.equal(states.length,1);assert.equal(states[0].snapshot.status.license_status,'verified');
});
test('unmount/account replacement ignores in-flight response and late events',async()=>{
 let resolve,calls=0;const states=[];const sync=createProfessionalReadinessSync({userId:'owner',load:()=>{calls++;return new Promise(r=>resolve=r);},publish:s=>states.push(s)});
 const request=sync.refresh();sync.dispose();resolve(snapshot('verified'));await request;sync.changed({new:{artist_id:'owner'}});sync.subscribed('SUBSCRIBED');await sync.refresh();assert.equal(states.length,0);assert.equal(calls,1);
});
test('wrong account snapshot fails closed',async()=>{const f=fixture(snapshot('verified',{artist_id:'other'}));await f.sync.refresh();assert.equal(f.states.at(-1).snapshot,null);assert.equal(f.states.at(-1).error,true);});
test('refresh failure preserves last authoritative snapshot and can retry',async()=>{
 let fail=false;const states=[];const sync=createProfessionalReadinessSync({userId:'owner',load:async()=>{if(fail)throw Error('offline');return snapshot();},publish:s=>states.push(s)});
 await sync.refresh();fail=true;await sync.refresh();assert.equal(states.at(-1).snapshot.status.license_status,'pending');assert.equal(states.at(-1).error,true);fail=false;await sync.refresh();assert.equal(states.at(-1).error,false);
});

// Run the real provider effects with isolated transport and browser event targets.
function providerHarness() {
 let cursor=0,path='/dashboard',tree,db=snapshot(),rpcReads=0,licenseReads=0;const values=[],deps=[],cleanups=[],effects=[],channels=[],listeners=new Map();
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],x=>values[i]=typeof x==='function'?x(values[i]):x];},useRef(initial){const i=cursor++;return values[i]??=( {current:initial});},useCallback(fn,d){const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){deps[i]=d;values[i]=fn;}return values[i];},useEffect(fn,d){const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){deps[i]=d;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}};
 const events=prefix=>({addEventListener:(name,fn)=>{const key=prefix+name;listeners.set(key,new Set([...(listeners.get(key)||[]),fn]));},removeEventListener:(name,fn)=>listeners.get(prefix+name)?.delete(fn)});
 const window={...events('w:'),setTimeout:()=>1,clearTimeout(){}};const document={...events('d:'),visibilityState:'visible'};
 const client={channel(topic){const ch={topic,handlers:[],removed:false,on(kind,filter,handler){this.handlers.push({kind,filter,handler});return this;},subscribe(fn){this.subscribed=fn;return this;}};channels.push(ch);return ch;},removeChannel(ch){ch.removed=true;},from(table){assert.equal(table,'professional_license_verifications');return{select(selection){assert.equal(selection,'*');return{eq(column,id){assert.equal(column,'artist_id');assert.equal(id,'owner');return{async maybeSingle(){licenseReads++;return{data:db.verification,error:null};}};}};}};}};
 const exports={};vm.runInNewContext(ts.transpileModule(source('components/ProfessionalReadinessProvider.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,window,document,Error,require(id){if(id==='react')return hooks;if(id==='next/navigation')return{usePathname:()=>path};if(id==='@/lib/supabase')return{supabase:client};if(id==='@/lib/professional-activation-client')return{loadMyProfessionalActivationStatus:async()=>{rpcReads++;return{data:db.status,error:null};}};if(id==='@/lib/professional-readiness-sync')return{createProfessionalReadinessSync};if(id==='@/lib/realtime-channel')return{createRealtimeChannelTopic:x=>x+'-fixture'};return require(id);}});
 const render=()=>{cursor=0;tree=exports.default({userId:'owner',children:'fixture-pages'});for(const run of effects.splice(0))run();return tree;};
 return {render,channels,listeners,get state(){return values[0];},get reads(){return rpcReads;},get licenseReads(){return licenseReads;},set:x=>db=x,navigate:p=>{path=p;render();},fire:(event,visible=true)=>{document.visibilityState=visible?'visible':'hidden';for(const fn of listeners.get(event)||[])fn();},dispose:()=>cleanups.forEach(fn=>fn?.())};
}
test('one owner has only INSERT/UPDATE with owner filter; navigation never multiplies subscriptions',async()=>{
 const h=providerHarness();h.render();await settle();for(const p of ['/dashboard/onboarding','/dashboard/settings','/dashboard']){h.navigate(p);await settle();}
 assert.equal(h.channels.length,1);assert.deepEqual(h.channels[0].handlers.map(x=>x.filter.event),['INSERT','UPDATE']);for(const {filter} of h.channels[0].handlers){assert.equal(filter.table,'professional_license_verifications');assert.equal(filter.filter,'artist_id=eq.owner');}assert.equal(h.reads,4);assert.equal(h.licenseReads,4);h.dispose();assert.equal(h.channels[0].removed,true);assert.ok([...h.listeners.values()].every(set=>set.size===0));
});
test('focus, visible return, online and reconnect reconcile the same shared snapshot',async()=>{
 const h=providerHarness();h.render();await settle();h.set(snapshot('verified'));h.fire('d:visibilitychange',false);assert.equal(h.reads,1);for(const event of ['w:focus','d:visibilitychange','w:online']){h.fire(event);await settle();assert.equal(h.state.snapshot.status.license_status,'verified');}h.channels[0].subscribed('SUBSCRIBED');await settle();assert.equal(h.reads,5);h.dispose();
});
test('provider rechecks conflicting license/RPC reads instead of publishing mixed status',async()=>{
 const h=providerHarness();h.set({...snapshot('verified'),verification:snapshot('pending').verification});h.render();await settle();assert.equal(h.state.error,true);assert.equal(h.state.snapshot,null);assert.equal(h.reads,3);h.dispose();
});
test('all consumers share readiness and explicit activation remains the only write path',()=>{
 for(const file of ['app/dashboard/page.tsx','app/dashboard/onboarding/page.tsx','app/dashboard/settings/page.tsx']){const s=source(file);assert.match(s,/useProfessionalReadiness\(\)/);assert.doesNotMatch(s,/loadMyProfessionalActivationStatus|\.channel\(/);assert.match(s,/setProfessionalProfileVisibility/);}
 const owner=source('components/ProfessionalReadinessProvider.tsx');assert.doesNotMatch(owner,/setProfessionalProfileVisibility|\.insert\(|\.update\(|\.upsert\(/);assert.match(owner,/role="status" aria-live="polite"/);assert.match(source('components/ProfessionalDashboardShell.tsx'),/ProfessionalReadinessProvider key=\{professional.id\}/);
});


test('updated correction message is authoritative even without a status transition', async () => {
 const f=fixture(snapshot('rejected'));await f.sync.refresh();
 const next=snapshot('rejected');next.status.license_decision_message='Provide the current license number';next.verification.decision_message=next.status.license_decision_message;
 f.set(next);f.sync.changed({new:{artist_id:'owner',decision_message:'untrusted'}});await settle();
 assert.equal(f.states.at(-1).snapshot.status.license_decision_message,next.status.license_decision_message);
 assert.equal(f.states.at(-1).announcement,'');
});

test('late failed request cannot replace a successful newer refresh with an error', async () => {
 const pending=[],states=[];const sync=createProfessionalReadinessSync({userId:'owner',load:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),publish:s=>states.push(s)});
 const first=sync.refresh(),second=sync.refresh();pending[1].resolve(snapshot('verified'));await second;pending[0].reject(Error('old failure'));await first;
 assert.equal(states.length,1);assert.equal(states[0].error,false);
});
