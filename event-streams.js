'use strict';
/* USA50 managed livestream metadata. Playback uses an external RTMPS/HLS provider. */
module.exports=function makeLiveEvents({db,save,id,now,json,fail,userFrom,members=[],notifyMany=()=>{},pushLive=()=>{},onStatus=()=>{}}){
 db.liveEvents ||= [];db.liveStreams ||= [];
 const managers=u=>['admin','management'].includes(u?.role);
 const idols=u=>u?.role==='idol';
 const options=[{id:'usa50',name:'USA50',kind:'group'},{id:'nyc50',name:'NYC50',kind:'group'},
  {id:'la50',name:'LA50',kind:'group'},{id:'management',name:'Management',kind:'group'},
  ...members.map(m=>({id:m.id,name:m.name,kind:'idol',team:m.team}))];
 const byId=Object.fromEntries(options.map(x=>[x.id,x]));
 function cleanHosts(value){
  if(!Array.isArray(value)||value.length>16)return null;
  const keys=[...new Set(value.map(v=>String(v).toLowerCase()))];
  if(keys.some(k=>!byId[k]))return null;
  return keys;
 }
 function expandHosts(hostIds){
  const set=new Set();
  for(const name of hostIds||[]){
   if(name==='usa50')members.forEach(m=>set.add(m.id));
   else if(name==='nyc50'||name==='la50')members.filter(m=>m.team.toLowerCase()===name).forEach(m=>set.add(m.id));
   else if(name==='management')set.add('management');
   else if(byId[name])set.add(name);
  }
  return [...set];
 }
 function hostNames(hostIds){
  return (hostIds||[]).map(x=>byId[x]?.name).filter(Boolean);
 }
 function liveHeadline(hostIds){
  const labels=hostNames(hostIds);
  if(!labels.length)return 'USA50 is Live now!';
  if(labels.length===1)return labels[0]+(labels[0]==='Management'||labels[0]==='NYC50'||labels[0]==='LA50'||labels[0]==='USA50'?' are':' is')+' Live now!';
  return labels.slice(0,-1).join(', ')+' and '+labels[labels.length-1]+' are Live now!';
 }
 function allowedIdol(u,stream){
  return idols(u)&&Boolean(u.idolId)&&expandHosts(stream.hosts).includes(u.idolId);
 }
 function canEdit(u,stream){return managers(u)||allowedIdol(u,stream);}
 function safeUrl(input,stream=false){
  const value=String(input||'').trim();if(!value)return null;
  try{
   const u=new URL(value);
   if(u.protocol!=='https:'||u.username||u.password||u.port||value.length>1800)return null;
   if(stream){
    const host=u.hostname.toLowerCase(),extra=(process.env.USA50_STREAM_PLAYBACK_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(!(host==='iframe.videodelivery.net'||/^customer-[a-z0-9-]+\.cloudflarestream\.com$/.test(host)||extra.includes(host)))return null;
   }
   return u.toString();
  }catch{return null;}
 }
 function publicEvent(ev){return {id:ev.id,title:ev.title,description:ev.description,venue:ev.venue,startsAt:ev.startsAt,postedAt:ev.postedAt,
  admissionUrl:ev.admissionUrl||null,status:ev.status,priceLabel:ev.priceLabel||null};}
 function publicStream(item,u){
  return {id:item.id,title:item.title,description:item.description,startsAt:item.startsAt,postedAt:item.postedAt,
    status:item.status,playerUrl:item.status==='live'?item.playerUrl:null,hasPlayer:!!item.playerUrl,
    eventId:item.eventId||null,hosts:item.hosts||[],hostNames:hostNames(item.hosts),recipientIds:expandHosts(item.hosts),
    liveHeadline:liveHeadline(item.hosts),editPlayerUrl:canEdit(u,item)?item.playerUrl:null,canEdit:canEdit(u,item),canManage:managers(u)};
 }
 function eligibleDraws(){return (db.fancallLottery?.draws||[]).filter(d=>d.status==='open'&&Date.parse(d.closesAt)>Date.now());}
 function notificationCount(user){
  if(!user)return 0;
  const seen=Date.parse(user.state?.eventLastSeenAt||0)||0;
  return db.liveEvents.filter(e=>e.status==='on-sale'&&e.admissionUrl&&Date.parse(e.postedAt)>seen).length+
    eligibleDraws().filter(d=>Date.parse(d.createdAt||d.startsAt||0)>seen&&!(d.entries||[]).includes(user.id)).length;
 }
 function info(u){
  return {events:db.liveEvents.filter(x=>x.status!=='draft').map(publicEvent),
   streams:db.liveStreams.filter(x=>x.status!=='draft').map(x=>publicStream(x,u)),
   hostOptions:options,newCount:notificationCount(u),
   streamProvider:'External RTMPS ingest + approved player',
   broadcastingConfigured:!!process.env.USA50_OBS_SERVER_URL&&!!process.env.USA50_OBS_STREAM_KEY,
   realInAppCheckoutEnabled:false};
 }
 function hostConfig(req,res){
  const u=userFrom(req);if(!u||!managers(u)){fail(res,403,'Management only.');return;}
  const server=String(process.env.USA50_OBS_SERVER_URL||''),key=String(process.env.USA50_OBS_STREAM_KEY||'');
  json(res,200,{configured:server.startsWith('rtmps://')&&!!key,server:server.startsWith('rtmps://')?server:null,streamKey:key||null,
   instructions:'OBS Settings → Stream → Custom → RTMPS server and stream key. Keep the key private.'});
 }
 function seen(req,res){
  const u=userFrom(req);if(!u){fail(res,401,'Sign in required.');return true;}
  u.state||={};u.state.eventLastSeenAt=now();save();json(res,200,{ok:true,newCount:notificationCount(u)});return true;
 }
 function handle(req,res,ep,data){
  if(!ep.startsWith('/api/events-v2/')&&!ep.startsWith('/api/livestreams/'))return false;
  if(ep==='/api/events-v2/seen')return seen(req,res);
  const u=userFrom(req);
  if(!u){fail(res,401,'Sign in required.');return true;}
  if(u.mustChangePassword){fail(res,403,'Change temporary password first.');return true;}
  if(ep==='/api/events-v2/create'){
   if(!managers(u)){fail(res,403,'Management only.');return true;}
   const title=String(data.title||'').trim().slice(0,90),startsAt=String(data.startsAt||'');
   const admissionUrl=data.admissionUrl?safeUrl(data.admissionUrl):null;
   if(title.length<3||!Number.isFinite(Date.parse(startsAt))||(data.admissionUrl&&!admissionUrl)){fail(res,400,'Valid title, date and HTTPS admission URL required.');return true;}
   const item={id:id(),title,description:String(data.description||'').trim().slice(0,600),startsAt:new Date(startsAt).toISOString(),
    postedAt:now(),admissionUrl,status:admissionUrl?'on-sale':'announced',venue:String(data.venue||'TBA').slice(0,100),
    priceLabel:String(data.priceLabel||'').slice(0,48),createdBy:u.id};
   db.liveEvents.unshift(item);save();json(res,201,{ok:true,event:publicEvent(item)});return true;
  }
  if(ep==='/api/events-v2/status'){
   if(!managers(u)){fail(res,403,'Management only.');return true;}
   const event=db.liveEvents.find(x=>x.id===String(data.eventId)),status=String(data.status||'');
   if(!event){fail(res,404,'Event not found.');return true;}
   if(!['announced','on-sale','sold-out','cancelled'].includes(status)){fail(res,400,'Invalid event status.');return true;}
   if(status==='on-sale'&&!event.admissionUrl){fail(res,409,'Provide admission URL first.');return true;}
   event.status=status;if(status==='on-sale')event.postedAt=now();
   save();json(res,200,{ok:true,event:publicEvent(event)});return true;
  }
  if(ep==='/api/livestreams/create'){
   if(!managers(u)&&!idols(u)){fail(res,403,'Idols or management only.');return true;}
   const title=String(data.title||'').trim().slice(0,90),startsAt=String(data.startsAt||''),url=data.playerUrl?safeUrl(data.playerUrl,true):null;
   const hosts=data.hosts===undefined?(idols(u)?[u.idolId]:[]):cleanHosts(data.hosts);
   if(title.length<3||!Number.isFinite(Date.parse(startsAt))||(data.playerUrl&&!url)||!hosts){fail(res,400,'Title, date, approved player URL and valid hosts required.');return true;}
   if(idols(u)&&(!u.idolId||hosts.length!==1||hosts[0]!==u.idolId)){fail(res,403,'Idols can schedule streams hosted by themselves; management can select groups.');return true;}
   const eventId=data.eventId?String(data.eventId):null;
   if(eventId&&!db.liveEvents.some(x=>x.id===eventId)){fail(res,404,'Linked event not found.');return true;}
   const stream={id:id(),title,description:String(data.description||'').trim().slice(0,600),
    startsAt:new Date(startsAt).toISOString(),postedAt:now(),hosts,eventId,playerUrl:url,status:'scheduled',createdBy:u.id,liveRevision:0};
   db.liveStreams.unshift(stream);save();json(res,201,{ok:true,stream:publicStream(stream,u)});return true;
  }
  if(ep==='/api/livestreams/update'){
   const stream=db.liveStreams.find(x=>x.id===String(data.streamId));
   if(!stream){fail(res,404,'Stream not found.');return true;}
   if(!canEdit(u,stream)){fail(res,403,'Only assigned idols and management can edit this stream.');return true;}
   if(stream.status==='ended'){fail(res,409,'Ended streams cannot be edited. Schedule a new stream.');return true;}
   if(Object.hasOwn(data,'playerUrl')){
    const url=data.playerUrl?safeUrl(data.playerUrl,true):null;
    if(data.playerUrl&&!url){fail(res,400,'Use an approved HTTPS player URL, not an RTMP stream key.');return true;}
    stream.playerUrl=url;
   }
   if(Object.hasOwn(data,'hosts')){
    if(!managers(u)){fail(res,403,'Only management can change the participant list.');return true;}
    const hosts=cleanHosts(data.hosts);
    if(!hosts||!hosts.length){fail(res,400,'Select at least one live participant.');return true;}
    stream.hosts=hosts;
   }
   if(Object.hasOwn(data,'eventId')){
    if(!managers(u)){fail(res,403,'Only management can link events.');return true;}
    const evId=data.eventId?String(data.eventId):null;
    if(evId&&!db.liveEvents.some(e=>e.id===evId)){fail(res,404,'Event not found.');return true;}
    stream.eventId=evId;
   }
   save();json(res,200,{ok:true,stream:publicStream(stream,u)});return true;
  }
  if(ep==='/api/livestreams/status'){
   const stream=db.liveStreams.find(x=>x.id===String(data.streamId)),status=String(data.status||'');
   if(!stream){fail(res,404,'Stream not found.');return true;}
   if(!canEdit(u,stream)){fail(res,403,'Only the assigned idol or management can control this livestream.');return true;}
   if(!['scheduled','live','ended'].includes(status)){fail(res,400,'Invalid stream status.');return true;}
   if(stream.status==='ended'&&status!=='ended'){fail(res,409,'Ended streams cannot be restarted.');return true;}
   if(status==='live'&&!stream.playerUrl){fail(res,409,'Set an approved stream player URL before going live.');return true;}
   if(status==='live'&&!expandHosts(stream.hosts).length){fail(res,409,'Select who is going live.');return true;}
   const previous=stream.status;
   if(previous!==status){
    stream.status=status;
    if(status==='live'){
      stream.liveRevision=(stream.liveRevision||0)+1;stream.liveAt=now();
      const ids=Object.values(db.users||{}).filter(x=>!['admin','management','staff','idol'].includes(x.role)).map(x=>x.id);
      notifyMany(ids,'livestream-live',liveHeadline(stream.hosts),{key:'live:'+stream.id+':'+stream.liveRevision,streamId:stream.id});
      Promise.resolve(pushLive(ids,liveHeadline(stream.hosts),stream.id)).catch(err=>console.warn('Live push delivery',err.message));
    }
    if(status==='ended')onStatus(stream);
    save();
   }
   json(res,200,{ok:true,stream:publicStream(stream,u)});return true;
  }
  fail(res,404,'Action not found.');return true;
 }
 return {info,handle,hostConfig,notificationCount,expandHosts,hostNames,liveHeadline};
};
