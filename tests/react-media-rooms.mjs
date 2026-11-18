import assert from 'node:assert/strict';
import makeFancalls from '../fancall-lottery.js';
import makeRTC from '../fancall-rtc.js';

const users={
 fan:{id:'fan',role:'fan',displayName:'Fan',state:{}},
 outsider:{id:'outsider',role:'fan',displayName:'Outsider',state:{}},
 idol:{id:'idol',role:'idol',idolId:'arielle',displayName:'Arielle',state:{}},
 otherIdol:{id:'otherIdol',role:'idol',idolId:'z',displayName:'Z',state:{}},
 management:{id:'management',role:'management',displayName:'Management',state:{}}
};
const db={users,fancallLottery:{draws:[{
 id:'lottery1',title:'Arielle 1:1 Test',description:'Free test lottery',
 closesAt:'2026-01-01T00:00:00Z',startsAt:'2025-12-01T00:00:00Z',
 winnerCount:1,idolId:'idol',status:'open',entries:['fan'],
 winners:[],createdAt:'2025-12-01T00:00:00Z'
}],sessions:[]}};
const notices=[];
const context={
 db,save(){},id(){return 'generated_session';},now(){return new Date().toISOString();},
 userFrom:req=>req.user,
 notify:(id,type,text)=>notices.push({id,type,text}),
 json:(res,status,payload)=>{res.status=status;res.payload=payload;},
 fail:(res,status,error)=>{res.status=status;res.error=error;}
};
const fancalls=makeFancalls(context),rtc=makeRTC(context);
function invoke(method,user,endpoint,body={},url){
 const response={};const req={user};
 const handled=method(req,response,endpoint,body,url);
 assert.equal(handled,true);
 return response;
}
const draw=invoke(fancalls.respond,users.management,'/api/fancalls/draw',{drawId:'lottery1'});
assert.equal(draw.status,200);
assert.equal(draw.payload.winners,1);
assert.equal(db.fancallLottery.sessions.length,1);
assert.equal(notices.length,1);
assert.equal(notices[0].type,'fancall-won');
const room=db.fancallLottery.sessions[0];
const noHost=invoke(fancalls.respond,users.otherIdol,'/api/fancalls/session',{sessionId:room.id,action:'start'});
assert.equal(noHost.status,403,'Unassigned idol cannot control this call');
const waiting=invoke(rtc.endpoint,users.fan,'/api/fancalls/rtc/join',{sessionId:room.id});
assert.equal(waiting.status,409,'Fan cannot join before host starts');
const started=invoke(fancalls.respond,users.idol,'/api/fancalls/session',{sessionId:room.id,action:'start'});
assert.equal(started.status,200);
const outsider=invoke(rtc.endpoint,users.outsider,'/api/fancalls/rtc/join',{sessionId:room.id});
assert.equal(outsider.status,403,'Non-winner cannot join fancall');
const strangerIdol=invoke(rtc.endpoint,users.otherIdol,'/api/fancalls/rtc/join',{sessionId:room.id});
assert.equal(strangerIdol.status,403,'Unassigned idol cannot enter call');
const a=invoke(rtc.endpoint,users.fan,'/api/fancalls/rtc/join',{sessionId:room.id});
const b=invoke(rtc.endpoint,users.idol,'/api/fancalls/rtc/join',{sessionId:room.id});
const c=invoke(rtc.endpoint,users.management,'/api/fancalls/rtc/join',{sessionId:room.id});
assert.equal(a.status,200);
assert.equal(b.status,200);
assert.equal(c.status,200);
assert.equal(a.payload.role,'fan');
assert.equal(b.payload.role,'host');
assert.equal(c.payload.role,'observer');
const invalid=invoke(rtc.endpoint,users.fan,'/api/fancalls/rtc/signal',{sessionId:room.id,to:'outsider',signal:{type:'offer',sdp:'v=0'}});
assert.equal(invalid.status,403,'Fans cannot signal outside call participants');
const valid=invoke(rtc.endpoint,users.fan,'/api/fancalls/rtc/signal',{sessionId:room.id,to:'idol',signal:{type:'offer',sdp:'v=0'}});
assert.equal(valid.status,200);
const statusUrl=new URL('http://localhost/api/fancalls/rtc/poll?sessionId='+room.id+'&after=0');
const poll=invoke(rtc.endpoint,users.idol,'/api/fancalls/rtc/poll',{},statusUrl);
assert.equal(poll.status,200);
assert.equal(poll.payload.signals.length,1);
assert.equal(poll.payload.signals[0].signal.type,'offer');
const finish=invoke(fancalls.respond,users.idol,'/api/fancalls/session',{sessionId:room.id,action:'next'});
assert.equal(finish.status,200);
assert.equal(finish.payload.status,'complete');
const post=invoke(rtc.endpoint,users.fan,'/api/fancalls/rtc/poll',{},statusUrl);
assert.equal(post.status,409,'Closed call must revoke active WebRTC access');
const visibleToWinner=fancalls.info(users.fan).sessions.find(s=>s.id===room.id);
const visibleToOutsider=fancalls.info(users.outsider).sessions.find(s=>s.id===room.id);
assert.ok(visibleToWinner);
assert.equal(visibleToOutsider,undefined,'Session details cannot leak to outsiders');
console.log('USA50 React fancall room tests passed: assignment, queue, permissions, signaling, observer and revocation.');
