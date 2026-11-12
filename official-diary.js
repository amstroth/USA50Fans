/**
 * USA50 official content + idol Diary Entries.
 * JSON metadata uses existing development storage; uploaded images live on DATA_DIR.
 * Official YouTube RSS polling requires YOUTUBE_CHANNEL_ID.
 * Instagram/TikTok official integrations ingest signed provider events through an
 * operator-controlled webhook gateway; never scrape or assume account ownership.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
module.exports=function createOfficialDiary({db,save,id,now,json,fail,userFrom,dataDir}){
 const state=db.officialDiary||(db.officialDiary={diaries:[],officialPosts:[],sequence:{},sources:{}});
 state.diaries||=[];state.officialPosts||=[];state.sequence||={};state.sources||={};
 const dir=path.join(dataDir,'diary-uploads');fs.mkdirSync(dir,{recursive:true});
 const palettes={cream:'#fff9f0',pink:'#ffe8f0',lavender:'#eee7ff',mint:'#e6f7ee',blue:'#e5f3ff',white:'#ffffff'};
 const lines={none:'Blank',ruled:'Ruled',grid:'Boxed',dots:'Dotted'};
 const allowedEmojis=['♡','✦','☆','☁️','🌷','🐰','🎀','💌','🫧','🦋','🍒','⭐','🪼','🍀','🦄','✨','💗','🌸'];
 function safeColor(input,def){return typeof input==='string'&&/^#[a-f\d]{6}$/i.test(input)?input:def;}
 function isIdol(u){return Boolean(u&&u.role==='idol'&&!u.mustChangePassword);}
 function authorName(u){return u?.idolName||u?.memberName||u?.displayName||'USA50 Idol';}
 function publicEntry(e){return {id:e.id,authorId:e.authorId,author:e.author,number:e.number,publishedAt:e.publishedAt,text:e.text,layout:e.layout,paper:e.paper,lineColor:e.lineColor,textColor:e.textColor,stickers:e.stickers,photos:e.photos.map(p=>({id:p.id,url:'/api/diary/photo/'+p.id,caption:p.caption}))};}
 function view(){return {diaries:state.diaries.slice(-100).reverse().map(publicEntry),officialPosts:state.officialPosts.slice(-100).reverse(),canPost:false,sourceStatus:{youtube:Boolean(process.env.YOUTUBE_CHANNEL_ID),instagram:Boolean(process.env.USA50_OFFICIAL_WEBHOOK_SECRET),tiktok:Boolean(process.env.USA50_OFFICIAL_WEBHOOK_SECRET)}};}
 function info(u){return {...view(),canPost:isIdol(u)};}
 function photoUpload(item){
   if(!item||!['image/jpeg','image/png','image/webp'].includes(item.mime)||typeof item.data!=='string')throw Error('Choose a JPG, PNG or WebP photo');
   if(item.data.length>950000)throw Error('Compress diary photos before uploading');
   const raw=Buffer.from(item.data,'base64');
   const verified=(item.mime==='image/jpeg'&&raw.subarray(0,3).toString('hex')==='ffd8ff')||(item.mime==='image/png'&&raw.subarray(0,8).toString('hex')==='89504e470d0a1a0a')||(item.mime==='image/webp'&&raw.toString('ascii',0,4)==='RIFF'&&raw.toString('ascii',8,12)==='WEBP');
   if(!verified||!raw.length||raw.length>700000)throw Error('Diary photo is invalid or too large');
   const name=crypto.randomUUID(),ext={ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[item.mime];
   fs.writeFileSync(path.join(dir,name+ext),raw,{flag:'wx'});
   return {id:name,mime:item.mime,ext,caption:String(item.caption||'').slice(0,80)};
 }
 function createDiary(req,res,data){
   const user=userFrom(req);if(!isIdol(user))return fail(res,403,'Only signed-in USA50 idols can publish diary entries');
   const text=String(data.text||'').trim();if(!text||text.length>6000)return fail(res,400,'Write a diary entry (up to 6000 characters)');
   const layout=Object.hasOwn(lines,data.layout)?data.layout:'ruled';
   const paper=safeColor(data.paper,palettes.cream),lineColor=safeColor(data.lineColor,'#c6b7b0'),textColor=safeColor(data.textColor,'#4c3c53');
   const stickers=Array.isArray(data.stickers)?data.stickers.slice(0,18).filter(s=>allowedEmojis.includes(s)).map(String):[];
   const imgs=Array.isArray(data.photos)?data.photos:[];
   if(imgs.length>4)return fail(res,400,'Up to four polaroid photos per entry');
   let photos=[];try{photos=imgs.map(photoUpload);}catch(err){for(const p of photos)try{fs.unlinkSync(path.join(dir,p.id+p.ext));}catch{}return fail(res,400,err.message);}
   const number=(state.sequence[user.id]||0)+1;
   const entry={id:id(),authorId:user.id,author:authorName(user),number,publishedAt:now(),text,layout,paper,lineColor,textColor,stickers,photos};
   state.sequence[user.id]=number;state.diaries.push(entry);save();
   return json(res,201,{ok:true,entry:publicEntry(entry)});
 }
 function deleteDiary(req,res,data){
   const user=userFrom(req);if(!user)return fail(res,401,'Sign in required');
   const entry=state.diaries.find(x=>x.id===data.id);
   if(!entry)return fail(res,404,'Entry not found');
   if(entry.authorId!==user.id&&user.role!=='admin')return fail(res,403,'Only the author or management can remove this entry');
   state.diaries=state.diaries.filter(x=>x.id!==entry.id);save();
   for(const photo of entry.photos)try{fs.unlinkSync(path.join(dir,photo.id+photo.ext));}catch{}
   return json(res,200,{ok:true});
 }
 function photo(req,res,pid){
   const found=state.diaries.flatMap(x=>x.photos).find(x=>x.id===pid);
   if(!found)return fail(res,404,'Photo not found');
   const file=path.join(dir,found.id+found.ext);
   fs.readFile(file,(err,content)=>{if(err)return fail(res,404,'Photo missing');res.writeHead(200,{'Content-Type':found.mime,'Content-Length':content.length,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});res.end(content);});
 }
 const canonical=url=>{
   try{const u=new URL(url);if(u.protocol!=='https:')return null;const h=u.hostname.toLowerCase();
     if(['youtube.com','www.youtube.com','youtu.be'].includes(h)){const m=h==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1];if(!/^[\w-]{11}$/.test(m||''))return null;return {platform:'YouTube',url:'https://www.youtube.com/watch?v='+m,externalId:m};}
     if(['www.instagram.com','instagram.com'].includes(h)){const m=u.pathname.match(/^\/(p|reel)\/([\w-]{5,32})/);if(!m)return null;return {platform:'Instagram',url:'https://www.instagram.com/'+m[1]+'/'+m[2]+'/',externalId:m[2]};}
     if(['www.tiktok.com','tiktok.com'].includes(h)){const m=u.pathname.match(/^\/@[\w.]+\/video\/(\d{12,25})/);if(!m)return null;return {platform:'TikTok',url:'https://www.tiktok.com'+u.pathname.replace(/\/$/,'') ,externalId:m[1]};}
   }catch{}return null;
 };
 function addOfficial(input){
   const source=canonical(input.url);if(!source)return false;
   if(state.officialPosts.some(p=>p.platform===source.platform&&p.externalId===source.externalId))return false;
   state.officialPosts.push({id:id(),...source,title:String(input.title||'Official USA50 update').slice(0,170),caption:String(input.caption||'').slice(0,500),publishedAt:input.publishedAt&&Number.isFinite(Date.parse(input.publishedAt))?new Date(input.publishedAt).toISOString():now()});
   state.officialPosts=state.officialPosts.slice(-300);save();return true;
 }
 async function pollYouTube(){
   const channel=process.env.YOUTUBE_CHANNEL_ID||'';
   if(!/^UC[\w-]{22}$/.test(channel))return;
   try{
     const url='https://www.youtube.com/feeds/videos.xml?channel_id='+encodeURIComponent(channel);
     const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'USA50FanApp/1.0'}});
     if(!response.ok)return;
     const xml=await response.text();
     const entries=xml.match(/<entry>[\s\S]*?<\/entry>/g)||[];
     const entity=s=>String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
     for(const chunk of entries.reverse()){
       const vid=chunk.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];if(!vid)continue;
       const title=entity(chunk.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
       const publishedAt=chunk.match(/<published>([^<]+)<\/published>/)?.[1];
       addOfficial({url:'https://www.youtube.com/watch?v='+vid,title,publishedAt});
     }
     state.sources.youtubeLastChecked=now();save();
   }catch(err){console.warn('USA50 YouTube feed check:',err.message);}
 }
 function ingestOfficial(req,res,data){
   const secret=process.env.USA50_OFFICIAL_WEBHOOK_SECRET;
   if(!secret)return fail(res,503,'Official provider ingestion is not configured');
   const provided=String(req.headers['x-usa50-webhook-secret']||'');
   const x=Buffer.from(provided),y=Buffer.from(secret);
   if(x.length!==y.length||!crypto.timingSafeEqual(x,y))return fail(res,403,'Unauthorized source');
   const src=canonical(data.url);if(!src||!['Instagram','TikTok','YouTube'].includes(src.platform))return fail(res,400,'Invalid official post URL');
   const allowed=src.platform==='Instagram'?process.env.USA50_INSTAGRAM_USERNAME:src.platform==='TikTok'?process.env.USA50_TIKTOK_USERNAME:null;
   if(allowed&&String(data.account||'').replace(/^@/,'').toLowerCase()!==allowed.replace(/^@/,'').toLowerCase())return fail(res,403,'Not an authorized official channel');
   return json(res,200,{ok:true,imported:addOfficial(data)});
 }
 return {info,createDiary,deleteDiary,photo,ingestOfficial,pollYouTube};
};