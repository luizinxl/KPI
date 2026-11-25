import fs from 'node:fs';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
const load=s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
const {default:w}=await load(fs.readFileSync('dist/server/index.js','utf8'));
const {fields,parseValue,validate}=await load(fs.readFileSync('public/fields.js','utf8'));
assert.equal(parseValue('1.250,50','money'),1250.5);assert.equal(parseValue('1,5','hours'),90);assert.equal(parseValue('',''),null);assert.equal(parseValue('0'),0);assert.throws(()=>parseValue('1,5'));assert.throws(()=>parseValue('-2'));assert.throws(()=>parseValue('1.5'));
const map=new Map();let rev=0;const env={ENTRY_PIN:'test',BUCKET:{async get(k){const o=map.get(k);return o?{etag:o.etag,text:async()=>o.text}:null;},async put(k,v,opts){const prev=map.get(k);if(opts?.onlyIf&&(opts.onlyIf.etagMatches?prev?.etag!==opts.onlyIf.etagMatches:!!prev))return null;const etag=String(++rev);map.set(k,{text:v,etag});return {etag};},async delete(k){map.delete(k);}}};
async function call(path,method='GET',body,cookie){return w.fetch(new Request('https://test'+path,{method,headers:{origin:'https://test',...(cookie?{cookie}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);}
let r=await call('/api/data?year=2027');assert.equal(r.status,200);assert.deepEqual((await r.json()).months,{});
const values=Object.fromEntries(fields.map(([id])=>[id,null]));values[21]=100;values[5]=5;values[12]=90;
r=await call('/api/data?year=2027','PUT',{month:0,values,revision:null});assert.equal(r.status,401);
r=await call('/api/login','POST',{pin:'test'});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
r=await call('/api/data?year=2027','PUT',{month:0,values,revision:null},cookie);assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.months[0].values[12],90);
r=await call('/api/data?year=2027','PUT',{month:0,values,revision:null},cookie);assert.equal(r.status,409);
values[5]=101;assert.throws(()=>validate(values));r=await call('/api/data?year=2027','PUT',{month:0,values,revision:saved.revision},cookie);assert.equal(r.status,400);
await call('/api/logout','POST',null,cookie);r=await call('/api/session','GET',null,cookie);assert.equal((await r.json()).authenticated,false);
console.log('Passed: parsing, units, validation, persistence, PIN, conflicts, logout.');
// Editing an existing month records the replaced snapshot atomically; restoring it creates a new revision.
r=await call('/api/login','POST',{pin:'test'});const cookie2=r.headers.get('set-cookie').split(';')[0];
values[5]=4;
r=await call('/api/data?year=2027','PUT',{month:0,values,revision:saved.revision,status:'draft'},cookie2);assert.equal(r.status,200);let updated=await r.json();
assert.equal(updated.history[0].at(-1).previous.values[5],5);
assert.equal(updated.months[0].status,'draft');
const prior=updated.history[0].at(-1).previous;
r=await call('/api/data?year=2027','PUT',{month:0,values:prior.values,revision:updated.revision,status:'draft'},cookie2);assert.equal(r.status,200);updated=await r.json();assert.equal(updated.months[0].values[5],5);assert.equal(updated.history[0].at(-1).previous.values[5],4);
r=await call('/api/data?year=2027','PUT',{month:0,values,revision:updated.revision,status:'closed'},cookie2);assert.equal(r.status,400);
const complete=Object.fromEntries(fields.map(([id])=>[id,0]));
r=await call('/api/data?year=2025','PUT',{month:0,values:complete,revision:null,status:'closed'},cookie2);assert.equal(r.status,200);assert.equal((await r.json()).months[0].status,'closed');
r=await call('/api/data?year=2100','PUT',{month:0,values:complete,revision:null,status:'closed'},cookie2);assert.equal(r.status,400);
console.log('Passed: history, recovery, closed-month completeness and future-period protection.');
// Overview settings persist independently of data and reject invalid/duplicate graph choices.
r=await call('/api/settings');assert.equal(r.status,200);assert.equal((await r.json()).overview,null);
r=await call('/api/settings','PUT',{overview:['0:0'],revision:null});assert.equal(r.status,401);
r=await call('/api/settings','PUT',{overview:['0:0','6:1'],revision:null},cookie2);assert.equal(r.status,200);const settings=await r.json();assert.deepEqual(settings.overview,['0:0','6:1']);
r=await call('/api/settings');assert.deepEqual((await r.json()).overview,['0:0','6:1']);
r=await call('/api/settings','PUT',{overview:['1:0'],revision:null},cookie2);assert.equal(r.status,409);
for(const overview of [[],['99:0'],['0:0','0:0'],['0:99']]){r=await call('/api/settings','PUT',{overview,revision:settings.revision},cookie2);assert.equal(r.status,400);}
console.log('Passed: overview settings persistence, PIN authorization, valid selections and concurrent edits.');
