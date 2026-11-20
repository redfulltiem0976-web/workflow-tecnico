'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wf-v2-'));const db=new DatabaseSync(path.join(tmp,'t.sqlite'));db.exec('PRAGMA foreign_keys=ON');const {init,handle}=require('../api');init(db);after(()=>{db.close();fs.rmSync(tmp,{recursive:true,force:true})});
test('V2 checklist, bitácora y duplicación con SQL persistente',()=>{
 const id=1;let detail=handle(db,'GET',`/api/orders/${id}/detail`,new URLSearchParams(),{}).data;assert.ok(detail.checklist.length>=3);
 const task=detail.checklist[0];assert.equal(handle(db,'PATCH',`/api/orders/${id}/checklist/${task.id}`,null,{done:false}).data.saved,true);
 assert.equal(handle(db,'POST',`/api/orders/${id}/notes`,null,{note:'Revisada temperatura antes de intervenir'}).status,201);
 const clone=handle(db,'POST',`/api/orders/${id}/duplicate`,null,{});assert.equal(clone.status,201);assert.notEqual(clone.data.id,id);
 detail=handle(db,'GET',`/api/orders/${id}/detail`,new URLSearchParams(),{}).data;assert.ok(detail.activity.some(x=>x.type==='nota'));assert.ok(handle(db,'GET',`/api/orders/${clone.data.id}/detail`,null,{}).data.checklist.length>=3);
});
