/* USA50 admission-event alerts, livestream player and broadcaster studio (preview).
 * Ticket purchases remain external; media ingress is an external RTMPS provider. */
(function(){
'use strict';
const liveData=()=>store?.liveEvents||{events:[],streams:[],newCount:0};
const staff=()=>['admin','management'].includes(store?.me?.role);
const stamp=d=>{const n=new Date(d);return Number.isFinite(n.getTime())?n.toLocaleString():'TBA'};
function eventCatalog(){
 const d=liveData();
 const cards=(d.events||[]).map(x=>'<article class="usa50-event-tile"><div><span class="eyebrow">'+e(x.status==='on-sale'?'ADMISSION AVAILABLE':'USA50 EVENT')+'</span><h3>'+e(x.title)+'</h3><p>'+e(x.description||'')+'</p><small>'+e(stamp(x.startsAt))+' · '+e(x.venue||'TBA')+'</small></div>'+
 '<div class="usa50-event-actions">'+(x.priceLabel?'<span class="usa50-price-tag">'+e(x.priceLabel)+'</span>':'')+
 (x.status==='on-sale'&&x.admissionUrl?'<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="'+e(x.admissionUrl)+'">Admission details</a>':'<span class="badge">'+e(x.status)+'</span>')+
 (staff()&&x.admissionUrl?'<button class="btn tiny secondary" data-action="usa50-event-status" data-value="'+e(x.id)+'" data-status="'+(x.status==='on-sale'?'sold-out':'on-sale')+'">'+(x.status==='on-sale'?'Mark sold out':'Open admission')+'</button>':'')+'</div></article>').join('');
 const streams=(d.streams||[]).map(x=>{
  const player=x.status==='live'&&x.playerUrl?'<div class="usa50-stream-embed"><iframe src="'+e(x.playerUrl)+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="'+e(x.title)+' live player"></iframe></div>':'<div class="usa50-stream-placeholder"><span>✦</span><p>'+(x.status==='ended'?'Broadcast has ended':'Streaming will appear here when live')+'</p></div>';
  return '<article class="usa50-stream-card"><div class="row wrap"><div><span class="eyebrow">USA50 LIVE · '+e(x.status.toUpperCase())+'</span><h3>'+e(x.title)+'</h3></div></div><p class="lead">'+e(x.description||'')+'</p>'+player+
    '<small>'+e(stamp(x.startsAt))+'</small>'+
    (staff()?'<div class="row wrap"><button class="btn tiny secondary" data-action="usa50-stream-state" data-value="'+e(x.id)+'" data-status="live">Go Live</button><button class="btn tiny secondary" data-action="usa50-stream-state" data-value="'+e(x.id)+'" data-status="ended">End Stream</button></div>':'')+'</article>';
 }).join('');
 const eventForm=staff()?'<section class="glass panel usa50-broadcast-admin"><h3>Publish an event</h3><form id="usa50-event-create" class="form-grid"><label>Event title<input name="title" minlength="3" maxlength="90" required placeholder="USA50 Fan Meeting"></label><label>Date and time<input type="datetime-local" required name="startsAt"></label><label>Location<input name="venue" maxlength="100" placeholder="Online / NYC"></label><label>Description<textarea name="description" maxlength="600"></textarea></label><label>Official ticket page (HTTPS, optional)<input name="admissionUrl" type="url" placeholder="https://ticketing-provider.example/..."></label><label>Price label (optional)<input name="priceLabel" placeholder="From $20" maxlength="48"></label><p class="usa50-fineprint">Admission is sold through the external official ticket page only. USA50 does not collect payment in this demo.</p><button class="btn" type="submit">Publish event</button></form></section>':'';
 const streamForm=staff()?'<section class="glass panel usa50-broadcast-admin"><h3>Broadcaster Studio · OBS</h3><p class="lead">Use OBS Studio or another RTMPS broadcaster with a managed video ingest provider. Configure the RTMPS server/key in Railway; viewers only receive the approved player URL.</p>'+
 '<button class="btn secondary" data-action="usa50-obs-settings">Show OBS setup</button>'+
 '<form id="usa50-stream-create" class="form-grid"><label>Stream title<input name="title" required minlength="3" maxlength="90" placeholder="USA50 Live Diary"></label><label>Start time<input type="datetime-local" name="startsAt" required></label><label>Description<textarea name="description" maxlength="600"></textarea></label><label>Approved Cloudflare Stream player URL<input name="playerUrl" type="url" placeholder="https://iframe.videodelivery.net/..."></label><button class="btn" type="submit">Schedule livestream</button></form></section>':'';
 return '<section class="usa50-events-extended"><div class="usa50-heading-mini"><span class="eyebrow">USA50 EVENTS</span><h2>Admission & new events</h2></div>'+
 (cards||'<p class="lead">Upcoming admissions from USA50 will be announced here.</p>')+
 '<div class="usa50-heading-mini"><span class="eyebrow">OFFICIAL LIVE</span><h2>Livestreams</h2></div>'+
 (streams||'<p class="lead">No livestream is scheduled yet.</p>')+eventForm+streamForm+'</section>';
}
const priorEvents=eventsScreen;
eventsScreen=function(){return priorEvents()+eventCatalog();};
function updateEventDots(){
 const count=Number(liveData().newCount||0);
 for(const el of document.querySelectorAll('[data-go="events"]')){
  if(el.closest('.usa50-room,.usa50-compose-page'))continue;
  let dot=el.querySelector('.usa50-events-alert');
  if(count>0&&!dot){dot=document.createElement('span');dot.className='usa50-events-alert';dot.textContent='';el.append(dot);}
  if(dot)dot.hidden=count===0;
  el.classList.toggle('usa50-has-new-events',count>0);
  if(count>0)el.setAttribute('title',count+' new USA50 events or fancall lotteries');
 }
}
const priorRender=render;
render=function(){priorRender();updateEventDots();};
const previousGo=go;
go=function(next){
 const result=previousGo(next);
 if(next==='events'&&store?.me&&Number(liveData().newCount)>0){
  request('/api/events-v2/seen',{method:'POST',body:'{}'}).then(()=>{if(store.liveEvents)store.liveEvents.newCount=0;updateEventDots();}).catch(()=>{});
 }
 return result;
};
const priorSubmit=submitForm;
submitForm=async function(form){
 if(form.id==='usa50-event-create'||form.id==='usa50-stream-create'){
  const d=Object.fromEntries(new FormData(form));d.startsAt=new Date(d.startsAt).toISOString();
  const ep=form.id==='usa50-event-create'?'/api/events-v2/create':'/api/livestreams/create';
  await request(ep,{method:'POST',body:JSON.stringify(d)});
  await refresh();toast(form.id==='usa50-event-create'?'Event published.':'Livestream scheduled.');return;
 }
 return priorSubmit(form);
};
const priorAct=act;
act=async function(name,node){
 if(name==='usa50-event-status'||name==='usa50-stream-state'){
  const event=name==='usa50-event-status';
  await request(event?'/api/events-v2/status':'/api/livestreams/status',{method:'POST',body:JSON.stringify(event?{eventId:node.dataset.value,status:node.dataset.status}:{streamId:node.dataset.value,status:node.dataset.status})});
  await refresh();return;
 }
 if(name==='usa50-obs-settings'){
  const config=await request('/api/livestreams/host-config');
  const body=config.configured?'<p>Open OBS Studio → Settings → Stream → Service: Custom.</p><p><strong>RTMPS server</strong></p><pre class="usa50-stream-secret">'+e(config.server||'')+'</pre><p><strong>Stream key (keep private)</strong></p><pre class="usa50-stream-secret">'+e(config.streamKey||'')+'</pre><p>Start OBS, then use Go Live on the USA50 Stream page. The stream key must never appear in a public post.</p>':'<p class="lead">No broadcaster has been configured in Railway yet.</p><p>Set <code>USA50_OBS_SERVER_URL</code> to the managed provider RTMPS ingest URL and <code>USA50_OBS_STREAM_KEY</code> to the provider stream key. Add the approved Cloudflare Stream playback URL when creating your livestream.</p>';
  showModal('OBS broadcaster settings',body);return;
 }
 return priorAct(name,node);
};
setInterval(()=>{
 if(!store?.me||document.visibilityState!=='visible'||view==='events')return;
 request('/api/state').then(data=>{if(data?.liveEvents){store.liveEvents=data.liveEvents;updateEventDots();}}).catch(()=>{});
},60000);
})();