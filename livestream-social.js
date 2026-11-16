'use strict';
/* USA50 moderated live chat, virtual STAR gifts, TTS overlay and demo creator settlement.
 * Gift payouts are NOT real money. Verified payments, refunds and creator payee accounts
 * are mandatory before cash settlement is enabled. */
const crypto=require('node:crypto');
module.exports=function makeLiveSocial({db,save,id,now,userFrom,json,fail,expandHosts}){
 db.liveInteraction ||= {messages:{},gifts:{},chatCooldowns:{},giftCooldowns:{},earnings:{},settlements:[],lastSettlementAt:now()};
 const state=db.liveInteraction;
 state.messages ||= {};state.gifts ||= {};state.chatCooldowns ||= {};state.giftCooldowns ||= {};state.earnings ||= {};state.settlements ||= [];
 const gifts=[
  {id:'spark',name:'Sparkle',emoji:'✨',stars:25,tts:false},
  {id:'ribbon',name:'Ribbon',emoji:'🎀',stars:75,tts:false},
  {id:'heart',name:'Heart Burst',emoji:'💗',stars:150,tts:true},
  {id:'bouquet',name:'Bouquet',emoji:'💐',stars:400,tts:true},
  {id:'galaxy',name:'Galaxy Rain',emoji:'🌠',stars:1000,tts:true}
 ];
 const splitPercent=70;
 const streamById=streamId=>db.liveStreams?.find(x=>x.id===String(streamId));
 const managers=u=>['admin','management'].includes(u?.role);
 const host=(u,s)=>managers(u)||(u?.role==='idol'&&Boolean(u.idolId)&&expandHosts(s.hosts).includes(u.idolId));
 function validStream(res,s){if(s)return true;fail(res,404,'Livestream not found.');return false;}
 function getMessages(s){return state.messages[s.id]||(state.messages[s.id]=[]);}
 function userLabel(u){
  const p=db.social?.profiles?.[u.id];
  return {username:u.role==='idol'?String(u.displayName||'Idol').replace(/\s+/g,''):p?.handle||u.displayName||'Fan',
   verified:u.role==='idol'?'idol':managers(u)||u.role==='staff'?'staff':null,hasAvatar:!!p?.avatarUrl};
 }
 function publicMsg(m){
  const u=db.users?.[m.authorId];
  if(!u)return {id:m.id,text:m.text,username:'Former fan',kind:m.kind,createdAt:m.createdAt};
  return {id:m.id,text:m.text,createdAt:m.createdAt,kind:m.kind,gift:m.gift||null,
   authorId:m.authorId,...userLabel(u),hidden:!!m.hidden,tts:!!m.tts};
 }
 function feed(user,streamId,after){
  const stream=streamById(streamId);
  if(!stream)return null;
  const all=getMessages(stream).filter(m=>!m.hidden&&m.status!=='pending');
  const found=after?all.findIndex(m=>m.id===after):-1;
  return {status:stream.status,streamId:stream.id,
   messages:(found>=0?all.slice(found+1):all.slice(-65)).slice(-65).map(publicMsg),
   gifts,ttsPending:host(user,stream)?(state.gifts[stream.id]||[]).filter(g=>g.status==='pending').map(g=>({id:g.id,username:userLabel(db.users[g.authorId]).username,text:g.text,stars:g.stars,createdAt:g.createdAt})):[],
   creatorSharePercent:splitPercent,
   realPayoutsEnabled:false};
 }
 function moderationEntry(res,u,s,entry){
  if(!host(u,s)){fail(res,403,'Assigned idol or management required.');return false;}
  if(!entry){fail(res,404,'Gift request not found.');return false;}
  return true;
 }
 function refund(entry,reason){
  if(entry.status!=='pending')return false;
  const user=db.users[entry.authorId];if(user){user.state ||= {};user.state.stars=Number(user.state.stars||0)+entry.stars;}
  entry.status='refunded';entry.refundReason=reason;entry.resolvedAt=now();
  const current=streamById(entry.streamId);
  const list=current?getMessages(current):[];
  const message=list.find(m=>m.id===entry.messageId);
  if(message)message.hidden=true;
  return true;
 }
 function credit(entry,stream){
  if(entry.status==='credited')return;
  const recipients=expandHosts(stream.hosts);
  if(!recipients.length)throw Error('No registered live participants.');
  const totalMilli=entry.stars*1000*splitPercent/100; // integer 1/1000th STARS
  const each=Math.floor(totalMilli/recipients.length);
  let remainder=totalMilli%recipients.length;
  const allocations={};
  for(const uid of recipients){
   const amt=each+(remainder>0?1:0);
   if(remainder)remainder--;
   state.earnings[uid]=Number(state.earnings[uid]||0)+amt;
   allocations[uid]=amt;
  }
  entry.allocations=allocations;entry.status='credited';entry.resolvedAt=now();
  entry.creatorSharePercent=splitPercent;
  const list=getMessages(stream);const message=list.find(m=>m.id===entry.messageId);
  if(message){message.status='published';message.tts=Boolean(entry.ttsRequested);message.text=entry.text;}
 }
 function expireStale(){
  let changed=0;
  for(const list of Object.values(state.gifts)){
   for(const g of list){
    if(g.status==='pending'&&(Date.now()-Date.parse(g.createdAt)>60*60*1000||streamById(g.streamId)?.status==='ended')){
     changed+=refund(g,'TTS request expired or stream ended')?1:0;
    }
   }
  }
  if(changed)save();return changed;
 }
 function settleDue(){
  const last=Date.parse(state.lastSettlementAt)||Date.now();
  if(Date.now()-last<7*24*60*60*1000)return null;
  const allocations=Object.fromEntries(Object.entries(state.earnings).filter(([,amount])=>Number(amount)>0));
  const total=Object.values(allocations).reduce((a,b)=>a+Number(b),0);
  const batch={id:id(),periodStart:state.lastSettlementAt,periodEnd:now(),allocations,totalMilliStars:total,
   status:'demo-awaiting-payment-setup',actualCashTransferred:false};
  state.settlements.unshift(batch);
  if(state.settlements.length>60)state.settlements.length=60;
  state.earnings={};state.lastSettlementAt=now();save();return batch;
 }
 function onStreamEnd(stream){
  for(const g of state.gifts[stream.id]||[])if(g.status==='pending')refund(g,'Livestream ended before approval');
  save();
 }
 function earnings(u){
  if(!u)return null;
  const me=u.role==='idol'?u.idolId:null;
  if(!me&&!managers(u))return null;
  const pending=managers(u)?{...state.earnings}:{[me]:Number(state.earnings[me]||0)};
  const history=state.settlements.slice(0,20).map(b=>({
   id:b.id,periodStart:b.periodStart,periodEnd:b.periodEnd,
   allocations:managers(u)?b.allocations:{[me]:Number(b.allocations[me]||0)},
   status:b.status,actualCashTransferred:false}));
  return {pendingMilliStars:pending,history,creatorSharePercent:splitPercent,
   nextSettlementAt:new Date((Date.parse(state.lastSettlementAt)||Date.now())+7*86400000).toISOString(),
   realPayoutsEnabled:false,
   disclaimer:'DEMO ONLY. Settlement records do not transfer cash. Purchases, app-store fees, refunds, creator agreements and verified payout accounts must be integrated before cash payouts.'};
 }
 function handleGet(req,res,pathname,params){
  if(pathname==='/api/livestreams/overlay'){
   const s=streamById(params.get('streamId')),token=String(params.get('token')||'');
   if(!s||!s.overlayTokenHash||token.length!==64){fail(res,403,'Invalid overlay access.');return true;}
   const digest=crypto.createHash('sha256').update(token).digest('hex');
   if(!crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(s.overlayTokenHash))){fail(res,403,'Invalid overlay access.');return true;}
   const tts=(state.gifts[s.id]||[]).filter(g=>g.status==='credited'&&g.ttsRequested&&!getMessages(s).some(m=>m.id===g.messageId&&m.hidden))
    .slice(-30).map(g=>({id:g.id,text:g.text,username:userLabel(db.users[g.authorId]).username,createdAt:g.resolvedAt}));
   json(res,200,{status:s.status,items:tts});return true;
  }
  if(pathname.startsWith('/api/livestreams/avatar/')){
   const u=db.users[String(pathname.slice('/api/livestreams/avatar/'.length))];
   if(!u){fail(res,404,'Avatar not found.');return true;}
   const value=db.social?.profiles?.[u.id]?.avatarUrl||'';
   const m=value.match(/^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i);
   if(!m||m[2].length>240000){fail(res,404,'Avatar unavailable.');return true;}
   const image=Buffer.from(m[2],'base64');
   res.writeHead(200,{'Content-Type':'image/'+m[1],'Cache-Control':'public,max-age=120','X-Content-Type-Options':'nosniff'});res.end(image);return true;
  }
  if(!['/api/livestreams/chat','/api/livestreams/earnings'].includes(pathname))return false;
  const u=userFrom(req);
  if(!u){fail(res,401,'Sign in first.');return true;}
  if(pathname==='/api/livestreams/earnings'){
   const data=earnings(u);if(!data){fail(res,403,'Creator or manager required.');return true;}
   settleDue();json(res,200,earnings(u));return true;
  }
  const result=feed(u,params.get('streamId'),params.get('after'));
  if(!result){fail(res,404,'Stream not found.');return true;}
  expireStale();json(res,200,result);return true;
 }
 function handle(req,res,ep,data){
  if(!['/api/livestreams/chat','/api/livestreams/gift','/api/livestreams/gift-review','/api/livestreams/chat-hide','/api/livestreams/overlay-token'].includes(ep))return false;
  const u=userFrom(req);if(!u){fail(res,401,'Sign in first.');return true;}
  if(u.mustChangePassword){fail(res,403,'Change your temporary password first.');return true;}
  const stream=streamById(data.streamId);if(!validStream(res,stream))return true;
  if(ep==='/api/livestreams/overlay-token'){
   if(!host(u,stream)){fail(res,403,'Assigned idol or manager required.');return true;}
   const token=crypto.randomBytes(32).toString('hex');
   stream.overlayTokenHash=crypto.createHash('sha256').update(token).digest('hex');
   save();json(res,200,{ok:true,token,streamId:stream.id,
    path:'/live-tts-overlay.html?streamId='+encodeURIComponent(stream.id)+'&token='+token});return true;
  }
  if(ep==='/api/livestreams/chat-hide'){
   if(!host(u,stream)){fail(res,403,'Host or manager required.');return true;}
   const msg=getMessages(stream).find(m=>m.id===String(data.messageId));
   if(!msg){fail(res,404,'Message not found.');return true;}
   msg.hidden=true;save();json(res,200,{ok:true});return true;
  }
  if(ep==='/api/livestreams/gift-review'){
   const entry=(state.gifts[stream.id]||[]).find(g=>g.id===String(data.giftId));
   if(!moderationEntry(res,u,stream,entry))return true;
   if(entry.status!=='pending'){fail(res,409,'Gift request has already been handled.');return true;}
   if(String(data.action)==='approve'){
    if(stream.status!=='live'){fail(res,409,'Stream is not live.');return true;}
    credit(entry,stream);
   }else if(String(data.action)==='reject'){refund(entry,'TTS request declined by host');}
   else{fail(res,400,'Review must approve or reject.');return true;}
   save();json(res,200,{ok:true,status:entry.status});return true;
  }
  if(stream.status!=='live'){fail(res,409,'The stream is not live.');return true;}
  if(ep==='/api/livestreams/chat'){
   const text=String(data.message||'').trim().slice(0,210);
   if(!text||text.length>200){fail(res,400,'Message must be 1–200 characters.');return true;}
   const last=Number(state.chatCooldowns[u.id]||0);
   if(Date.now()-last<3000){fail(res,429,'You can send one message every three seconds.');return true;}
   state.chatCooldowns[u.id]=Date.now();
   const item={id:id(),streamId:stream.id,authorId:u.id,text,kind:'chat',createdAt:now(),status:'published'};
   const messages=getMessages(stream);messages.push(item);if(messages.length>400)messages.splice(0,messages.length-400);
   save();json(res,201,{ok:true,message:publicMsg(item)});return true;
  }
  const gift=gifts.find(g=>g.id===String(data.giftId));
  if(!gift){fail(res,400,'Select a valid gift.');return true;}
  const text=String(data.message||'').trim().slice(0,140),ttsRequested=Boolean(data.tts);
  if(text.length>120){fail(res,400,'Gift messages may be up to 120 characters.');return true;}
  if(ttsRequested&&(!gift.tts||!text)){fail(res,400,'This gift cannot request TTS without a message.');return true;}
  const requestId=String(data.requestId||'');
  if(!/^[0-9a-f-]{36}$/i.test(requestId)){fail(res,400,'Invalid gift request token.');return true;}
  const already=(state.gifts[stream.id]||[]).find(g=>g.requestId===requestId);
  if(already){json(res,200,{ok:true,status:already.status,duplicate:true,starsLeft:Number(u.state?.stars||0)});return true;}
  if(Date.now()-Number(state.giftCooldowns[u.id]||0)<4500){fail(res,429,'Please wait before sending another gift.');return true;}
  if(Number(u.state?.stars||0)<gift.stars){fail(res,400,'Not enough STARS. Top up in Shop.');return true;}
  if(!expandHosts(stream.hosts).length){fail(res,409,'No assigned recipients for this stream.');return true;}
  u.state.stars-=gift.stars;state.giftCooldowns[u.id]=Date.now();
  const item={id:id(),streamId:stream.id,requestId,authorId:u.id,giftId:gift.id,stars:gift.stars,
   text:text||gift.name,ttsRequested,createdAt:now(),status:ttsRequested?'pending':'accepted'};
  (state.gifts[stream.id]||(state.gifts[stream.id]=[])).push(item);
  const message={id:id(),streamId:stream.id,authorId:u.id,kind:'gift',gift:{...gift},text:item.text,
   tts:false,createdAt:item.createdAt,status:ttsRequested?'pending':'published'};
  item.messageId=message.id;const messages=getMessages(stream);messages.push(message);
  if(messages.length>400)messages.splice(0,messages.length-400);
  if(!ttsRequested)credit(item,stream);
  save();json(res,201,{ok:true,status:item.status,starsLeft:u.state.stars,
   note:ttsRequested?'TTS request awaits host approval. Declined requests are refunded.':'Gift recorded in demo earnings ledger.'});return true;
 }
 return {handle,handleGet,feed,earnings,onStreamEnd,settleDue,expireStale,gifts};
};
