(() => {
 const expectedOrigin="https://meus-chamados-robson-041126.nosborx-costa.chatgpt.site";
 function allowed(path,method){
  if(typeof path!=='string'||!['GET','POST','PUT','DELETE'].includes(method))return false;
  if(method==='GET')return /^\/api\/tickets(?:\?from=\d+)?$/.test(path)||path==='/api/notes';
  if(method==='POST')return path==='/api/tickets'||path==='/api/notes';
  if(method==='PUT')return /^\/api\/notes\/[a-zA-Z0-9-]+$/.test(path);
  return /^\/api\/(?:tickets|notes)\/[a-zA-Z0-9-]+$/.test(path);
 }
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||msg?.type!=='MY_WORK_REQUEST')return;
  if(location.origin!==expectedOrigin||!allowed(msg.path,msg.method)){reply({data:null,error:{message:'Operação inválida'}});return;}
  if(msg.body&&JSON.stringify(msg.body).length>110000){reply({data:null,error:{message:'Conteúdo muito grande'}});return;}
  (async()=>{
   const response=await fetch(msg.path,{method:msg.method,credentials:'same-origin',redirect:'error',headers:msg.body?{'Content-Type':'application/json'}:{},body:msg.body?JSON.stringify(msg.body):undefined,signal:AbortSignal.timeout(20000)});
   if(!response.headers.get('content-type')?.includes('application/json'))return {data:null,error:{message:'Entre na sua conta na aba do My Work e tente novamente.',connection:true}};
   const data=await response.json();
   return response.ok?{data,error:null}:{data:null,error:data};
  })().then(reply,()=>reply({data:null,error:{message:'Verifique a conexão e o login na aba do My Work.',connection:true}}));return true;
 });
})();