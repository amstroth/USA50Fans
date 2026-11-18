import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeSocial=require('../social-hub.js');
let clock='2026-11-18T21:00:00.000Z',next=0;
const users=Object.fromEntries(['fan','fan2','reposter','idol','admin'].map(uid=>[uid,{
 id:uid,displayName:uid,role:uid==='idol'?'idol':uid==='admin'?'admin':'fan',
 state:{pullPoints:0,fancallTickets:0,unlockedRings:['classic']}
}]));
const db={users,posts:[],fansites:[]};
const options={db,save:()=>{},id:()=>String(++next),now:()=>clock,
 bodyText:(value,n)=>String(value||'').trim().slice(0,n),userFrom:req=>users[req.uid]||null,
 json:(res,status,body)=>{res.status=status;res.body=body;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}};
let service=makeSocial(options);
const publish=(uid,i)=>send(uid,'/api/social/post',{caption:'Fan edit and stage moment '+i,url:'https://www.instagram.com/p/ABCDE'+String(i).padStart(6,'0')+'/'});
async function send(uid,endpoint,body){
 const res={};await service.handlePost({uid},res,endpoint,body);return res;
}
const exact="Woah slow down there. Only 5 posts are allowed per day. Make sure you're only posting your own content. <#3";
const created=[];
for(let i=0;i<5;i++){
 const result=await publish('fan',i);
 assert.equal(result.status,201,'fan publication #'+(i+1)+' should be accepted');
 created.push(result.body.postId);
}
assert.deepEqual(db.social.postDailyCounts.fan,{day:'2026-11-18',count:5});
const sixth=await publish('fan',5);
assert.equal(sixth.status,429);
assert.equal(sixth.body.error,exact);
assert.equal(db.social.postDailyCounts.fan.count,5);
assert.equal(service.info(users.fan).myProfile.postsCount,5);
// Edits, comments and normal social engagement do not consume another post slot.
const edit=await send('fan','/api/social/post-edit',{postId:created[0],caption:'An edited fan-created clip',url:'https://www.instagram.com/p/ABCDE000000/',category:'fan'});
assert.equal(edit.status,200);
assert.equal((await send('fan','/api/social/comment',{postId:created[0],text:'Thanks for watching!'})).status,201);
// Deleting a post does not refund the daily slot.
assert.equal((await send('fan','/api/social/delete',{postId:created[1],confirm:true})).status,200);
assert.equal(service.info(users.fan).myProfile.postsCount,4);
assert.equal((await publish('fan',6)).status,429);
assert.equal(db.social.postDailyCounts.fan.count,5);
// Counts are preserved across service restarts on the same saved database.
service=makeSocial(options);
assert.equal((await publish('fan',7)).status,429);
// Quotas are per account. Idols and management have no 5-post restriction.
assert.equal((await publish('fan2',100)).status,201);
for(let i=0;i<7;i++){
 assert.equal((await publish('idol',200+i)).status,201,'idol should not be limited');
 assert.equal((await publish('admin',300+i)).status,201,'management should not be limited');
}
assert.equal(db.social.postDailyCounts.idol,undefined);
assert.equal(db.social.postDailyCounts.admin,undefined);
// Reposts also create a public feed post and count toward the same fan quota.
for(let i=0;i<4;i++)assert.equal((await publish('reposter',400+i)).status,201);
const original=service.info(users.idol).posts.find(p=>p.authorId==='idol');
const repost=await send('reposter','/api/social/repost',{postId:original.id});
assert.equal(repost.status,201);
assert.equal(db.social.postDailyCounts.reposter.count,5);
const anotherOriginal=service.info(users.admin).posts.find(p=>p.authorId==='admin');
const cappedRepost=await send('reposter','/api/social/repost',{postId:anotherOriginal.id});
assert.equal(cappedRepost.status,429);
assert.equal(cappedRepost.body.error,exact);
assert.equal((await publish('reposter',500)).status,429);
// Deleting the source causes repost cascade, but doesn't refund the repost slot.
assert.equal((await send('idol','/api/social/delete',{postId:original.id,confirm:true})).status,200);
assert.equal((await publish('reposter',501)).status,429);
// At the next UTC date boundary, the daily count resets for fans.
clock='2026-11-19T00:00:00.000Z';
assert.equal((await publish('fan',9)).status,201);
assert.deepEqual(db.social.postDailyCounts.fan,{day:'2026-11-19',count:1});
assert.equal((await publish('reposter',502)).status,201);
assert.equal(db.social.postDailyCounts.reposter.count,1);
// Existing published posts are counted when upgrading an older database
// with no tracking ledger, instead of allowing five extra on the same day.
delete db.social.postDailyCounts.fan;
assert.equal((await publish('fan',10)).status,201,'existing current-day post counts as slot one');
assert.equal(db.social.postDailyCounts.fan.count,2);
console.log('Fan daily-post quota passed: exact popup message, 5-post cap, deletion protection, reposts, role exemptions, persistence and UTC reset.');
