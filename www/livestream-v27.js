/* USA50 Live v27: group hosts, post-scheduling stream URL, chat, gifts and creator ledger. */
(function(){
'use strict';
let liveTicker=null;
const liveData=()=>store?.liveEvents||{streams:[],events:[],hostOptions:[]};
const isManager=()=>['admin','management'].includes(store?.me?.role);
const isIdol=()=>store?.me?.role==='idol';
const xescape=x=>e(String(x??''));
function hostPicker(selected=[],name='hosts'){
 const options=liveData().hostOptions||[];
 return '<fieldset class="usa50-live-host-picker"><legend>Who is appearing live? (select multiple)</legend>'+
 '<div class="usa50-live-host-options">'+options.map(x=>
  '<label class="usa50-live-host-option"><input type="checkbox" name="'+name+'" value="'+xescape(x.id)+'" '+(selected.includes(x.id)?'checked':'')+'> '+xescape(x.name)+(x.kind==='group'?' · Group':'')+'</label>').join('')+'</div>'+
 '<small>Groups include their listed members. Overlapping selections count each person once for gift sharing.</small></fieldset>';
}
function eventPicker(current=''){
 const events=liveData().events||[];
 return '<label>Link to event (optional)<select name="eventId"><option value="">Standalone livestream</option>'+
 events.map(x=>'<option value="'+xescape(x.id)+'" '+(x.id===current?'selected':'')+'>'+xescape(x.title)+'</option>').join('')+'</select></label>';
}
function activeRecipients(stream){
 const people=stream.recipientIds||[];
 return people.map(id=>(liveData().hostOptions||[]).find(x=>x.id===id)?.name||id);
}
function messageMarkup(m){
 const badge=m.verified&&window.USA50VerifiedBadge?window.USA50VerifiedBadge({verifiedIdol:m.verified==='idol',verifiedStaff:m.verified==='staff'}):'';
 const avatar=m.hasAvatar?'<img class="usa50-live-avatar" src="/api/livestreams/avatar/'+encodeURIComponent(m.authorId)+'" alt="" loading="lazy">':
 '<span class="usa50-live-avatar empty">'+xescape((m.username||'?').charAt(0).toUpperCase())+'</span>';
 const icon=m.kind==='gift'?' <span class="usa50-live-gift-badge">'+xescape(m.gift?.emoji||'✦')+' '+xescape(m.gift?.name||'Gift')+'</span>':'';
 return '<div class="usa50-live-line'+(m.kind==='gift'?' gifted':'')+'">'+avatar+'<div class="usa50-live-line-body">'+
 '<div><strong>@'+xescape(m.username)+'</strong>'+badge+icon+'</div>'+
 '<p>'+xescape(m.text)+'</p></div>'+
 ((isManager()||isIdol())?'<button class="usa50-live-hide" data-action="usa50-live-hide" data-value="'+xescape(m.id)+'" data-stream="'+xescape(m.streamId||'')+'" aria-label="Hide message">×</button>':'')+'</div>';
}
function livePanel(x){
 if(x.status!=='live')return '';
 const names=x.hostNames?.length?x.hostNames.join(', '):'USA50';
 return '<section class="usa50-live-interaction" data-usa50-live-id="'+xescape(x.id)+'">'+
 '<div class="usa50-live-topline"><span class="usa50-live-pill"><span class="usa50-live-pulse"></span> LIVE CHAT</span><small>Featuring '+xescape(names)+'</small></div>'+
 '<div class="usa50-live-lines" role="log" aria-live="off" aria-label="Livestream chat"><p class="usa50-live-loading">Joining live chat…</p></div>'+
 '<div class="usa50-live-tts-pending" hidden></div>'+
 (store?.me?'<form class="usa50-live-compose" id="usa50-live-chat:'+xescape(x.id)+'"><input name="message" maxlength="200" required placeholder="Say something nice…" aria-label="Send a live chat message"><button class="usa50-live-send" type="submit">Send</button>'+
 '<button class="usa50-live-gift-button" type="button" data-action="usa50-live-gifts" data-value="'+xescape(x.id)+'" aria-label="Send a live gift">🎁</button></form>':
 '<p class="usa50-live-signin">Sign in to chat or send virtual gifts.</p>')+
 '<p class="usa50-live-disclosure">Live chat is moderated. Gifts use demo STARS; TTS requires host approval. Cash payouts are not enabled.</p></section>';
}
function liveActions(x){
 if(!x.canEdit)return '';
 const list=activeRecipients(x);
 return '<section class="usa50-live-host-controls"><div><strong>Broadcast controls</strong><small>'+
 (list.length?'Creator pool: '+xescape(list.join(', ')):'Select live participants first')+'</small></div><div class="row wrap">'+
 '<button type="button" class="btn tiny secondary" data-action="usa50-live-edit" data-value="'+xescape(x.id)+'">Edit stream URL / hosts</button>'+
 (x.status==='scheduled'?'<button type="button" class="btn tiny" data-action="usa50-live-transition" data-value="'+xescape(x.id)+'" data-status="live" '+(!x.hasPlayer||!list.length?'disabled':'')+'>Go Live</button>':'')+
 (x.status==='live'?'<button type="button" class="btn tiny secondary" data-action="usa50-live-overlay" data-value="'+xescape(x.id)+'">OBS TTS overlay</button><button type="button" class="btn tiny secondary" data-action="usa50-live-transition" data-value="'+xescape(x.id)+'" data-status="ended">End stream</button>':'')+
 '<button type="button" class="btn tiny secondary" data-action="usa50-live-earnings">Creator ledger</button></div></section>';
}
function augment(){
 if(view!=='events')return;
 const streams=liveData().streams||[];
 document.querySelectorAll('.usa50-stream-card').forEach((card,index)=>{
  const stream=streams[index];if(!stream)return;
  // Remove previous management-only controls to avoid duplicate actions.
  card.querySelectorAll('[data-action="usa50-stream-state"]').forEach(node=>node.remove());
  if(!card.querySelector('.usa50-live-host-controls'))card.insertAdjacentHTML('beforeend',liveActions(stream));
  if(stream.status==='live'&&!card.querySelector('[data-usa50-live-id]'))card.insertAdjacentHTML('beforeend',livePanel(stream));
 });
 const form=document.querySelector('#usa50-stream-create');
 if(form&&!form.querySelector('.usa50-live-host-picker')){
  const button=form.querySelector('button[type="submit"]');
  button?.insertAdjacentHTML('beforebegin',hostPicker()+eventPicker());
  const url=form.querySelector('[name="playerUrl"]');
  if(url)url.required=false;
  const hint=form.querySelector('label:has([name="playerUrl"])');
  hint?.insertAdjacentHTML('afterend','<p class="usa50-live-hint">You can add the approved playback URL later—even after scheduling this event.</p>');
 }
 // The original broadcaster form is management only. Idols can schedule their own session here.
 if(isIdol()&&!document.querySelector('#usa50-idol-live-create')){
  const host=document.querySelector('.usa50-events-extended');
  if(host){
   host.insertAdjacentHTML('beforeend','<section class="glass panel usa50-idol-live-new"><h3>Schedule my livestream</h3><form id="usa50-idol-live-create" class="form-grid">'+
   '<label>Stream title<input name="title" required minlength="3" maxlength="90" placeholder="Arielle Live ♡"></label>'+
   '<label>Start time<input name="startsAt" type="datetime-local" required></label>'+
   '<label>About this live<textarea name="description" maxlength="600"></textarea></label>'+
   '<label>Approved player URL (can be added later)<input name="playerUrl" type="url" placeholder="https://iframe.videodelivery.net/..."></label>'+
   '<button class="btn" type="submit">Schedule my live</button></form></section>');
  }
 }
}
function editModal(stream){
 return '<form id="usa50-live-update" class="form-grid"><input name="streamId" type="hidden" value="'+xescape(stream.id)+'">'+
 '<p class="lead">Add or change the viewing URL after scheduling. Use the provider’s HTTPS playback URL; never enter an RTMP stream key here.</p>'+
 '<label>Playback URL<input name="playerUrl" type="url" value="'+xescape(stream.editPlayerUrl||'')+'" placeholder="https://iframe.videodelivery.net/..."></label>'+
 (isManager()?hostPicker(stream.hosts||[])+eventPicker(stream.eventId||''):
 '<p class="lead">Only management can change the participant list; your verified idol account can update this stream URL.</p>')+
 '<button class="btn" type="submit">Save stream settings</button></form>';
}
function giftModal(stream){
 const opts=[{id:'spark',emoji:'✨',name:'Sparkle',stars:25},{id:'ribbon',emoji:'🎀',name:'Ribbon',stars:75},{id:'heart',emoji:'💗',name:'Heart Burst',stars:150,tts:true},
 {id:'bouquet',emoji:'💐',name:'Bouquet',stars:400,tts:true},{id:'galaxy',emoji:'🌠',name:'Galaxy Rain',stars:1000,tts:true}];
 return '<form id="usa50-live-gift-form" class="usa50-live-gift-form"><input type="hidden" name="streamId" value="'+xescape(stream.id)+'">'+
 '<p>Current balance: <strong>✦ '+Number(store?.me?.state?.stars||0).toLocaleString()+' STARS</strong></p>'+
 '<div class="usa50-live-gifts-grid">'+opts.map((p,i)=>'<label><input name="giftId" type="radio" value="'+p.id+'" '+(i===0?'checked':'')+' required><span class="gift-art">'+p.emoji+'</span><strong>'+p.name+'</strong><small>✦ '+p.stars+' STARS</small></label>').join('')+'</div>'+
 '<label>Optional gift message<input name="message" maxlength="120" placeholder="A supportive message…"></label>'+
 '<label class="usa50-live-tts-check"><input name="tts" type="checkbox"> Request live TTS (Heart Burst gift or higher)</label>'+
 '<p class="usa50-live-disclosure">TTS is reviewed by the idol or management first. If declined or expired, the entire gift is refunded. Approved speech can play through the OBS TTS Browser Source.</p>'+
 '<p class="usa50-live-disclosure">70% of gift STARS are allocated equally across selected participants, 30% reserved for operations. This is a demo ledger, not a cash payment or creator payout.</p>'+
 '<button class="btn full" type="submit">Send gift with demo STARS</button></form>';
}
function formatTime(v){const date=new Date(v);return Number.isFinite(date.getTime())?date.toLocaleDateString():'—';}
function earningsModal(data){
 const names=liveData().hostOptions||[];
 const lines=Object.entries(data.pendingMilliStars||{}).map(([id,amt])=>{
  const name=names.find(x=>x.id===id)?.name||id;
  return '<div class="usa50-ledger-line"><strong>'+xescape(name)+'</strong><span>'+Number(amt/1000).toFixed(3)+' share-STARS</span></div>';
 }).join('')||'<p class="lead">No live gifts credited yet.</p>';
 const batches=(data.history||[]).slice(0,8).map(b=>'<div class="usa50-ledger-batch"><b>'+formatTime(b.periodStart)+' – '+formatTime(b.periodEnd)+'</b><small>'+xescape(b.status)+' · No cash transferred</small></div>').join('');
 return '<p class="usa50-live-disclosure">'+xescape(data.disclaimer)+'</p><div class="usa50-ledger-head">Pending creator allocations</div>'+lines+
 '<div class="usa50-ledger-head">Weekly settlement batches</div>'+(batches||'<p class="lead">Next weekly ledger cycle: '+xescape(new Date(data.nextSettlementAt).toLocaleString())+'</p>');
}
const oldRender=render;
render=function(){
 oldRender();augment();
};
const oldAct=act;
act=async function(name,node){
 if(name==='usa50-live-edit'){
  const stream=liveData().streams.find(x=>x.id===node.dataset.value);
  if(!stream||!stream.canEdit)return toast('You are not assigned to edit this stream.');
  showModal('Edit livestream',editModal(stream));return;
 }
 if(name==='usa50-live-transition'){
  const status=node.dataset.status;
  if(status==='ended'&&!confirm('End this livestream? Pending TTS requests will be refunded.'))return;
  await request('/api/livestreams/status',{method:'POST',body:JSON.stringify({streamId:node.dataset.value,status})});
  await refresh();toast(status==='live'?'You are live!':'Livestream ended.');return;
 }
 if(name==='usa50-live-gifts'){
  if(!store?.me)return go('profile');
  const stream=liveData().streams.find(x=>x.id===node.dataset.value);
  if(!stream)return;
  showModal('Send a Live Gift ✦',giftModal(stream));return;
 }
 if(name==='usa50-live-earnings'){
  const data=await request('/api/livestreams/earnings');
  showModal('Creator gift ledger',earningsModal(data));return;
 }
 if(name==='usa50-live-overlay'){
  const response=await request('/api/livestreams/overlay-token',{method:'POST',body:JSON.stringify({streamId:node.dataset.value})});
  const url=location.origin+response.path;
  try{await navigator.clipboard.writeText(url);toast('OBS Browser Source link copied. This replaces earlier overlay links.');}
  catch{showModal('OBS TTS overlay','<p class="lead">Copy this private URL into an OBS Browser Source:</p><textarea rows="4" readonly>'+xescape(url)+'</textarea><p class="lead">Use OBS Interact to enable speech audio.</p>');}
  return;
 }
 if(name==='usa50-live-hide'){
  const streamId=node.dataset.stream||node.closest('[data-usa50-live-id]')?.dataset.usa50LiveId;
  if(!streamId)return;
  await request('/api/livestreams/chat-hide',{method:'POST',body:JSON.stringify({streamId,messageId:node.dataset.value})});
  await pollLive(streamId,true);return;
 }
 if(name==='usa50-live-gift-review'){
  await request('/api/livestreams/gift-review',{method:'POST',body:JSON.stringify({streamId:node.dataset.stream,giftId:node.dataset.value,action:node.dataset.status})});
  toast(node.dataset.status==='approve'?'TTS approved for broadcast.':'TTS declined and gift refunded.');
  await pollLive(node.dataset.stream,true);return;
 }
 return oldAct(name,node);
};
const oldSubmit=submitForm;
submitForm=async function(form){
 if(form.id==='usa50-stream-create'||form.id==='usa50-idol-live-create'){
  const fd=new FormData(form);const payload=Object.fromEntries(fd);
  payload.startsAt=new Date(payload.startsAt).toISOString();
  payload.hosts=form.id==='usa50-stream-create'?fd.getAll('hosts'):[store?.me?.idolId].filter(Boolean);
  await request('/api/livestreams/create',{method:'POST',body:JSON.stringify(payload)});
  await refresh();toast('Livestream scheduled. Add a playback URL later if needed.');return;
 }
 if(form.id==='usa50-live-update'){
  const fd=new FormData(form),payload={streamId:fd.get('streamId'),playerUrl:String(fd.get('playerUrl')||'')};
  if(isManager()){payload.hosts=fd.getAll('hosts');payload.eventId=fd.get('eventId')||null;}
  await request('/api/livestreams/update',{method:'POST',body:JSON.stringify(payload)});
  hideModal();await refresh();toast('Livestream updated.');return;
 }
 if(form.id.startsWith('usa50-live-chat:')){
  const streamId=form.id.slice('usa50-live-chat:'.length);
  const value=String(new FormData(form).get('message')||'').trim();if(!value)return;
  await request('/api/livestreams/chat',{method:'POST',body:JSON.stringify({streamId,message:value})});
  form.reset();await pollLive(streamId,true);return;
 }
 if(form.id==='usa50-live-gift-form'){
  const fd=new FormData(form);
  const result=await request('/api/livestreams/gift',{method:'POST',body:JSON.stringify({
   streamId:String(fd.get('streamId')),giftId:String(fd.get('giftId')),message:String(fd.get('message')||''),
   tts:fd.has('tts'),requestId:crypto.randomUUID()
  })});
  hideModal();
  if(store?.me?.state)store.me.state.stars=result.starsLeft;
  await refresh();toast(result.status==='pending'?'TTS gift submitted for host approval.':'Live gift sent!');return;
 }
 return oldSubmit(form);
};
async function pollLive(id,force=false){
 const root=document.querySelector('[data-usa50-live-id="'+CSS.escape(id)+'"]');
 if(!root||document.visibilityState!=='visible')return;
 const data=await request('/api/livestreams/chat?streamId='+encodeURIComponent(id));
 if(!root.isConnected)return;
 const lines=root.querySelector('.usa50-live-lines');
 if(lines){
  const wasAtBottom=lines.scrollHeight-lines.scrollTop-lines.clientHeight<85;
  const ids=(data.messages||[]).map(m=>m.id).join(',');
  if(force||lines.dataset.ids!==ids){
   lines.innerHTML=(data.messages?.length?data.messages.map(m=>messageMarkup({...m,streamId:id})).join(''):'<p class="usa50-live-loading">Be the first to say hello! ♡</p>');
   lines.dataset.ids=ids;
   if(wasAtBottom||force)lines.scrollTop=lines.scrollHeight;
  }
 }
 const pending=root.querySelector('.usa50-live-tts-pending');
 if(pending){
  const queue=data.ttsPending||[];pending.hidden=!queue.length;
  pending.innerHTML=queue.length?'<strong>Awaiting TTS approval</strong>'+queue.map(g=>'<div class="usa50-tts-request"><span>@'+xescape(g.username)+': '+xescape(g.text)+' · ✦'+g.stars+'</span><div class="row"><button class="btn tiny" data-action="usa50-live-gift-review" data-value="'+xescape(g.id)+'" data-stream="'+xescape(id)+'" data-status="approve">Read aloud</button><button class="btn tiny secondary" data-action="usa50-live-gift-review" data-value="'+xescape(g.id)+'" data-stream="'+xescape(id)+'" data-status="reject">Refund</button></div></div>').join(''):'';
 }
}
setInterval(()=>{
 if(view!=='events'||document.visibilityState!=='visible')return;
 for(const section of document.querySelectorAll('[data-usa50-live-id]'))pollLive(section.dataset.usa50LiveId).catch(()=>{});
},4500);
const oldGo=go;
go=function(destination){return oldGo(destination)};
})();
