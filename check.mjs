import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('drizzle/0000_personal_workspace.sql','utf8'));
sqlite.exec(fs.readFileSync('drizzle/0001_note_history.sql','utf8'));
sqlite.exec(fs.readFileSync('drizzle/0002_note_deletion.sql','utf8'));
const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this},async all(){return {results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}}}}};
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('dist/server/index.js')).toString('base64'));
const req=(path,method='GET',body,origin='https://example.test')=>worker.fetch(new Request('https://example.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),{DB});
assert(!(await (await req('/')).text()).includes('id="auth"'));
assert.equal((await req('/api/tickets','POST',{number:'123',closed_on:'2026-11-04'})).status,201);
assert.equal((await req('/api/tickets','POST',{number:'123',closed_on:'2026-11-04'})).status,409);
let rows=await (await req('/api/tickets')).json();assert.equal(rows.length,1);
assert.equal((await req('/api/tickets','POST',{number:'bad',closed_on:'2026-02-30'})).status,400);
assert.equal((await req('/api/notepad','PUT',{content:'Livre\nSegunda linha'})).status,200);
assert.equal((await (await req('/api/notepad')).json()).content,'Livre\nSegunda linha');
assert.equal((await req('/api/notepad','PUT',{content:'intruso'},'https://other.test')).status,403);
assert.equal((await req('/api/tickets/'+rows[0].id,'DELETE')).status,200);
assert.equal((await (await req('/api/tickets')).json()).length,0);
console.log('Passed: no login, persistence, duplicates, date validation, delete, cross-origin protection');
let history=await (await req('/api/notes')).json();assert.equal(history.length,1);assert.equal(history[0].content,'Livre\nSegunda linha');
assert.equal((await (await req('/api/notes')).json()).length,1);
const first=await (await req('/api/notes','POST',{content:'Nova anotação'})).json();
await req('/api/notes','POST',{content:'Outra anotação'});
await req('/api/notes/'+first.id,'PUT',{content:'Texto editado'});
history=await (await req('/api/notes')).json();assert.equal(history.length,3);assert.equal(history.find(n=>n.id===first.id).content,'Texto editado');assert(history.some(n=>n.id==='original-notepad'));
assert.equal((await req('/api/notes','POST',{content:'  '})).status,400);
console.log('Passed: legacy preservation, separate saved notes, history and editing');

assert.equal((await req('/api/notes/'+first.id,'DELETE')).status,200);
assert(!(await (await req('/api/notes')).json()).some(n=>n.id===first.id));
await req('/api/notes/original-notepad','DELETE');
assert(!(await (await req('/api/notes')).json()).some(n=>n.id==='original-notepad'));
assert.equal((await req('/api/notes/'+first.id,'PUT',{content:'Deleted'})).status,404);
console.log('Passed: history deletion, no legacy resurrection, deleted note cannot be edited');

const extensionRequest = (path, method, body, extraHeaders = {}) => {
  const headers = {
    'Origin': 'chrome-extension://nfjkhehohhjpmalmkllgfjnfpelilpio',
    'X-My-Work-Client': 'chrome-side-panel',
    'oai-authenticated-user-id': 'test-owner',
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  for (const key of Object.keys(headers)) if (headers[key] === null) delete headers[key];
  return worker.fetch(new Request('https://example.test/api/extension/' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }), {DB});
};

const extensionTicket = {number:'extension-123', closed_on:'2026-11-05'};
assert.equal((await extensionRequest('tickets', 'GET', undefined, {'oai-authenticated-user-id':null})).status, 401);
assert.equal((await extensionRequest('tickets', 'POST', extensionTicket, {Origin:'https://other.test'})).status, 403);
assert.equal((await extensionRequest('tickets', 'POST', extensionTicket, {'X-My-Work-Client':null})).status, 403);
assert.equal((await extensionRequest('notepad', 'GET')).status, 404);
assert.equal((await extensionRequest('tickets', 'OPTIONS')).status, 405);
assert.equal((await extensionRequest('tickets', 'POST', extensionTicket)).status, 201);
assert.equal((await extensionRequest('tickets', 'POST', extensionTicket)).status, 409);
assert((await (await req('/api/tickets')).json()).some(ticket => ticket.number === extensionTicket.number));
assert((await (await extensionRequest('tickets?from=0','GET',undefined,{Origin:null})).json()).some(ticket => ticket.number === extensionTicket.number));
const extensionNote = await (await extensionRequest('notes', 'POST', {content:'Pelo painel lateral'})).json();
assert.equal((await extensionRequest('notes/' + extensionNote.id, 'PUT', {content:'Editado no painel'})).status, 200);
assert((await (await req('/api/notes')).json()).some(note => note.id === extensionNote.id && note.content === 'Editado no painel'));
console.log('Passed: extension session, origin, request header, route scope, shared tickets and notes');
