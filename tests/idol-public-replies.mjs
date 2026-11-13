import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeRoles=require('../role-features.js');
let sequence=0,tick=0;
const now=()=>new Date(Date.parse('2026-11-13T18:00:00Z')+(++tick)*1000).toISOString();
const admin={id:'m',role:'admin',displayName:'Management',state:{}};
const arielle={id:'a',role:'idol',idolId:'arielle',displayName:'Arielle',state:{}};
const jaylene={id:'j',role:'idol',idolId:'jaylene',displayName:'Jaylene',state:{}};
const locked={id:'x',role:'idol',idolId:'kellie',displayName:'Kellie',mustChangePassword:true,state:{}};
const fanA={id:'f1',role:'fan',displayName:'Fan One',state:{subscriberPreview:true}};
const fanB={id:'f2',role:'fan',displayName:'Fan Two',state:{subscriberPreview:false}};
const db={users:{m:admin,a:arielle,j:jaylene,x:locked,f1:fanA,f2:fanB},idolPosts:[],fanReplies:[],idolReplies:[]};
const roles=makeRoles({db,save:()=>{},id:()=>String(++sequence),hashPass:x=>x,checkPass:(a,b)=>a===b,
 adminFrom:()=>null,now,bodyText:(v,max)=>String(v||'').trim().slice(0,max),
 userFrom:r=>db.users[r.id]||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}});
function send(user,endpoint,data){const res={};roles.handle({id:user},res,endpoint,data);return res;}
const original=send('a','/api/idol/post',{body:'Hello from Arielle'});
assert.equal(original.status,201);
const postId=original.body.post.id;
assert.equal(send('f1','/api/idol/public-reply',{postId,text:'Fan cannot reply publicly'}).status,403);
assert.equal(send('m','/api/idol/public-reply',{postId,text:'Admin cannot impersonate idols'}).status,403);
assert.equal(send('x','/api/idol/public-reply',{postId,text:'Temporary password'}).status,403);
assert.equal(send('a','/api/idol/public-reply',{postId,text:'Own post'}).status,400);
assert.equal(send('j','/api/idol/public-reply',{postId:'invalid',text:'Missing post'}).status,404);
const answer=send('j','/api/idol/public-reply',{postId,text:'Hi Arielle! We are ready for rehearsals ♡'});
assert.equal(answer.status,201);
assert.equal(answer.body.reply.fromId,'jaylene');
assert.equal(answer.body.reply.idolId,'arielle');
for(const u of [fanA,fanB,arielle,jaylene,admin]){
 const info=roles.info(u);
 assert.equal(info.idolReplies.length,1);
 assert.equal(info.idolReplies[0].text,'Hi Arielle! We are ready for rehearsals ♡');
 assert.equal(info.idolReplies[0].fromName,'Jaylene');
}
assert.ok(roles.info(fanA).unreadCounts.arielle>=2,'public idol reply increments unread in original thread');
assert.equal(send('f1','/api/messages/mark-read',{idolId:'arielle'}).status,200);
assert.equal(roles.info(fanA).unreadCounts.arielle||0,0);
assert.ok(roles.info(fanB).unreadCounts.arielle>0,'fan read state remains private');
const privateReply=send('f1','/api/messages/fan-reply',{postId,text:'I love this interaction'});
assert.equal(privateReply.status,201);
assert.equal(roles.info(fanA).replies.length,1);
assert.equal(roles.info(fanB).replies.length,0);
assert.equal(roles.info(jaylene).replies.length,0,'replying idol may not read another idol private fan inbox');
assert.equal(roles.info(arielle).replies.length,1);
const privateResponse=send('a','/api/idol/reply',{replyId:privateReply.body.reply.id,text:'Thank you!'});
assert.equal(privateResponse.status,200);
assert.equal(roles.info(fanA).replies[0].idolResponse.text,'Thank you!');
assert.equal(roles.info(fanB).replies.length,0);
assert.equal(roles.info(jaylene).idolReplies.length,1);
const bad=send('j','/api/idol/public-reply',{postId,text:' '});
assert.equal(bad.status,400);
const secondPost=send('j','/api/idol/post',{body:'New update from Jaylene'});
assert.equal(secondPost.status,201);
assert.equal(send('a','/api/idol/public-reply',{postId:secondPost.body.post.id,text:'Congrats Jaylene!'}).status,201);
assert.equal(roles.info(fanA).idolReplies.length,2);
console.log('Public idol-to-idol replies are visible to all; fan private replies stay isolated.');
