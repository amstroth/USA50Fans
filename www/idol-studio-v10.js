/* USA50 Idol Studio: iMessage-style idol broadcast conversation and per-post fan responses. */
(function installIdolStudioV10(){
'use strict';
const priorMessagesScreen=messagesScreen;
const priorAct=act;
const priorSubmit=submitForm;
const role=()=>store?.me?.role;
const inbox=()=>store?.messaging||{posts:[],replies:[]};
const ownPosts=()=>inbox().posts.filter(p=>p.idolId===(store.me?.idolId||'arielle')).slice().sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
const repliesFor=postId=>inbox().replies.filter(r=>r.postId===postId&&r.idolId===(store.me?.idolId||'arielle')).slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
const ts=date=>{const d=new Date(date);return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''};
let commentsPostId=null,activeIdolThread=null,publicReplyTo=null;
const currentIdol=()=>store.me?.idolId||'arielle';
const openThread=()=>activeIdolThread||currentIdol();
const publicAnswers=postId=>(inbox().idolReplies||[]).filter(r=>r.postId===postId).slice().sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
function idolName(){
 const idol=(store.members||[]).find(m=>m.id===(store.me?.idolId||'arielle'));
 return idol?.name||store.me?.displayName||'USA50 Idol';
}
function idolBubble(post){
 const isMine=post.idolId===currentIdol();
 const answers=publicAnswers(post.id);
 const comments=isMine?repliesFor(post.id):[];
 const openForm=publicReplyTo===post.id&&!isMine;
 const buttons=isMine?'<button type="button" class="idol-studio-comments" data-action="idol-studio-comments" data-value="'+e(post.id)+'" aria-label="View '+comments.length+' private fan comments">◌ Fan comments <b>'+comments.length+'</b></button>':
 '<button type="button" class="idol-studio-comments" data-action="idol-public-reply-toggle" data-value="'+e(post.id)+'" aria-label="Reply publicly to this idol message">↩ Reply publicly</button>';
 const sender=(store.members||[]).find(m=>m.id===post.idolId);
 const thread=sender?.name||post.idolId;
 return '<article class="idol-studio-row '+(isMine?'idol-studio-own':'idol-studio-other')+'" id="idol-message-'+e(post.id)+'">'+
 '<div class="idol-studio-bubble"><p>'+e(post.body)+'</p><small>'+e(thread)+' · '+ts(post.createdAt)+'</small></div>'+
 '<div class="idol-studio-row-actions">'+buttons+'</div>'+
 (answers.length?'<div class="idol-public-replies">'+answers.map(r=>
 '<div class="idol-public-answer"><strong>✦ '+e(r.fromName)+' · Public reply</strong><p>'+e(r.text)+'</p><small>'+ts(r.createdAt)+' · Visible to all fans</small></div>').join('')+'</div>':'')+
 (openForm?'<form id="idol-public-reply-form" class="idol-public-reply-form"><input type="hidden" name="postId" value="'+e(post.id)+'">'+
 '<label for="idol-public-reply-field" class="sr-only">Public message to '+e(thread)+'</label>'+
 '<textarea id="idol-public-reply-field" name="text" maxlength="600" rows="2" required placeholder="Reply to '+e(thread)+' · everyone can see this…"></textarea>'+
 '<div><small>All fans and idols can read this reply.</small><button type="submit">Post public reply ↑</button></div></form>':'')+
 '</article>';
}
function idolThreadSelector(){
 const selected=openThread();
 const ids=(store.members||[]).filter(m=>['arielle','jaylene','kellie','z','michelle','zoe','miu'].includes(m.id));
 return '<nav class="idol-thread-list" aria-label="Choose an idol conversation">'+ids.map(m=>
 '<button type="button" data-action="idol-thread-select" data-value="'+e(m.id)+'" class="idol-thread-choice '+(m.id===selected?'selected':'')+'" aria-current="'+(m.id===selected?'page':'false')+'">'+
 '<span class="idol-thread-emoji">'+avatar(m)+'</span><span>'+e(m.name)+'</span>'+
 (m.id===currentIdol()?'<small>Me</small>':'')+'</button>').join('')+'</nav>';
}
function idolChat(){
 const me=store.me,selected=openThread(),own=selected===currentIdol();
 const idol=(store.members||[]).find(m=>m.id===selected);
 const posts=(inbox().posts||[]).filter(p=>p.idolId===selected)
  .slice().sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
 const name=idol?.name||selected;
 return '<section class="idol-studio"><header class="idol-studio-header">'+
 '<div class="idol-studio-avatar">'+avatar(idol||{id:selected,name,emoji:'✦'})+'</div>'+
 '<div class="idol-studio-header-name"><span class="eyebrow">IDOL STUDIO · USA50</span><h1>'+e(name)+' ♡</h1>'+
 '<small>'+(own?'Your public broadcasts · private fan responses':'Idol-to-idol conversation · public to all fans')+'</small></div>'+
 '<span class="idol-studio-online">Official</span></header>'+idolThreadSelector()+
 '<div class="idol-studio-chat-log" role="log" aria-label="Published idol updates from '+e(name)+'">'+
 (posts.length?posts.map(idolBubble).join(''):'<div class="idol-studio-empty"><span>✦</span><h3>No updates yet</h3><p>'+(own?'Write your first message below.':'This idol has not posted yet.')+'</p></div>')+
 '</div><footer class="idol-studio-compose"><div class="idol-studio-compose-hint">'+
 (own?'Your messages go to all fans. Private fan replies remain confidential.':
 'Choose “Reply publicly” beneath any message above. Other idols and all fans can see your response.')+'</div>'+
 (me.mustChangePassword?'<p class="idol-studio-locked">Change your temporary password in My Page to publish.</p>':
 own?'<form id="idol-post-form" class="idol-studio-compose-form"><label for="idol-studio-message" class="sr-only">Message to fans</label>'+
 '<textarea id="idol-studio-message" name="body" maxlength="1200" minlength="2" rows="1" placeholder="Message your fans…" aria-label="Message your fans" required></textarea>'+
 '<button type="submit" aria-label="Send to fans">↑</button></form>':'')+
 '</footer></section>';
}
function openComments(postId){
 const post=ownPosts().find(p=>p.id===postId);
 if(!post)return toast('This message is no longer available.');
 commentsPostId=postId;
 const replies=repliesFor(postId);
 const rows=replies.map(r=>
 '<article class="idol-comment"><div class="idol-comment-head"><span class="idol-comment-fan-avatar">'+e((r.fanName||'?').slice(0,1).toUpperCase())+'</span>'+
 '<div><strong>'+e(r.fanName||'Fan')+'</strong><small>'+ts(r.createdAt)+'</small></div></div>'+
 '<p>'+e(r.text)+'</p>'+
 (r.idolResponse?'<div class="idol-comment-answer"><span>You replied · '+ts(r.idolResponse.createdAt)+'</span><p>'+e(r.idolResponse.text)+'</p></div>':'')+
 '<button type="button" class="idol-comment-reply" data-action="respond-fan" data-value="'+e(r.id)+'">'+(r.idolResponse?'Edit your reply':'Reply privately')+'</button></article>'
 ).join('');
 showModal('Comments · '+replies.length, '<div class="idol-comments-view"><div class="idol-comments-context"><strong>Your message</strong><p>'+e(post.body)+'</p>'+
 '<small>'+ts(post.createdAt)+'</small></div>'+
 '<h3>Fan responses <span>'+replies.length+'</span></h3>'+
 (rows||'<div class="idol-comments-empty">No responses yet. Fans who reply to this message will appear here.</div>')+
 '<p class="idol-comments-privacy">Responses are only visible to you and the fan who wrote them. Fans cannot see each other’s replies.</p></div>');
}
messagesScreen=function(){
 if(role()==='idol')return idolChat();
 return priorMessagesScreen();
};
act=async function(name,node){
 if(name==='idol-studio-comments'){openComments(node.dataset.value);return;}
 if(name==='idol-thread-select'){
   if(!(store.members||[]).some(m=>m.id===node.dataset.value))return;
   activeIdolThread=node.dataset.value;publicReplyTo=null;render();return;
 }
 if(name==='idol-public-reply-toggle'){
   const post=(inbox().posts||[]).find(p=>p.id===node.dataset.value);
   if(!post||post.idolId===currentIdol()||post.idolId!==openThread())return;
   publicReplyTo=publicReplyTo===post.id?null:post.id;render();
   document.getElementById('idol-public-reply-field')?.focus();return;
 }
 return priorAct(name,node);
};
submitForm=async function(form){
 if(form.id==='idol-public-reply-form'){
   const data=Object.fromEntries(new FormData(form));
   const post=(inbox().posts||[]).find(p=>p.id===data.postId);
   if(!post||post.idolId===currentIdol())return toast('Choose another idol’s message.');
   await request('/api/idol/public-reply',{method:'POST',body:JSON.stringify(data)});
   publicReplyTo=null;await refresh();
   return toast('Your reply is now visible to all fans ✦');
 }
 if(form.id==='idol-post-form'){
  const content=String(new FormData(form).get('body')||'').trim();
  if(content.length<2)return toast('Write at least two characters to send.');
  await request('/api/idol/post',{method:'POST',body:JSON.stringify({body:content})});
  await refresh();
  const log=document.querySelector('.idol-studio-chat-log');
  if(log)log.scrollTop=log.scrollHeight;
  return toast('Message sent to fans ♡');
 }
 return priorSubmit(form);
};
const priorRender=render;
render=function(){
 priorRender();
 if(view==='messages'&&role()==='idol'){
  const log=document.querySelector('.idol-studio-chat-log');
  if(log)requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});
 }
};
document.addEventListener('input',event=>{
 if(event.target?.id==='idol-studio-message'){
  const box=event.target;
  box.style.height='auto';
  box.style.height=Math.min(160,Math.max(37,box.scrollHeight))+'px';
 }
});
})();