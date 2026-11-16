/* USA50 verified star + account mail. Shared pink idol / blue staff icon. */
(function(){
'use strict';
const starSvg='<svg class="usa50-verified-svg" viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M32 3L40.7 23.1L62.5 24.8L45.7 39.4L50.8 61L32 49.7L13.2 61L18.3 39.4L1.5 24.8L23.3 23.1Z"/><path d="M20.2 34.5L28.7 43.2L44.9 25.6" fill="none" stroke="#fff" stroke-width="6.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
window.USA50VerifiedBadge=function(person,avatar=false){
 if(!person?.verifiedIdol&&!person?.verifiedStaff)return '';
 const isStaff=!!person.verifiedStaff&&!person.verifiedIdol;
 return '<span class="usa50-verified-badge '+(isStaff?'staff':'idol')+(avatar?' on-avatar':'')+'" title="'+(isStaff?'Verified USA50 staff':'Verified USA50 idol')+'" aria-label="'+(isStaff?'Verified USA50 staff':'Verified USA50 idol')+'">'+starSvg+'</span>';
};
function notices(){return store?.mailbox||{items:[],unread:0};}
function escapeText(value){return e(String(value||''));}
function listHtml(){
 const items=notices().items||[];
 return '<div class="usa50-mail-intro"><p>Official USA50 activity and account updates</p>'+
 (items.some(n=>!n.read)?'<button type="button" class="btn tiny secondary" data-action="usa50-mail-read-all">Mark all read</button>':'')+'</div>'+
 (items.length?'<div class="usa50-mail-list">'+items.map(n=>{
  const iconType={'idol-heart':'♥','idol-reply':'✉','fancall-won':'🎫','fancall-lost':'✉','fan-rank':'🏆','vip-tier':'✦'}[n.type]||'✧';
  const date=Number.isFinite(Date.parse(n.createdAt))?new Date(n.createdAt).toLocaleString():'';
  return '<button type="button" class="usa50-mail-item '+(n.read?'read':'unread')+'" data-action="usa50-mail-select" data-value="'+escapeText(n.id)+'" aria-label="'+escapeText(n.text)+'"><span class="usa50-mail-item-symbol">'+iconType+'</span><span><strong>'+escapeText(n.text)+'</strong><small>'+escapeText(date)+'</small></span>'+(n.read?'':'<span class="usa50-mail-unread-dot"></span>')+'</button>';
 }).join('')+'</div>':'<div class="usa50-mail-empty">Your USA50 mail is empty. Idol hearts, fancall results, replies and milestones will appear here.</div>');
}
function openMail(){
 if(!store?.me)return go('profile');
 showModal('Your Mail ✉',listHtml());
}
function updateMailIcon(){
 const bar=document.querySelector('.top-actions');
 if(!bar)return;
 const count=Number(notices().unread||0);
 let btn=bar.querySelector('.usa50-mail-button');
 if(!btn){
  const markup='<button type="button" class="icon-btn usa50-mail-button" data-action="usa50-mail-open" aria-label="Open your mail" title="Your mail">'+
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>'+
    '<span class="usa50-mail-count" hidden></span></button>';
  const mobile=bar.querySelector('.mobile-menu');
  if(mobile)mobile.insertAdjacentHTML('beforebegin',markup);else bar.insertAdjacentHTML('beforeend',markup);
  btn=bar.querySelector('.usa50-mail-button');
 }
 const pill=btn.querySelector('.usa50-mail-count');
 pill.hidden=count===0;
 pill.textContent=count>99?'99+':String(count);
 btn.setAttribute('aria-label',count?count+' unread USA50 messages':'Open your mail');
}
const oldRender=render;
render=function(){oldRender();updateMailIcon();};
const oldAct=act;
act=async function(name,node){
 if(name==='usa50-mail-open')return openMail();
 if(name==='usa50-mail-read-all'||name==='usa50-mail-select'){
  const id=name==='usa50-mail-select'?String(node.dataset.value||''):null;
  const selected=id?(notices().items||[]).find(x=>x.id===id):null;
  await request('/api/notifications/read',{method:'POST',body:JSON.stringify(id?{id}:{})});
  const next=await request('/api/notifications/list');store.mailbox=next;
  if(name==='usa50-mail-read-all'){showModal('Your Mail ✉',listHtml());updateMailIcon();return;}
  hideModal();updateMailIcon();
  if(selected?.type?.startsWith('fancall')){go('events');return;}
  if(selected?.type==='idol-heart'&&selected.postId){go('community');return;}
  if(selected?.type==='idol-reply'){go('messages');return;}
  if(selected?.type==='fan-rank'||selected?.type==='vip-tier'){go('profile');return;}
  return openMail();
 }
 return oldAct(name,node);
};
let checking=false;
setInterval(async()=>{
 if(checking||!store?.me||document.visibilityState!=='visible')return;
 checking=true;
 try{
  const latest=await request('/api/notifications/list');
  const before=Number(store?.mailbox?.unread||0);
  store.mailbox=latest;updateMailIcon();
  if(latest.unread>before&&before>=0)toast('New USA50 mail ✉');
 }catch(_err){}finally{checking=false;}
},20000);
})();
