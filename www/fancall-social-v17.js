/* USA50 v17: dedicated composer, navigation, free fancall lottery & room prototype. */
(function(){
'use strict';
let composer=false,selectedRoom=null,localCameraStream=null;
function stopLocalCamera(){if(localCameraStream){localCameraStream.getTracks().forEach(t=>t.stop());localCameraStream=null;}}
const thumbnailLookupInProgress=new Set();
function hydrateProfileThumbnails(){
 const posts=store?.social?.posts||[];
 const tiles=document.querySelectorAll('.usa50-profile-tile');
 for(const tile of [...tiles].slice(0,24)){
   const post=posts.find(p=>p.id===tile.dataset.value);
   if(!post||post.thumbnailUrl||post.platform!=='TikTok'||thumbnailLookupInProgress.has(post.id))continue;
   thumbnailLookupInProgress.add(post.id);
   request('/api/social/resolve?postId='+encodeURIComponent(post.id)).then(result=>{
     if(!result?.thumbnailUrl)return;
     post.thumbnailUrl=result.thumbnailUrl;
     if(!tile.isConnected||tile.querySelector('img'))return;
     const image=document.createElement('img');image.src=result.thumbnailUrl;image.alt='Shared post thumbnail';image.className='usa50-profile-thumb';
     image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();tile.querySelector('.usa50-profile-embed')?.remove();tile.prepend(image);
   }).catch(()=>{}).finally(()=>thumbnailLookupInProgress.delete(post.id));
 }
}
function drawInfo(){
 const d=store?.fancalls||{draws:[],sessions:[]};
 const staff=['admin','management'].includes(store?.me?.role);
 const host=staff||store?.me?.role==='idol';
 const lottery=d.draws.map(x=>{
 const odds=x.currentEstimatedChance===null?'No entries yet':x.currentEstimatedChance.toFixed(1)+'%';
 const until=new Date(x.closesAt).toLocaleString();
 return '<section class="glass panel usa50-lottery"><div class="row wrap"><div><span class="eyebrow">FREE FAN-CALL DRAW · DEMO</span><h3>'+e(x.title)+'</h3></div><span class="badge">'+e(x.status)+'</span></div><p class="lead">'+e(x.description||'')+'</p>'+
 '<div class="usa50-draw-stats"><div><strong>'+x.winnerCount+'</strong><small>Winners</small></div><div><strong>'+x.entryCount+'</strong><small>Entries</small></div><div><strong>'+odds+'</strong><small>Current estimated chance</small></div></div>'+
 '<p class="usa50-odds-disclaimer">Current odds reflect entries right now, not your actual odds at the drawing. The odds can change when fans enter or withdraw. Entries are free. No prizes or actual video calls are enabled in this development build.</p>'+
 '<small>Closes '+e(until)+'</small><div class="row wrap" style="margin-top:13px">'+
 (x.status==='open'?(x.joined?'<button class="btn secondary" data-action="usa50-draw-withdraw" data-value="'+e(x.id)+'">Withdraw entry</button>':'<button class="btn" data-action="usa50-draw-join" data-value="'+e(x.id)+'">Enter free lottery</button>'):'<span class="badge">'+(x.myWinner?'You were selected!':'Entries closed')+'</span>')+
 (staff&&x.status==='open'?'<button class="btn secondary" data-action="usa50-draw-finalize" data-value="'+e(x.id)+'">Draw after closing</button>':'')+
 (x.mySession?'<button class="btn" data-action="usa50-room-open" data-value="'+e(x.mySession)+'">Open waiting room</button>':'')+'</div></section>';
 }).join('');
 const create=staff?'<section class="glass panel"><h3>Create a demo fancall lottery</h3><form id="usa50-lottery-create" class="form-grid"><label>Lottery name<input name="title" required minlength="3" maxlength="90" placeholder="USA50 videocall fan meeting"></label><label>Details<textarea name="description" maxlength="450" placeholder="Date, participating idols and rules"></textarea></label><label>Number of winners<input type="number" name="winnerCount" min="1" max="100" value="5" required></label><label>Entry closing time<input type="datetime-local" name="closesAt" required></label><button class="btn" type="submit">Create lottery</button></form></section>':'';
 const sessions=(d.sessions||[]).map(s=>'<section class="glass panel"><h3>'+e(s.title)+' · Call queue</h3><p class="lead">'+s.queue.length+' winners · '+e(s.status)+'</p><button class="btn secondary" data-action="usa50-room-open" data-value="'+e(s.id)+'">Open call waiting room</button></section>').join('');
 return '<div class="usa50-lottery-list">'+create+(lottery||'<section class="glass panel"><h3>No open fancall lotteries</h3><p class="lead">Management can publish a free-entry demo lottery here.</p></section>')+sessions+'</div>';
}
const oldEvents=eventsScreen;
eventsScreen=function(){const base=oldEvents().replace('The future application system will use event-specific entries with a free entry route and publicly disclosed official rules. No paid chance-based calls are enabled in this demo.','Free-entry demonstration lotteries are available below. Official rules, real awards and live calls are not enabled.');return base+'<section class="usa50-fancall-program"><h2>Fancall lotteries</h2>'+drawInfo()+'</section>';};
const oldMenu=menuModal;
menuModal=function(){
 showModal('Explore USA50','<div class="grid grid-2">'+navItems.filter(([key])=>key!=='recycle').map(([key,title,ic])=>'<button class="quick-action" data-go="'+key+'">'+icon(ic)+' '+e(title)+'</button>').join('')+'</div>');
};
function composePage(){
 const fansite=store?.social?.myProfile?.fansite;
 if(!store?.me)return '<section class="usa50-compose-page"><h2>Sign in to share</h2><p>You need a fan account to publish a post.</p><button class="btn" data-go="profile">Go to My Page</button></section>';
 return '<section class="usa50-compose-page"><header class="usa50-compose-heading"><button type="button" data-action="usa50-compose-close">‹ Back</button><h2>New post</h2></header><div class="usa50-compose-preview"><span>✧</span><p>Share your USA50 moments</p></div><form id="social-post-form" class="form-grid"><label>Caption<textarea name="caption" minlength="6" maxlength="650" required placeholder="Write a caption…"></textarea></label><label>TikTok or Instagram link<input name="url" type="url" required inputmode="url" placeholder="https://www.instagram.com/reel/..."></label><label>Post to<select name="category"><option value="fan">Fan community</option>'+(fansite?'<option value="fansite">Fansites</option>':'')+'</select></label><p class="lead">Use a link to your original TikTok or Instagram post. Your post will be added to your profile and the community feed.</p><button type="submit" class="btn full">Share</button></form></section>';
}
function roomScreen(){
 const room=store?.fancalls?.sessions?.find(s=>s.id===selectedRoom);
 if(!room)return '<div class="glass panel">Waiting room not found. <button data-action="usa50-room-close" class="btn secondary">Return</button></div>';
 const canHost=room.canHost,canManage=room.canManage;
 return '<section class="usa50-room"><header><button class="text-btn" data-action="usa50-room-close">← Events</button><h2>'+e(room.title)+'</h2><small>'+e(room.status)+'</small></header>'+
 '<div class="usa50-room-video"><div class="usa50-remote-placeholder">✦<strong>'+(room.status==='live'?'Call session active (demo)':'Waiting for the next fan')+'</strong><small>Secure remote video transport is not yet connected.</small></div><div class="usa50-local-placeholder"><video id="usa50-local-preview" autoplay muted playsinline></video><button class="usa50-camera-button" data-action="usa50-camera-preview">Camera preview</button></div></div>'+
 '<div class="usa50-room-queue"><h3>'+(room.isMyTurn&&room.status==='live'?'You are next on screen':room.isMyWinner?'Your waiting room':'Call queue')+'</h3>'+
 '<p class="lead">'+(room.status==='break'?'Idol break in progress. Please remain in the waiting room.':room.status==='waiting'?'The host has not started calls yet.':room.status==='complete'?'This session has finished.':room.isMyTurn?'It is your turn (demo session state).':'Please wait for your turn.')+'</p>'+
 room.queue.map(q=>'<div class="usa50-queue-person '+(q.active?'active':'')+'"><span>#'+q.position+' '+e(q.displayName)+'</span><small>'+(q.done?'Completed':q.active?'Up next':'Waiting')+'</small></div>').join('')+
 (canHost?'<div class="row wrap usa50-host-controls"><button class="btn" data-action="usa50-session-action" data-value="'+e(room.id)+'" data-session="start">Start / Resume</button><button class="btn secondary" data-action="usa50-session-action" data-value="'+e(room.id)+'" data-session="break">Take a break</button><button class="btn secondary" data-action="usa50-session-action" data-value="'+e(room.id)+'" data-session="next">Finish & next fan</button><button class="btn secondary" data-action="usa50-session-action" data-value="'+e(room.id)+'" data-session="end-early">End this call early</button></div>':'')+
 (canManage?'<p class="usa50-odds-disclaimer">Management oversight: queue and session state are visible here. Live video supervision requires a future secure media provider.</p>':'')+'</div></section>';
}
const oldRender=render;
render=function(){
 oldRender();
 const content=document.querySelector('.screen');
 if(composer&&content)content.innerHTML=composePage();
 if(selectedRoom&&content){content.innerHTML=roomScreen();const preview=document.querySelector('#usa50-local-preview');if(preview&&localCameraStream)preview.srcObject=localCameraStream;}
 hydrateProfileThumbnails();
 const actions=document.querySelector('.top-actions');
 if(actions&&!actions.querySelector('.usa50-top-shortcuts')){
  actions.insertAdjacentHTML('beforeend','<span class="usa50-top-shortcuts"><button class="icon-btn" data-go="events" title="Events & fancalls" aria-label="Events & fancalls">'+icon('calendar',18)+'</button><button class="icon-btn" data-go="shop" title="Fan shop" aria-label="Fan shop">'+icon('bag',18)+'</button></span>');
 }
};
const oldAct=act;
act=async function(name,node){
 if(name==='social-new-post'){composer=true;selectedRoom=null;view='community';render();window.scrollTo(0,0);return;}
 if(name==='usa50-compose-close'){composer=false;render();return;}
 if(name==='usa50-room-open'){selectedRoom=node.dataset.value;composer=false;view='events';render();window.scrollTo(0,0);return;}
 if(name==='usa50-room-close'){stopLocalCamera();selectedRoom=null;render();return;}
 if(name==='usa50-camera-preview'){
  if(localCameraStream){stopLocalCamera();render();return;}
  if(!navigator.mediaDevices?.getUserMedia)return toast('Camera requires a supported secure browser.');
  try{localCameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});render();toast('Local camera preview only — not broadcasting.');}catch(_error){toast('Camera permission was denied or the camera is unavailable.');}return;
 }
 if(['usa50-draw-join','usa50-draw-withdraw','usa50-draw-finalize'].includes(name)){
  const action=name==='usa50-draw-join'?'join':name==='usa50-draw-withdraw'?'withdraw':'draw';
  if(action==='withdraw'&&!confirm('Withdraw your free lottery entry?'))return;
  await request('/api/fancalls/'+action,{method:'POST',body:JSON.stringify({drawId:node.dataset.value})});
  await refresh();toast(action==='join'?'Free entry submitted.':action==='withdraw'?'Entry withdrawn.':'Lottery drawn.');return;
 }
 if(name==='usa50-session-action'){
  if(node.dataset.session==='end-early'&&!confirm('End the current demo call early?'))return;
  await request('/api/fancalls/session',{method:'POST',body:JSON.stringify({sessionId:node.dataset.value,action:node.dataset.session})});
  await refresh();return;
 }
 return oldAct(name,node);
};
const oldSubmit=submitForm;
submitForm=async function(form){
 if(form.id==='usa50-lottery-create'){
  const data=Object.fromEntries(new FormData(form));
  data.closesAt=new Date(data.closesAt).toISOString();data.winnerCount=Number(data.winnerCount);
  await request('/api/fancalls/create',{method:'POST',body:JSON.stringify(data)});await refresh();toast('Demo lottery created.');return;
 }
 if(form.id==='social-post-form'&&composer){
  await oldSubmit(form);composer=false;view='profile';render();return;
 }
 return oldSubmit(form);
};
// Keep winners and staff synchronized to host-controlled queue transitions.
setInterval(()=>{if(selectedRoom&&document.visibilityState==='visible')refresh().catch(()=>{});},5000);
setInterval(()=>{if(view==='events'&&!selectedRoom&&!composer&&document.visibilityState==='visible'&&!document.querySelector('#usa50-lottery-create:focus-within'))refresh().catch(()=>{});},15000);
const oldGo=go;
go=function(screen){composer=false;selectedRoom=null;stopLocalCamera();return oldGo(screen);};
})();