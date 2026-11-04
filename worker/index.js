// The Sites owner-only access gate protects the UI and these same-origin endpoints.
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(path==='/')return new Response(HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 if(path==='/app.js')return new Response(JS,{headers:{'Content-Type':'text/javascript;charset=utf-8','Cache-Control':'no-store'}});
 if(!path.startsWith('/api/'))return new Response('Not found',{status:404});
 if(!['GET','POST','PUT','DELETE'].includes(method))return json({message:'Método inválido'},405);
 if(method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({message:'Origem inválida'},403);
 if(!env.DB)return json({message:'Banco indisponível'},503);
 try{
  if(path==='/api/tickets'&&method==='GET'){const from=Number(url.searchParams.get('from')||0);if(!Number.isSafeInteger(from)||from<0)return json({message:'Página inválida'},400);const {results}=await env.DB.prepare('select * from tickets order by closed_on desc, created_at desc, id limit 1000 offset ?').bind(from).all();return json(results)}
  if(path==='/api/tickets'&&method==='POST'){
   const body=await request.json(),number=typeof body.number==='string'?body.number.trim():'';const date=body.closed_on;
   if(!number||number.length>100||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return json({message:'Ticket ou data inválidos'},400);
   const row={id:crypto.randomUUID(),number,closed_on:date,created_at:new Date().toISOString()};
   await env.DB.prepare('insert into tickets(id,number,closed_on,created_at) values (?,?,?,?)').bind(row.id,row.number,row.closed_on,row.created_at).run();return json(row,201);
  }
  if(path.startsWith('/api/tickets/')&&method==='DELETE'){const id=decodeURIComponent(path.slice('/api/tickets/'.length));const result=await env.DB.prepare('delete from tickets where id=?').bind(id).run();return json(result.meta.changes?[{id}]:[])}
  if(path==='/api/notepad'&&method==='GET'){return json(await env.DB.prepare('select content from notepad where id=1').first()||{content:''})}
  if(path==='/api/notepad'&&method==='PUT'){const body=await request.json();if(typeof body.content!=='string'||body.content.length>100000)return json({message:'Texto inválido'},400);await env.DB.prepare('insert into notepad(id,content) values (1,?) on conflict(id) do update set content=excluded.content').bind(body.content).run();return json({saved:true})}
  return json({message:'Não encontrado'},404);
 }catch(error){if(String(error.message).includes('UNIQUE'))return json({code:'23505',message:'Ticket já registrado'},409);return json({message:'Não foi possível concluir a operação'},500)}
}};
