/* USA50 livestream + fancall interactive preview studio (safe local simulation).
 * All demo actions stay in browser memory. No real STAR spending, lotteries,
 * chat posts, notifications, camera broadcast, or provider calls. */
(function(){
'use strict';
const previewPeople=[
 {id:'arielle',name:'Arielle',emoji:'🐰',photo:'/assets/portraits/arielle_real.webp'},
 {id:'z',name:'Z',emoji:'🪼'},
 {id:'miu',name:'Miu',emoji:'☆'},
 {id:'fan',name:'You',emoji:'♡'}
];
const giftCatalog=[
 {id:'spark',name:'Sparkle',icon:'✨',stars:25,tts:false},
 {id:'ribbon',name:'Ribbon',icon:'🎀',stars:75,tts:false},
 {id:'heart',name:'Heart Burst',icon:'💗',stars:150,tts:true},
 {id:'bouquet',name:'Bouquet',icon:'💐',stars:400,tts:true},
 {id:'galaxy',name:'Galaxy Rain',icon:'🌠',stars:1000,tts:true}
];
let active=false;
let state=null;
let camera=null;
let oldOverflow='';
let liveGiftPick='heart';
let initialUrlHandled=false;
function esc(v){return e(String(v??''));}
function init(mode){
 state={
  mode:mode==='fancall'?'fancall':'livestream',role:'fan',credits:2700,
  streamLive:true,streamMsg:[
   {id:1,user:'Arielle',message:'Welcome to our first USA50 Live! ♡',idol:true},
   {id:2,user:'luna50',message:'We love you Arielle and Z!'},
   {id:3,user:'Z',message:'Hi everyone!! 🪼',idol:true},
   {id:4,user:'starryfan',message:'The outfits are so cute'},
   {id:5,user:'jaylene_bunni',message:'Sending love from NYC ♡'}
  ],
  giftRequests:[],giftLast:null,giftLedger:{arielle:0,z:0},giftCount:0,giftsOpen:false,
  callStatus:'waiting',cursor:0,queue:[
   {id:'one',name:'Mia',emoji:'🌸'},
   {id:'me',name:'You',emoji:'♡'},
   {id:'three',name:'Jules',emoji:'🍀'}
  ],muted:false,videoOff:false
 };
 liveGiftPick='heart';
}
function roleTag(person){
 const badge=(person.id==='arielle'||person.id==='z')&&window.USA50VerifiedBadge?
  window.USA50VerifiedBadge({verifiedIdol:true}):'';
 return '<strong>'+esc(person.name)+'</strong>'+badge;
}
function face(person,extra=''){
 if(person.photo)return '<img class="usa50-preview-person-image '+extra+'" src="'+esc(person.photo)+'" alt="'+esc(person.name)+'">';
 return '<span class="usa50-preview-person-image usa50-preview-avatar-art '+extra+'">'+esc(person.emoji)+'</span>';
}
function header(){
 const name=state.mode==='livestream'?'USA50 Live':'USA50 Fancall';
 return '<header class="usa50-preview-header"><button type="button" class="usa50-preview-back" data-preview-action="close" aria-label="Close preview">←</button>'+
 '<div><small>USA50 INTERACTIVE PREVIEW</small><h2>'+name+'</h2></div>'+
 '<span class="usa50-preview-sim-pill">DEMO · NO CHARGES</span></header>'+
 '<div class="usa50-preview-tabs" role="tablist" aria-label="Preview interface">'+
 '<button role="tab" aria-selected="'+(state.mode==='livestream')+'" data-preview-action="mode" data-preview-value="livestream" class="'+(state.mode==='livestream'?'selected':'')+'">Livestream</button>'+
 '<button role="tab" aria-selected="'+(state.mode==='fancall')+'" data-preview-action="mode" data-preview-value="fancall" class="'+(state.mode==='fancall'?'selected':'')+'">Fancall</button></div>'+
 '<div class="usa50-preview-rolebar"><span>View as</span>'+[
  ['fan','Fan'],['idol','Idol'],['staff','Management']
 ].map(([k,label])=>'<button type="button" data-preview-action="role" data-preview-value="'+k+'" class="'+(state.role===k?'selected':'')+'">'+label+'</button>').join('')+'</div>';
}
function streamStage(){
 const label=state.streamLive?'LIVE':'PREVIEW ENDED';
 const sample='<div class="usa50-preview-live-persons">'+previewPeople.slice(0,2).map(p=>
 '<div class="usa50-preview-talent">'+face(p)+'<div class="usa50-preview-talents-caption">'+roleTag(p)+'</div></div>').join('')+'</div>';
 return '<div class="usa50-preview-stream-screen">'+sample+
 '<div class="usa50-preview-live-top"><span class="'+(state.streamLive?'usa50-preview-liveflag':'usa50-preview-offflag')+'">'+label+'</span><span>👁 128 watching · simulated</span></div>'+
 '<div class="usa50-preview-live-bottom"><span class="usa50-preview-motion-blob">✦</span><div><small>USA50 LIVE · NYC50</small><h3>Arielle and Z are Live now!</h3><p>This is a visual preview, not a video transmission.</p></div></div>'+
 (state.giftLast?'<div class="usa50-preview-gift-float">'+esc(state.giftLast)+'</div>':'')+streamChat()+'</div>';
}
function streamChat(){
 return '<section class="usa50-preview-chat-card" aria-label="Livestream comments and gifts">'+
 '<div class="usa50-preview-chat-list" role="log" aria-label="Preview livestream comments">'+state.streamMsg.map(m=>{
 const p=previewPeople.find(x=>x.name===m.user);
 const badge=m.idol&&window.USA50VerifiedBadge?window.USA50VerifiedBadge({verifiedIdol:true}):'';
 return '<div class="usa50-preview-chat-line"><span class="usa50-preview-chat-avatar">'+esc(p?.emoji||m.user.charAt(0).toUpperCase())+'</span>'+
 '<div><span class="usa50-preview-chat-name">@'+esc(m.user)+badge+'</span><p>'+esc(m.message)+'</p></div></div>';
 }).join('')+'</div>'+
 (state.giftsOpen?giftArea():'')+
 '<form class="usa50-preview-compose" data-preview-form="chat"><input name="message" maxlength="180" placeholder="Say something nice…" autocomplete="off" '+(!state.streamLive?'disabled':'')+' required>'+
 '<button class="usa50-preview-send" type="submit" '+(!state.streamLive?'disabled':'')+' aria-label="Send message">➤</button>'+
 '<button class="usa50-preview-gift-toggle" data-preview-action="gift-show" type="button" '+(!state.streamLive?'disabled':'')+' aria-expanded="'+state.giftsOpen+'" aria-label="Choose a live gift">🎁</button></form>'+
 '<div class="usa50-preview-credit-hint">Demo STARS ✦ '+state.credits.toLocaleString()+' · no actual charge</div></section>';
}
function giftArea(){
 return '<aside class="usa50-preview-gift-popover" aria-label="Choose a live gift">'+
 '<div class="usa50-preview-gift-head"><strong>Send a little love ♡</strong><button type="button" data-preview-action="gift-close" aria-label="Close gifts">×</button></div>'+
 '<div class="usa50-preview-gift-grid">'+giftCatalog.map(g=>
 '<button type="button" data-preview-action="gift-pick" data-preview-value="'+g.id+'" class="'+(liveGiftPick===g.id?'selected':'')+'"><span>'+g.icon+'</span><strong>'+esc(g.name)+'</strong><small>✦ '+g.stars+'</small></button>').join('')+'</div>'+
 '<div class="usa50-preview-preview-actions"><button type="button" class="btn" data-preview-action="gift-send">Send sample gift</button>'+
 '<span>Preview balance ✦ '+state.credits.toLocaleString()+'</span></div>'+
 (state.giftRequests.length?'<div class="usa50-preview-requests"><h4>TTS review queue</h4>'+
 state.giftRequests.map((g,i)=>'<div class="usa50-preview-request"><span>'+esc(g.title)+' · '+g.stars+' demo STARS</span><div>'+
 (g.status==='pending'&&state.role!=='fan'?'<button data-preview-action="tts-approve" data-preview-value="'+i+'">Approve</button><button data-preview-action="tts-reject" data-preview-value="'+i+'">Refund</button>':'<small>'+esc(g.status)+'</small>')+
 '</div></div>').join('')+'</div>':'')+'</aside>';
}
function streamAdmin(){
 if(state.role==='fan')return '';
 return '<section class="usa50-preview-mini-panel usa50-preview-stream-admin"><h3>'+ (state.role==='idol'?'Idol Live Studio':'Management Live Studio')+'</h3>'+
 '<p>Arielle and Z selected · Creator share: 70%, split evenly · this is not real earnings.</p>'+
 '<div class="usa50-preview-ledger"><span>Arielle <strong>'+state.giftLedger.arielle.toFixed(2)+' ★</strong></span><span>Z <strong>'+state.giftLedger.z.toFixed(2)+' ★</strong></span></div>'+
 '<button type="button" class="btn secondary" data-preview-action="stream-toggle">'+(state.streamLive?'Simulate ending live':'Restart sample stream')+'</button>'+
 '<p class="usa50-preview-footnote">In the real studio, assigned idols or management add an OBS playback URL and start the livestream. Actual media is not connected in this preview.</p></section>';
}
function liveView(){
 return '<div class="usa50-preview-main usa50-preview-live-main"><div class="usa50-preview-live-layout">'+
 streamStage()+streamAdmin()+'</div></div>';
}
function activeFan(){return state.queue[state.cursor]||null;}
function callWaiting(){
 const turn=state.callStatus==='live'&&activeFan()?.id==='me';
 const queuePosition=state.queue.findIndex(q=>q.id==='me');
 const ahead=Math.max(0,state.cursor===0?queuePosition:queuePosition-state.cursor);
 const line=state.callStatus==='waiting'?'The idol has not started calls yet.':
  state.callStatus==='break'?'The idol is taking a break. You will be connected when calls resume.':
  state.callStatus==='complete'?'This preview fancall has ended.':
  turn?'You are on your fancall now!':ahead>0?ahead+' person ahead of you.':'Your turn is coming up.';
 return '<div class="usa50-preview-waiting '+(turn?'your-turn':'')+'"><div class="usa50-preview-status-circle">'+(turn?'💗':state.callStatus==='break'?'☕':'✦')+'</div>'+
 '<h3>'+(turn?'You are connected to Arielle ♡':'Your fancall waiting room')+'</h3><p>'+esc(line)+'</p>'+
 '<div class="usa50-preview-wait-stat"><div><strong>#'+(queuePosition+1)+'</strong><small>Your queue number</small></div><div><strong>'+state.queue.length+'</strong><small>Winners in queue</small></div></div>'+
 '<div class="usa50-preview-queue-help">Once it is your turn, the real app automatically offers the secured call room. This preview does not contact another person.</div>'+
 '<button type="button" data-preview-action="jump-my-turn" class="btn secondary" '+(state.callStatus==='complete'?'disabled':'')+'>Simulate my turn</button>'+ (camera?'<div class="usa50-preview-wait-camera"><video id="usa50-preview-camera" autoplay playsinline muted></video><small>Only you can see this local camera test</small></div>':'')+'</div>';
}
function videoTile(person,caption,kind='main'){
 const media=person?face(person):'<span class="usa50-preview-no-remote">☆</span>';
 return '<div class="usa50-preview-video-tile '+kind+'">'+media+'<div class="usa50-preview-video-caption">'+esc(caption)+'</div></div>';
}
function callVideo(){
 const person=activeFan();
 const status=state.callStatus;
 const showPerson=status==='live';
 const viewAs=state.role;
 const isFanActive=person?.id==='me';
 const heroPerson=viewAs==='fan'?previewPeople[0]:person?{name:person.name,emoji:person.emoji}:null;
 const heroName=viewAs==='fan'?'Arielle · USA50':person?person.name:'Waiting for next fan';
 const hero=showPerson&&(viewAs!=='fan'||isFanActive)?videoTile(heroPerson,heroName):'<div class="usa50-preview-video-tile main empty"><div class="usa50-preview-empty-call"><span>'+(status==='break'?'☕':'✦')+'</span><strong>'+ (status==='break'?'Idol break':'Waiting for next call')+'</strong><small>Live video is not connected in preview mode</small></div></div>';
 const selfLabel=state.role==='idol'?'Arielle (you)':state.role==='staff'?'Supervision · camera off':'You · camera preview';
 let self='<div class="usa50-preview-video-tile self">'+(camera?'<video id="usa50-preview-camera" autoplay playsinline muted></video>':state.videoOff?'<span class="usa50-preview-video-disabled">Camera off</span>':'<span class="usa50-preview-video-emoji">'+(state.role==='idol'?'🐰':state.role==='staff'?'👁':'♡')+'</span>')+
 '<div class="usa50-preview-video-caption">'+selfLabel+'</div></div>';
 return '<div class="usa50-preview-videos"><div class="usa50-preview-main-video">'+hero+'</div>'+self+'</div>';
}
function queueView(){
 const person=activeFan();
 return '<section class="usa50-preview-mini-panel"><div class="usa50-preview-mini-header"><h3>Winner queue</h3><small>'+esc(state.callStatus.toUpperCase())+'</small></div>'+
 state.queue.map((q,i)=>{
 const done=i<state.cursor,activeNow=i===state.cursor&&state.callStatus==='live';
 return '<div class="usa50-preview-queue-row '+(activeNow?'active':'')+'"><span class="usa50-preview-queue-index">'+(i+1)+'</span><span>'+esc(q.emoji)+' '+esc(q.name)+'</span><small>'+ (done?'Completed':activeNow?'On call':'Waiting')+'</small></div>';
 }).join('')+
 '<p class="usa50-preview-footnote">This queue is simulated. No lottery winner, camera feed, or real fancall record is being changed.</p></section>';
}
function controls(){
 const isHost=state.role!=='fan';
 if(!isHost)return '<div class="usa50-preview-call-controls">'+
 '<button data-preview-action="camera" type="button">'+(camera?'Disable local camera':'Preview my camera')+'</button>'+
 '<button data-preview-action="video" type="button">'+(state.videoOff?'Turn camera on':'Camera off')+'</button>'+
 '<button data-preview-action="mute" type="button">'+(state.muted?'Unmute':'Mute')+'</button></div>';
 return '<section class="usa50-preview-mini-panel usa50-preview-host-panel"><h3>'+ (state.role==='idol'?'Idol call controls':'Management supervision controls')+'</h3>'+
 '<p>Idols and management can pause the queue, end a call early and advance to the next winner. Management can supervise the real session with authorized media access.</p>'+
 '<div class="usa50-preview-call-controls">'+
 '<button type="button" data-preview-action="call-start">▶ '+(state.callStatus==='break'?'Resume':'Start / resume')+'</button>'+
 '<button type="button" data-preview-action="call-break" '+(state.callStatus==='complete'?'disabled':'')+'>☕ Break</button>'+
 '<button type="button" data-preview-action="call-next" '+(state.callStatus==='complete'?'disabled':'')+'>Next fan</button>'+
 '<button type="button" data-preview-action="call-end" '+(state.callStatus==='complete'?'disabled':'')+'>End call early</button>'+
 '<button type="button" data-preview-action="call-reset">↺ Reset preview</button></div></section>';
}
function callView(){
 const person=activeFan();
 const live=state.callStatus==='live';
 return '<div class="usa50-preview-main"><div class="usa50-preview-intro"><div><small>FAN MEETING · 1:1 VIDEO ROOM</small><h3>Arielle Fancall · Session Preview</h3></div><span>'+(state.callStatus==='live'?'● Connected (simulated)':state.callStatus==='break'?'☕ Break':'○ '+esc(state.callStatus))+'</span></div>'+
 '<div class="usa50-preview-call-columns"><div>'+
 (state.role==='fan'&&!(live&&person?.id==='me')?callWaiting():'<section class="usa50-preview-video-stage">'+callVideo()+
 '<div class="usa50-preview-call-meta"><span>🔒 Moderated 1:1 call</span><span>'+ (live?'00:42 · sample timer':'No active call')+'</span></div></section>')+
 (state.role==='fan'&&live&&person?.id==='me'?controls():'')+'</div><div>'+
 (state.role==='fan'?'<section class="usa50-preview-mini-panel"><h3>Before your call</h3><p>Check your lighting, microphone and camera. The winner enters the real call automatically when the assigned idol admits the next fan.</p>'+
 '<button type="button" class="btn secondary" data-preview-action="camera">'+(camera?'Stop camera preview':'Try my camera locally')+'</button></section>':controls())+
 queueView()+'</div></div></div>';
}
function previewBody(){
 return '<div id="usa50-preview-overlay" class="usa50-preview-overlay" role="dialog" aria-modal="true" aria-label="USA50 '+esc(state.mode)+' interface preview">'+
 '<div class="usa50-preview-window">'+header()+
 '<div class="usa50-preview-content">'+(state.mode==='livestream'?liveView():callView())+'</div>'+
 '<footer class="usa50-preview-footer"><span>✦ Interactive mockup — no real stream, call, gift charge or lottery change.</span>'+
 '<button type="button" data-preview-action="close">Exit preview</button></footer></div></div>';
}
function renderPreview(){
 if(!active||!state)return;
 let root=document.getElementById('usa50-preview-overlay');
 if(!root){document.body.insertAdjacentHTML('beforeend',previewBody());root=document.getElementById('usa50-preview-overlay');}
 else root.outerHTML=previewBody();
 const replacement=document.getElementById('usa50-preview-overlay');
 if(camera){const el=replacement.querySelector('#usa50-preview-camera');if(el){el.srcObject=camera;el.play().catch(()=>{});}}
 const chat=replacement.querySelector('.usa50-preview-chat-list');if(chat)chat.scrollTop=chat.scrollHeight;
}
function stopCamera(){
 if(camera){camera.getTracks().forEach(track=>track.stop());camera=null;}
}
function close(){
 stopCamera();active=false;
 document.getElementById('usa50-preview-overlay')?.remove();
 document.body.style.overflow=oldOverflow;
}
function open(mode){
 if(active)stopCamera();
 if(!active)oldOverflow=document.body.style.overflow;
 init(mode);active=true;document.body.style.overflow='hidden';
 renderPreview();
 const closeButton=document.querySelector('.usa50-preview-back');closeButton?.focus();
}
function gift(){
 const selected=giftCatalog.find(g=>g.id===liveGiftPick)||giftCatalog[2];
 if(!state.streamLive)return;
 if(state.credits<selected.stars)return toast('Not enough simulated STARS. Restart the preview to restore balance.');
 state.credits-=selected.stars;
 state.giftCount++;
 state.giftLast=selected.icon+' @You sent '+selected.name+' · '+selected.stars+' demo STARS';
 state.streamMsg.push({id:Date.now()+state.giftCount,user:'You',message:state.giftLast});
 if(selected.tts){state.giftRequests.push({title:selected.name,stars:selected.stars,status:'pending'});}
 else {state.giftLedger.arielle+=selected.stars*.35;state.giftLedger.z+=selected.stars*.35;}
 state.giftsOpen=false;renderPreview();
}
function addLauncher(){
 if(view!=='events')return;
 const screen=document.querySelector('.screen');
 if(!screen)return;
 if(!screen.querySelector('.usa50-preview-launcher')){
  const html='<section class="usa50-preview-launcher" aria-label="Interface previews"><div><small>DESIGN STUDIO · PREVIEW ONLY</small><h3>Explore the live experience ♡</h3><p>Try the fan, idol and management screens without a real broadcast or lottery winner.</p></div>'+
  '<div class="usa50-preview-launch-buttons"><button type="button" data-preview-action="open" data-preview-mode="livestream">✦ Preview livestream</button>'+
  '<button type="button" data-preview-action="open" data-preview-mode="fancall">♡ Preview fancall</button></div></section>';
  const header=screen.querySelector('.screen-header');
  if(header)header.insertAdjacentHTML('afterend',html);
  else screen.insertAdjacentHTML('afterbegin',html);
 }
 for(const card of screen.querySelectorAll('.usa50-stream-card')){
  if(!card.querySelector('.usa50-stream-preview-shortcut'))card.insertAdjacentHTML('beforeend',
   '<button class="btn tiny secondary usa50-stream-preview-shortcut" data-preview-action="open" data-preview-mode="livestream">Preview viewer layout</button>');
 }
 for(const lotto of screen.querySelectorAll('.usa50-lottery')){
  if(!lotto.querySelector('.usa50-fancall-preview-shortcut'))lotto.insertAdjacentHTML('beforeend',
   '<button class="btn tiny secondary usa50-fancall-preview-shortcut" data-preview-action="open" data-preview-mode="fancall">Preview waiting room & call</button>');
 }
}
function action(name,value){
 if(name==='open')return open(value);
 if(name==='close')return close();
 if(!active||!state)return;
 if(name==='mode'){stopCamera();init(value);renderPreview();return;}
 if(name==='role'){stopCamera();state.role=['fan','idol','staff'].includes(value)?value:'fan';renderPreview();return;}
 if(name==='gift-pick'){liveGiftPick=value;renderPreview();return;}
 if(name==='gift-show'){state.giftsOpen=!state.giftsOpen;renderPreview();return;}
 if(name==='gift-close'){state.giftsOpen=false;renderPreview();return;}
 if(name==='gift-send'){gift();return;}
 if(name==='stream-toggle'){state.streamLive=!state.streamLive;renderPreview();return;}
 if(name==='tts-approve'||name==='tts-reject'){
  if(state.role==='fan')return;
  const req=state.giftRequests[Number(value)];
  if(!req||req.status!=='pending')return;
  if(name==='tts-approve'){req.status='Approved for simulated TTS';state.giftLedger.arielle+=req.stars*.35;state.giftLedger.z+=req.stars*.35;}
  else{req.status='Refunded in preview';state.credits+=req.stars;}
  renderPreview();return;
 }
 if(name==='camera'){
  if(camera){stopCamera();renderPreview();return;}
  if(!navigator.mediaDevices?.getUserMedia)return toast('Camera preview needs a secure browser with camera access.');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(stream=>{
   if(!active||state.mode!=='fancall'){stream.getTracks().forEach(t=>t.stop());return;}
   camera=stream;state.videoOff=false;renderPreview();
   toast('Local camera preview only. No recording or transmission.');
  }).catch(()=>toast('Camera permission was declined or unavailable.'));
  return;
 }
 if(name==='video'){state.videoOff=!state.videoOff;if(camera)camera.getVideoTracks().forEach(t=>t.enabled=!state.videoOff);renderPreview();return;}
 if(name==='mute'){state.muted=!state.muted;renderPreview();return;}
 if(name==='jump-my-turn'){state.cursor=1;state.callStatus='live';renderPreview();return;}
 if(name==='call-start'){if(state.callStatus==='complete'){state.cursor=0;}state.callStatus='live';renderPreview();return;}
 if(name==='call-break'){state.callStatus='break';renderPreview();return;}
 if(name==='call-next'){state.cursor++;state.callStatus=state.cursor>=state.queue.length?'complete':'live';renderPreview();return;}
 if(name==='call-end'){state.cursor++;state.callStatus=state.cursor>=state.queue.length?'complete':'break';renderPreview();return;}
 if(name==='call-reset'){stopCamera();state.cursor=0;state.callStatus='waiting';state.muted=false;state.videoOff=false;renderPreview();return;}
}
document.addEventListener('click',function(evt){
 const control=evt.target.closest('[data-preview-action]');if(!control)return;
 evt.preventDefault();evt.stopPropagation();evt.stopImmediatePropagation();
 action(control.dataset.previewAction,control.dataset.previewValue||control.dataset.previewMode);
},true);
document.addEventListener('submit',function(evt){
 const form=evt.target.closest('[data-preview-form="chat"]');if(!form)return;
 evt.preventDefault();evt.stopPropagation();evt.stopImmediatePropagation();
 if(!active||!state.streamLive)return;
 const field=form.querySelector('[name="message"]');
 const message=String(field?.value||'').trim().slice(0,180);
 if(!message)return;
 const username=state.role==='fan'?'You':state.role==='idol'?'Arielle':'Management';
 state.streamMsg.push({id:Date.now(),user:username,message,idol:state.role==='idol'});
 renderPreview();
},true);
document.addEventListener('keydown',evt=>{if(evt.key==='Escape'&&active){evt.preventDefault();close();}},true);
const previousRender=render;
render=function(){previousRender();addLauncher();if(active&&!document.getElementById('usa50-preview-overlay'))renderPreview();};
const previousGo=go;
go=function(destination){if(active)close();return previousGo(destination);};
function initDeepLink(){
 if(initialUrlHandled)return;
 const val=new URLSearchParams(location.search).get('preview');
 if(val==='livestream'||val==='fancall'){
  initialUrlHandled=true;
  history.replaceState(null,'',location.pathname);
  open(val);
 }
}
const preInitRender=render;
render=function(){preInitRender();if(store&&!initialUrlHandled)initDeepLink();};
window.USA50Preview={open,close,isOpen:()=>active};
})();