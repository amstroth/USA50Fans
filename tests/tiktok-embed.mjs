import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeSocial=require('../social-hub.js');
const user={id:'fan1',displayName:'USA50 Test Fan',role:'fan',state:{pullPoints:0,fancallTickets:0}};
const db={users:{fan1:user},posts:[],fansites:[]};
const social=makeSocial({db,save:()=>{},id:()=>String(db.social.posts.length+1),now:()=>new Date().toISOString(),bodyText:(v,max)=>String(v||'').trim().slice(0,max),json:(res,status,data)=>{res.status=status;res.data=data;return true},fail:(res,status,error)=>{res.status=status;res.data={error};return true},userFrom:()=>user});
const res={};
social.handlePost({},res,'/api/social/post',{caption:'USA50 fan fancam from TikTok',url:'https://vt.tiktok.com/ZShort1/'});
assert.equal(res.status,201);
const postId=res.data.postId;
assert.equal(social.info(user).posts.find(x=>x.id===postId).embedKind,'link');
const previousFetch=globalThis.fetch;
let requested='';
globalThis.fetch=async (url,opts)=>{
 requested=String(url);
 assert.equal(new URL(requested).hostname,'www.tiktok.com');
 assert.equal(new URL(requested).pathname,'/oembed');
 return {ok:true,json:async()=>({embed_product_id:'7512345678901234567',author_url:'https://www.tiktok.com/@usa50fan'})};
};
try{
 const result=await social.resolveEmbed(postId);
 assert.equal(result.embedKind,'tiktok');
 assert.equal(result.embedId,'7512345678901234567');
 assert.ok(result.url.includes('/video/7512345678901234567'));
 assert.equal((await social.resolveEmbed(postId)).embedKind,'tiktok');
 assert.ok(requested.includes('oembed'));
}finally{globalThis.fetch=previousFetch}
console.log('TikTok short link resolves to official playable player ID');
