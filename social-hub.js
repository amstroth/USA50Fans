'use strict';
/**
 * USA50 Social Hub development module.
 * Web preview only: reward credits, event perks and entry tickets are not redeemable.
 * Uses the existing single-process JSON store; migrate counters/votes to transactional
 * PostgreSQL tables before accepting real-money or contest entries.
 */
module.exports=function makeSocial({db,save,id,bodyText,now,json,fail,userFrom}){
  if(!db.social)db.social={posts:[],profiles:{},votes:{},follows:{},reports:[],bans:{},ticketMilestones:{},dailyCredits:{}};
  const state=db.social;
  for(const k of ['posts','profiles','votes','follows','reports','bans','ticketMilestones','dailyCredits']){
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
    return state.profiles[uid];
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
    for(const p of state.posts){if(!p.hidden&&p.authorId&&account(p.authorId))ids.add(p.authorId);}
    const arr=[...ids].map(uid=>{
      const p=profileFor(uid);
      const published=state.posts.filter(x=>x.authorId===uid&&!x.hidden);
      const votes=published.reduce((n,post)=>n+counts(post).score,0);
      return {id:uid,xp:Math.max(0,Number(p.xp||0)),posts:published.length,netVotes:votes};
    });
    arr.sort((a,b)=>b.xp-a.xp||b.netVotes-a.netVotes||a.id.localeCompare(b.id));
    return arr.slice(0,100).map((x,i)=>({...x,rank:i+1,tier:tier(i+1)}));
  }
  function publicProfile(uid,viewerId,ranking){
    const u=account(uid),p=profileFor(uid);if(!u||!p)return null;
    const followers=Object.values(state.follows).filter(ids=>Array.isArray(ids)&&ids.includes(uid)).length;
    const following=(state.follows[uid]||[]).length;
    const stat=ranking.find(x=>x.id===uid);
    return {id:uid,displayName:u.displayName,handle:p.handle,bio:p.bio,vipLevel:u.state?.vipLevel||'Starter',followers,following,postsCount:state.posts.filter(post=>post.authorId===uid&&!post.hidden).length,fanXP:Math.max(0,p.xp||0),rank:stat?.rank||null,tier:stat?.tier||'Fan',fansite:approvedFansite(uid),isFollowing:Boolean(viewerId&&(state.follows[viewerId]||[]).includes(uid))};
  }
  function info(user){
    const uid=user?.id||null,ranking=ranks();
    const ids=new Set([...state.posts.map(x=>x.authorId),...ranking.map(x=>x.id)]);
    if(uid)ids.add(uid);
    const profiles={};for(const target of ids){if(target)profiles[target]=publicProfile(target,uid,ranking);}
    const posts=state.posts.filter(p=>!p.hidden).slice(-250).map(post=>{
      const count=counts(post);
      return {id:post.id,authorId:post.authorId,category:post.category,caption:post.caption,url:post.url,platform:post.platform,embedId:post.embedId,embedKind:post.embedKind,createdAt:post.createdAt,...count,myVote:uid?(state.votes[post.id]?.[uid]||0):0,isFollowing:Boolean(uid&&(state.follows[uid]||[]).includes(post.authorId))};
    });
    return {posts,profiles,rankings:ranking,following:uid?(state.follows[uid]||[]):[],myProfile:uid?profiles[uid]:null,top100Limit:100,earnings:{postPullPoints:50,dailyCreditedPosts:2,upvotesPerTicket:100},policy:'Demo awards, not real fancall entry or confirmed ticketing.',reports:role(user)==='admin'?state.reports.filter(x=>x.status==='pending').slice(-80):[],bans:role(user)==='admin'?state.bans:{}};
  }
  function sourceUrl(raw){
    let u;try{u=new URL(String(raw||''));}catch{return null;}
    if(u.protocol!=='https:')return null;
    const h=u.hostname.toLowerCase().replace(/^www\./,'');
    if(h==='tiktok.com'){
      const m=u.pathname.match(/^\/@[\w.]+\/(?:video|photo)\/(\d{12,25})\/?$/i);
      if(!m)return null;
      return {url:'https://www.tiktok.com'+u.pathname,platform:'TikTok',embedKind:'tiktok',embedId:m[1]};
    }
    if(h==='instagram.com'){
      const m=u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]{5,32})\/?$/i);
      if(!m)return null;
      return {url:'https://www.instagram.com/'+m[1]+'/'+m[2]+'/',platform:'Instagram',embedKind:m[1].toLowerCase(),embedId:m[2]};
    }
    return null;
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
  function handlePost(req,res,ep,data){
    if(!ep.startsWith('/api/social/'))return false;
    const u=requireFan(req,res);if(!u)return true;
    const text=field=>bodyText(data[field],650);
    if(ep==='/api/social/post'){
      if(state.bans[u.id])return fail(res,403,'Social posting is currently suspended.'),true;
      if(!['fan','idol','admin'].includes(role(u)))return fail(res,403,'Posting is unavailable.'),true;
      const caption=text('caption'),source=sourceUrl(data.url),category=data.category==='fansite'?'fansite':'fan';
      if(caption.length<6||caption.length>650)return fail(res,400,'Add a description between 6 and 650 characters.'),true;
      if(!source)return fail(res,400,'Enter a public TikTok video or Instagram post/Reel URL.'),true;
      if(category==='fansite'&&!approvedFansite(u.id))return fail(res,403,'Fansite publishing requires management approval.'),true;
      if(state.posts.some(p=>p.authorId===u.id&&p.url===source.url&&!p.hidden))return fail(res,409,'You already shared this post.'),true;
      const day=now().slice(0,10);
      if(state.posts.filter(p=>p.authorId===u.id&&p.createdAt.slice(0,10)===day).length>=5)return fail(res,429,'Limit 5 submissions per day in this development preview.'),true;
      const post={id:id(),authorId:u.id,category,caption,url:source.url,platform:source.platform,embedKind:source.embedKind,embedId:source.embedId,createdAt:now(),hidden:false};
      state.posts.push(post);
      const credit=state.dailyCredits[u.id]||{day,count:0};if(credit.day!==day){credit.day=day;credit.count=0;}
      let pointsAwarded=0;
      if(credit.count<2){pointsAwarded=50;u.state.pullPoints=(u.state.pullPoints||0)+50;credit.count++;}
      state.dailyCredits[u.id]=credit;
      profileFor(u.id).xp+=15;
      save();return json(res,201,{ok:true,postId:post.id,pullPointsAwarded:pointsAwarded,fanXPAwarded:15}),true;
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
  return {info,handlePost};
};
