'use strict';
/* Free demo fancall draws and moderated waiting-room queue.
 * Video transport intentionally NOT active: session state is only a prototype. */
const crypto=require('node:crypto');
module.exports=function makeFancalls({db,save,id,now,json,fail,userFrom,notify=()=>{}}){
 db.fancallLottery ||= {draws:[],sessions:[]};
 const state=db.fancallLottery;
 const role=u=>u?.role||'fan';
 const staff=u=>['admin','management'].includes(role(u));
 const host=u=>staff(u)||role(u)==='idol';
 const viewDraw=(d,u)=>{
   const entrants=d.entries||[],n=entrants.length,w=d.winners||[],joined=!!u&&entrants.includes(u.id);
   return {id:d.id,title:d.title,description:d.description,startsAt:d.startsAt,closesAt:d.closesAt,
      winnerCount:d.winnerCount,status:d.status,entryCount:n,joined,
      currentEstimatedChance:n?Math.min(100,100*Math.min(d.winnerCount,n)/n):null,
      myWinner:!!u&&w.includes(u.id),isWinner:!!u&&w.includes(u.id),
      mySession:!!u?state.sessions.find(s=>s.drawId===d.id&&s.winnerIds.includes(u.id))?.id||null:null,
      winnersDrawn:w.length,disclaimer:'Snapshot only: based on the current number of entries. Your actual chance at drawing may change as people enter or withdraw. One free entry per account. Demo only.'};
 };
 function info(u){
  return {draws:state.draws.map(d=>viewDraw(d,u)),sessions:state.sessions.filter(s=>staff(u)||host(u)||s.winnerIds.includes(u?.id)).map(s=>({
   id:s.id,drawId:s.drawId,title:s.title,status:s.status,queue:s.winnerIds.map((uid,index)=>({position:index+1,displayName:db.users[uid]?.displayName||'Fan',isMe:uid===u?.id,userId:staff(u)||host(u)?uid:undefined,done:index<s.cursor,active:index===s.cursor})),
   cursor:s.cursor,activeUserId:s.winnerIds[s.cursor]||null,activeName:db.users[s.winnerIds[s.cursor]]?.displayName||null,
   isMyTurn:s.winnerIds[s.cursor]===u?.id,isMyWinner:s.winnerIds.includes(u?.id),
   canHost:host(u),canManage:staff(u),breakMode:s.status==='break'}))};
 }
 function respond(req,res,ep,data){
  if(!ep.startsWith('/api/fancalls/'))return false;
  const u=userFrom(req);if(!u){fail(res,401,'Sign in required.');return true;}
  if(u.mustChangePassword){fail(res,403,'Change your temporary password first.');return true;}
  if(ep==='/api/fancalls/create'){
   if(!staff(u))return fail(res,403,'Management only.'),true;
   const title=String(data.title||'').trim().slice(0,90),description=String(data.description||'').trim().slice(0,450),winnerCount=Number(data.winnerCount);
   const closesAt=String(data.closesAt||'');
   if(title.length<3||!Number.isInteger(winnerCount)||winnerCount<1||winnerCount>100||!Number.isFinite(Date.parse(closesAt))||Date.parse(closesAt)<=Date.now())return fail(res,400,'Provide a title, future closing date, and 1–100 winners.'),true;
   const d={id:id(),title,description,startsAt:now(),closesAt:new Date(closesAt).toISOString(),winnerCount,status:'open',entries:[],winners:[],createdBy:u.id};
   state.draws.unshift(d);save();return json(res,201,{ok:true,draw:viewDraw(d,u)}),true;
  }
  const d=state.draws.find(x=>x.id===data.drawId);
  if(ep==='/api/fancalls/join'||ep==='/api/fancalls/withdraw'){
   if(!d)return fail(res,404,'Lottery not found.'),true;
   if(d.status!=='open'||Date.parse(d.closesAt)<=Date.now())return fail(res,409,'Entries are closed.'),true;
   d.entries ||= [];const idx=d.entries.indexOf(u.id);
   if(ep.endsWith('join')){if(idx<0)d.entries.push(u.id);}
   else if(idx>=0)d.entries.splice(idx,1);
   save();return json(res,200,{ok:true,draw:viewDraw(d,u)}),true;
  }
  if(ep==='/api/fancalls/draw'){
   if(!staff(u))return fail(res,403,'Management only.'),true;
   if(!d||d.status!=='open')return fail(res,409,'Lottery is not open.'),true;
   if(Date.parse(d.closesAt)>Date.now())return fail(res,409,'Wait until the published close time.'),true;
   const pool=[...new Set(d.entries||[])];
   for(let i=pool.length-1;i>0;i--){const j=crypto.randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
   d.winners=pool.slice(0,Math.min(d.winnerCount,pool.length));d.status='drawn';d.drawnAt=now();
   for(const uid of pool){const won=d.winners.includes(uid);notify(uid,won?'fancall-won':'fancall-lost',won?'You won the '+d.title+' fancall lottery! Open Events to join the waiting room.':'The '+d.title+' fancall lottery has ended. You were not selected this time.',{drawId:d.id,key:'fancall:'+d.id+':'+uid});}
   if(d.winners.length)state.sessions.push({id:id(),drawId:d.id,title:d.title,winnerIds:d.winners,cursor:0,status:'waiting',history:[],createdAt:now()});
   save();return json(res,200,{ok:true,winners:d.winners.length}),true;
  }
  if(ep==='/api/fancalls/session'){
   const s=state.sessions.find(x=>x.id===data.sessionId);
   if(!s)return fail(res,404,'Call session not found.'),true;
   if(!host(u))return fail(res,403,'Idol or management only.'),true;
   const action=String(data.action||'');
   if(action==='start'||action==='resume'){
     if(s.cursor>=s.winnerIds.length)return fail(res,409,'Queue completed.'),true;
     s.status='live';s.history.push({at:now(),action,userId:u.id});
   }else if(action==='break'){
     s.status='break';s.history.push({at:now(),action,userId:u.id});
   }else if(action==='next'||action==='end-early'){
     if(s.status!=='live'&&s.status!=='break')return fail(res,409,'No active call to advance.'),true;
     s.history.push({at:now(),action,userId:u.id,finishedUserId:s.winnerIds[s.cursor]});
     s.cursor++;s.status=s.cursor>=s.winnerIds.length?'complete':'break';
   }else return fail(res,400,'Unsupported action.'),true;
   save();return json(res,200,{ok:true,status:s.status,cursor:s.cursor}),true;
  }
  return fail(res,404,'Unknown fancall action.'),true;
 }
 return {info,respond};
};
