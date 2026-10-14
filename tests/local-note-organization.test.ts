import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { filterLocalCategoryNotes, validateLocalCategoryName, LOCAL_NOTE_CATEGORY_EXAMPLES } from "../lib/local-note-organization.ts";

test("custom category names normalize whitespace and reject duplicates and system names",()=>{
 assert.deepEqual(validateLocalCategoryName("  Color   notes  ",LOCAL_NOTE_CATEGORY_EXAMPLES),{name:"Color notes",error:""});
 for(const label of ["all"," ALL ","Pinned"," retention ","COLOR FORMULAS"]){assert.ok(validateLocalCategoryName(label,LOCAL_NOTE_CATEGORY_EXAMPLES).error,label);}
 assert.ok(validateLocalCategoryName("   ",[]).error);
 assert.ok(validateLocalCategoryName("x".repeat(41),[]).error);
});
test("the local prototype has no category-count entitlement limit",()=>{
 const many=Array.from({length:80},(_,i)=>({id:`local-${i}`,name:`Category ${i}`}));
 assert.equal(validateLocalCategoryName("Another category",many).error,"");
});
test("local organization filters independently of note type without mutating notes",()=>{
 const notes=[{id:"a",is_pinned:false,note_type:"inspiration"},{id:"b",is_pinned:true,note_type:"inspiration"},{id:"c",is_pinned:false,note_type:"service_note"}];
 const before=JSON.stringify(notes);
 const assignments={a:"local-retention",b:"local-ideas",c:"local-retention"};
 assert.deepEqual(filterLocalCategoryNotes(notes,"local-retention",assignments).map(n=>n.id),["a","c"]);
 assert.deepEqual(filterLocalCategoryNotes(notes,"pinned",assignments).map(n=>n.id),["b"]);
 assert.equal(filterLocalCategoryNotes(notes,"all",assignments),notes);
 assert.deepEqual(filterLocalCategoryNotes(notes,"unknown",assignments),[]);
 assert.equal(JSON.stringify(notes),before);
});
test("custom category experiment is development-only; the real route uses the safe shared rail",()=>{
 const ui=readFileSync(new URL("../components/LocalClientNoteOrganization.tsx",import.meta.url),"utf8");
 const page=readFileSync(new URL("../app/dashboard/clients/[clientId]/notes/page.tsx",import.meta.url),"utf8");
 assert.match(ui,/process\.env\.NODE_ENV !== "development"/);
 assert.doesNotMatch(page,/import LocalClientNoteOrganization from|<LocalClientNoteOrganization/);
 assert.match(page,/<ClientNotesCategoryRail/);
 assert.doesNotMatch(ui,/supabase|localStorage|sessionStorage|fetch\(/);
 assert.match(ui,/Local category preview · resets when you leave/);
});
