'use strict';
/* Optional real Web Push for USA50 live announcements.
 * Requires VAPID keys in Railway. No push attempt without fan opt-in. */
module.exports=function createPush({db,save,now,userFrom,json,fail}){
 db.webPushSubscriptions ||= {};
 let push=null;
 const publicKey=String(process.env.USA50_VAPID_PUBLIC_KEY||'');
 const privateKey=String(process.env.USA50_VAPID_PRIVATE_KEY||'');
 const subject=String(process.env.USA50_VAPID_SUBJECT||'https://usa50.co');
 try{
  if(publicKey&&privateKey){
   push=require('web-push');
   push.setVapidDetails(subject,publicKey,privateKey);
  }
 }catch(err){console.warn('Web Push disabled: invalid VAPID configuration',String(err.message));push=null;}
 const configured=()=>!!push;
 function endpointOK(value){
  try{
   if(typeof value!=='string'||value.length>650)return false;
   const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return false;
   const host=url.hostname.toLowerCase();
   return host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||
    host==='web.push.apple.com'||host.endsWith('.push.apple.com')||
    host==='wns2-pn1p.notify.windows.com'||host.endsWith('.notify.windows.com');
  }catch{return false;}
 }
 function info(){return {configured:configured(),publicKey:configured()?publicKey:null,requiresConsent:true};}
 function handleGet(req,res,path){if(path==='/api/push/config'){json(res,200,info());return true;}return false;}
 function handle(req,res,path,data){
  if(path!=='/api/push/subscribe'&&path!=='/api/push/unsubscribe')return false;
  const user=userFrom(req);if(!user){fail(res,401,'Sign in required for live alerts.');return true;}
  const endpoint=String(data?.endpoint||data?.subscription?.endpoint||'');
  if(path==='/api/push/unsubscribe'){
   const list=db.webPushSubscriptions[user.id]||[];
   db.webPushSubscriptions[user.id]=list.filter(s=>s.endpoint!==endpoint);save();
   json(res,200,{ok:true});return true;
  }
  if(!configured()){fail(res,503,'Web Push needs VAPID configuration. In-app alerts still work.');return true;}
  const subscription=data.subscription;
  const p256dh=String(subscription?.keys?.p256dh||''),auth=String(subscription?.keys?.auth||'');
  if(!endpointOK(endpoint)||p256dh.length<50||p256dh.length>160||auth.length<15||auth.length>160){
   fail(res,400,'Invalid browser push subscription.');return true;
  }
  const list=db.webPushSubscriptions[user.id]||(db.webPushSubscriptions[user.id]=[]);
  const existing=list.findIndex(x=>x.endpoint===endpoint);
  if(existing>=0)list.splice(existing,1);
  list.unshift({endpoint,keys:{p256dh,auth},createdAt:now()});
  if(list.length>5)list.splice(5);
  save();json(res,200,{ok:true});return true;
 }
 async function broadcastLive(userIds,title,streamId){
  if(!configured())return {attempted:0,delivered:0};
  const payload=JSON.stringify({type:'livestream-live',title,body:'Tap to watch on USA50 ♡',streamId,
   url:'/?open=events&streamId='+encodeURIComponent(streamId)});
  const tasks=[];
  for(const uid of [...new Set(userIds)]){
   for(const subscription of db.webPushSubscriptions[uid]||[])tasks.push({uid,subscription});
  }
  let delivered=0,stale=0;
  for(let i=0;i<tasks.length;i+=20){
   const results=await Promise.allSettled(tasks.slice(i,i+20).map(async ({uid,subscription})=>{
    try{await push.sendNotification(subscription,payload,{TTL:3600,urgency:'high'});delivered++;}
    catch(err){
     if(err.statusCode===404||err.statusCode===410){
      const list=db.webPushSubscriptions[uid]||[];
      db.webPushSubscriptions[uid]=list.filter(x=>x.endpoint!==subscription.endpoint);stale++;
     }else console.warn('Web Push delivery failed',err.statusCode||err.message);
    }
   }));
  }
  if(stale)save();
  return {attempted:tasks.length,delivered};
 }
 return {handle,handleGet,broadcastLive,info};
};
