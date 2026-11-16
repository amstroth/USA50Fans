import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const makeStreams=require('../event-streams.js');
const makeLiveSocial=require('../livestream-social.js');
const makeNotifier=require('../notification-center.js');
const members=[{id:'arielle',name:'Arielle',team:'NYC50'},{id:'z',name:'Z',team:'NYC50'},{id:'miu',name:'Miu',team:'LA50'}];
const users={
 fan:{id:'fan',role:'fan',displayName:'Fan account',state:{stars:1000}},
 idol:{id:'idol',role:'idol',displayName:'Arielle',idolId:'arielle',state:{}},
 other:{id:'other',role:'idol',displayName:'Miu',idolId:'miu',state:{}},
 management:{id:'management',role:'management',displayName:'Chase',state:{}}
};
let i=0,saveCount=0;
const db={users,social:{profiles:{fan:{handle:'the_usa50_fan'}}}};
const ctx={db,save:()=>{saveCount++},id:()=>String(++i),now:()=>new Date().toISOString(),
 userFrom:req=>req.user,json:(res,status,payload)=>{res.status=status;res.payload=payload},
 fail:(res,status,reason)=>{res.status=status;res.reason=reason}};
const notifier=makeNotifier(ctx);let social;
const stream=makeStreams({...ctx,members,notifyMany:notifier.pushMany,onStatus:entry=>social?.onStreamEnd(entry)});
social=makeLiveSocial({...ctx,expandHosts:stream.expandHosts});
const call=async(fn,user,endpoint,data={})=>{
 const res={};await fn({user},res,endpoint,data);return res;
};
let result=await call(stream.handle,users.management,'/api/livestreams/create',{
 title:'Arielle and Z Diary Live',startsAt:new Date().toISOString(),hosts:['arielle','z']
});
assert.equal(result.status,201);
const streamId=result.payload.stream.id;
assert.equal(result.payload.stream.playerUrl,null);
result=await call(stream.handle,users.other,'/api/livestreams/update',{
 streamId,playerUrl:'https://iframe.videodelivery.net/example'});
assert.equal(result.status,403);
result=await call(stream.handle,users.idol,'/api/livestreams/update',{
 streamId,playerUrl:'https://iframe.videodelivery.net/example'});
assert.equal(result.status,200);
result=await call(stream.handle,users.management,'/api/livestreams/status',{streamId,status:'live'});
assert.equal(result.status,200);
assert.equal(notifier.info(users.fan).items[0].text,'Arielle and Z are Live now!');
result=await call(social.handle,users.fan,'/api/livestreams/chat',{streamId,message:'Great dance!'});
assert.equal(result.status,201);
result=await call(social.handle,users.fan,'/api/livestreams/chat',{streamId,message:'Spam'});
assert.equal(result.status,429);
const giftRequest='00000000-0000-4000-8000-000000000000';
result=await call(social.handle,users.fan,'/api/livestreams/gift',{
 streamId,giftId:'heart',message:'Love this!',tts:true,requestId:giftRequest});
assert.equal(result.status,201);assert.equal(users.fan.state.stars,850);
const gift=db.liveInteraction.gifts[streamId][0];
result=await call(social.handle,users.fan,'/api/livestreams/gift',{
 streamId,giftId:'heart',message:'Love this!',tts:true,requestId:giftRequest});
assert.equal(result.payload.duplicate,true);assert.equal(users.fan.state.stars,850);
result=await call(social.handle,users.other,'/api/livestreams/gift-review',{
 streamId,giftId:gift.id,action:'approve'});
assert.equal(result.status,403);
result=await call(social.handle,users.idol,'/api/livestreams/gift-review',{
 streamId,giftId:gift.id,action:'approve'});
assert.equal(result.status,200);
assert.deepEqual(social.earnings(users.management).pendingMilliStars,{arielle:52500,z:52500});
db.liveInteraction.giftCooldowns.fan=0;
result=await call(social.handle,users.fan,'/api/livestreams/gift',{
 streamId,giftId:'heart',message:'Refund if declined',tts:true,
 requestId:'11111111-1111-4111-8111-111111111111'});
assert.equal(result.status,201);
const rejected=db.liveInteraction.gifts[streamId][1];
result=await call(social.handle,users.management,'/api/livestreams/gift-review',{
 streamId,giftId:rejected.id,action:'reject'});
assert.equal(result.status,200);assert.equal(users.fan.state.stars,850);
db.liveInteraction.giftCooldowns.fan=0;
result=await call(social.handle,users.fan,'/api/livestreams/gift',{
 streamId,giftId:'heart',message:'Refund at close',tts:true,
 requestId:'22222222-2222-4222-8222-222222222222'});
assert.equal(result.status,201);assert.equal(users.fan.state.stars,700);
result=await call(stream.handle,users.management,'/api/livestreams/status',{streamId,status:'ended'});
assert.equal(result.status,200);assert.equal(users.fan.state.stars,850);
db.liveInteraction.lastSettlementAt=new Date(Date.now()-8*86400000).toISOString();
const batch=social.settleDue();
assert.equal(batch.status,'demo-awaiting-payment-setup');
assert.equal(batch.allocations.arielle,52500);
assert.equal(batch.allocations.z,52500);
assert.equal(batch.actualCashTransferred,false);
console.log('USA50 livestream authorization, notifications, chat, gift refund, split and settlement tests passed.');
