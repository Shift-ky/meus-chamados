function showConnectionError(text) {
 const status = document.getElementById('connection-status');
 status.textContent = text;
 status.classList.toggle('error', Boolean(text));
 document.getElementById('open-site').hidden = !text;
}

async function api(path, method = 'GET', body) {
 try {
  const result = await chrome.runtime.sendMessage({type:'MY_WORK_API', path, method, body});
  if (!result) throw Error();
  showConnectionError(result.error?.connection ? result.error.message : '');
  return result;
 } catch {
  const message = 'Falha ao conectar. Reabra o painel lateral.';
  showConnectionError(message);
  return {data:null, error:{message, connection:true}};
 }
}
const $ = id => document.getElementById(id);
const day = () => {const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let entries=[], user={id:"personal"}, busy=false, ready=false, loadVersion=0;
const message=(text,error=false)=>{$('message').textContent=text;$('message').classList.toggle('error',error)};
function lock(){lockActiveTicket()}
function renderGoals() {
 const today = day();
 const start = new Date(today + 'T12:00:00');
 start.setDate(start.getDate() - 28);
 const dateKey = date => date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
 const historyStart = dateKey(start);
 const historyCount = entries.filter(entry => entry.closed_on >= historyStart && entry.closed_on < today).length;
 const monday = new Date(today + 'T12:00:00');
 monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
 const weekStart = dateKey(monday);
 for (const period of ['daily','weekly']) {
  const count = entries.filter(entry => period === 'daily'
   ? entry.closed_on === today
   : entry.closed_on >= weekStart && entry.closed_on <= today).length;
  const average = Math.max(1, Math.ceil(historyCount / (period === 'daily' ? 28 : 4)));
  const target = period === 'daily' ? Math.min(14, Math.max(7, average)) : Math.max(7, average);
  const progress = $(period + '-progress');
  progress.max = target;
  progress.value = ready ? Math.min(count, target) : 0;
  const status = $(period + '-goal-status');
  status.textContent = ready ? count + ' / ' + target : 'Aguardando atualização';
  status.parentElement.classList.toggle('goal-reached', ready && count >= target);
 }
}
setInterval(render, 60000);

function render(){
 const today=day();
 const monday = new Date(today + 'T12:00:00');
 monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
 const weekStart = monday.getFullYear() + '-' + String(monday.getMonth()+1).padStart(2,'0') + '-' + String(monday.getDate()).padStart(2,'0');
 $('todayCount').textContent=entries.filter(e=>e.closed_on===today).length;
 $('weekCount').textContent=entries.filter(e=>e.closed_on>=weekStart && e.closed_on<=today).length;
 renderGoals();
 renderClosedTickets();
}
const closedPanel = $('closed-tickets');
const closedToggle = $('closed-toggle');
const closureDate = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short'});
function renderClosedTickets(){
 if(closedPanel.hidden)return;
 const list=$('closed-list'), status=$('closed-status');
 status.textContent=entries.length?'':ready?'Nenhum chamado fechado.':'Clique em Atualizar para carregar os chamados.';
 status.hidden=!status.textContent;
 const rows=document.createDocumentFragment();
 for(const {number,closed_on} of entries){
  const row=document.createElement('li');
  const ticket=document.createElement('strong');
  const date=document.createElement('time');
  ticket.textContent='#'+number;
  date.dateTime=closed_on;
  date.textContent=closureDate.format(new Date(closed_on+'T12:00:00'));
  row.append(ticket,date);
  rows.append(row);
 }
 list.replaceChildren(rows);
}
closedToggle.onclick=()=>{
 const opening=closedPanel.hidden;
 closedPanel.hidden=!opening;
 closedToggle.setAttribute('aria-expanded',String(opening));
 closedToggle.textContent=opening?'Ocultar fechados':'Ver fechados';
 if(opening)renderClosedTickets();
};
async function load(){
 const version=++loadVersion,owner=user?.id;if(!owner)return;
 ready=false;lock();message('Carregando chamados…');
 try{let all=[];for(let from=0;;from+=1000){const {data,error}=await api('/api/tickets?from='+from);if(error)throw error;all.push(...data);if(data.length<1000)break}if(version!==loadVersion||user?.id!==owner)return;entries=all;ready=true;render();message('')}catch{if(version===loadVersion)message('Não foi possível carregar os chamados. Verifique sua conexão e clique em Atualizar.',true)}finally{lock()}
}
const activeTicketKey = 'my-work-active-tickets';
const legacyTicket = localStorage.getItem('my-work-active-ticket');
let activeTickets = JSON.parse(localStorage.getItem(activeTicketKey) ?? 'null') ?? (legacyTicket ? [legacyTicket] : []);
const activeNumber = $('active-ticket-number');
const activeStatus = $('active-ticket-status');

function updateActiveTickets(tickets) {
 localStorage.setItem(activeTicketKey, JSON.stringify(tickets));
 localStorage.removeItem('my-work-active-ticket');
 activeTickets = tickets;
 lock();
}

function lockActiveTicket() {
 const list = $('active-ticket-list');
 list.replaceChildren();
 for (const number of activeTickets) {
  const row = document.createElement('li');
  const label = document.createElement('span');
  label.textContent = '#' + number;
  const finish = document.createElement('button');
  finish.textContent = 'Finalizado';
  finish.disabled = busy || !ready || !user;
  finish.onclick = () => finishTicket(number);
  const remove = document.createElement('button');
  remove.className = 'plain';
  remove.textContent = 'Remover';
  remove.disabled = busy;
  remove.onclick = () => {
   updateActiveTickets(activeTickets.filter(ticket => ticket !== number));
   activeStatus.textContent = 'Ticket #' + number + ' removido.';
  };
  row.append(label, finish, remove);
  list.append(row);
 }
}

async function registerClosedTicket(number, closedOn) {
 const {data,error} = await api('/api/tickets','POST',{number,closed_on:closedOn});
 if(error) throw error;
 entries.push(data);
 entries.sort((a,b)=>b.closed_on.localeCompare(a.closed_on)||b.created_at.localeCompare(a.created_at));
 render();
}

$('active-ticket-form').onsubmit = event => {
 event.preventDefault();
 const number = activeNumber.value.trim().replace(/^#+/,'').trim();
 if (!number || activeTickets.includes(number)) return;
 updateActiveTickets([...activeTickets, number]);
 activeNumber.value = '';
 activeStatus.textContent = 'Ticket #' + number + ' em atendimento.';
};

async function finishTicket(number) {
 if (busy || !ready || !user) return;
 busy = true;
 lock();
 try {
  await registerClosedTicket(number, day());
  activeStatus.textContent = 'Ticket #' + number + ' finalizado.';
 } catch(error) {
  if (error?.code !== '23505') {
   activeStatus.textContent = 'Não foi possível finalizar. Tente novamente.';
   return;
  }
  activeStatus.textContent = 'Esse ticket já consta nos chamados fechados.';
 } finally {
  busy = false;
  lock();
 }
 updateActiveTickets(activeTickets.filter(ticket => ticket !== number));
}
let noteReady=false,noteSaving=false,noteDirty=false,noteVersion=0,notes=[],editingId=null;
function noteStatus(text,error=false){$('note-status').textContent=text;$('note-status').classList.toggle('error',error)}
function noteLock(){$('notepad').disabled=!noteReady||noteSaving;$('note-save').disabled=!noteReady||noteSaving||!noteDirty||!$('notepad').value.trim();$('note-retry').hidden=noteReady||noteSaving;$('note-cancel').disabled=noteSaving;$('note-template').disabled=!noteReady||noteSaving}
const noteDraftKey = 'my-work-note-draft';
function persistNoteDraft() {
 localStorage.setItem(noteDraftKey, JSON.stringify({id: editingId, dirty: noteDirty, content: $('notepad').value}));
}
function showEditMode() {
 $('note-label').textContent='Editando anotação salva';
 $('note-save').textContent='Salvar alterações';
 $('note-cancel').hidden=false;
}
const noteDraft = JSON.parse(localStorage.getItem(noteDraftKey) ?? 'null');
if (noteDraft) {
 editingId = noteDraft.id;
 noteDirty = noteDraft.dirty;
 $('notepad').value = noteDraft.content;
 if (editingId) showEditMode();
}
function clearDraft(){localStorage.removeItem(noteDraftKey);editingId=null;noteDirty=false;$('notepad').value='';$('note-label').textContent='Nova anotação';$('note-save').textContent='Salvar anotação';$('note-cancel').hidden=true;noteLock()}
function noteField(content, label) {
 const pattern = new RegExp(String.raw`^[^\S\r\n]*${label}[^\S\r\n]*:[^\S\r\n]*([^\r\n]*)`, 'im');
 return pattern.exec(content)?.[1].trim() ?? '';
}

function normalizeName(name) {
 return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

$('note-search').addEventListener('input', renderNotes);

function renderNotes(){
 const query = normalizeName($('note-search').value);
 const matches = notes.map(note => ({ note, name: noteField(note.content, 'SOLICITANTE') }))
  .filter(({ name }) => !query || normalizeName(name).includes(query));
 $('note-count').textContent=`(${query ? matches.length + ' de ' : ''}${notes.length})`;$('note-history-list').replaceChildren();
 if(!matches.length){const p=document.createElement('p');p.textContent=query?'Nenhuma anotação encontrada para esse solicitante.':'Suas anotações salvas aparecerão aqui.';p.style.fontSize='12px';$('note-history-list').append(p)}
 for(const { note, name } of matches){
  const detail=document.createElement('details'),summary=document.createElement('summary'),date=document.createElement('small'),text=document.createElement('div'),edit=document.createElement('button');
  detail.style.cssText='border-top:1px solid #edf0eb;padding:12px 0';summary.style.cssText='cursor:pointer;font-size:13px;color:#607268;overflow-wrap:anywhere';const title = [name, noteField(note.content, 'CLIENTE')].filter(Boolean).join(' · ');summary.textContent=title || note.content.trim().replace(/\s+/g,' ').slice(0,85)+(note.content.length>85?'…':'');
  date.textContent=new Date(note.created_at).toLocaleString('pt-BR');date.style.cssText='display:block;color:#98a39c;font-size:11px;margin-top:6px';summary.append(date);
  text.textContent=note.content;text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.7;margin:16px 0';edit.className='plain';edit.textContent='Editar';
  edit.onclick=()=>{if(noteSaving)return;if(noteDirty&&!confirm('Substituir o rascunho atual por esta anotação?'))return;editingId=note.id;$('notepad').value=note.content;noteDirty=false;showEditMode();persistNoteDraft();noteStatus('Edite o texto e salve as alterações.');noteLock();$('notepad').focus();$('notepad').scrollIntoView({behavior:'smooth',block:'center'})};
  const remove=document.createElement('button');remove.className='plain';remove.textContent='Excluir';remove.style.cssText='margin-left:8px;color:#96766e';remove.onclick=async()=>{if(noteSaving||!confirm('Excluir esta anotação do histórico?'))return;noteSaving=true;noteLock();try{const {error}=await api('/api/notes/'+encodeURIComponent(note.id),'DELETE');if(error)throw error;notes=notes.filter(n=>n.id!==note.id);noteSaving=false;if(editingId===note.id)clearDraft();renderNotes();noteStatus('Anotação excluída do histórico.')}catch{noteStatus('Não foi possível excluir. Tente novamente.',true)}finally{noteSaving=false;noteLock()}};
  const row = document.createElement('div');
  row.style.cssText = 'position:relative';
  detail.style.paddingRight = '72px';
  edit.type = 'button';
  edit.style.cssText = 'position:absolute;right:0;top:6px';
  detail.append(summary,text,remove);
  row.append(detail,edit);
  $('note-history-list').append(row);
 }
}
async function loadNotepad(){
 noteReady=false;noteLock();noteStatus('Carregando histórico…');
 try{const {data,error}=await api('/api/notes');if(error)throw error;notes=data;noteReady=true;renderNotes();noteStatus(noteDirty?'Rascunho recuperado.':'')}catch{noteStatus('Não foi possível carregar o histórico. Tente novamente.',true)}finally{noteLock()}
}
$('notepad').oninput=()=>{noteDirty=true;persistNoteDraft();noteStatus('Alterações não salvas.');noteLock()};$('note-retry').onclick=loadNotepad;
$('note-template').onclick=()=>{if(!noteReady||noteSaving)return;const field=$('notepad'),template='CLIENTE: \nSOLICITANTE: \nTELEFONE: \nPROBLEMA: ';if(field.value.length+(field.value?'\n\n':'').length+template.length>field.maxLength){noteStatus('Não há espaço para inserir o modelo.',true);return}field.value+=(field.value?'\n\n':'')+template;noteDirty=true;persistNoteDraft();noteStatus('Modelo inserido. Preencha os campos e salve.');noteLock();field.focus()};
$('note-cancel').onclick=()=>{if(noteDirty&&!confirm('Descartar as alterações não salvas?'))return;clearDraft();noteStatus('Pronto para uma nova anotação.')};
$('note-save').onclick=async()=>{
 if(!noteReady||noteSaving||!noteDirty||!$('notepad').value.trim())return;
 const id=editingId,content=$('notepad').value;noteSaving=true;noteLock();noteStatus('Salvando…');
 try{const {data,error}=await api(id?'/api/notes/'+encodeURIComponent(id):'/api/notes',id?'PUT':'POST',{content});if(error)throw error;notes=id?notes.map(note=>note.id===id?data:note):[data,...notes];noteSaving=false;clearDraft();renderNotes();$('note-history').open=Boolean(id);noteStatus(id?'Alterações salvas no histórico.':'Anotação salva no histórico. Pode escrever outra.');$('notepad').focus()}catch{noteStatus('Não foi possível salvar. Seu texto continua aqui; tente novamente.',true)}finally{noteSaving=false;noteLock()}
};

render();lock();

load();loadNotepad();

document.getElementById('open-site').onclick=async()=>{
 const status=document.getElementById('connection-status');
 try{
  const result=await chrome.runtime.sendMessage({type:'MY_WORK_OPEN'});
  if(!result?.ok)throw Error();
  status.textContent='Depois de entrar no My Work, feche a aba e clique em Atualizar.';
  status.classList.remove('error');
 }catch{
  status.textContent='Não foi possível abrir o My Work.';
  status.classList.add('error');
 }
};
document.getElementById('reconnect').onclick=()=>{if(!busy&&!noteSaving){load();loadNotepad()}};
