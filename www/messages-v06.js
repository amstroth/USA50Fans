/* USA50 Messages v0.6: full-screen fan inbox, pinned idols and conversations. */
(function installMessagesV06(){
'use strict';
let threadId=null, searchTerm='';
const oldMessagesScreen=messagesScreen;
const role=()=>store?.me?.role||'fan';
const msg=()=>store?.messaging||{posts:[],replies:[],pinnedIds:[],unreadCounts:{}};
const dateShort=x=>x?new Date(x).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
const time=x=>x?new Date(x).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
const allMembers=()=>store?.members||[];
const pinned=m=>(msg().pinnedIds||[]).includes(m.id);
function recent(m){
 const notes=[];
 for(const p of msg().posts||[])if(p.idolId===m.id)notes.push({at:p.createdAt,text:p.body,from:'idol'});
 for(const r of msg().replies||[])if(r.idolId===m.id){
   notes.push({at:r.createdAt,text:r.text,from:'you'});
   if(r.idolResponse)notes.push({at:r.idolResponse.createdAt,text:r.idolResponse.text,from:'idol'});
 }
 notes.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 return notes[0]||null;
}
function pinControl(m){
 if(!store.me)return '';
 return '<button class="im-pin '+(pinned(m)?'selected':'')+'" type="button" data-action="im-pin" data-value="'+e(m.id)+'" aria-label="'+(pinned(m)?'Unpin ':'Pin ')+e(m.name)+'" title="'+(pinned(m)?'Unpin':'Pin to top')+'">'+(pinned(m)?'★':'☆')+'</button>';
}
function listing(m){
 const r=recent(m),n=(msg().unreadCounts||{})[m.id]||0;
 return '<div class="im-listing"><button class="im-listing-open" type="button" data-action="im-open" data-value="'+e(m.id)+'">'+
 '<span class="im-avatar">'+avatar(m)+'</span><span class="im-label"><strong>'+e(m.name)+'</strong><small>'+e(m.team)+' · '+e(r?(r.from==='you'?'You: ':'')+r.text:'No messages yet')+'</small></span>'+
 '<span class="im-listing-meta"><small>'+dateShort(r?.at)+'</small>'+(n?'<b class="im-notification" aria-label="'+n+' unread">'+(n>99?'99+':n)+'</b>':'')+'</span></button>'+
 pinControl(m)+'</div>';
}
function section(title,people){
 if(!people.length)return '';
 return '<section class="im-section"><div class="im-section-title">'+title+'</div><div class="im-section-list">'+people.map(listing).join('')+'</div></section>';
}
function gallery(){
 const ms=allMembers().slice().sort((a,b)=>
 Number(pinned(b))-Number(pinned(a))||
 Date.parse(recent(b)?.at||'1970-01-01')-Date.parse(recent(a)?.at||'1970-01-01')||
 a.name.localeCompare(b.name));
 const unread=ms.reduce((n,m)=>n+((msg().unreadCounts||{})[m.id]||0),0);
 return '<div class="im-gallery"><header class="im-gallery-head"><span class="eyebrow">USA50 FAN CLUB</span><h1>Messages <span>✦</span></h1><p>Official updates from your favorite idols</p>'+
 '<small class="im-badge">'+(unread?unread+' unread':'All caught up ♡')+'</small></header>'+
 '<label class="im-search">⌕ <input id="im-filter" type="search" placeholder="Search idols" value="'+e(searchTerm)+'" aria-label="Search messages"></label>'+
 (!store.me?'<p class="im-guest">Reading is free. <button class="text-btn" data-go="profile">Sign in</button> to pin favorites.</p>':'')+
 '<div class="im-list-groups">'+section('Pinned',ms.filter(pinned))+section('All Idols',ms.filter(m=>!pinned(m)))+'</div>'+
 '<p class="im-privacy-note">Replies are private between each fan and idol. Fan subscriptions are only simulated in this development build.</p></div>';
}
function chat(){
 const m=allMembers().find(x=>x.id===threadId);if(!m){threadId=null;return gallery();}
 const posts=(msg().posts||[]).filter(p=>p.idolId===threadId);
 const messages=[];
 for(const p of posts)messages.push({at:p.createdAt,body:p.body,from:'idol'});
 for(const r of msg().replies||[])if(r.idolId===threadId){
   messages.push({at:r.createdAt,body:r.text,from:'fan'});
   if(r.idolResponse)messages.push({at:r.idolResponse.createdAt,body:r.idolResponse.text,from:'personal'});
 }
 messages.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const rows=messages.map(p=>'<div class="im-msg-row '+(p.from==='fan'?'outbound':'inbound')+'"><div class="im-chat-bubble '+(p.from==='fan'?'mine':p.from==='personal'?'personal':'')+'"><p>'+e(p.body)+'</p><small>'+e(p.from==='personal'?'Private reply · ':'')+time(p.at)+'</small></div></div>').join('');
 const last=posts.slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
 const locked=!store.me?.state?.subscriberPreview||msg().banned||!last||store.me?.mustChangePassword;
 let input='';
 if(!locked)input='<form id="fan-reply-form" class="im-reply-form"><input type="hidden" name="postId" value="'+e(last.id)+'"><input name="text" type="text" maxlength="500" required placeholder="Reply privately to '+e(m.name)+'…"><button type="submit" aria-label="Send reply">↑</button></form>';
 else input='<div class="im-locked">'+(msg().banned?'Replies are temporarily suspended':!last?'Waiting for this idol to post':store.me?.mustChangePassword?'Change your password in My Page':'Subscribe to send a private reply')+
 (last&&!msg().banned?'<button class="text-btn" data-go="profile">'+(store.me?'Subscription settings':'Sign in')+'</button>':'')+'</div>';
 return '<div class="im-chat"><header class="im-chat-header"><button class="im-back" data-action="im-back" type="button" aria-label="Back to inbox">‹ <span>Back</span></button><div class="im-idol">'+avatar(m)+'<div><strong>'+e(m.name)+'</strong><small>'+e(m.team)+' · Official idol updates</small></div></div>'+pinControl(m)+'</header>'+
 '<div class="im-chat-log" id="im-chat-log" role="log" aria-label="Messages from '+e(m.name)+'">'+(rows||'<div class="im-no-chat"><div>'+avatar(m)+'</div><h3>No messages yet ♡</h3><p>New updates from '+e(m.name)+' will appear here.</p></div>')+'</div>'+
 '<footer class="im-composer"><p>Only you and '+e(m.name)+' can see your replies.</p>'+input+'</footer></div>';
}
messagesScreen=function(){
 if(role()==='idol'||role()==='admin')return oldMessagesScreen();
 return threadId?chat():gallery();
};
const oldRender=render;
render=function(){
 oldRender();
 const shell=document.querySelector('.app-shell');if(!shell)return;
 const active=view==='messages'&&role()==='fan';
 shell.classList.toggle('im-active',active);
 shell.classList.toggle('im-in-chat',active&&!!threadId);
 if(active&&threadId)requestAnimationFrame(()=>{const pane=document.querySelector('#im-chat-log');if(pane)pane.scrollTop=pane.scrollHeight;});
};
const oldGo=go;
go=function(next){
 if(next!=='messages'){threadId=null;searchTerm='';}
 oldGo(next);
};
function filter(query){
 searchTerm=query.toLowerCase().trim();
 document.querySelectorAll('.im-listing').forEach(el=>el.hidden=!el.textContent.toLowerCase().includes(searchTerm));
 document.querySelectorAll('.im-section').forEach(el=>el.hidden=!Array.from(el.querySelectorAll('.im-listing')).some(row=>!row.hidden));
}
document.addEventListener('input',ev=>{if(ev.target?.id==='im-filter')filter(ev.target.value);});
const oldAct=act;
act=async function(name,node){
 if(name==='im-back'){threadId=null;render();window.scrollTo(0,0);return;}
 if(name==='im-open'){
   if(!allMembers().some(m=>m.id===node.dataset.value))return;
   threadId=node.dataset.value;searchTerm='';
   if(store.me&&role()==='fan'&&!store.me.mustChangePassword){
     await request('/api/messages/mark-read',{method:'POST',body:JSON.stringify({idolId:threadId})});await refresh();
   }else render();
   window.scrollTo(0,0);return;
 }
 if(name==='im-pin'){
   if(!store.me)return toast('Sign in to pin favorite idols.');
   await request('/api/messages/pin',{method:'POST',body:JSON.stringify({idolId:node.dataset.value})});
   await refresh();return;
 }
 return oldAct(name,node);
};
const oldSubmit=submitForm;
submitForm=async function(form){
 if(form.id==='fan-reply-form'){
   const data=Object.fromEntries(new FormData(form));
   await request('/api/messages/fan-reply',{method:'POST',body:JSON.stringify(data)});
   await refresh();return toast('Private reply sent ♡');
 }
 return oldSubmit(form);
};
window.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'&&view==='messages'&&threadId&&!modalOpen){threadId=null;render();}
});
})();