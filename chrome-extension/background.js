const SITE = "https://meus-chamados-robson-041126.nosborx-costa.chatgpt.site";
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
async function findTab() {
 const tabs=await chrome.tabs.query({url:SITE+'/*'});
 return tabs.find(t=>t.status==='complete')||tabs[0];
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||sender.tab||!sender.url?.startsWith(chrome.runtime.getURL('')))return;
 if(msg?.type==='MY_WORK_OPEN'){
  (async()=>{const tab=await findTab();if(tab){await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true})}else await chrome.tabs.create({url:SITE});return {ok:true}})().then(reply,()=>reply({error:{message:'Não foi possível abrir o site.'}}));return true;
 }
 if(msg?.type!=='MY_WORK_API')return;
 (async()=>{
  const tab=await findTab();
  if(!tab)return {data:null,error:{message:'Abra o site e entre na sua conta. Depois clique em Conectar / atualizar.',connection:true}};
  try{return await chrome.tabs.sendMessage(tab.id,{type:'MY_WORK_REQUEST',path:msg.path,method:msg.method,body:msg.body})}
  catch{return {data:null,error:{message:'Recarregue a aba do My Work, conclua o login e clique em Conectar / atualizar.',connection:true}}}
 })().then(reply,()=>reply({data:null,error:{message:'Falha ao conectar ao My Work.',connection:true}}));return true;
});