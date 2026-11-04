async function api(path,method='GET',body){try{const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});if(!response.ok){const error=await response.json().catch(()=>({message:'Erro de conexão'}));return {data:null,error}}return {data:await response.json(),error:null}}catch{return {data:null,error:{message:'Sem conexão'}}}}
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
 try{let all=[];for(let from=0;;from+=1000){const {data,error}=await api('/api/tickets?from='+from);if(error)throw error;all.push(...data);if(data.length<1000)break}if(version!==loadVersion||user?.id!==owner)return;entries=all;ready=true;render();message('Registros atualizados com o banco de dados.')}catch{if(version===loadVersion)message('Não foi possível carregar os chamados. Verifique sua conexão e clique em Atualizar.',true)}finally{lock()}
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
let noteReady=false,noteSaving=false,noteDirty=false,noteVersion=0;
function noteStatus(text,error=false){$('note-status').textContent=text;$('note-status').classList.toggle('error',error)}
function noteLock(){$('notepad').disabled=!noteReady||noteSaving||!user;$('note-save').disabled=!noteReady||noteSaving||!noteDirty||!user;$('note-retry').hidden=noteReady||noteSaving}
function resetNotepad(){noteVersion++;noteReady=false;noteSaving=false;noteDirty=false;$('notepad').value='';noteStatus('');noteLock()}
async function loadNotepad(){
 const owner=user?.id,version=++noteVersion;if(!owner)return;
 noteReady=false;noteLock();noteStatus('Carregando suas anotações…');
 try{const {data,error}=await api('/api/notepad');if(error)throw error;if(version!==noteVersion||user?.id!==owner)return;$('notepad').value=data?.content||'';noteReady=true;noteDirty=false;noteStatus(data?'Anotações carregadas.':'Escreva o que precisar e clique em Salvar anotações.')}catch{if(version===noteVersion)noteStatus('Não foi possível carregar suas anotações. Tente novamente.',true)}finally{noteLock()}
}
$('notepad').oninput=()=>{noteDirty=true;noteStatus('Alterações não salvas.');noteLock()};
$('note-retry').onclick=loadNotepad;
$('note-save').onclick=async()=>{
 if(!user||!noteReady||noteSaving||!noteDirty)return;
 const owner=user.id,version=noteVersion,content=$('notepad').value;
 noteSaving=true;noteLock();noteStatus('Salvando anotações…');
 try{const {error}=await api('/api/notepad','PUT',{content});if(error)throw error;if(version!==noteVersion||user?.id!==owner)return;noteDirty=false;noteStatus('Anotações salvas no banco de dados.')}catch{if(version===noteVersion)noteStatus('Não foi possível salvar. Seu texto continua aqui; tente novamente.',true)}finally{if(version===noteVersion){noteSaving=false;noteLock()}}
};
window.addEventListener('beforeunload',event=>{if(noteDirty){event.preventDefault();event.returnValue=''}});
render();lock();

load();loadNotepad();
