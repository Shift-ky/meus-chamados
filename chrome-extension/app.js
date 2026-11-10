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
function lock(){document.querySelectorAll('#form input,#form button,#import').forEach(e=>e.disabled=busy||!ready||!user)}
function render(){
 $('todayCount').textContent=entries.filter(e=>e.closed_on===day()).length;
 $('total').textContent=`(${entries.length})`;
 const rows=entries.filter(e=>!$('filter').value||e.closed_on===$('filter').value);
 $('list').replaceChildren();$('empty').hidden=!!rows.length;
 $('summary').textContent=`${rows.length} chamado${rows.length===1?'':'s'} ${$('filter').value?'neste dia':'no total'}`;
 for(const e of rows){
  const li=document.createElement('li'),tick=document.createElement('span'),info=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small'),badge=document.createElement('span'),del=document.createElement('button');
  tick.className='tick';tick.textContent='✓';info.className='ticket';b.textContent='#'+e.number;
  small.textContent=new Date(e.closed_on+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  info.append(b,small);badge.className='badge';badge.textContent='Fechado';del.className='remove';del.textContent='×';del.setAttribute('aria-label','Excluir ticket '+e.number);del.disabled=busy||!ready;
  del.onclick=async()=>{if(busy||!confirm('Excluir o ticket '+e.number+'?'))return;busy=true;lock();render();try{const {data,error}=await api('/api/tickets/'+encodeURIComponent(e.id),'DELETE');if(error)throw error;if(!data.length)throw Error('Registro não encontrado. Atualize a lista.');entries=entries.filter(x=>x.id!==e.id);message('Registro excluído do banco.')}catch{message('Não foi possível excluir. Tente novamente.',true)}finally{busy=false;lock();render()}};
  li.append(tick,info,badge,del);$('list').append(li);
 }
}
async function load(){
 const version=++loadVersion,owner=user?.id;if(!owner)return;
 ready=false;lock();message('Carregando chamados…');
 try{let all=[];for(let from=0;;from+=1000){const {data,error}=await api('/api/tickets?from='+from);if(error)throw error;all.push(...data);if(data.length<1000)break}if(version!==loadVersion||user?.id!==owner)return;entries=all;ready=true;render();message('')}catch{if(version===loadVersion)message('Não foi possível carregar os chamados. Verifique sua conexão e clique em Atualizar.',true)}finally{lock()}
}
$('date').value=$('filter').value=day();
$('form').onsubmit=async e=>{
 e.preventDefault();if(busy||!ready||!user)return;
 const number=$('number').value.trim().replace(/^#+/,'').trim(),closed_on=$('date').value;
 if(!number||!closed_on){message('Preencha o ticket e a data.',true);return}
 busy=true;lock();message('Salvando…');
 try{const {data,error}=await api('/api/tickets','POST',{number,closed_on});if(error)throw error;entries.push(data);entries.sort((a,b)=>b.closed_on.localeCompare(a.closed_on)||b.created_at.localeCompare(a.created_at));$('filter').value=closed_on;$('number').value='';render();message('Ticket #'+number+' salvo no banco de dados.')}catch(error){message(error.code==='23505'?'Esse ticket já foi registrado.':'Não foi possível salvar. O ticket permanece no campo para você tentar novamente.',true)}finally{busy=false;lock();$('number').focus()}
};
$('filter').onchange=render;$('all').onclick=()=>{$('filter').value='';render()};$('refresh').onclick=()=>{if(!busy)load()};
$('export').onclick=()=>{if(!entries.length){message('Nenhum registro para exportar.');return}const safe=v=>'"'+(/^[=+@\-\t\r]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"';const rows=['Ticket;Data de fechamento',...entries.map(e=>safe(e.number)+';'+safe(e.closed_on))];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='my-work-'+day()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onclick=()=> $('import-file').click();
$('import-file').onchange=async()=>{
 const file=$('import-file').files[0];if(!file||busy||!ready||!user)return;
 busy=true;lock();let imported=0;
 try{const text=(await file.text()).replace(/^\uFEFF/,'');const rows=text.trim().split(/\r?\n/);if(rows.shift()!=='Ticket;Data de fechamento')throw Error('Formato inválido. Use o CSV exportado pela versão anterior.');
 const pending=[];for(const row of rows){const match=row.match(/^"((?:[^"]|"")*)";"(\d{4}-\d{2}-\d{2})"$/);if(!match)throw Error('CSV inválido. Use o arquivo original exportado.');let number=match[1].replace(/""/g,'"');if(/^'[=+@\-\t\r]/.test(number))number=number.slice(1);const date=match[2];if(!number.trim()||number.length>100||Number.isNaN(Date.parse(date+'T12:00:00'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Ticket ou data inválidos no CSV.');pending.push({number,closed_on:date,user_id:user.id})}
 for(const record of pending){const {error}=await api('/api/tickets','POST',record);if(error&&error.code!=='23505')throw Error('A importação foi interrompida. Você pode reenviar o arquivo; tickets duplicados serão ignorados.');if(!error)imported++}
 await load();message(`${imported} chamado(s) importado(s). Duplicados foram ignorados.`);
 }catch(error){await load();message(error.message||'Não foi possível importar o arquivo.',true)}finally{busy=false;lock();$('import-file').value=''}
};
let noteReady=false,noteSaving=false,noteDirty=false,noteVersion=0,notes=[],editingId=null;
function noteStatus(text,error=false){$('note-status').textContent=text;$('note-status').classList.toggle('error',error)}
function noteLock(){$('notepad').disabled=!noteReady||noteSaving;$('note-save').disabled=!noteReady||noteSaving||!noteDirty||!$('notepad').value.trim();$('note-retry').hidden=noteReady||noteSaving;$('note-cancel').disabled=noteSaving;$('note-template').disabled=!noteReady||noteSaving}
function clearDraft(){editingId=null;noteDirty=false;$('notepad').value='';$('note-label').textContent='Nova anotação';$('note-save').textContent='Salvar anotação';$('note-cancel').hidden=true;noteLock()}
function renderNotes(){
 $('note-count').textContent=`(${notes.length})`;$('note-history-list').replaceChildren();
 if(!notes.length){const p=document.createElement('p');p.textContent='Suas anotações salvas aparecerão aqui.';p.style.fontSize='12px';$('note-history-list').append(p)}
 for(const note of notes){
  const detail=document.createElement('details'),summary=document.createElement('summary'),date=document.createElement('small'),text=document.createElement('div'),edit=document.createElement('button');
  detail.style.cssText='border-top:1px solid #edf0eb;padding:12px 0';summary.style.cssText='cursor:pointer;font-size:13px;color:#607268;overflow-wrap:anywhere';summary.textContent=note.content.trim().replace(/\s+/g,' ').slice(0,85)+(note.content.length>85?'…':'');
  date.textContent=new Date(note.created_at).toLocaleString('pt-BR');date.style.cssText='display:block;color:#98a39c;font-size:11px;margin-top:6px';summary.append(date);
  text.textContent=note.content;text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.7;margin:16px 0';edit.className='plain';edit.textContent='Editar';
  edit.onclick=()=>{if(noteSaving)return;if(noteDirty&&!confirm('Substituir o rascunho atual por esta anotação?'))return;editingId=note.id;$('notepad').value=note.content;noteDirty=false;$('note-label').textContent='Editando anotação salva';$('note-save').textContent='Salvar alterações';$('note-cancel').hidden=false;noteStatus('Edite o texto e salve as alterações.');noteLock();$('notepad').focus();$('notepad').scrollIntoView({behavior:'smooth',block:'center'})};
  const remove=document.createElement('button');remove.className='plain';remove.textContent='Excluir';remove.style.cssText='margin-left:8px;color:#96766e';remove.onclick=async()=>{if(noteSaving||!confirm('Excluir esta anotação do histórico?'))return;noteSaving=true;noteLock();try{const {error}=await api('/api/notes/'+encodeURIComponent(note.id),'DELETE');if(error)throw error;notes=notes.filter(n=>n.id!==note.id);noteSaving=false;if(editingId===note.id)clearDraft();renderNotes();noteStatus('Anotação excluída do histórico.')}catch{noteStatus('Não foi possível excluir. Tente novamente.',true)}finally{noteSaving=false;noteLock()}};
  detail.append(summary,text,edit,remove);$('note-history-list').append(detail);
 }
}
async function loadNotepad(){
 noteReady=false;noteLock();noteStatus('Carregando histórico…');
 try{const {data,error}=await api('/api/notes');if(error)throw error;notes=data;noteReady=true;renderNotes();noteStatus('')}catch{noteStatus('Não foi possível carregar o histórico. Tente novamente.',true)}finally{noteLock()}
}
$('notepad').oninput=()=>{noteDirty=true;noteStatus('Alterações não salvas.');noteLock()};$('note-retry').onclick=loadNotepad;
$('note-template').onclick=()=>{if(!noteReady||noteSaving)return;const field=$('notepad'),template='CLIENTE: \nSOLICITANTE: \nTELEFONE: \nPROBLEMA: ';if(field.value.length+(field.value?'\n\n':'').length+template.length>field.maxLength){noteStatus('Não há espaço para inserir o modelo.',true);return}field.value+=(field.value?'\n\n':'')+template;noteDirty=true;noteStatus('Modelo inserido. Preencha os campos e salve.');noteLock();field.focus()};
$('note-cancel').onclick=()=>{if(noteDirty&&!confirm('Descartar as alterações não salvas?'))return;clearDraft();noteStatus('Pronto para uma nova anotação.')};
$('note-save').onclick=async()=>{
 if(!noteReady||noteSaving||!noteDirty||!$('notepad').value.trim())return;
 const id=editingId,content=$('notepad').value;noteSaving=true;noteLock();noteStatus('Salvando…');
 try{const {data,error}=await api(id?'/api/notes/'+encodeURIComponent(id):'/api/notes',id?'PUT':'POST',{content});if(error)throw error;notes=id?notes.map(note=>note.id===id?data:note):[data,...notes];noteSaving=false;clearDraft();renderNotes();$('note-history').open=false;noteStatus(id?'Alterações salvas no histórico.':'Anotação salva no histórico. Pode escrever outra.');$('notepad').focus()}catch{noteStatus('Não foi possível salvar. Seu texto continua aqui; tente novamente.',true)}finally{noteSaving=false;noteLock()}
};

window.addEventListener('beforeunload',event=>{if(noteDirty){event.preventDefault();event.returnValue=''}});
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
