'use strict';
/* Persistent, per-account in-app notification center.  No real email or push delivery. */
module.exports=function makeNotifications({db,save,id,now,userFrom,json,fail}){
 db.userNotifications ||= {};
 db.notificationMilestones ||= {ranks:{}};
 // Preserve previous social-heart messages from the older Social notification store.
 for(const [uid,items] of Object.entries(db.social?.notifications||{})){
  const inbox=db.userNotifications[uid]||(db.userNotifications[uid]=[]);
  const existing=new Set(inbox.map(x=>x.id));
  for(const n of items||[])if(n.id&&!existing.has(n.id)){
   inbox.push({id:n.id,type:n.type||'idol-heart',text:String(n.text||''),createdAt:n.createdAt||now(),read:!!n.read,postId:n.postId||null});
   existing.add(n.id);
  }
 }
 function push(uid,type,text,meta={}){
  if(!db.users?.[uid])return null;
  const inbox=db.userNotifications[uid]||(db.userNotifications[uid]=[]);
  const key=meta.key?String(meta.key).slice(0,200):null;
  if(key&&inbox.some(n=>n.key===key))return null;
  const item={id:id(),type:String(type||'general'),text:String(text||'').slice(0,350),
   createdAt:now(),read:false,...(key?{key}:{}),
   ...(meta.postId?{postId:String(meta.postId)}:{}),
   ...(meta.drawId?{drawId:String(meta.drawId)}:{})};
  inbox.unshift(item);if(inbox.length>120)inbox.length=120;save();return item;
 }
 function info(user){
  const notifications=user?(db.userNotifications[user.id]||[]).slice(0,100):[];
  return {items:notifications,unread:notifications.filter(n=>!n.read).length};
 }
 function handle(req,res,endpoint,data){
  if(!endpoint.startsWith('/api/notifications/'))return false;
  const user=userFrom(req);
  if(!user){fail(res,401,'Sign in to view your mail.');return true;}
  const inbox=db.userNotifications[user.id]||(db.userNotifications[user.id]=[]);
  if(endpoint==='/api/notifications/read'){
   if(data.id){const item=inbox.find(n=>n.id===String(data.id));if(!item)return fail(res,404,'Notification not found.'),true;item.read=true;}
   else for(const n of inbox)n.read=true;
   save();json(res,200,{ok:true,unread:inbox.filter(n=>!n.read).length});return true;
  }
  fail(res,404,'Notification action not found.');return true;
 }
 function rank(uid,position){
  const snap=db.notificationMilestones.ranks;
  const before=snap[uid];
  if(before===position)return;
  snap[uid]=position;
  if(!position){save();return;}
  if(before===undefined){save();return;} // establish baseline without historic false congratulations
  if(before===null||position<before)push(uid,'fan-rank',before?'You climbed to fan rank #'+position+'!':'You entered the fan rankings at #'+position+'!',{key:'rank-'+uid+'-'+position+'-'+now()});
  else save();
 }
 return {push,info,handle,rank};
};
