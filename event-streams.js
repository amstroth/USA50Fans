'use strict';
/* Events and OBS-compatible live stream catalog; Railway does not ingest/transcode video.
 * Video delivery requires a separately configured RTMPS provider (Cloudflare Stream recommended).
 * No local in-app paid checkout or admission charge is performed here. */
module.exports=function makeLiveEvents({db,save,id,now,json,fail,userFrom}){
 db.liveEvents ||= [];
 db.liveStreams ||= [];
 const roles=u=>['admin','management'].includes(u?.role);
 function safeUrl(value,mode){
  const input=String(value||'').trim();if(!input)return null;
  try{
   const url=new URL(input);
   if(url.protocol!=='https:'||url.username||url.password||input.length>1800)return null;
   if(mode==='stream'){
    const host=url.hostname.toLowerCase();
    const extra=(process.env.USA50_STREAM_PLAYBACK_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(!(/^(?:customer-[a-z0-9-]+)\.cloudflarestream\.com$/.test(host)||host==='iframe.videodelivery.net'||extra.includes(host)))return null;
   }
   return url.toString();
  }catch{return null;}
 }
 function eligibleDraws(){
  return (db.fancallLottery?.draws||[]).filter(d=>d.status==='open'&&Date.parse(d.closesAt)>Date.now());
 }
 function publicEvent(event){return {id:event.id,title:event.title,description:event.description,venue:event.venue,startsAt:event.startsAt,postedAt:event.postedAt,admissionUrl:event.admissionUrl||null,status:event.status,priceLabel:event.priceLabel||null};}
 function publicStream(item){return {id:item.id,title:item.title,description:item.description,startsAt:item.startsAt,postedAt:item.postedAt,status:item.status,playerUrl:item.status==='live'?item.playerUrl:null,hasPlayer:!!item.playerUrl};}
 function notificationCount(user){
  if(!user)return 0;
  const seen=Date.parse(user.state?.eventLastSeenAt||'1970-01-01T00:00:00Z')||0;
  return db.liveEvents.filter(e=>e.status==='on-sale'&&e.admissionUrl&&Date.parse(e.postedAt)>seen).length+
   eligibleDraws().filter(d=>Date.parse(d.createdAt||d.startsAt||0)>seen && !(d.entries||[]).includes(user.id)).length;
 }
 function info(user){
  return {events:db.liveEvents.filter(x=>x.status!=='draft').map(publicEvent),
   streams:db.liveStreams.filter(x=>x.status!=='draft').map(publicStream),
   newCount:notificationCount(user),streamProvider:'External RTMPS ingest + managed HLS/iframe player',
   broadcastingConfigured:!!process.env.USA50_OBS_SERVER_URL&&!!process.env.USA50_OBS_STREAM_KEY,
   realInAppCheckoutEnabled:false};
 }
 function seen(req,res){
  const user=userFrom(req);if(!user){fail(res,401,'Sign in required.');return true;}
  user.state||={};user.state.eventLastSeenAt=now();save();
  json(res,200,{ok:true,newCount:notificationCount(user)});return true;
 }
 function handle(req,res,ep,data){
  if(!ep.startsWith('/api/events-v2/')&&!ep.startsWith('/api/livestreams/'))return false;
  if(ep==='/api/events-v2/seen')return seen(req,res);
  const user=userFrom(req);
  if(!user){fail(res,401,'Sign in required.');return true;}
  if(user.mustChangePassword){fail(res,403,'Change temporary password first.');return true;}
  if(!roles(user)){fail(res,403,'Management only.');return true;}
  if(ep==='/api/events-v2/create'){
   const title=String(data.title||'').trim().slice(0,90),description=String(data.description||'').trim().slice(0,600);
   const startsAt=String(data.startsAt||'');
   const url=data.admissionUrl?safeUrl(data.admissionUrl,'ticket'):null;
   if(!title||title.length<3||!Number.isFinite(Date.parse(startsAt))||(data.admissionUrl&&!url)){
    fail(res,400,'Enter a title, valid date and optional HTTPS ticketing URL.');return true;
   }
   const status=url?'on-sale':'announced';
   const event={id:id(),title,description,startsAt:new Date(startsAt).toISOString(),
    admissionUrl:url,venue:String(data.venue||'TBA').trim().slice(0,100),priceLabel:String(data.priceLabel||'').trim().slice(0,48),
    postedAt:now(),status,createdBy:user.id};
   db.liveEvents.unshift(event);save();json(res,201,{ok:true,event:publicEvent(event)});return true;
  }
  if(ep==='/api/events-v2/status'){
   const event=db.liveEvents.find(x=>x.id===String(data.eventId));
   if(!event){fail(res,404,'Event not found.');return true;}
   const next=String(data.status||'');
   if(!['announced','on-sale','sold-out','cancelled'].includes(next)){fail(res,400,'Invalid event status.');return true;}
   if(next==='on-sale'&&!event.admissionUrl){fail(res,409,'Add an official admission URL before enabling sales.');return true;}
   event.status=next;
   if(next==='on-sale')event.postedAt=now();
   save();json(res,200,{ok:true,event:publicEvent(event)});return true;
  }
  if(ep==='/api/livestreams/create'){
   const title=String(data.title||'').trim().slice(0,90),description=String(data.description||'').trim().slice(0,600);
   const startsAt=String(data.startsAt||'');
   const url=safeUrl(data.playerUrl,'stream');
   if(title.length<3||!Number.isFinite(Date.parse(startsAt))||(data.playerUrl&&!url)){
    fail(res,400,'Provide a stream title, date, and an approved Cloudflare player URL (or leave playback blank).');return true;
   }
   const item={id:id(),title,description,startsAt:new Date(startsAt).toISOString(),postedAt:now(),
    playerUrl:url,status:'scheduled',createdBy:user.id};
   db.liveStreams.unshift(item);save();json(res,201,{ok:true,stream:publicStream(item)});return true;
  }
  if(ep==='/api/livestreams/status'){
   const stream=db.liveStreams.find(x=>x.id===String(data.streamId));
   if(!stream){fail(res,404,'Stream not found.');return true;}
   const status=String(data.status);
   if(!['scheduled','live','ended'].includes(status)){fail(res,400,'Invalid stream status.');return true;}
   if(status==='live'&&!stream.playerUrl){fail(res,409,'Configure an approved Stream player URL before broadcasting live.');return true;}
   stream.status=status;save();json(res,200,{ok:true,stream:publicStream(stream)});return true;
  }
  fail(res,404,'Action not found.');return true;
 }
 function hostConfig(req,res){
  const u=userFrom(req);if(!u||!roles(u)){fail(res,403,'Management only.');return;}
  const server=String(process.env.USA50_OBS_SERVER_URL||'');
  const key=String(process.env.USA50_OBS_STREAM_KEY||'');
  json(res,200,{configured:server.startsWith('rtmps://')&&!!key,server:server.startsWith('rtmps://')?server:null,
   streamKey:key||null,
   instructions:'In OBS: Settings → Stream → Service Custom → paste the RTMPS server and stream key. Start streaming in OBS, then set the USA50 stream Live. Never share the key with viewers.'});
 }
 return {info,handle,hostConfig,notificationCount};
};
