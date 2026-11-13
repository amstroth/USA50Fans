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
let commentsPostId=null;
function idolName(){
 const idol=(store.members||[]).find(m=>m.id===(store.me?.idolId||'arielle'));
 return idol?.name||store.me?.displayName||'USA50 Idol';
}
function idolBubble(post){
 const replies=repliesFor(post.id);
 return '<article class="idol-studio-row" id="idol-message-'+e(post.id)+'">'+
 '<div class="idol-studio-bubble"><p>'+e(post.body)+'</p><small>'+ts(post.createdAt)+'</small></div>'+
 '<button type="button" class="idol-studio-comments" data-action="idol-studio-comments" data-value="'+e(post.id)+'" aria-label="View '+replies.length+' fan comments for this message">'+
 '◌ Comments <b>'+replies.length+'</b></button></article>';
}
function idolChat(){
 const me=store.me;
 const posts=ownPosts();
 return '<section class="idol-studio"><header class="idol-studio-header">'+
 '<div class="idol-studio-avatar">'+avatar((store.members||[]).find(m=>m.id===me.idolId)||{id:me.idolId,name:idolName(),emoji:'✦'})+'</div>'+
 '<div class="idol-studio-header-name"><span class="eyebrow">IDOL STUDIO · USA50</span><h1>'+e(idolName())+' ♡</h1><small>Broadcast to fans · responses are private</small></div>'+
 '<span class="idol-studio-online">Official</span></header>'+
 '<div class="idol-studio-chat-log" role="log" aria-label="Your published idol updates">'+
 (posts.length?posts.map(idolBubble).join(''):'<div class="idol-studio-empty"><span>✦</span><h3>Your story starts here</h3><p>Write your first message to USA50 fans below.</p></div>')+
 '</div><footer class="idol-studio-compose"><div class="idol-studio-compose-hint">Your messages appear in fans’ inboxes. Fan replies stay private between each fan and you.</div>'+
 (me.mustChangePassword?'<p class="idol-studio-locked">Change your temporary password in My Page to publish.</p>':
 '<form id="idol-post-form" class="idol-studio-compose-form"><label for="idol-studio-message" class="sr-only">Message to fans</label>'+
 '<textarea id="idol-studio-message" name="body" maxlength="1200" minlength="2" rows="1" placeholder="Message your fans…" aria-label="Message your fans" required></textarea>'+
 '<button type="submit" aria-label="Send to fans">↑</button></form>')+
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
 return priorAct(name,node);
};
submitForm=async function(form){
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