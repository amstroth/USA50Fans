import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeSocial=require('../social-hub.js');
const db={
 users:{
  fan0:{id:'fan0',displayName:'First Fan',role:'fan',state:{pullPoints:0,fancallTickets:0}},
  fan1:{id:'fan1',displayName:'Second Fan',role:'fan',state:{pullPoints:0,fancallTickets:0}},
  fan2:{id:'fan2',displayName:'Third Fan',role:'fan',state:{pullPoints:0,fancallTickets:0}},
  idol:{id:'idol',displayName:'Idol Member',role:'idol',idolId:'arielle',state:{pullPoints:0,fancallTickets:0}},
  admin:{id:'admin',displayName:'Management',role:'admin',state:{pullPoints:0,fancallTickets:0}},
 },
 posts:[],fansites:[],userNotifications:{}
};
let seq=0,saves=0;
const config={db,save:()=>saves++,id:()=>String(++seq),now:()=>new Date().toISOString(),
 bodyText:(v,max)=>String(v||'').trim().slice(0,max),
 userFrom:req=>db.users[req.uid]||null,
 notify:(uid,type,text,meta)=>{(db.userNotifications[uid]||=([])).push({type,text,...meta});},
 json:(res,status,body)=>{res.status=status;res.body=body;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}};
const social=makeSocial(config);
async function send(uid,ep,body){const res={};await social.handlePost({uid},res,ep,body);return res;}
const url='https://www.instagram.com/reel/ABCDE123456/';
const created=await send('fan0','/api/social/post',{caption:'USA50 debut stage fancam',url});
assert.equal(created.status,201);
const main=created.body.postId;
assert.equal(social.info(db.users.fan0).myProfile.fanXP,15,'publishing grants 15 Fan XP');
assert.equal(social.commentsFor(main,null).total,0);
assert.equal((await send('fan1','/api/social/comment',{postId:main,text:'  The dance is incredible!  '})).status,201);
const second=await send('idol','/api/social/comment',{postId:main,text:'Thank you ♡'});
assert.equal(second.status,201);
assert.equal(social.commentsFor(main,null).total,2);
assert.equal(social.info(db.users.fan0).posts.find(x=>x.id===main).commentCount,2);
assert.equal(social.commentsFor(main,db.users.fan0).comments[0].canDelete,true,'post owner may moderate comments');
assert.equal(social.commentsFor(main,db.users.fan2).comments[0].canDelete,false,'other fan may not moderate comments');
assert.equal((await send('fan2','/api/social/comment-delete',{postId:main,commentId:second.body.commentId})).status,403);
assert.equal((await send('fan0','/api/social/comment-delete',{postId:main,commentId:second.body.commentId})).status,200);
assert.equal(social.commentsFor(main,null).total,1);
assert.equal((await send('idol','/api/social/comment',{postId:main,text:'Thank you again ♡'})).status,201);
assert.equal((await send('fan0','/api/social/comment',{postId:main,text:'  '})).status,400);
assert.equal((await send('fan0','/api/social/comment',{postId:main,text:'x'.repeat(501)})).status,400);
assert.equal((await send('fan1','/api/social/vote',{postId:main,vote:1})).status,200);
assert.equal((await send('idol','/api/social/heart',{postId:main})).status,200);
assert.equal(social.info(db.users.fan0).myProfile.fanXP,167,'15 post + 2 vote + 150 idol heart XP');
assert.equal(db.userNotifications.fan0.length,1);
const repost=await send('fan1','/api/social/repost',{postId:main});
assert.equal(repost.status,201);
const repostId=repost.body.postId;
assert.equal((await send('fan2','/api/social/vote',{postId:repostId,vote:1})).status,200);
assert.equal((await send('idol','/api/social/heart',{postId:repostId})).status,200);
assert.equal((await send('fan2','/api/social/comment',{postId:repostId,text:'Reposted!'})).status,201);
assert.equal(social.info(db.users.fan1).myProfile.fanXP,157,'5 repost + 2 votes + 150 heart XP');
assert.equal((await send('fan2','/api/social/delete',{postId:main,confirm:true})).status,403);
assert.equal((await send('fan0','/api/social/delete',{postId:main})).status,400,'delete requires explicit confirmation');
assert.equal(social.info(db.users.fan0).posts.length,2);
const gone=await send('fan0','/api/social/delete',{postId:main,confirm:true});
assert.equal(gone.status,200);
assert.equal(gone.body.removedPostXP,15);
assert.equal(gone.body.removedVoteXP,2);
assert.equal(gone.body.removedHearts,1);
assert.equal(gone.body.removedHeartXP,150);
assert.equal(gone.body.removedFanXP,167);
assert.equal(gone.body.deletedCount,2,'reposts cannot survive deletion of their source');
assert.equal(social.info(db.users.fan0).myProfile.fanXP,0,'author XP recalculated after permanent deletion');
assert.equal(social.info(db.users.fan1).myProfile.fanXP,0,'repost XP and hearts removed');
assert.equal(db.social.posts.length,0);
assert.equal(db.social.idolHearts[main],undefined);
assert.equal(db.social.idolHearts[repostId],undefined);
assert.equal(db.social.votes[main],undefined);
assert.equal(db.social.votes[repostId],undefined);
assert.equal(db.social.comments[main],undefined);
assert.equal(db.social.comments[repostId],undefined);
assert.equal(db.userNotifications.fan0.length,0,'heart reward notification removed');
assert.equal(db.userNotifications.fan1.length,0,'repost heart notification removed');
assert.equal(social.commentsFor(main,null),null);
assert.equal((await send('fan1','/api/social/comment',{postId:main,text:'Too late'})).status,404);
assert.equal((await send('fan0','/api/social/delete',{postId:main,confirm:true})).status,404,'cannot delete twice');
const secondPost=await send('fan0','/api/social/post',{caption:'New official edit from rehearsal',url:'https://www.instagram.com/reel/ZYXWV987654/'});
assert.equal(secondPost.status,201);
assert.equal(social.info(db.users.fan0).myProfile.fanXP,15);
assert.equal((await send('admin','/api/social/delete',{postId:secondPost.body.postId,confirm:true})).status,200);
assert.equal(social.info(db.users.fan0).myProfile.fanXP,0,'management deletion also reverses rewards');
assert.ok(saves>0);
console.log('Social comments and permanent deletion tests passed: access control, comments, repost cascade, idol hearts, Fan XP reversal, and notifications.');
