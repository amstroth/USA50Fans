import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const createOfficial=require('../official-diary.js');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-official-posts-'));
const originalFetch=globalThis.fetch;
const previousSecret=process.env.USA50_OFFICIAL_WEBHOOK_SECRET;
process.env.USA50_OFFICIAL_WEBHOOK_SECRET='unit-test-secret-only';
const admin={id:'admin',role:'admin',mustChangePassword:false};
const idol={id:'idol',role:'idol',mustChangePassword:false};
const fan={id:'fan',role:'fan',mustChangePassword:false};
const image=Buffer.from('ffd8ff00112233445566','hex');
const calls=[];
globalThis.fetch=async(url)=>{
 const uri=String(url);calls.push(uri);
 if(uri.startsWith('https://www.tiktok.com/oembed?')){
  return {ok:true,json:async()=>({title:'Live TikTok premiere',
   thumbnail_url:'https://p16-sign-va.tiktokcdn.com/cached-cover.jpg'})};
 }
 if(uri.startsWith('https://p16-sign-va.tiktokcdn.com/')){
  return {ok:true,headers:{get:key=>({'content-type':'image/jpeg','content-length':String(image.length)})[key.toLowerCase()]||null},
   arrayBuffer:async()=>image};
 }
 throw Error('Unexpected external request '+uri);
};
const db={};
let i=0,saves=0;
const service=createOfficial({db,dataDir:tmp,save:()=>saves++,id:()=>('00000000-0000-4000-8000-'+String(++i).padStart(12,'0')),
 now:()=>new Date('2026-11-13T18:00:00Z').toISOString(),userFrom:r=>r.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}});
const post=async(user,data)=>{const r={};await service.publishOfficial({user},r,data);return r;};
const remove=async(user,id)=>{const r={};await service.deleteOfficial({user},r,{id});return r;};
const thumb=async(user,id)=>new Promise((resolve,reject)=>{
 const res={writeHead(status,headers){this.status=status;this.headers=headers;},
  end(content){resolve({status:this.status,headers:this.headers,content});}};
 try{const result=service.photoThumbnail({user},res,id);if(res.status&&!res.headers)resolve(res);}
 catch(e){reject(e);}
});
try{
 assert.equal((await post(fan,{url:'https://www.instagram.com/reel/ABCDE1234/',title:'Nope'})).status,403);
 assert.equal((await post(idol,{url:'https://www.instagram.com/reel/ABCDE1234/',title:'Nope'})).status,403);
 assert.equal((await post(admin,{url:'http://127.0.0.1/admin',title:'Nope'})).status,400);
 const youtube=await post(admin,{url:'https://www.youtube.com/watch?v=abcd1234XYZ',title:'USA50 performance'});
 assert.equal(youtube.status,201,JSON.stringify(youtube.body));
 assert.equal(youtube.body.post.platform,'YouTube');
 assert.equal(youtube.body.post.thumbnailUrl,'https://i.ytimg.com/vi/abcd1234XYZ/hqdefault.jpg');
 const igNoThumb=await post(admin,{url:'https://www.instagram.com/reel/ABCDE1234/',title:'Instagram debut'});
 assert.equal(igNoThumb.status,201);
 assert.equal(igNoThumb.body.post.thumbnailUrl,null,'Meta oEmbed does not include cover images');
 const igCover=await post(admin,{url:'https://www.instagram.com/p/ABCDE4321/',title:'USA50 photo',
  thumbnailDataUrl:'data:image/jpeg;base64,'+image.toString('base64')});
 assert.equal(igCover.status,201,JSON.stringify(igCover.body));
 assert.equal(igCover.body.post.thumbnailUrl,'/api/official/thumbnail/'+igCover.body.post.id);
 const imgResponse=await thumb(fan,igCover.body.post.id);
 assert.equal(imgResponse.status,200);
 assert.equal(imgResponse.headers['Content-Type'],'image/jpeg');
 assert.deepEqual(imgResponse.content,image);
 const tik=await post(admin,{url:'https://www.tiktok.com/@usa50/video/6718335390845095173',title:'TikTok cover'});
 assert.equal(tik.status,201,JSON.stringify(tik.body));
 assert.equal(tik.body.post.platform,'TikTok');
 assert.equal(tik.body.post.thumbnailUrl,'/api/official/thumbnail/'+tik.body.post.id);
 assert.ok(calls.some(x=>x.includes('www.tiktok.com/oembed?')));
 assert.ok(calls.some(x=>x.startsWith('https://p16-sign-va.tiktokcdn.com/')));
 assert.equal((await post(admin,{url:'https://www.tiktok.com/@usa50/video/6718335390845095173',title:'Duplicate'})).status,409);
 const publicFeed=service.info(fan);
 assert.equal(publicFeed.officialPosts.length,4);
 assert.ok(publicFeed.officialPosts.every(x=>!('thumbnailFile' in x)), 'internal volume paths must not be exposed');
 assert.equal((await remove(fan,tik.body.post.id)).status,403);
 assert.equal((await remove(admin,tik.body.post.id)).status,200);
 assert.equal((await thumb(fan,tik.body.post.id)).status,404);
 const newSrc={youtubeChannelId:'',instagramUsername:'usa50',tiktokUsername:'usa50'};
 const res={};service.setSources({user:admin},res,newSrc);assert.equal(res.status,200);
 assert.equal(service.info(fan).sourceStatus.instagram,true,'configured verified webhooks should show status');
 const webhookRes={};
 service.ingestOfficial({headers:{'x-usa50-webhook-secret':'unit-test-secret-only'}},webhookRes,
  {url:'https://www.tiktok.com/@usa50/video/6718335390845095174',
   account:'usa50',thumbnailUrl:'https://p16-sign-va.tiktokcdn.com/cached-cover.jpg',title:'Webhook clip'});
 assert.equal(webhookRes.status,200);
 assert.equal(webhookRes.body.imported,true);
 // Enrichment runs asynchronously; verify the event was created.
 assert.ok(service.info(fan).officialPosts.some(p=>p.title==='Webhook clip'));
 assert.ok(saves>0);
 console.log('Official channels tests passed: YouTube/TikTok covers, approved IG upload, safe admin imports, no duplicates and protected webhook.');
}finally{
 globalThis.fetch=originalFetch;
 if(previousSecret===undefined)delete process.env.USA50_OFFICIAL_WEBHOOK_SECRET;
 else process.env.USA50_OFFICIAL_WEBHOOK_SECRET=previousSecret;
 fs.rmSync(tmp,{recursive:true,force:true});
}
