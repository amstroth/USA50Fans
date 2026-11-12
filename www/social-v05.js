/* USA50 Social Hub v0.5 — public fans, fansites, original-platform embeds. */
(function(){
 'use strict';
 let socialTab='recent',openSocialProfile=null,tourOpen=localStorage.getItem('usa50-social-tour-seen')!=='1';
 const getSocial=()=>store?.social||{posts:[],profiles:{},rankings:[],following:[]};
 const getPerson=id=>getSocial().profiles[id]||null;
 const getPosts=()=>getSocial().posts||[];
 const labelTier=rank=>rank&&rank<=3?'UltraFan':rank&&rank<=10?'SuperFan':rank&&rank<=50?'BigFan':'Fan';
 const tierIcon=rank=>rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank&&rank<=10?'✦':rank&&rank<=50?'♡':'';
 function socialTabs(){
   const tabs=[['recent','Recent'],['top','Top Posts'],['following','Following'],['fansites','Fansites'],['rankings','Top 100']];
   return '<div class="social-tabs" role="tablist" aria-label="Community sections">'+tabs.map(t=>
     '<button type="button" role="tab" aria-selected="'+(socialTab===t[0])+'" class="social-tab '+(socialTab===t[0]?'selected':'')+'" data-action="social-tab" data-value="'+t[0]+'">'+t[1]+'</button>'
   ).join('')+'</div>';
 }
 function fanTutorial(){
   return '<section class="glass panel social-tutorial">'+
     '<div class="social-tutorial-top"><div><span class="eyebrow">WELCOME TO THE FAN UNIVERSE</span><h2>Share. Shine. Earn. ✧</h2></div><button class="text-btn" data-action="social-tour-dismiss" aria-label="Hide tutorial">✕</button></div>'+
     '<div class="social-tutorial-grid">'+
       '<div><b>01 · Share your edit</b><p>Post a link to a public TikTok or Instagram edit, fancam or fan photo. Eligible posts earn <strong>50 Pull Points</strong> (first two per day) plus Fan XP.</p></div>'+
       '<div><b>02 · Collect votes</b><p>Get upvotes from USA50 fans. Every <strong>100 qualifying upvotes</strong> across your posts grants one <strong>Fancall Entry Ticket</strong> in this preview.</p></div>'+
       '<div><b>03 · Climb the ranks</b><p>Earn Fan XP to reach BigFan, SuperFan and UltraFan. Higher ranks unlock proposed sneak peeks, shop discounts and ticket priority.</p></div>'+
     '</div><p class="social-fineprint">Tickets and perks are demo previews, not live contest entries. External-platform likes do not count; only in-app votes do. Community content is subject to moderation.</p></section>';
 }
 function socialEmbed(post){
   const url=e(post.url);
   if(post.embedKind==='tiktok' && /^[0-9]{12,25}$/.test(post.embedId||'')){
     return '<div class="social-embed social-tiktok"><iframe loading="lazy" title="TikTok fan content" src="https://www.tiktok.com/player/v1/'+post.embedId+'?description=1&music_info=1" allow="fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
   }
   if(['p','reel','tv'].includes(post.embedKind) && /^[a-zA-Z0-9_-]{5,32}$/.test(post.embedId||'')){
     return '<div class="social-embed social-instagram"><blockquote class="instagram-media" data-instgrm-permalink="'+url+'" data-instgrm-captioned="true" data-instgrm-version="14"><a href="'+url+'" target="_blank" rel="noopener noreferrer">Open this Instagram post</a></blockquote><a class="social-embed-fallback" href="'+url+'" target="_blank" rel="noopener noreferrer">View original on Instagram ↗</a></div>';
   }
   return '';
 }
 function socialPost(p,compact=false){
   const author=getPerson(p.authorId),isMine=store.me?.id===p.authorId,isAdmin=store.me?.role==='admin';
   if(!author)return '';
   const code='<button class="social-handle" data-action="social-profile" data-value="'+e(author.id)+'">@'+e(author.handle)+'</button>';
   const mark=author.fansite?'<span class="social-mini-badge">Verified Fansite</span>':'<span class="social-mini-badge">Fan Content</span>';
   return '<article class="glass social-post" id="socialpost-'+e(p.id)+'">'+
     '<div class="social-post-head"><div class="social-avatar">'+e(author.displayName.slice(0,1).toUpperCase())+'</div><div class="social-post-author">'+code+'<small>'+e(author.displayName)+' · '+e(labelDate(p.createdAt))+'</small></div>'+mark+'</div>'+
     '<p class="social-caption">'+e(p.caption)+'</p>'+socialEmbed(p)+
     '<div class="social-post-footer"><div class="social-votes">'+
       '<button aria-label="Upvote" class="social-vote '+(p.myVote===1?'on':'')+'" data-action="social-vote" data-value="'+e(p.id)+'" data-vote="1">▲ '+Number(p.upvotes||0)+'</button>'+
       '<button aria-label="Downvote" class="social-vote down '+(p.myVote===-1?'on':'')+'" data-action="social-vote" data-value="'+e(p.id)+'" data-vote="-1">▼ '+Number(p.downvotes||0)+'</button>'+
       '<span class="social-score">'+(p.score>0?'+':'')+Number(p.score||0)+' score</span></div>'+
       '<div class="social-post-links"><a href="'+e(p.url)+'" target="_blank" rel="noopener noreferrer">Open on '+e(p.platform)+' ↗</a>'+
       (isMine?'':isAdmin?'<button class="text-btn" data-action="social-admin-hide" data-value="'+e(p.id)+'">Remove</button>':'<button class="text-btn" data-action="social-report" data-value="'+e(p.id)+'">Report</button>')+
       '</div></div></article>';
 }
 function socialFeed(){
   let posts=getPosts().slice();
   if(socialTab==='top')posts.sort((a,b)=>b.score-a.score||b.upvotes-a.upvotes||Date.parse(b.createdAt)-Date.parse(a.createdAt));
   else posts.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
   if(socialTab==='following')posts=posts.filter(p=>getSocial().following.includes(p.authorId));
   if(socialTab==='fansites')posts=posts.filter(p=>p.category==='fansite');
   const special=socialTab==='fansites'?
      '<section class="glass panel social-fansite-banner"><span class="eyebrow">FANSITES · PROFESSIONAL CREATOR PROGRAM</span><h2>Through the fans’ lens ✦</h2><p>Approved high-quality USA50 photographers and videographers receive priority press-area opportunities, press gifts, and—proposed for each comeback—one complimentary event and two discounted event passes, subject to venue capacity and management approval.</p><button class="btn" data-action="open-fansite-application">Apply to Be a Fansite '+icon('arrow',15)+'</button><p class="social-fineprint">Application requires camera equipment details and a strong original USA50 portfolio. Access is not yet active.</p></section>'+
       '<div class="social-section-heading"><h2>Approved Fansites</h2></div>'+fansiteFeed()+
       '<div class="social-section-heading"><h2>Fansite Content</h2></div>':'';
   const text=socialTab==='top'?'Most upvoted USA50 fan posts':socialTab==='following'?'Recent posts from fans you follow':socialTab==='fansites'?'Photos and videos by approved fansites':'Most recent posts from the USA50 community, including creators you follow';
   return special+'<div class="social-section-heading"><div><h2>'+text+'</h2><small>'+(posts.length>0?posts.length+' posts':'New content will appear here')+'</small></div><button class="btn" data-action="social-new-post">'+icon('plus',15)+' Share an Edit</button></div>'+
      (posts.length?'<div class="social-feed">'+posts.slice(0,20).map(p=>socialPost(p)).join('')+'</div>':
       '<div class="glass panel social-empty"><strong>No posts in this section yet ♡</strong><p>Share your favorite USA50 edit using an original Instagram or TikTok link, or follow other fans.</p><button class="btn secondary" data-action="social-new-post">Share content</button></div>');
 }
 function rewardTierCards(){
   const rows=[
     ['BigFan','Ranks 11–50','5% fan-shop discount, member sneak peeks and a fan profile badge'],
     ['SuperFan','Ranks 4–10','10% fan-shop discount, 24-hour early ticket window, one bonus fancall ticket per comeback'],
     ['UltraFan','Ranks 1–3','15% fan-shop discount, 48-hour early ticket window, signed collector rewards and exclusive preview invitations'],
   ];
   return '<div class="social-benefits">'+rows.map(x=>'<div class="glass social-benefit"><div class="eyebrow">'+x[1]+'</div><h3>'+x[0]+'</h3><p>'+x[2]+'</p></div>').join('')+'</div>'+
      '<div class="glass panel social-top-three"><h3>The Top Three · Proposed special prizes</h3><p>🥇 #1 — Personalized signed collector gift and private digital greeting.</p><p>🥈 #2 — Signed collector bundle and exclusive early listening preview.</p><p>🥉 #3 — Signed photocard edition and VIP event priority.</p><small>Not live entitlements. Management must finalize eligibility, capacity, duration, and rules before offering any rewards.</small></div>';
 }
 function socialRanking(){
   const ranks=getSocial().rankings||[];
   return '<div class="social-section-heading"><div><span class="eyebrow">USA50 FAN LEADERBOARD</span><h2>Top 100 Fans</h2><p class="lead">Contributions and verified community engagement, not spending, determine Fan XP.</p></div></div>'+
      '<div class="glass panel social-rank-panel">'+
      (ranks.length?ranks.map(item=>{
        const user=getPerson(item.id);if(!user)return '';
        return '<button class="social-rank-row" data-action="social-profile" data-value="'+e(item.id)+'"><span class="social-rank-num">'+(tierIcon(item.rank)||item.rank)+'</span><span class="social-rank-person"><strong>@'+e(user.handle)+'</strong><small>'+e(user.displayName)+' · '+item.posts+' posts</small></span><span class="social-rank-points">'+item.xp+' XP</span><span class="social-rank-tier">'+e(item.tier)+'</span></button>';
      }).join(''):'<p class="social-empty">The ranking opens as fans share content.</p>')+
      '</div>'+rewardTierCards();
 }
 function socialProfileView(){
   const person=getPerson(openSocialProfile),own=store.me?.id===openSocialProfile;
   if(!person)return '<div class="glass panel">This fan profile is not available.</div>';
   const posts=getPosts().filter(p=>p.authorId===openSocialProfile).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
   return '<button class="text-btn social-back" data-action="social-back">← Back to Social Hub</button>'+
      '<section class="glass panel social-public-profile"><div class="social-profile-heading"><div class="social-avatar large">'+e(person.displayName.charAt(0).toUpperCase())+'</div><div><span class="eyebrow">'+e(person.fansite?'APPROVED FANSITE · ':'')+e(person.tier)+'</span><h2>@'+e(person.handle)+'</h2><p>'+e(person.bio||'Fan of USA50 ♡')+'</p></div></div>'+
      '<div class="social-profile-stats"><div><strong>'+person.postsCount+'</strong><small>Posts</small></div><div><strong>'+person.followers+'</strong><small>Followers</small></div><div><strong>'+person.following+'</strong><small>Following</small></div><div><strong>'+(person.rank?'#'+person.rank:'—')+'</strong><small>Rank</small></div></div>'+
      '<div class="social-profile-foot"><span class="social-mini-badge">VIP '+e(person.vipLevel)+'</span><span class="social-mini-badge">'+person.fanXP+' Fan XP</span>'+
      (own?'<button class="btn secondary tiny" data-action="social-edit-bio">Edit bio</button>':store.me?'<button class="btn tiny" data-action="social-follow" data-value="'+e(person.id)+'">'+(person.isFollowing?'Following ✓':'Follow +')+'</button>':'')+'</div></section>'+
      '<div class="social-section-heading"><h2>Fan content grid</h2><small>'+posts.length+' posts</small></div>'+
      (posts.length?'<div class="social-profile-grid">'+posts.map(p=>'<button class="social-profile-tile" data-action="social-open-post" data-value="'+e(p.id)+'"><span class="social-platform-icon">'+(p.platform==='TikTok'?'♪':'◎')+'</span><strong>'+e(p.caption)+'</strong><small>▲ '+p.upvotes+' · '+e(p.platform)+'</small></button>').join('')+'</div>':'<div class="glass panel">No public posts yet.</div>');
 }
 const oldCommunity=communityScreen;
 communityScreen=function(){
   const social=getSocial();
   let page=screenTop('Social Hub','Your favorite USA50 moments, shared by the fans.',btn('How rewards work','social-tour-show','','btn secondary'));
   if(openSocialProfile)return page+socialProfileView();
   page+='<div class="glass panel social-hero"><div><span class="eyebrow">USA50 · THE SOCIAL UNIVERSE</span><h2>Every fan is part of the story ✦</h2><p>Share your edits and fancams, support the creators you love, and rise through the rankings.</p></div><span class="social-hero-stars">✧ ♡ ✦</span></div>';
   if(tourOpen)page+=fanTutorial();
   page+=socialTabs();
   page+=socialTab==='rankings'?socialRanking():socialFeed();
   return page;
 };
 function openPostModal(post){
   if(!post)return;
   showModal('Fan post',socialPost(post));
   runInstagramEmbeds();
 }
 function newSocialPostModal(){
   if(!store.me)return showModal('Join the community','<p class="lead">Create a free USA50 fan account before sharing your fan content.</p><button class="btn" data-go="profile">Join free</button>');
   const isFansite=getSocial().myProfile?.fansite;
   showModal('Share your USA50 edit ♡','<p class="lead">Paste a public Instagram post/Reel or TikTok video. Your original post stays on its platform, and fans can visit it directly.</p>'+
      '<form id="social-post-form" class="form-grid"><div class="form-field"><label>Your caption</label><textarea name="caption" required maxlength="650" minlength="6" placeholder="My new USA50 edit… ♡"></textarea></div>'+
      '<div class="form-field"><label>Original TikTok or Instagram URL</label><input name="url" type="url" required placeholder="https://www.tiktok.com/@yourhandle/video/..."></div>'+
      '<div class="form-field"><label>Publish in</label><select name="category"><option value="fan">Fan Content</option>'+
      (isFansite?'<option value="fansite">Approved Fansites</option>':'')+'</select></div>'+
      '<p class="social-fineprint">Earn 50 demo Pull Points on each of your first two qualifying posts daily, plus Fan XP. Public links and original content only; 5 posts per day maximum.</p><button class="btn" type="submit">Share post</button></form>');
 }
 function runInstagramEmbeds(){
   setTimeout(function(){try{if(window.instgrm && window.instgrm.Embeds)window.instgrm.Embeds.process();}catch(_e){}},120);
 }
 const previousRender=render;
 render=function(){previousRender();if(view==='community')runInstagramEmbeds();};
 const previousAct=act;
 act=async function(name,node){
   if(name==='social-tab'){socialTab=node.dataset.value;openSocialProfile=null;render();return;}
   if(name==='social-tour-dismiss'){tourOpen=false;localStorage.setItem('usa50-social-tour-seen','1');render();return;}
   if(name==='social-tour-show'){tourOpen=true;openSocialProfile=null;render();return;}
   if(name==='social-new-post')return newSocialPostModal();
   if(name==='social-profile'){openSocialProfile=node.dataset.value;render();return;}
   if(name==='social-back'){openSocialProfile=null;render();return;}
   if(name==='social-open-post')return openPostModal(getPosts().find(p=>p.id===node.dataset.value));
   if(name==='social-edit-bio'){
     const person=getSocial().myProfile;return showModal('Edit profile bio','<form id="social-bio-form" class="form-grid"><div class="form-field"><label>About you (180 characters)</label><textarea name="bio" maxlength="180">'+e(person?.bio||'')+'</textarea></div><button class="btn" type="submit">Save bio</button></form>');
   }
   if(name==='social-vote'){
     if(!store.me)return toast('Sign in to vote on fan posts.');
     const desired=Number(node.dataset.vote),postId=node.dataset.value;
     await request('/api/social/vote',{method:'POST',body:JSON.stringify({postId,vote:desired})});
     await refresh();return;
   }
   if(name==='social-follow'){
     await request('/api/social/follow',{method:'POST',body:JSON.stringify({userId:node.dataset.value})});
     await refresh();return;
   }
   if(name==='social-report'){
     if(!store.me)return toast('Sign in before reporting.');
     await request('/api/social/report',{method:'POST',body:JSON.stringify({postId:node.dataset.value,reason:'Flagged by community member'})});
     toast('Report sent to USA50 management.');return;
   }
   if(name==='social-admin-hide'){
     if(!confirm('Remove this post from the Social Hub?'))return;
     await request('/api/social/moderate',{method:'POST',body:JSON.stringify({action:'hide',postId:node.dataset.value})});
     await refresh();return;
   }
   if(name==='social-mod-resolve'){
     await request('/api/social/moderate',{method:'POST',body:JSON.stringify({action:'resolve',reportId:node.dataset.value})});
     await refresh();return showAdmin();
   }
   if(name==='social-mod-ban'){
     if(!confirm('Change this fan’s Social Hub posting access?'))return;
     await request('/api/social/moderate',{method:'POST',body:JSON.stringify({action:'ban',userId:node.dataset.value,banned:node.dataset.banned==='true'})});
     await refresh();return showAdmin();
   }
   return previousAct(name,node);
 };
 const previousSubmit=submitForm;
 submitForm=async function(form){
   const v=Object.fromEntries(new FormData(form));
   if(form.id==='social-post-form'){
     const result=await request('/api/social/post',{method:'POST',body:JSON.stringify(v)});
     hideModal();socialTab=v.category==='fansite'?'fansites':'recent';openSocialProfile=null;await refresh();
     toast('Posted! +15 Fan XP'+(result.pullPointsAwarded?' and +'+result.pullPointsAwarded+' Pull Points.':'.'));return;
   }
   if(form.id==='social-bio-form'){
     await request('/api/social/bio',{method:'POST',body:JSON.stringify(v)});
     hideModal();await refresh();toast('Profile updated.');return;
   }
   return previousSubmit(form);
 };
 const priorShowAdmin=showAdmin;
 showAdmin=async function(){
   await priorShowAdmin();
   const el=document.querySelector('#admin-content');
   if(!el||store.me?.role!=='admin')return;
   const social=getSocial();
   const pending=social.reports||[];
   el.insertAdjacentHTML('beforeend','<section class="glass panel" style="margin-top:18px"><div class="eyebrow">SOCIAL CONTENT MODERATION</div><h3>Fan Content reports</h3>'+
    (pending.length?pending.map(r=>'<div class="social-mod-report"><strong>'+e(r.reason)+'</strong><span>Post '+e(r.postId.slice(0,8))+'</span><button class="btn secondary tiny" data-action="social-mod-resolve" data-value="'+e(r.id)+'">Resolve</button><button class="btn tiny" data-action="social-admin-hide" data-value="'+e(r.postId)+'">Remove Post</button></div>').join(''):'<p class="lead">No outstanding social reports.</p>')+
    '<p class="social-fineprint">Management can remove reported posts and suspend offending accounts. Staff do not receive unrelated private idol conversations.</p></section>');
 };
})();
