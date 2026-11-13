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
const makeOfficialAutoSync=require('./official-auto-sync.js');
module.exports=function createOfficialDiary({db,save,id,now,json,fail,userFrom,dataDir}){
 const state=db.officialDiary||(db.officialDiary={diaries:[],officialPosts:[],sequence:{},sources:{}});
 state.diaries||=[];state.officialPosts||=[];state.sequence||={};state.sources||={};
 const autoSync=makeOfficialAutoSync({state,save,addOfficial,fetchThumb,now});
 const dir=path.join(dataDir,'diary-uploads');fs.mkdirSync(dir,{recursive:true});
 const previewDir=path.join(dataDir,'official-previews');fs.mkdirSync(previewDir,{recursive:true});
 const THUMB_MAX=1200000;
 const mimeExt={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
 function validImageBuffer(buf,mime){
   if(!Buffer.isBuffer(buf)||!buf.length||buf.length>THUMB_MAX||!mimeExt[mime])return false;
   return (mime==='image/jpeg'&&buf.subarray(0,3).toString('hex')==='ffd8ff')||
      (mime==='image/png'&&buf.subarray(0,8).toString('hex')==='89504e470d0a1a0a')||
      (mime==='image/webp'&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP');
 }
 function safeThumbnailHost(raw){
   try{
     const u=new URL(raw);
     if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
     const h=u.hostname.toLowerCase();
     const allowed=['tiktokcdn.com','tiktokcdn-us.com','tiktok.com','muscdn.com',
       'ibytedtos.com','byteoversea.com','cdninstagram.com','fbcdn.net','instagram.com',
       'ytimg.com','ggpht.com','googleusercontent.com'];
     if(!allowed.some(d=>h===d||h.endsWith('.'+d)))return null;
     return u.toString();
   }catch{return null;}
 }
 function publicOfficial(p){
   const {thumbnailFile,thumbnailMime,thumbnailExt,thumbnailAttemptedAt,...display}=p;
   return {...display,thumbnailUrl:thumbnailFile?'/api/official/thumbnail/'+p.id:
       p.platform==='YouTube'?'https://i.ytimg.com/vi/'+p.externalId+'/hqdefault.jpg':null};
 }
 function writeThumb(p,buf,mime){
   if(!validImageBuffer(buf,mime))throw Error('Thumbnail must be a JPG, PNG or WebP under 1.2 MB.');
   const ext=mimeExt[mime],file=p.id+ext;
   fs.writeFileSync(path.join(previewDir,file),buf);
   if(p.thumbnailFile&&p.thumbnailFile!==file)try{fs.unlinkSync(path.join(previewDir,p.thumbnailFile));}catch{}
   p.thumbnailFile=file;p.thumbnailExt=ext;p.thumbnailMime=mime;save();
 }
 function thumbnailFromData(p,dataUrl){
   const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl||''));
   if(!m)return false;
   const buf=Buffer.from(m[2],'base64');writeThumb(p,buf,m[1]);return true;
 }
 async function fetchThumb(p,rawUrl){
   const safe=safeThumbnailHost(rawUrl);
   if(!safe)return false;
   const response=await fetch(safe,{headers:{Accept:'image/avif,image/webp,image/png,image/jpeg'},redirect:'error',signal:AbortSignal.timeout(6500)});
   if(!response.ok)return false;
   const mime=String(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
   if(!mimeExt[mime]||Number(response.headers.get('content-length')||0)>THUMB_MAX)return false;
   const bytes=Buffer.from(await response.arrayBuffer());
   if(!validImageBuffer(bytes,mime))return false;
   if(p.thumbnailFile)return true; // An uploaded approved cover takes precedence.
   writeThumb(p,bytes,mime);return true;
 }
 async function enrichOfficial(p,input={}){
   if(!p||p.thumbnailFile)return;
   // Only trusted hostnames supplied by a verified webhook can become media sources.
   if(input.thumbnailUrl){
     try{if(await fetchThumb(p,input.thumbnailUrl))return;}catch(err){console.warn('USA50 official thumbnail:',err.message);}
   }
   if(p.platform!=='TikTok')return;
   try{
     // TikTok oEmbed may supply a cover URL for public videos. The provider can omit it.
     const response=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(p.url),
       {headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(6500)});
     if(!response.ok)return;
     const result=await response.json();
     if(result.thumbnail_url)await fetchThumb(p,result.thumbnail_url);
     if((!p.title||p.title==='Official USA50 update')&&typeof result.title==='string'){
       p.title=result.title.slice(0,170);save();
     }
   }catch(err){console.warn('USA50 TikTok preview:',err.message);}
   finally{p.thumbnailAttemptedAt=now();save();}
 }
 function photoThumbnail(req,res,postId){
   if(!/^[0-9a-f-]{36}$/i.test(postId))return fail(res,404,'Thumbnail not found.');
   const item=state.officialPosts.find(p=>p.id===postId&&p.thumbnailFile);
   if(!item)return fail(res,404,'Thumbnail not found.');
   fs.readFile(path.join(previewDir,item.thumbnailFile),(err,buf)=>{
     if(err)return fail(res,404,'Thumbnail unavailable.');
     res.writeHead(200,{'Content-Type':item.thumbnailMime,'Content-Length':buf.length,
       'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'});res.end(buf);
   });
 }
 function removeThumb(p){
   if(p.thumbnailFile)try{fs.unlinkSync(path.join(previewDir,p.thumbnailFile));}catch{}
 }

 const palettes={cream:'#fff9f0',pink:'#ffe8f0',lavender:'#eee7ff',mint:'#e6f7ee',blue:'#e5f3ff',white:'#ffffff'};
 const lines={none:'Blank',ruled:'Ruled',grid:'Boxed',dots:'Dotted'};
 const allowedEmojis=['♡','✦','☆','☁️','🌷','🐰','🎀','💌','🫧','🦋','🍒','⭐','🪼','🍀','🦄','✨','💗','🌸'];
 function safeColor(input,def){return typeof input==='string'&&/^#[a-f\d]{6}$/i.test(input)?input:def;}
 function isIdol(u){return Boolean(u&&u.role==='idol'&&!u.mustChangePassword);}
 function authorName(u){return u?.idolName||u?.memberName||u?.displayName||'USA50 Idol';}
 function publicEntry(e){return {id:e.id,authorId:e.authorId,author:e.author,number:e.number,publishedAt:e.publishedAt,text:e.text,layout:e.layout,paper:e.paper,lineColor:e.lineColor,textColor:e.textColor,stickers:e.stickers,photos:e.photos.map(p=>({id:p.id,url:'/api/diary/photo/'+p.id,caption:p.caption}))};}
 function view(){return {diaries:state.diaries.slice(-100).reverse().map(publicEntry),
   officialPosts:state.officialPosts.slice(-100).reverse().map(publicOfficial),
   canPost:false,sourceStatus:{youtube:Boolean(state.sources.youtubeChannelId||process.env.YOUTUBE_CHANNEL_ID),
     instagram:Boolean(process.env.USA50_OFFICIAL_WEBHOOK_SECRET||autoSync.publicStatus().instagram.configured),
     tiktok:Boolean(process.env.USA50_OFFICIAL_WEBHOOK_SECRET||autoSync.publicStatus().tiktok.configured)}};}
 function info(u){return {...view(),canPost:isIdol(u),
   settings:u?.role==='admin'?{youtubeChannelId:state.sources.youtubeChannelId||process.env.YOUTUBE_CHANNEL_ID||'',
     instagramUsername:state.sources.instagramUsername||'',tiktokUsername:state.sources.tiktokUsername||'',
     autoSync:autoSync.publicStatus()}:null};}
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
 function addOfficial(input,autoEnrich=true){
   const source=canonical(input.url);if(!source)return null;
   if(state.officialPosts.some(p=>p.platform===source.platform&&p.externalId===source.externalId))return null;
   const p={id:id(),...source,title:String(input.title||'Official USA50 update').slice(0,170),
     caption:String(input.caption||'').slice(0,500),
     publishedAt:input.publishedAt&&Number.isFinite(Date.parse(input.publishedAt))?new Date(input.publishedAt).toISOString():now()};
   state.officialPosts.push(p);
   const discarded=state.officialPosts.splice(0,Math.max(0,state.officialPosts.length-300));
   for(const old of discarded)removeThumb(old);
   save();
   // Async source metadata enrichment is never required for importing the post itself.
   if(autoEnrich)enrichOfficial(p,input).catch(err=>console.warn('USA50 preview error:',err.message));
   return p;
 }
 async function publishOfficial(req,res,input){
   const user=userFrom(req);
   if(!user||user.role!=='admin'||user.mustChangePassword)return fail(res,403,'Management account required.');
   const canonicalPost=canonical(input.url);
   if(!canonicalPost)return fail(res,400,'Paste a public YouTube, Instagram post/reel, or TikTok video URL.');
   if(input.thumbnailDataUrl&&String(input.thumbnailDataUrl).length>1800000)return fail(res,413,'Thumbnail is too large.');
   const title=String(input.title||'').trim().slice(0,170)||'Official USA50 update';
   const p=addOfficial({url:canonicalPost.url,title,caption:input.caption},false);
   if(!p)return fail(res,409,'This official post is already in the feed.');
   if(input.thumbnailDataUrl){
     try{if(!thumbnailFromData(p,input.thumbnailDataUrl))throw Error('Invalid thumbnail.');}
     catch(err){state.officialPosts=state.officialPosts.filter(x=>x.id!==p.id);removeThumb(p);save();return fail(res,400,err.message);}
   }else if(p.platform==='TikTok'){
     // The management form waits for the official public metadata response so
     // the thumbnail is visible on the very next feed refresh if available.
     await enrichOfficial(p).catch(err=>console.warn('USA50 official preview:',err.message));
   }
   return json(res,201,{ok:true,post:publicOfficial(p)});
 }
 function deleteOfficial(req,res,data){
   const user=userFrom(req);
   if(!user||user.role!=='admin'||user.mustChangePassword)return fail(res,403,'Management account required.');
   const p=state.officialPosts.find(x=>x.id===data.id);
   if(!p)return fail(res,404,'Official post not found.');
   state.officialPosts=state.officialPosts.filter(x=>x.id!==p.id);removeThumb(p);save();
   return json(res,200,{ok:true});
 }
 async function refreshPreviews(){
   const stale=state.officialPosts.filter(p=>p.platform==='TikTok'&&!p.thumbnailFile&&
     (!p.thumbnailAttemptedAt||Date.now()-Date.parse(p.thumbnailAttemptedAt)>6*3600000)).slice(-6);
   for(const p of stale)await enrichOfficial(p).catch(()=>{});
 }
 async function pollYouTube(){
   const channel=state.sources.youtubeChannelId||process.env.YOUTUBE_CHANNEL_ID||'';
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
 function setSources(req,res,data){
   const user=userFrom(req);
   if(!user||user.role!=='admin'||user.mustChangePassword)return fail(res,403,'Management account required');
   const channel=String(data.youtubeChannelId||'').trim();
   if(channel&&!/^UC[A-Za-z0-9_-]{22}$/.test(channel))return fail(res,400,'Enter a valid YouTube channel ID beginning with UC');
   state.sources.youtubeChannelId=channel;
   for(const platform of ['instagram','tiktok']){
     const value=String(data[platform+'Username']||'').replace(/^@/,'').trim();
     if(value&&!/^[a-zA-Z0-9_.]{1,40}$/.test(value))return fail(res,400,'Invalid '+platform+' username');
     state.sources[platform+'Username']=value;
   }
   save();
   pollYouTube().catch(console.warn);
   if(autoSync.publicStatus().instagram.configured||autoSync.publicStatus().tiktok.configured)
     autoSync.sync().catch(err=>console.warn('Official auto-sync:',err.message));
   return json(res,200,{ok:true,sourceStatus:view().sourceStatus});
 }
 function ingestOfficial(req,res,data){
   const secret=process.env.USA50_OFFICIAL_WEBHOOK_SECRET;
   if(!secret)return fail(res,503,'Official provider ingestion is not configured');
   const provided=String(req.headers['x-usa50-webhook-secret']||'');
   const x=Buffer.from(provided),y=Buffer.from(secret);
   if(x.length!==y.length||!crypto.timingSafeEqual(x,y))return fail(res,403,'Unauthorized source');
   const src=canonical(data.url);if(!src||!['Instagram','TikTok','YouTube'].includes(src.platform))return fail(res,400,'Invalid official post URL');
   const allowed=src.platform==='Instagram'?(state.sources.instagramUsername||process.env.USA50_INSTAGRAM_USERNAME):src.platform==='TikTok'?(state.sources.tiktokUsername||process.env.USA50_TIKTOK_USERNAME):null;
   if(allowed&&String(data.account||'').replace(/^@/,'').toLowerCase()!==allowed.replace(/^@/,'').toLowerCase())return fail(res,403,'Not an authorized official channel');
   return json(res,200,{ok:true,imported:Boolean(addOfficial(data))});
 }
 async function syncOfficial(req,res){
   const u=userFrom(req);
   if(!u||u.role!=='admin'||u.mustChangePassword)return fail(res,403,'Management required.');
   const result=await autoSync.sync();
   return json(res,200,{ok:true,...result});
 }
 return {info,createDiary,deleteDiary,photo,photoThumbnail,publishOfficial,deleteOfficial,refreshPreviews,ingestOfficial,setSources,pollYouTube,syncOfficial,pollAutomatic:()=>autoSync.sync()};
};