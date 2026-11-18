import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const makeSocial=require('../social-hub.js');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-social-image-'));
const jpeg=Buffer.from('ffd8ff1122334455667788','hex');
const image='data:image/jpeg;base64,'+jpeg.toString('base64');
const fans={
 fan:{id:'fan',role:'fan',displayName:'Fan',state:{pullPoints:0,fancallTickets:0}},
 another:{id:'another',role:'fan',displayName:'Another',state:{pullPoints:0,fancallTickets:0}},
 management:{id:'management',role:'admin',displayName:'Management',state:{pullPoints:0,fancallTickets:0}}
};
const db={users:fans,posts:[],fansites:[]};
let seq=0;
const social=makeSocial({db,dataDir:folder,save:()=>{},id:()=>String(++seq),now:()=>new Date().toISOString(),
 bodyText:(s,n)=>String(s||'').trim().slice(0,n),userFrom:req=>fans[req.uid],
 json:(res,status,data)=>{res.status=status;res.data=data;return true;},
 fail:(res,status,message)=>{res.status=status;res.data={error:message};return true;}});
async function post(uid,route,body){const res={};await social.handlePost({uid},res,route,body);return res;}
function getCover(key){
 return new Promise(resolve=>{
  const res={writeHead(status,headers){this.status=status;this.headers=headers;return this;},end(bytes){this.bytes=bytes;resolve(this);}};
  social.serveThumbnail({method:'GET'},res,key);
 });
}
const originalFetch=globalThis.fetch;
try{
 const noFetch=async()=>{throw Error('Should not need a provider fetch when preview is uploaded.');};
 globalThis.fetch=noFetch;
 const first=await post('fan','/api/social/post',{caption:'My official fan edit!',url:'https://www.instagram.com/reel/ABCdEfgh123/',thumbnailDataUrl:image});
 assert.equal(first.status,201);
 const id=first.data.postId;
 let metadata=social.info(fans.fan).posts.find(x=>x.id===id);
 assert.ok(metadata.thumbnailUrl.startsWith('/api/social/thumbnail/'));
 const served=await getCover(id);assert.equal(served.status,200);assert.deepEqual(served.bytes,jpeg);
 assert.equal(served.headers['Content-Type'],'image/jpeg');
 assert.equal((await post('another','/api/social/thumbnail',{postId:id,thumbnailDataUrl:image})).status,403);
 assert.equal((await post('fan','/api/social/thumbnail',{postId:id,thumbnailDataUrl:'data:image/jpeg;base64,bad'})).status,400);
 assert.equal((await post('fan','/api/social/thumbnail',{postId:id,thumbnailDataUrl:image})).status,200);
 assert.equal((await post('management','/api/social/thumbnail',{postId:id,thumbnailDataUrl:image})).status,200);
 const repost=await post('another','/api/social/repost',{postId:id});
 assert.equal(repost.status,201);
 const shared=social.info(fans.another).posts.find(x=>x.id===repost.data.postId);
 assert.equal(shared.thumbnailUrl,metadata.thumbnailUrl.replace(/v=[^&]+/,'v='+encodeURIComponent(db.social.posts.find(x=>x.id===id).thumbnailUpdatedAt)));
 // Simulate a historical Instagram post without an uploaded cover.
 const existing=await post('another','/api/social/post',{caption:'Legacy Instagram fan edit',url:'https://www.instagram.com/p/ABCDefGH12/'});
 assert.equal(existing.status,201);
 let calls=[];
 globalThis.fetch=async (url)=>{
  calls.push(String(url));
  if(String(url).startsWith('https://www.instagram.com/p/')){
   return {ok:true,headers:{get:()=>null},text:async()=>'<meta property="og:image" content="https://scontent.cdninstagram.com/media.jpg?x=1&amp;y=2">'};
  }
  if(String(url).startsWith('https://scontent.cdninstagram.com/')){
   return {ok:true,headers:{get:key=>key==='content-type'?'image/jpeg':null},arrayBuffer:async()=>jpeg};
  }
  throw Error('Unexpected request: '+url);
 };
 const resolved=await social.resolveEmbed(existing.data.postId);
 assert.ok(resolved.thumbnailUrl.startsWith('/api/social/thumbnail/'));
 assert.equal((await getCover(existing.data.postId)).status,200);
 assert.equal(calls.length,2);
 assert.ok(calls[1].includes('&y=2'));
 assert.equal((await social.resolveEmbed(existing.data.postId)).thumbnailUrl,resolved.thumbnailUrl);
 // Attempting to upload an invalid/malformed image must not replace the saved original.
 assert.equal((await post('another','/api/social/thumbnail',{postId:existing.data.postId,thumbnailDataUrl:'data:image/png;base64,'+jpeg.toString('base64')})).status,400);
 assert.deepEqual((await getCover(existing.data.postId)).bytes,jpeg);
 // A manually selected grid cover must not alter the source embed on Social.
 const sourceFirst=social.info(fans.fan).posts.find(x=>x.id===id);
 assert.equal(sourceFirst.hasCustomThumbnail,true);
 assert.equal((await post('another','/api/social/post-edit',{postId:id,caption:'Not permitted to edit this',url:sourceFirst.url,category:'fan'})).status,403);
 assert.equal((await post('fan','/api/social/post-edit',{postId:id,caption:'Edited fan reel caption',url:sourceFirst.url,category:'fan'})).status,200);
 let edited=social.info(fans.fan).posts.find(x=>x.id===id);
 assert.equal(edited.caption,'Edited fan reel caption');
 assert.equal(edited.embedId,sourceFirst.embedId);
 assert.ok(edited.thumbnailUrl.startsWith('/api/social/thumbnail/'));
 assert.equal(edited.hasCustomThumbnail,true);
 // The user may intentionally return to the original embed/automatic preview.
 assert.equal((await post('fan','/api/social/post-edit',{postId:id,caption:'Edited fan reel caption',url:sourceFirst.url,category:'fan',clearThumbnail:true})).status,200);
 edited=social.info(fans.fan).posts.find(x=>x.id===id);
 assert.equal(edited.hasCustomThumbnail,false);
 assert.equal(edited.thumbnailUrl,null);
 assert.equal(db.social.posts.find(x=>x.id===id).thumbnailFile,null);
 // Management may attach another cover without changing URL, platform or votes.
 assert.equal((await post('management','/api/social/post-edit',{postId:id,caption:'Edited by management',url:sourceFirst.url,category:'fan',thumbnailDataUrl:image})).status,200);
 edited=social.info(fans.fan).posts.find(x=>x.id===id);
 assert.equal(edited.caption,'Edited by management');
 assert.equal(edited.hasCustomThumbnail,true);
 assert.equal(edited.url,sourceFirst.url);
 assert.ok(edited.thumbnailUrl.startsWith('/api/social/thumbnail/'));
 assert.equal((await post('fan','/api/social/post-edit',{postId:id,caption:'Too short',url:'https://not-trusted.example/post',category:'fan'})).status,400);
 console.log('Social image tests passed: stored previews, reposts, embedded defaults, owner permissions, post edits and optional grid covers.');
}finally{globalThis.fetch=originalFetch;fs.rmSync(folder,{recursive:true,force:true});}
