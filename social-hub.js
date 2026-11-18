'use strict';
const vipProgram=require('./vip-program.js');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
/**
 * USA50 Social Hub development module.
 * Web preview only: reward credits, event perks and entry tickets are not redeemable.
 * Uses the existing single-process JSON store; migrate counters/votes to transactional
 * PostgreSQL tables before accepting real-money or contest entries.
 */
module.exports=function makeSocial({db,save,id,bodyText,now,json,fail,userFrom,dataDir=null,notify=()=>{},rankNotice=()=>{}}){
  if(!db.social)db.social={posts:[],profiles:{},votes:{},follows:{},reports:[],bans:{},ticketMilestones:{},dailyCredits:{}};
  const state=db.social;
  const mediaDir=dataDir?path.join(dataDir,'social-thumbnails'):null;
  if(mediaDir)fs.mkdirSync(mediaDir,{recursive:true});
  for(const k of ['posts','profiles','votes','follows','reports','bans','ticketMilestones','dailyCredits','idolHearts','notifications']){
    if(!state[k])state[k]=['posts','reports'].includes(k)?[]:{};
  }
  function account(uid){return db.users[uid]||null;}
  function approvedFansite(uid){return db.fansites.some(f=>f.userId===uid&&f.status==='approved');}
  function role(u){return u?.role||'fan';}
  function profileFor(uid){
    const user=account(uid);if(!user)return null;
    if(!state.profiles[uid]){
      const slug=String(user.displayName||'fan').toLowerCase().normalize('NFKD').replace(/[^a-z0-9_]+/g,'').slice(0,17)||'fan';
      state.profiles[uid]={handle:slug+'_'+uid.slice(0,4),bio:'Sharing my USA50 fan moments ♡',xp:0,createdAt:now()};
      save();
    }
    const profile=state.profiles[uid];
    if(role(user)==='idol'){profile.handle=String(user.displayName||'Idol').replace(/[^A-Za-z0-9_]/g,'').slice(0,22)||'Idol';}
    return profile;
  }
  function tier(rank){
    if(rank>0&&rank<=3)return 'UltraFan';
    if(rank<=10&&rank>0)return 'SuperFan';
    if(rank<=50&&rank>0)return 'BigFan';
    return 'Fan';
  }
  function counts(post){
    const v=state.votes[post.id]||{};
    const vals=Object.values(v);
    return {upvotes:vals.filter(x=>x===1).length,downvotes:vals.filter(x=>x===-1).length,score:vals.reduce((a,x)=>a+x,0)};
  }
  function ranks(){
    const ids=new Set();
    for(const p of state.posts){if(!p.hidden&&p.authorId&&account(p.authorId)&&role(account(p.authorId))==='fan')ids.add(p.authorId);}
    const arr=[...ids].map(uid=>{
      const p=profileFor(uid);
      const published=state.posts.filter(x=>x.authorId===uid&&!x.hidden);
      const votes=published.reduce((n,post)=>n+counts(post).score,0);
      return {id:uid,xp:Math.max(0,Number(p.xp||0)),posts:published.length,netVotes:votes};
    });
    arr.sort((a,b)=>b.xp-a.xp||b.netVotes-a.netVotes||a.id.localeCompare(b.id));
    const ranked=arr.slice(0,100).map((x,i)=>({...x,rank:i+1,tier:tier(i+1)}));
    for(const person of ranked)rankNotice(person.id,person.rank);
    return ranked;
  }
  function publicProfile(uid,viewerId,ranking){
    const u=account(uid),p=profileFor(uid);if(!u||!p)return null;
    const followers=Object.values(state.follows).filter(ids=>Array.isArray(ids)&&ids.includes(uid)).length;
    const following=(state.follows[uid]||[]).length;
    const stat=ranking.find(x=>x.id===uid);
    const isIdol=role(u)==='idol';const isStaff=['admin','management','staff'].includes(role(u));
    const newRankAward=!isIdol?(stat?.rank===1?'diamond':stat?.rank===2?'gold':stat?.rank===3?'rose-gold':stat?.rank&&stat.rank<=10?'silver':stat?.rank&&stat.rank<=50?'top50':stat?.rank&&stat.rank<=100?'top100':null):null;
    if(!isIdol&&p.lastRankAward!==newRankAward){
      if(newRankAward)p.ring='rank-auto';
      p.lastRankAward=newRankAward;save();
    }
    const oshiCount=isIdol?Object.entries(state.profiles).filter(([id,x])=>role(account(id))==='fan'&&Array.isArray(x.oshiIds)&&x.oshiIds.includes(String(u.idolId||'').toLowerCase())).length:0;
    const equippedRing=p.ring||'classic';
    return {id:uid,displayName:u.displayName,handle:p.handle,verifiedIdol:isIdol,verifiedStaff:isStaff,idolId:u.idolId||null,oshiCount,oshiIds:p.oshiIds||[],idolBorderColor:p.idolBorderColor||'#E63A84',rankBorder:newRankAward,bio:p.bio,avatarUrl:p.avatarUrl||null,ring:equippedRing,unlockedRings:u.state?.unlockedRings||['classic'],vipLevel:vipProgram.publicInfo(u).label,vipRank:vipProgram.publicInfo(u).level,followers,following,postsCount:state.posts.filter(post=>post.authorId===uid&&!post.hidden).length,fanXP:Math.max(0,p.xp||0),rank:stat?.rank||null,tier:stat?.tier||'Fan',fansite:approvedFansite(uid),isFollowing:Boolean(viewerId&&(state.follows[viewerId]||[]).includes(uid))};
  }

  const IMAGE_TYPES={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'},IMAGE_MAX=1200000;
  function imageLocation(p){return crypto.createHash('sha256').update(String(p.id)).digest('hex');}
  function pictureUrl(post){
    if(post.thumbnailHidden)return null;
    const p=post.repostOf?state.posts.find(x=>x.id===post.repostOf&&!x.hidden)||post:post;
    if(p.thumbnailHidden)return null;
    return p.thumbnailFile?'/api/social/thumbnail/'+encodeURIComponent(p.id)+'?v='+encodeURIComponent(p.thumbnailUpdatedAt||p.createdAt||'1'):p.thumbnailUrl||null;
  }
  function verifiedImage(bytes,mime){
    if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>IMAGE_MAX||!IMAGE_TYPES[mime])return false;
    if(mime==='image/jpeg')return bytes.subarray(0,3).toString('hex')==='ffd8ff';
    if(mime==='image/png')return bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
    return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  }
  function saveImage(p,bytes,mime){
    if(!mediaDir)throw Error('Thumbnail storage is unavailable.');
    if(!verifiedImage(bytes,mime))throw Error('Upload a valid JPG, PNG or WebP image under 1.2 MB.');
    const filename=imageLocation(p)+IMAGE_TYPES[mime];
    fs.writeFileSync(path.join(mediaDir,filename),bytes,{mode:0o600});
    if(p.thumbnailFile&&p.thumbnailFile!==filename)try{fs.unlinkSync(path.join(mediaDir,p.thumbnailFile));}catch{}
    p.thumbnailFile=filename;p.thumbnailMime=mime;p.thumbnailUpdatedAt=now();p.thumbnailUrl=null;save();
  }
  function saveImageFromData(p,value){
    const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value||''));
    if(!m||m[2].length>Math.ceil(IMAGE_MAX*4/3)+20)throw Error('Choose a JPG, PNG or WebP image under 1.2 MB.');
    saveImage(p,Buffer.from(m[2],'base64'),m[1]);
  }
  function serveThumbnail(req,res,postId){
    let postKey;try{postKey=decodeURIComponent(postId);}catch{return fail(res,400,'Invalid thumbnail ID.');}
    const p=state.posts.find(x=>x.id===postKey&&!x.hidden&&x.thumbnailFile);
    if(!p||!mediaDir||!IMAGE_TYPES[p.thumbnailMime]||p.thumbnailFile!==imageLocation(p)+IMAGE_TYPES[p.thumbnailMime])return fail(res,404,'Thumbnail unavailable.');
    fs.readFile(path.join(mediaDir,p.thumbnailFile),(err,bytes)=>{
      if(err)return fail(res,404,'Thumbnail unavailable.');
      res.writeHead(200,{'Content-Type':p.thumbnailMime,'Content-Length':bytes.length,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();
      res.end(bytes);
    });
  }
  function trustedImage(raw){
    try{
      const u=new URL(String(raw||''));if(u.protocol!=='https:'||u.port||u.username||u.password)return null;
      const host=u.hostname.toLowerCase(),hosts=['tiktokcdn.com','tiktokcdn-us.com','tiktok.com','muscdn.com','ibytedtos.com',
        'byteoversea.com','cdninstagram.com','fbcdn.net','instagram.com','ytimg.com'];
      return hosts.some(x=>host===x||host.endsWith('.'+x))?u.toString():null;
    }catch{return null;}
  }
  async function cacheImage(p,raw){
    const url=trustedImage(raw);if(!url||!mediaDir)return false;
    try{
      const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(4500),headers:{Accept:'image/jpeg,image/png,image/webp'}});
      if(!res.ok||Number(res.headers?.get?.('content-length')||0)>IMAGE_MAX)return false;
      const mime=String(res.headers?.get?.('content-type')||'').split(';')[0].toLowerCase();
      if(!IMAGE_TYPES[mime])return false;
      const chunks=[];let total=0,bytes;
      if(res.body?.getReader){
        const reader=res.body.getReader();
        try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
          if(total>IMAGE_MAX){await reader.cancel();return false;}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
        bytes=Buffer.concat(chunks);
      }else bytes=Buffer.from(await res.arrayBuffer());
      if(!verifiedImage(bytes,mime))return false;
      saveImage(p,bytes,mime);return true;
    }catch(_e){return false;}
  }
  function ogImage(html){
    for(const match of String(html).matchAll(/<meta\b[^>]*>/gi)){
      const tag=match[0],prop=tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];
      if(!['og:image','og:image:secure_url','twitter:image','twitter:image:src'].includes(String(prop||'').toLowerCase()))continue;
      const src=tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g,'&').replace(/&#38;/g,'&');
      if(trustedImage(src))return src;
    }
    return null;
  }
  async function fetchProviderImage(p){
    if(p.thumbnailFile)return;
    if(p.thumbnailUrl&&await cacheImage(p,p.thumbnailUrl))return;
    if(p.platform==='TikTok'){
      try{const r=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(p.url),{signal:AbortSignal.timeout(4000)});
        if(r.ok){const data=await r.json(),src=trustedImage(data?.thumbnail_url);
          if(src){p.thumbnailUrl=src;save();if(await cacheImage(p,src))return;}}
      }catch(_e){}
    }
    if(!['TikTok','Instagram'].includes(p.platform))return;
    const canonical=sourceUrl(p.url);if(!canonical||canonical.platform!==p.platform)return;
    try{
      const r=await fetch(canonical.url,{redirect:'error',signal:AbortSignal.timeout(4000),headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; USA50Preview/1.0)'}});
      if(!r.ok||Number(r.headers?.get?.('content-length')||0)>900000)return;
      const candidate=ogImage((await r.text()).slice(0,900000));
      if(candidate){p.thumbnailUrl=candidate;save();await cacheImage(p,candidate);}
    }catch(_e){}
  }
  const previewJobs=new Map();
  async function refreshPreview(p){
    if(p.thumbnailFile||p.thumbnailHidden||Date.now()-Date.parse(p.thumbnailAttemptedAt||0)<3600000)return;
    if(!previewJobs.has(p.id)){
      const job=(async()=>{try{await fetchProviderImage(p);}finally{p.thumbnailAttemptedAt=now();save();}})();
      previewJobs.set(p.id,job);job.finally(()=>previewJobs.delete(p.id)).catch(()=>{});
    }
    await previewJobs.get(p.id);
  }
  function info(user){
    const uid=user?.id||null,ranking=ranks();
    const ids=new Set([...state.posts.map(x=>x.authorId),...ranking.map(x=>x.id),...Object.values(db.users).filter(x=>['idol','admin','management','staff'].includes(role(x))).map(x=>x.id)]);
    if(uid)ids.add(uid);
    const profiles={};for(const target of ids){if(target)profiles[target]=publicProfile(target,uid,ranking);}
    const posts=state.posts.filter(p=>!p.hidden).slice(-250).map(post=>{
      const count=counts(post);
      return {id:post.id,authorId:post.authorId,category:post.category,caption:post.caption,url:post.url,platform:post.platform,embedId:post.embedId,embedKind:post.embedKind,createdAt:post.createdAt,updatedAt:post.updatedAt||null,thumbnailUrl:pictureUrl(post),hasCustomThumbnail:!!post.thumbnailManual,thumbnailHidden:!!post.thumbnailHidden,repostOf:post.repostOf||null,repostAuthor:post.repostAuthor||null,...count,heartedBy:(state.idolHearts[post.id]||[]).filter(x=>role(account(x))==='idol').map(x=>({id:x,name:account(x).displayName})),myHeart:uid?(state.idolHearts[post.id]||[]).includes(uid):false,myVote:uid?(state.votes[post.id]?.[uid]||0):0,isFollowing:Boolean(uid&&(state.follows[uid]||[]).includes(post.authorId))};
    });
    return {posts,profiles,rankings:ranking,following:uid?(state.follows[uid]||[]):[],myProfile:uid?profiles[uid]:null,savedPostIds:uid?(profileFor(uid).savedPostIds||[]):[],notifications:uid?(state.notifications[uid]||[]).slice(-40).reverse():[],topHashtags:Object.entries(state.posts.filter(p=>!p.hidden).flatMap(p=>(p.caption.match(/#[A-Za-z0-9_]+/g)||[]).map(t=>t.toLowerCase())).reduce((a,h)=>(a[h]=(a[h]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([tag,count])=>({tag,count})),top100Limit:100,earnings:{postPullPoints:50,dailyCreditedPosts:2,upvotesPerTicket:100},policy:'Demo awards, not real fancall entry or confirmed ticketing.',reports:role(user)==='admin'?state.reports.filter(x=>x.status==='pending').slice(-80):[],bans:role(user)==='admin'?state.bans:{}};
  }
  // Canonicalize public post links while accepting the short/share links copied on phones.
  // Short links do not include a media ID, so they are link-only previews until
  // a trusted redirect is resolved. Never treat arbitrary hosts as social posts.
  function sourceUrl(raw){
    let u;
    try{u=new URL(String(raw||'').trim());}catch{return null;}
    if(u.protocol!=='https:'||u.username||u.password)return null;
    const h=u.hostname.toLowerCase().replace(/^www\./,'');
    const path=u.pathname;
    if(h==='tiktok.com'||h==='m.tiktok.com'){
      const m=path.match(/^\/@([A-Za-z0-9._]+)\/(video|photo)\/(\d{12,25})\/?$/i);
      if(m){
        const format=m[2].toLowerCase();
        return {url:'https://www.tiktok.com/@'+m[1]+'/'+format+'/'+m[3],platform:'TikTok',embedKind:format==='video'?'tiktok':'link',embedId:format==='video'?m[3]:null};
      }
      const share=path.match(/^\/t\/([A-Za-z0-9_-]{4,80})\/?$/i);
      if(share)return {url:'https://www.tiktok.com/t/'+share[1]+'/',platform:'TikTok',embedKind:'link',embedId:null};
      return null;
    }
    if(h==='vt.tiktok.com'||h==='vm.tiktok.com'){
      const m=path.match(/^\/([A-Za-z0-9_-]{4,80})\/?$/);
      if(!m)return null;
      return {url:'https://'+h+'/'+m[1]+'/',platform:'TikTok',embedKind:'link',embedId:null};
    }
    if(h==='instagram.com'||h==='m.instagram.com'){
      const m=path.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,32})\/?$/i);
      if(m){
        const kind=m[1].toLowerCase()==='reels'?'reel':m[1].toLowerCase();
        return {url:'https://www.instagram.com/'+kind+'/'+m[2]+'/',platform:'Instagram',embedKind:kind,embedId:m[2]};
      }
      const share=path.match(/^\/share\/(reel|reels|p|post|tv)\/([A-Za-z0-9_-]{4,100})\/?$/i);
      if(share)return {url:'https://www.instagram.com/share/'+share[1]+'/'+share[2]+'/',platform:'Instagram',embedKind:'link',embedId:null};
      return null;
    }
    return null;
  }
  const embedRequests=new Map();
  // TikTok's official player requires a numeric media ID. Short share links
  // have no ID; resolve through TikTok oEmbed or a strictly whitelisted redirect.
  async function resolveTikTokShort(post){
    if(!post||post.platform!=='TikTok'||post.embedKind!=='link')return false;
    const cache=embedRequests.get(post.id);
    if(cache && Date.now()-cache<300000)return false;
    embedRequests.set(post.id,Date.now());
    let id=null,canonicalUrl=null;
    try{
      const endpoint=new URL('https://www.tiktok.com/oembed');
      endpoint.searchParams.set('url',post.url);
      const res=await fetch(endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(3500)});
      if(res.ok){
        const data=await res.json();
        const candidate=String(data.embed_product_id||'');
        if(/^\d{12,25}$/.test(candidate)){
          id=candidate;
          const match=String(data.author_url||'').match(/^https:\/\/www\.tiktok\.com\/@[A-Za-z0-9._]+/);
          canonicalUrl=match?match[0]+'/video/'+id:post.url;
        }
      }
    }catch(_e){}
    if(!id){
      // Manual redirect checks never follow or request non-TikTok destinations.
      let target=post.url;
      for(let step=0;step<4;step++){
        try{
          const url=new URL(target);
          if(url.protocol!=='https:'||!['vt.tiktok.com','vm.tiktok.com','www.tiktok.com','tiktok.com','m.tiktok.com'].includes(url.hostname.toLowerCase()))break;
          const res=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(2500),headers:{'user-agent':'Mozilla/5.0'}});
          const location=res.headers.get('location');
          if(!location)break;
          target=new URL(location,url).toString();
          const canonical=sourceUrl(target);
          if(canonical && canonical.platform==='TikTok'&&canonical.embedId){
            id=canonical.embedId;canonicalUrl=canonical.url;break;
          }
        }catch(_e){break;}
      }
    }
    if(!id)return false;
    post.embedKind='tiktok';post.embedId=id;
    if(canonicalUrl)post.url=canonicalUrl;
    save();return true;
  }
  async function resolveEmbed(postId){
    const p=state.posts.find(x=>x.id===postId&&!x.hidden);
    if(!p)return null;
    if(p.embedKind==='link'&&p.platform==='TikTok')await resolveTikTokShort(p);
    const media=p.repostOf?state.posts.find(x=>x.id===p.repostOf&&!x.hidden)||p:p;
    if(!p.thumbnailHidden)await refreshPreview(media);
    return {postId:p.id,embedId:media.embedId||null,embedKind:media.embedKind,platform:media.platform,url:media.url,thumbnailUrl:pictureUrl(p),thumbnailHidden:!!p.thumbnailHidden};
  }
  function requireFan(req,res){
    const u=userFrom(req);
    if(!u){fail(res,401,'Sign in to participate in the social hub.');return null;}
    if(u.mustChangePassword){fail(res,403,'Change your temporary password first.');return null;}
    return u;
  }
  function awardMilestone(uid){
    const posts=state.posts.filter(p=>p.authorId===uid&&!p.hidden);
    const sum=posts.reduce((total,p)=>total+counts(p).upvotes,0);
    const achieved=Math.floor(sum/100),prior=state.ticketMilestones[uid]||0;
    if(achieved<=prior)return 0;
    const delta=achieved-prior;
    state.ticketMilestones[uid]=achieved;
    const u=account(uid);
    if(u){u.state.fancallTickets=(u.state.fancallTickets||0)+delta;}
    return delta;
  }
  // One-time import of the earlier Community feed. No automatic paid-value rewards.
  if(!state.importedLegacy){
    for(const previous of (db.posts||[])){
      if(!previous.authorId||!previous.url||!account(previous.authorId))continue;
      const source=sourceUrl(previous.url);
      if(!source||state.posts.some(p=>p.authorId===previous.authorId&&p.url===source.url))continue;
      const legacyId='legacy-'+previous.id;
      state.posts.push({id:legacyId,authorId:previous.authorId,category:'fan',
        caption:bodyText(previous.text,650)||'USA50 fan edit',url:source.url,
        platform:source.platform,embedKind:source.embedKind,embedId:source.embedId,
        createdAt:previous.createdAt||now(),hidden:false});
      const validLikers=(previous.likedBy||[]).filter(uid=>account(uid)&&uid!==previous.authorId);
      if(validLikers.length)state.votes[legacyId]=Object.fromEntries(validLikers.map(uid=>[uid,1]));
      profileFor(previous.authorId).xp+=15+validLikers.length*2;
    }
    state.importedLegacy=true;save();
  }
  async function handlePost(req,res,ep,data){
    if(!ep.startsWith('/api/social/'))return false;
    const u=requireFan(req,res);if(!u)return true;
    const text=field=>bodyText(data[field],650);
    if(ep==='/api/social/post'){
      if(state.bans[u.id])return fail(res,403,'Social posting is currently suspended.'),true;
      if(!['fan','idol','admin'].includes(role(u)))return fail(res,403,'Posting is unavailable.'),true;
      const caption=text('caption'),source=sourceUrl(data.url),category=data.category==='fansite'?'fansite':'fan';
      if(caption.length<6||caption.length>650)return fail(res,400,'Add a description between 6 and 650 characters.'),true;
      if(!source)return fail(res,400,'Use a TikTok video, TikTok Share link, or Instagram post/Reel link.'),true;
      if(category==='fansite'&&!approvedFansite(u.id))return fail(res,403,'Fansite publishing requires management approval.'),true;
      if(state.posts.some(p=>p.authorId===u.id&&p.url===source.url&&!p.hidden))return fail(res,409,'You already shared this post.'),true;
      const day=now().slice(0,10);
      if(state.posts.filter(p=>p.authorId===u.id&&p.createdAt.slice(0,10)===day).length>=5)return fail(res,429,'Limit 5 submissions per day in this development preview.'),true;
      if(data.hideThumbnail===true&&Object.hasOwn(data,'thumbnailDataUrl'))return fail(res,400,'Choose either a thumbnail or no thumbnail.'),true;
      const post={id:id(),authorId:u.id,category,caption,url:source.url,platform:source.platform,embedKind:source.embedKind,embedId:source.embedId,thumbnailUrl:null,thumbnailHidden:data.hideThumbnail===true,createdAt:now(),hidden:false};
      // Resolve only provider-approved thumbnail metadata for a verified post URL.
      // Failure never blocks publishing; Instagram may require provider credentials.
      if(!post.thumbnailHidden&&source.platform==='TikTok' && source.embedId){
        try{
          const metaUrl='https://www.tiktok.com/oembed?url='+encodeURIComponent(source.url);
          const metaRes=await fetch(metaUrl,{signal:AbortSignal.timeout(3500)});
          if(metaRes.ok){const meta=await metaRes.json();if(typeof meta.thumbnail_url==='string'&&meta.thumbnail_url.startsWith('https://'))post.thumbnailUrl=meta.thumbnail_url.slice(0,1200);}
        }catch(_err){}
      }
      if(Object.hasOwn(data,'thumbnailDataUrl')){
        try{saveImageFromData(post,data.thumbnailDataUrl);post.thumbnailManual=true;}
        catch(err){return fail(res,400,err.message),true;}
      }
      state.posts.push(post);
      const credit=state.dailyCredits[u.id]||{day,count:0};if(credit.day!==day){credit.day=day;credit.count=0;}
      let pointsAwarded=0;
      if(credit.count<2){pointsAwarded=50;u.state.pullPoints=(u.state.pullPoints||0)+50;credit.count++;}
      state.dailyCredits[u.id]=credit;
      profileFor(u.id).xp+=15;
      save();return json(res,201,{ok:true,postId:post.id,pullPointsAwarded:pointsAwarded,fanXPAwarded:15}),true;
    }
    if(ep==='/api/social/post-edit'){
      const post=state.posts.find(p=>p.id===String(data.postId||'')&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      if(post.authorId!==u.id&&role(u)!=='admin')return fail(res,403,'Only the author or management can edit this post.'),true;
      // Retain engagement and social identity; cover affects the profile grid only.
      const caption=text('caption'),source=sourceUrl(data.url||post.url);
      const category=data.category==='fansite'?'fansite':'fan';
      if(caption.length<6||caption.length>650)return fail(res,400,'Add a description between 6 and 650 characters.'),true;
      if(!source)return fail(res,400,'Use a public TikTok or Instagram post link.'),true;
      if(category==='fansite'&&!approvedFansite(post.authorId))return fail(res,403,'Fansite publishing requires approval.'),true;
      if(state.posts.some(p=>p.id!==post.id&&p.authorId===post.authorId&&p.url===source.url&&!p.hidden))
        return fail(res,409,'This account already shared that post.'),true;
      const changingUrl=post.url!==source.url;
      if(data.hideThumbnail===true&&Object.hasOwn(data,'thumbnailDataUrl'))return fail(res,400,'Choose either a thumbnail or no thumbnail.'),true;
      if(Object.hasOwn(data,'thumbnailDataUrl')){
        try{saveImageFromData(post,data.thumbnailDataUrl);post.thumbnailManual=true;post.thumbnailHidden=false;}
        catch(err){return fail(res,400,err.message),true;}
      }else if(data.hideThumbnail===true||data.clearThumbnail===true||changingUrl){
        // Removing a cover deletes the saved image file, not just its display URL.
        if(post.thumbnailFile&&mediaDir)try{fs.unlinkSync(path.join(mediaDir,post.thumbnailFile));}catch{}
        post.thumbnailFile=null;post.thumbnailMime=null;post.thumbnailUpdatedAt=null;
        post.thumbnailManual=false;post.thumbnailUrl=null;post.thumbnailAttemptedAt=null;
        if(data.hideThumbnail===true)post.thumbnailHidden=true;
        else if(data.clearThumbnail===true)post.thumbnailHidden=false;
        // Changing the external post link preserves the explicit "no thumbnail" choice.
      }
      post.caption=caption;post.url=source.url;post.category=category;post.platform=source.platform;
      post.embedKind=source.embedKind;post.embedId=source.embedId;post.updatedAt=now();
      save();return json(res,200,{ok:true,postId:post.id,thumbnailUrl:pictureUrl(post)}),true;
    }
    if(ep==='/api/social/thumbnail'){
      const post=state.posts.find(p=>p.id===String(data.postId||'')&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      if(post.authorId!==u.id&&role(u)!=='admin')return fail(res,403,'Only the post author or management can update its image.'),true;
      try{saveImageFromData(post,data.thumbnailDataUrl);post.thumbnailManual=true;post.thumbnailHidden=false;}catch(err){return fail(res,400,err.message),true;}
      save();return json(res,200,{ok:true,postId:post.id,thumbnailUrl:pictureUrl(post)}),true;
    }
    if(ep==='/api/social/heart'){
      if(role(u)!=='idol')return fail(res,403,'Only verified idol accounts can heart posts.'),true;
      const post=state.posts.find(p=>p.id===String(data.postId||'')&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      if(post.authorId===u.id)return fail(res,400,'You cannot heart your own post.'),true;
      const likes=state.idolHearts[post.id]||(state.idolHearts[post.id]=[]);
      if(likes.includes(u.id))return json(res,200,{ok:true,alreadyHearted:true,heartedBy:likes.map(uid=>account(uid)?.displayName).filter(Boolean)}),true;
      likes.push(u.id);
      const author=profileFor(post.authorId);
      if(author)author.xp=Math.max(0,Number(author.xp||0))+150;
      notify(post.authorId,'idol-heart',String(u.displayName)+' hearted your post! +150 Fan XP',{postId:post.id,key:'idol-heart:'+post.id+':'+u.id});
      save();return json(res,200,{ok:true,fanXPAwarded:150}),true;
    }
    if(ep==='/api/social/notifications-read'){
      for(const n of state.notifications[u.id]||[])n.read=true;
      save();return json(res,200,{ok:true}),true;
    }
    if(ep==='/api/social/vote'){
      const post=state.posts.find(p=>p.id===data.postId&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      if(post.authorId===u.id)return fail(res,400,'You cannot vote on your own post.'),true;
      const vote=Number(data.vote);
      if(![-1,0,1].includes(vote))return fail(res,400,'Invalid vote.'),true;
      const entry=state.votes[post.id]||(state.votes[post.id]={});
      const old=entry[u.id]||0;
      if(vote===0||vote===old)delete entry[u.id];else entry[u.id]=vote;
      const next=entry[u.id]||0,change=next-old;
      const authorProfile=profileFor(post.authorId);
      if(authorProfile)authorProfile.xp=Math.max(0,(authorProfile.xp||0)+(next===1?2:next===-1?-1:0)-(old===1?2:old===-1?-1:0));
      const earned=awardMilestone(post.authorId);
      save();return json(res,200,{ok:true,postId:post.id,...counts(post),myVote:next,ticketMilestonesAwarded:earned}),true;
    }
    if(ep==='/api/social/follow'){
      const target=account(String(data.userId||''));
      if(!target||target.id===u.id)return fail(res,400,'Select another member to follow.'),true;
      const list=state.follows[u.id]||(state.follows[u.id]=[]);
      const i=list.indexOf(target.id);
      if(i>=0)list.splice(i,1);else list.push(target.id);
      save();return json(res,200,{ok:true,following:i<0}),true;
    }
    if(ep==='/api/social/profile'){
      const p=profileFor(u.id);
      if(Object.hasOwn(data,'bio'))p.bio=bodyText(data.bio,180);
       if(Object.hasOwn(data,'handle')){
         if(role(u)==='idol')return fail(res,403,'Idol usernames are assigned from verified stage names.'),true;
         const handle=String(data.handle||'').replace(/^@/,'').trim();
         if(!/^[A-Za-z][A-Za-z0-9_]{2,21}$/.test(handle))return fail(res,400,'Username must be 3–22 letters, numbers or underscores, starting with a letter.'),true;
         if(['arielle','jaylene','kellie','z','michelle','zoe','miu','usa50','nyc50','la50','admin','management'].includes(handle.toLowerCase())||Object.keys(db.users).some(uid=>uid!==u.id&&profileFor(uid)?.handle.toLowerCase()===handle.toLowerCase()))return fail(res,409,'Username already taken.'),true;
         p.handle=handle;
       }
       if(Object.hasOwn(data,'oshiIds')){
         if(!Array.isArray(data.oshiIds)||data.oshiIds.length>7||data.oshiIds.some(x=>!['arielle','jaylene','kellie','z','michelle','zoe','miu'].includes(x)))return fail(res,400,'Invalid oshi selections.'),true;
         p.oshiIds=[...new Set(data.oshiIds)];
       }
       if(Object.hasOwn(data,'idolBorderColor')){
         if(role(u)!=='idol')return fail(res,403,'Idol border colors are reserved for idol accounts.'),true;
         if(!/^#[0-9a-fA-F]{6}$/.test(String(data.idolBorderColor)))return fail(res,400,'Invalid color.'),true;
         p.idolBorderColor=data.idolBorderColor;
       }
      if(Object.hasOwn(data,'avatarUrl')){
        const photo=String(data.avatarUrl||'');
        if(photo && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>205000))return fail(res,400,'Use a compressed photo smaller than 150 KB.'),true;
        p.avatarUrl=photo||null;
      }
      if(Object.hasOwn(data,'ring')){
        const ring=String(data.ring||'classic');
        if(!['classic','rank-auto'].includes(ring)&&!(u.state.unlockedRings||['classic']).includes(ring))return fail(res,403,'This ring has not been unlocked.'),true;
        p.ring=ring;
      }
      save();return json(res,200,{ok:true}),true;
    }
    if(ep==='/api/social/save'){
      const post=state.posts.find(p=>p.id===data.postId&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      const p=profileFor(u.id);p.savedPostIds ||= [];
      if(p.savedPostIds.includes(post.id))p.savedPostIds=p.savedPostIds.filter(x=>x!==post.id);
      else p.savedPostIds.push(post.id);
      save();return json(res,200,{ok:true,saved:p.savedPostIds.includes(post.id)}),true;
    }
    if(ep==='/api/social/repost'){
      const original=state.posts.find(p=>p.id===data.postId&&!p.hidden);
      if(!original)return fail(res,404,'Post not found.'),true;
      if(original.authorId===u.id)return fail(res,400,'You cannot repost your own post.'),true;
      if(state.posts.some(p=>p.authorId===u.id&&p.repostOf===original.id&&!p.hidden))return fail(res,409,'Already reposted.'),true;
      const day=now().slice(0,10);
      if(state.posts.filter(p=>p.authorId===u.id&&p.createdAt.slice(0,10)===day).length>=5)return fail(res,429,'Daily posting limit reached.'),true;
      const post={id:id(),authorId:u.id,category:'fan',caption:original.caption,url:original.url,platform:original.platform,embedKind:original.embedKind,embedId:original.embedId,repostOf:original.id,repostAuthor:profileFor(original.authorId)?.handle||'USA50 fan',thumbnailUrl:original.thumbnailUrl||null,createdAt:now(),hidden:false};
      state.posts.push(post);profileFor(u.id).xp+=5;save();
      return json(res,201,{ok:true,postId:post.id}),true;
    }
    if(ep==='/api/social/bio'){
      const bio=bodyText(data.bio,180);
      profileFor(u.id).bio=bio;save();
      return json(res,200,{ok:true,bio}),true;
    }
    if(ep==='/api/social/report'){
      const post=state.posts.find(p=>p.id===data.postId&&!p.hidden);
      if(!post)return fail(res,404,'Post not found.'),true;
      if(state.reports.some(r=>r.postId===post.id&&r.reporterId===u.id&&r.status==='pending'))return fail(res,409,'Already reported for review.'),true;
      state.reports.push({id:id(),postId:post.id,reporterId:u.id,reason:bodyText(data.reason,200)||'Community content report',status:'pending',createdAt:now()});
      save();return json(res,200,{ok:true}),true;
    }
    if(ep==='/api/social/moderate'){
      if(role(u)!=='admin')return fail(res,403,'Management privileges required.'),true;
      const action=String(data.action||'');
      if(action==='hide'){
        const post=state.posts.find(p=>p.id===data.postId);
        if(!post)return fail(res,404,'Post not found.'),true;
        post.hidden=true;
        for(const r of state.reports)if(r.postId===post.id)r.status='resolved';
        save();return json(res,200,{ok:true}),true;
      }
      if(action==='resolve'){
        const report=state.reports.find(r=>r.id===data.reportId);
        if(!report)return fail(res,404,'Report not found.'),true;
        report.status='resolved';save();return json(res,200,{ok:true}),true;
      }
      if(action==='ban'){
        const uid=String(data.userId||'');
        if(!account(uid)||role(account(uid))!=='fan')return fail(res,400,'Select a fan account.'),true;
        if(data.banned)state.bans[uid]={at:now(),reason:bodyText(data.reason,100)||'Moderation action'};
        else delete state.bans[uid];
        save();return json(res,200,{ok:true,banned:!!data.banned}),true;
      }
      return fail(res,400,'Unknown moderation action.'),true;
    }
    return fail(res,404,'Unknown social endpoint.'),true;
  }
  return {info,handlePost,resolveEmbed,serveThumbnail};
};
