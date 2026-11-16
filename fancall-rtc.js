'use strict';
/* Prototype, authenticated WebRTC signaling relay for scheduled 1:1 fancalls.
 * Signaling carries SDP/ICE only; remote media is browser-to-browser.
 * TURN service and abuse controls must be configured before real public calls. */
module.exports=function makeRTC({db,userFrom,json,fail}){
 const rooms=new Map();
 const roles=u=>u?.role||'fan';
 const staff=u=>['admin','management'].includes(roles(u));
 const sessionFor=id=>(db.fancallLottery?.sessions||[]).find(x=>x.id===id);
 function permission(u,s){
  if(!u||u.mustChangePassword||!s)return null;
  if(roles(u)==='idol')return (!s.idolId||s.idolId===u.id)?'host':null;
  if(staff(u))return 'observer';
  return s.winnerIds?.includes(u.id)?'fan':null;
 }
 function roomFor(s){
  const epoch=s.cursor+':'+s.status,old=rooms.get(s.id);
  if(old?.epoch===epoch){
   for(const [uid,m] of old.members)if(Date.now()-m.last>40000)old.members.delete(uid);
   return old;
  }
  const room={epoch,members:new Map(),signals:[],seq:0};
  rooms.set(s.id,room);return room;
 }
 function canParticipate(u,s){
  const p=permission(u,s);
  if(!p||s.status!=='live')return null;
  if(p==='fan'&&s.winnerIds[s.cursor]!==u.id)return null;
  return p;
 }
 function publicPeers(room,u){
  return [...room.members].filter(([uid])=>uid!==u.id).map(([id,p])=>({id,role:p.role}));
 }
 function iceConfig(){
  const servers=[{urls:String(process.env.USA50_STUN_URL||'stun:stun.l.google.com:19302')}];
  const turn=String(process.env.USA50_TURN_URL||'');
  if(/^turns?:/.test(turn)&&process.env.USA50_TURN_USER&&process.env.USA50_TURN_CREDENTIAL)
   servers.push({urls:turn,username:process.env.USA50_TURN_USER,credential:process.env.USA50_TURN_CREDENTIAL});
  return {iceServers:servers};
 }
 function endpoint(req,res,ep,data,url){
  if(!ep.startsWith('/api/fancalls/rtc/'))return false;
  const u=userFrom(req);
  if(!u){fail(res,401,'Sign in required');return true;}
  const sessionId=String(data?.sessionId||url?.searchParams?.get('sessionId')||'');
  const s=sessionFor(sessionId),p=permission(u,s);
  if(!p){fail(res,403,'Not authorized for this fancall room');return true;}
  const room=roomFor(s);
  if(!canParticipate(u,s)){fail(res,409,'The current fancall is not live or it is not your turn');return true;}
  if(ep==='/api/fancalls/rtc/join'){
   room.members.set(u.id,{role:p,last:Date.now()});
   json(res,200,{ok:true,role:p,sessionId:s.id,epoch:room.epoch,selfId:u.id,peers:publicPeers(room,u),
    rtcConfiguration:iceConfig(),turnConfigured:Boolean(process.env.USA50_TURN_URL&&process.env.USA50_TURN_USER&&process.env.USA50_TURN_CREDENTIAL),
    monitoringNotice:'Management may supervise these calls. Do not use calls without participant consent, privacy rules and moderation.'});return true;
  }
  if(ep==='/api/fancalls/rtc/poll'){
   room.members.set(u.id,{role:p,last:Date.now()});
   const since=Number(url?.searchParams?.get('after')||0);
   if(!Number.isSafeInteger(since)||since<0){fail(res,400,'Invalid sequence');return true;}
   const signals=room.signals.filter(m=>m.seq>since&&m.to===u.id).slice(0,30);
   json(res,200,{ok:true,epoch:room.epoch,sessionStatus:s.status,activeFanId:s.winnerIds[s.cursor],
    peers:publicPeers(room,u),signals,nextSeq:Math.max(since,...signals.map(x=>x.seq))});return true;
  }
  if(ep==='/api/fancalls/rtc/signal'){
   const target=String(data.to||''),signal=data.signal;
   if(target===u.id||!room.members.has(u.id)||!room.members.has(target)){
    fail(res,403,'Target peer is not in this call');return true;
   }
   const toRole=room.members.get(target).role;
   // Observers may only receive offers/tracks after their own join, no arbitrary user IDs.
   if(p==='fan'&&toRole!=='host'&&toRole!=='observer'){fail(res,403,'Invalid peer');return true;}
   if(p==='observer'&&!['host','fan'].includes(toRole)){fail(res,403,'Invalid peer');return true;}
   if(p==='host'&&!['fan','observer'].includes(toRole)){fail(res,403,'Invalid peer');return true;}
   const kind=String(signal?.type||'');
   if(!['offer','answer','candidate'].includes(kind)){
    fail(res,400,'Invalid WebRTC signal');return true;
   }
   if(kind==='candidate'&&(typeof signal?.candidate!=='string'||signal.candidate.length>1300)){
    fail(res,400,'Invalid ICE candidate');return true;
   }
   if(kind!=='candidate'&&(typeof signal?.sdp!=='string'||signal.sdp.length>25000)){
    fail(res,400,'Invalid session description');return true;
   }
   const bytes=JSON.stringify(signal);
   if(bytes.length>28000){fail(res,413,'Signal too large');return true;}
   const now=Date.now();
   room.signals=room.signals.filter(x=>now-x.at<90000);
   const sender=room.members.get(u.id);
   sender.sent ||= [];
   sender.sent=sender.sent.filter(t=>now-t<60000);
   if(sender.sent.length>120){fail(res,429,'Too many WebRTC messages');return true;}
   sender.sent.push(now);sender.last=now;
   room.signals.push({seq:++room.seq,from:u.id,to:target,signal,at:now});
   if(room.signals.length>200)room.signals.splice(0,room.signals.length-200);
   json(res,200,{ok:true,seq:room.seq});return true;
  }
  if(ep==='/api/fancalls/rtc/leave'){
   room.members.delete(u.id);
   room.signals=room.signals.filter(x=>x.to!==u.id&&x.from!==u.id);
   json(res,200,{ok:true});return true;
  }
  fail(res,404,'Unknown signaling action');return true;
 }
 return {endpoint};
};
