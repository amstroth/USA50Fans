/* USA50 v29 · immersive fullscreen livestream player with inline chat and gift drawer.
 * Existing server-backed chat and gift routes remain unchanged. */
(function(){
'use strict';
let selectedStream=null,chosenGift='heart',opening=false,posting=false,previousOverflow='';
const gifts=[
 {id:'spark',name:'Sparkle',emoji:'✨',stars:25,tts:false},
 {id:'ribbon',name:'Ribbon',emoji:'🎀',stars:75,tts:false},
 {id:'heart',name:'Heart Burst',emoji:'💗',stars:150,tts:true},
 {id:'bouquet',name:'Bouquet',emoji:'💐',stars:400,tts:true},
 {id:'galaxy',name:'Galaxy Rain',emoji:'🌠',stars:1000,tts:true}
];
function escaped(v){return e(String(v??''));}
function locate(id){return (store?.liveEvents?.streams||[]).find(s=>s.id===id);}
function cardFor(id){
 const index=(store?.liveEvents?.streams||[]).findIndex(s=>s.id===id);
 return index<0?null:document.querySelectorAll('.usa50-stream-card')[index]||null;
}
function drawer(){
 return '<div class="usa50-immersive-gift-drawer" hidden aria-label="Choose a live gift">'+
 '<header class="usa50-immersive-drawer-head"><div><small>USA50 LIVE GIFTS</small><strong>Send some love ♡</strong></div>'+
 '<button type="button" data-immersive-action="gift-close" aria-label="Close gift selection">×</button></header>'+
 '<div class="usa50-immersive-gift-options">'+gifts.map(g=>'<label class="usa50-immersive-gift-choice"><input type="radio" name="immersive-gift" value="'+g.id+'" '+(chosenGift===g.id?'checked':'')+'><span>'+g.emoji+'</span><strong>'+escaped(g.name)+'</strong><small>✦ '+g.stars+'</small></label>').join('')+'</div>'+
 '<form data-immersive-form="gift" class="usa50-immersive-gift-form">'+
 '<label>Optional message <input name="message" maxlength="120" placeholder="A message for the idols"></label>'+
 '<label class="usa50-immersive-tts-option"><input type="checkbox" name="tts"> Request moderated TTS (Heart Burst or higher)</label>'+
 '<div class="usa50-immersive-gift-checkout"><small>Demo balance ✦ <span class="usa50-immersive-balance">'+Number(store?.me?.state?.stars||0).toLocaleString()+'</span></small>'+
 '<button type="submit">Send gift</button></div></form>'+
 '<p>Gift uses demo STARS. TTS needs host approval; declined requests are refunded. Real cash payments are not enabled.</p></div>';
}
function markup(stream){
 const title=escaped(stream.title||'USA50 Live');
 return '<section id="usa50-live-fullscreen" data-stream-id="'+escaped(stream.id)+'" class="usa50-live-fullscreen" role="dialog" aria-modal="true" aria-label="USA50 livestream: '+title+'">'+
 '<div class="usa50-immersive-player" aria-label="Livestream player"></div>'+
 '<div class="usa50-immersive-gradient" aria-hidden="true"></div>'+
 '<header class="usa50-immersive-header"><button type="button" data-immersive-action="close" aria-label="Close livestream">←</button>'+
 '<span class="usa50-immersive-live-tag">● LIVE</span><div><strong>'+title+'</strong><small>'+escaped((stream.hostNames||[]).join(' and ')||'USA50')+'</small></div>'+
 (stream.canEdit?'<button type="button" class="usa50-immersive-control" data-action="usa50-live-transition" data-value="'+escaped(stream.id)+'" data-status="ended">End live</button>':'')+'</header>'+
 '<div class="usa50-immersive-chat-slot"></div>'+drawer()+
 '<small class="usa50-immersive-demo-label">USA50 Live · Chat is moderated · STAR purchases/payouts not enabled</small></section>';
}
function close({rerender=true}={}){
 const overlay=document.getElementById('usa50-live-fullscreen');
 if(!overlay)return;
 overlay.remove();
 selectedStream=null;opening=false;posting=false;
 document.body.style.overflow=previousOverflow;
 if(rerender&&view==='events')render();
}
function open(id){
 const stream=locate(id);
 if(!stream||stream.status!=='live'){
  toast('This stream is not live yet. You can preview the layout instead.');
  return;
 }
 if(opening)return;
 opening=true;
 if(selectedStream)close({rerender:false});
 chosenGift='heart';
 previousOverflow=document.body.style.overflow;
 document.body.style.overflow='hidden';
 selectedStream=id;
 const card=cardFor(id);
 document.body.insertAdjacentHTML('beforeend',markup(stream));
 const overlay=document.getElementById('usa50-live-fullscreen');
 const layer=overlay.querySelector('.usa50-immersive-player');
 const livePlayer=card?.querySelector('.usa50-stream-embed');
 if(livePlayer){
  layer.append(livePlayer);
 }else if(stream.playerUrl&&/^https:\/\//i.test(stream.playerUrl)){
  layer.innerHTML='<iframe src="'+escaped(stream.playerUrl)+'" title="'+escaped(stream.title)+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
 }else{
  layer.innerHTML='<div class="usa50-immersive-unavailable"><span>✦</span><h2>Connecting to USA50 Live…</h2><p>No approved player has been set yet.</p></div>';
 }
 const panel=card?.querySelector('.usa50-live-interaction');
 if(panel){
  const gift=panel.querySelector('[data-action="usa50-live-gifts"]');
  if(gift){
   gift.removeAttribute('data-action');
   gift.dataset.immersiveAction='gift-toggle';
   gift.setAttribute('aria-expanded','false');
  }
  overlay.querySelector('.usa50-immersive-chat-slot').append(panel);
 }else{
  overlay.querySelector('.usa50-immersive-chat-slot').innerHTML='<p class="usa50-immersive-chat-unavailable">Chat is connecting…</p>';
 }
 overlay.querySelector('[data-immersive-action="close"]')?.focus();
 opening=false;
}
function addButtons(){
 if(view!=='events')return;
 const streams=store?.liveEvents?.streams||[];
 for(const [index,stream] of streams.entries()){
  const card=document.querySelectorAll('.usa50-stream-card')[index];
  if(!card)continue;
  card.dataset.immersiveStreamId=stream.id;
  let button=card.querySelector('.usa50-immersive-launch');
  if(!button){
   button=document.createElement('button');
   button.type='button';button.className='btn secondary usa50-immersive-launch';
   button.dataset.immersiveAction='open';
   card.append(button);
  }
  button.dataset.immersiveId=stream.id;
  button.textContent=stream.status==='live'?'⛶ Watch livestream fullscreen':'⛶ View livestream preview';
  button.dataset.immersiveMode=stream.status==='live'?'live':'preview';
 }
 // Keep the immersive player's moved DOM nodes unique during API refresh.
 if(selectedStream&&document.getElementById('usa50-live-fullscreen')){
  const card=cardFor(selectedStream);
  card?.querySelector('.usa50-live-interaction')?.remove();
  card?.querySelector('.usa50-stream-embed')?.remove();
  const stream=locate(selectedStream);
  if(!stream||stream.status!=='live')close({rerender:false});
 }
}
function toggleGift(){
 const overlay=document.getElementById('usa50-live-fullscreen');
 if(!overlay)return;
 if(!store?.me){toast('Sign in to send live gifts.');return;}
 const drawer=overlay.querySelector('.usa50-immersive-gift-drawer');
 drawer.hidden=!drawer.hidden;
 overlay.querySelector('[data-immersive-action="gift-toggle"]')?.setAttribute('aria-expanded',String(!drawer.hidden));
}
async function sendGift(form){
 if(posting)return;
 const stream=locate(selectedStream);
 if(!stream||stream.status!=='live')return toast('The livestream has ended.');
 const gift=gifts.find(g=>g.id===chosenGift);
 if(!gift)return;
 const fd=new FormData(form);
 if(fd.has('tts')&&!gift.tts)return toast('Choose a TTS-eligible gift to request voice playback.');
 if(Number(store?.me?.state?.stars||0)<gift.stars)return toast('Not enough demo STARS. Top up from Shop.');
 posting=true;
 const button=form.querySelector('button[type="submit"]');
 if(button)button.disabled=true;
 try{
  const result=await request('/api/livestreams/gift',{method:'POST',body:JSON.stringify({
   streamId:stream.id,giftId:gift.id,message:String(fd.get('message')||''),
   tts:fd.has('tts'),requestId:crypto.randomUUID()
  })});
  if(store?.me?.state)store.me.state.stars=result.starsLeft;
  const overlay=document.getElementById('usa50-live-fullscreen');
  overlay?.querySelector('.usa50-immersive-gift-drawer')?.setAttribute('hidden','');
  const bal=overlay?.querySelector('.usa50-immersive-balance');
  if(bal)bal.textContent=Number(result.starsLeft||0).toLocaleString();
  toast(result.status==='pending'?'TTS request sent for host approval.':'Gift sent! ♡');
 }catch(err){toast(err.message||'Gift could not be sent.');}
 finally{posting=false;if(button?.isConnected)button.disabled=false;}
}
document.addEventListener('click',function(event){
 const target=event.target.closest('[data-immersive-action]');
 if(target){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const name=target.dataset.immersiveAction;
  if(name==='close'){close();return;}
  if(name==='gift-toggle'||name==='gift-close'){toggleGift();return;}
  if(name==='open'){
   const id=target.dataset.immersiveId;
   if(target.dataset.immersiveMode==='preview'){
    window.USA50Preview?.open('livestream');
    return;
   }
   open(id);return;
  }
 }
 if(!selectedStream||!document.getElementById('usa50-live-fullscreen'))return;
 const card=event.target.closest('.usa50-stream-card');
 if(card&&!event.target.closest('button,a,input,textarea,select,form,label')){
  const stream=locate(card.dataset.immersiveStreamId);
  if(stream?.status==='live'){
   event.preventDefault();open(stream.id);
  }
 }
},true);
document.addEventListener('change',event=>{
 const input=event.target.closest('#usa50-live-fullscreen input[name="immersive-gift"]');
 if(input)chosenGift=input.value;
},true);
document.addEventListener('submit',function(event){
 const form=event.target.closest('#usa50-live-fullscreen [data-immersive-form="gift"]');
 if(!form)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 sendGift(form);
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&selectedStream){
  if(!document.getElementById('usa50-live-fullscreen'))return;
  const drawer=document.querySelector('#usa50-live-fullscreen .usa50-immersive-gift-drawer');
  if(drawer&&!drawer.hidden){drawer.hidden=true;return;}
  event.preventDefault();close();
 }
},true);
const oldRender=render;
render=function(){oldRender();addButtons();};
const oldGo=go;
go=function(dest){if(selectedStream)close({rerender:false});return oldGo(dest);};
window.addEventListener('pagehide',()=>{if(selectedStream)close({rerender:false})});
})();
