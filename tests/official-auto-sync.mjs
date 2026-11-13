import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeAuto=require('../official-auto-sync.js');
const keys=['USA50_INSTAGRAM_ACCESS_TOKEN','USA50_INSTAGRAM_USER_ID','USA50_INSTAGRAM_GRAPH_HOST',
 'USA50_TIKTOK_ACCESS_TOKEN','USA50_TIKTOK_REFRESH_TOKEN','USA50_TIKTOK_CLIENT_KEY',
 'USA50_TIKTOK_CLIENT_SECRET','USA50_TIKTOK_USERNAME'];
const prior=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
const originalFetch=globalThis.fetch;
const posts=[],covers=[],calls=[];
let saves=0;
const state={sources:{instagramUsername:'usa50nyc',tiktokUsername:'usa50'}};
const storePost=(data)=>{
 if(posts.some(p=>p.url===data.url))return null;
 const post={id:'p'+(posts.length+1),...data};posts.push(post);return post;
};
const backend=makeAuto({state,save:()=>saves++,addOfficial:storePost,
 fetchThumb:async(post,url)=>{covers.push({id:post.id,url});return true;},
 now:()=>new Date('2026-11-13T19:00:00Z').toISOString()});
try{
 for(const key of keys)delete process.env[key];
 assert.equal(backend.publicStatus().instagram.configured,false);
 assert.equal(backend.publicStatus().tiktok.configured,false);
 let result=await backend.sync();
 assert.equal(result.instagram.configured,false);
 assert.equal(result.tiktok.configured,false);
 assert.equal(posts.length,0);
 process.env.USA50_INSTAGRAM_USER_ID='17841400000000000';
 process.env.USA50_INSTAGRAM_ACCESS_TOKEN='ig_test_secret_token';
 process.env.USA50_TIKTOK_ACCESS_TOKEN='tt_test_secret_token';
 process.env.USA50_TIKTOK_USERNAME='usa50';
 globalThis.fetch=async(url,options={})=>{
  url=String(url);calls.push({url,method:options.method||'GET',auth:options.headers?.Authorization});
  if(url.startsWith('https://graph.facebook.com/v27.0/')){
   assert.equal(options.headers.Authorization,'Bearer ig_test_secret_token');
   return {ok:true,json:async()=>({data:[
    {id:'1800000000001',permalink:'https://www.instagram.com/reel/ABCDEabc1/',caption:'USA50 performance',
      media_type:'VIDEO',thumbnail_url:'https://scontent.cdninstagram.com/source.jpg',timestamp:'2026-11-13T17:00:00Z'}
   ]})};
  }
  if(url.startsWith('https://open.tiktokapis.com/v2/video/list/')){
   assert.equal(options.headers.Authorization,'Bearer tt_test_secret_token');
   return {ok:true,json:async()=>({data:{videos:[
    {id:'6718335390845095173',title:'USA50 TikTok live',share_url:'https://www.tiktok.com/@usa50/video/6718335390845095173',
      cover_image_url:'https://p16.tiktokcdn.com/source.webp',create_time:1794592800}
   ]},error:{code:'ok'}})};
  }
  throw Error('Unexpected request '+url);
 };
 result=await backend.sync();
 assert.equal(result.instagram.imported,1);
 assert.equal(result.tiktok.imported,1);
 assert.equal(posts.length,2);
 assert.equal(covers.length,2);
 assert.equal(backend.publicStatus().instagram.configured,true);
 assert.equal(backend.publicStatus().tiktok.configured,true);
 assert.equal(backend.publicStatus().tiktok.lastError,null);
 assert.ok(!JSON.stringify(backend.publicStatus()).includes('tt_test_secret_token'));
 result=await backend.sync();
 assert.equal(result.instagram.imported,0,'no duplicates from repeat Graph poll');
 assert.equal(result.tiktok.imported,0,'no duplicates from repeat TikTok poll');
 delete process.env.USA50_TIKTOK_ACCESS_TOKEN;
 process.env.USA50_TIKTOK_REFRESH_TOKEN='refresh_original_secret';
 process.env.USA50_TIKTOK_CLIENT_KEY='client_key';
 process.env.USA50_TIKTOK_CLIENT_SECRET='client_secret';
 calls.length=0;
 globalThis.fetch=async(url,options={})=>{
  url=String(url);calls.push({url,body:options.body,auth:options.headers?.Authorization});
  if(url==='https://open.tiktokapis.com/v2/oauth/token/'){
   const params=new URLSearchParams(options.body);
   assert.equal(params.get('refresh_token'),'refresh_original_secret');
   assert.equal(params.get('client_key'),'client_key');
   assert.equal(params.get('grant_type'),'refresh_token');
   return {ok:true,json:async()=>({access_token:'rotated_access',refresh_token:'rotated_refresh',expires_in:7200,open_id:'account_1'})};
  }
  if(url.startsWith('https://open.tiktokapis.com/v2/video/list/')){
   assert.equal(options.headers.Authorization,'Bearer rotated_access');
   return {ok:true,json:async()=>({data:{videos:[]},error:{code:'ok'}})};
  }
  if(url.startsWith('https://graph.facebook.com/'))return {ok:true,json:async()=>({data:[]})};
  throw Error('Unexpected request '+url);
 };
 const refreshed=await backend.pollTikTok();
 assert.equal(refreshed.error,undefined);
 assert.equal(state.tiktokAuth.accessToken,'rotated_access');
 assert.equal(state.tiktokAuth.refreshToken,'rotated_refresh');
 assert.ok(saves>0);
 assert.ok(calls.some(x=>x.url.includes('/oauth/token/')),'refresh occurs server-side');
 assert.ok(!JSON.stringify(backend.publicStatus()).includes('rotated_refresh'));
 console.log('Instagram and TikTok authorized feed polling, token rotation and deduplication tests passed.');
}finally{
 globalThis.fetch=originalFetch;
 for(const key of keys)prior[key]===undefined?delete process.env[key]:process.env[key]=prior[key];
}
