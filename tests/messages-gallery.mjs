import {strict as assert} from 'node:assert';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeRoles=require('../role-features.js');
const makeSocial=require('../social-hub.js');
const now=()=>new Date().toISOString();
const db={users:{
 f1:{id:'f1',role:'fan',displayName:'Fan One',state:{fancallTickets:0,pullPoints:0}},
 f2:{id:'f2',role:'fan',displayName:'Fan Two',state:{fancallTickets:0,pullPoints:0}}
 },posts:[],idolPosts:[{id:'p1',idolId:'arielle',body:'Hello USA50 fans',createdAt:'2026-11-12T10:00:00.000Z'}],fanReplies:[],fansites:[]};
let serial=0;
const apiResult=(res,status,body)=>{res.status=status;res.data=body;return true;};
const fail=(res,status,error)=>apiResult(res,status,{error});
const common={db,save:()=>{},id:()=>String(++serial),now,bodyText:(v,n)=>String(v||'').trim().slice(0,n),json:apiResult,fail,userFrom:req=>db.users[req.id]||null};
const roles=makeRoles({...common,hashPass:x=>x,checkPass:(x,y)=>x===y,adminFrom:()=>null});
function sendRole(user,endpoint,data){const res={};roles.handle({id:user},res,endpoint,data);return res;}
assert.ok(roles.info(db.users.f1).unreadCounts.arielle>0);
assert.ok(roles.info(db.users.f2).unreadCounts.arielle>0);
assert.equal(sendRole('f1','/api/messages/mark-read',{idolId:'arielle'}).status,200);
assert.equal(roles.info(db.users.f1).unreadCounts.arielle||0,0);
assert.ok(roles.info(db.users.f2).unreadCounts.arielle>0);
assert.equal(sendRole('f1','/api/messages/mark-read',{idolId:'unknown'}).status,400);
assert.equal(sendRole('f1','/api/messages/pin',{idolId:'arielle'}).data.pinned,true);
assert.ok(roles.info(db.users.f1).pinnedIds.includes('arielle'));
assert.equal(roles.info(db.users.f2).pinnedIds.length,0);
assert.equal(sendRole('f1','/api/messages/pin',{idolId:'arielle'}).data.pinned,false);
assert.equal(roles.info(db.users.f1).pinnedIds.length,0);
db.idolPosts.push({id:'p2',idolId:'arielle',body:'Fresh idol update',createdAt:'2099-01-01T00:00:00.000Z'});
assert.equal(roles.info(db.users.f1).unreadCounts.arielle,1);
const social=makeSocial(common);
function sendSocial(endpoint,data){const res={};social.handlePost({id:'f1'},res,endpoint,data);return res;}
let result=sendSocial('/api/social/post',{caption:'My USA50 fan edit from TikTok',url:'https://vt.tiktok.com/ZSBabc123/?_t=8.1'});
assert.equal(result.status,201);
assert.equal(social.info(db.users.f1).posts.find(x=>x.id===result.data.postId).embedKind,'link');
result=sendSocial('/api/social/post',{caption:'My USA50 Instagram edit',url:'https://www.instagram.com/share/reel/BAaBcD12345/?igsh=test'});
assert.equal(result.status,201);
result=sendSocial('/api/social/post',{caption:'Invalid link should fail',url:'https://evil-instagram.com/reel/BAaBcD12345/'});
assert.equal(result.status,400);
console.log('USA50 inbox and social share-link tests passed');
