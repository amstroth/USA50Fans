import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeSocial=require('../social-hub.js');
const db={users:{},posts:[],fansites:[]};
let seq=0;
for(let n=0;n<102;n++){
 const uid='fan'+n;
 db.users[uid]={id:uid,displayName:'Fan '+n,email:'f'+n+'@example.com',state:{pullPoints:0,fancallTickets:0},role:'fan'};
}
const now=()=>new Date().toISOString();
const social=makeSocial({
 db,save:()=>{},id:()=>String(++seq),bodyText:(value,max)=>String(value||'').trim().slice(0,max),
 now,userFrom:req=>db.users[req.uid]||null,
 json:(res,status,body)=>{res.status=status;res.body=body;return true;},
 fail:(res,status,message)=>{res.status=status;res.body={error:message};return true;}
});
function send(uid,endpoint,body){const res={};social.handlePost({uid},res,endpoint,body);return res;}
const posted=send('fan0','/api/social/post',{caption:'Original USA50 edit I made ♡',url:'https://www.tiktok.com/@fans/video/7341234567890123456'});
assert.equal(posted.status,201);
assert.equal(posted.body.pullPointsAwarded,50);
const postId=posted.body.postId;
for(let n=1;n<=99;n++)assert.equal(send('fan'+n,'/api/social/vote',{postId,vote:1}).status,200);
assert.equal(db.users.fan0.state.fancallTickets,0);
let result=send('fan100','/api/social/vote',{postId,vote:1});
assert.equal(result.status,200);
assert.equal(result.body.ticketMilestonesAwarded,1);
assert.equal(db.users.fan0.state.fancallTickets,1);
result=send('fan100','/api/social/vote',{postId,vote:1});
assert.equal(result.body.upvotes,99);
result=send('fan100','/api/social/vote',{postId,vote:1});
assert.equal(result.body.upvotes,100);
assert.equal(result.body.ticketMilestonesAwarded,0);
assert.equal(db.users.fan0.state.fancallTickets,1);
assert.equal(send('fan0','/api/social/vote',{postId,vote:1}).status,400);
const snapshot=social.info(db.users.fan0);
assert.equal(snapshot.rankings[0].tier,'UltraFan');
assert.equal(snapshot.myProfile.fanXP,215);
console.log('Social reward milestone tests passed');
