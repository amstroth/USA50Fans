/* Instagram-inspired USA50 profile and navigation, loaded after the existing modules. */
(function(){
'use strict';
let settingsOpen=false,profileTab='posts';
const rings=['classic','starlight','pink-ribbon','moonlight','golden-hour'];
const ringNames={'classic':'Classic','starlight':'Starlight','pink-ribbon':'Pink Ribbon','moonlight':'Moonlight','golden-hour':'Golden Hour'};
function current(){return store?.social?.myProfile||null;}
function pictures(person){
 const ring=rings.includes(person?.ring)?person.ring:'classic';
 return '<span class="usa50-avatar-frame ring-'+ring+'"><span class="usa50-avatar-inner">'+(person?.avatarUrl?'<img src="'+e(person.avatarUrl)+'" alt="Profile picture">':'<span>'+e((person?.displayName||'F').charAt(0).toUpperCase())+'</span>')+'</span></span>';
}
function postPreview(post){
 const thumbnail=typeof post.thumbnailUrl==='string' && /^https:\/\//i.test(post.thumbnailUrl)?post.thumbnailUrl:null;
 if(thumbnail)return '<img class="usa50-profile-thumb" src="'+e(thumbnail)+'" alt="Thumbnail for '+e(post.caption||'shared post')+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true">';
 // TikTok embeds show the video's original poster when provider thumbnail metadata is unavailable.
 if(post.platform==='TikTok'&&/^[0-9]{12,25}$/.test(String(post.embedId||''))){
  return '<iframe class="usa50-profile-embed usa50-profile-tiktok" title="TikTok post preview" tabindex="-1" loading="lazy" src="https://www.tiktok.com/player/v1/'+e(post.embedId)+'?controls=0&description=0&music_info=0&autoplay=0" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
 }
 // For Instagram, use the shared post's actual public embed instead of a generic pink placeholder.
 if(post.platform==='Instagram'&&/^[A-Za-z0-9_-]{5,32}$/.test(String(post.embedId||''))&&['p','reel','tv'].includes(post.embedKind)){
  return '<iframe class="usa50-profile-embed usa50-profile-instagram" title="Instagram post preview" tabindex="-1" loading="lazy" src="https://www.instagram.com/'+e(post.embedKind)+'/'+e(post.embedId)+'/embed/" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
 }
 return '<span class="usa50-profile-fallback">'+(post.platform==='TikTok'?'♪':'◎')+'</span>';
}
function gridPosts(person,tab){
 const posts=(store?.social?.posts||[]).filter(p=>tab==='saved'?(store?.social?.savedPostIds||[]).includes(p.id):tab==='reposts'?p.authorId===person.id&&!!p.repostOf:p.authorId===person.id&&!p.repostOf).slice().reverse();
 return posts.length?'<div class="usa50-profile-grid">'+posts.map(p=>'<button class="usa50-profile-tile" data-action="social-open-post" data-value="'+e(p.id)+'" aria-label="Open shared post">'+postPreview(p)+'<span class="usa50-profile-platform">'+(p.platform==='TikTok'?'♪':'◎')+'</span></button>').join('')+'</div>':'<p class="usa50-profile-empty">No '+(tab==='reposts'?'reposts':tab==='saved'?'saved posts':'posts')+' yet.</p>';
}
window.USA50RenderFanProfile=function(person,own){
 if(!person)return '<p class="lead">This profile is unavailable.</p>';
 const mine=store?.me?.id===person.id;
 const ownView=own===true;
 const tabs=[['posts','▦','Posts'],['reposts','↻','Reposts']].concat(mine?[['saved','♡','Saved']]:[]);
 return '<section class="usa50-instagram-profile">'+
 '<div class="usa50-profile-title"><strong>@'+e(person.handle)+'</strong>'+(ownView?'<button class="usa50-profile-menu" data-action="usa50-settings" aria-label="Account settings">'+icon('menu',23)+'</button>':'')+'</div>'+
 '<div class="usa50-profile-main">'+(mine?'<button class="usa50-change-avatar" data-action="usa50-edit-profile" aria-label="Edit profile picture">'+pictures(person)+'</button>':pictures(person))+
 '<div class="usa50-profile-stats"><div><b>'+Number(person.postsCount||0)+'</b><small>Posts</small></div><div><b>'+Number(person.followers||0)+'</b><small>Followers</small></div><div><b>'+Number(person.following||0)+'</b><small>Following</small></div></div></div>'+
 '<div class="usa50-profile-details"><strong>'+e(person.displayName)+'</strong><p>'+e(person.bio||'Fan of USA50 ♡')+'</p><div class="usa50-vip-row"><span class="usa50-vip-badge vip-'+e(String(person.vipLevel||'Starter').toLowerCase().replace(/[^a-z0-9]/g,''))+'">'+({'starter':'✦','bronze':'🥉','silver':'🥈','gold':'🏆','platinum':'🏆','diamond':'💎'}[String(person.vipLevel||'Starter').toLowerCase()]||'🏆')+' VIP '+e(person.vipLevel||'Starter')+'</span><span class="usa50-rank-badge '+(person.rank===1?'rank-gold':person.rank===2?'rank-silver':person.rank===3?'rank-bronze':person.rank&&person.rank<=10?'rank-purple':'rank-plain')+'">'+(person.rank===1?'🏆':person.rank===2?'🥈':person.rank===3?'🥉':'♛')+' Rank '+(person.rank?'#'+person.rank:'Unranked')+'</span><span>'+Number(person.fanXP||0)+' Fan XP</span></div></div>'+
 '<div class="usa50-profile-buttons">'+(mine?'<button class="btn secondary" data-action="usa50-edit-profile">Edit profile</button>':store.me?'<button class="btn" data-action="social-follow" data-value="'+e(person.id)+'">'+(person.isFollowing?'Following':'Follow +')+'</button>':'')+
 (ownView?'<button class="btn secondary" data-action="usa50-settings">Account settings</button>':'')+'</div>'+
 '<div class="usa50-profile-tabs" role="tablist">'+tabs.map(t=>'<button role="tab" aria-selected="'+(profileTab===t[0])+'" class="'+(profileTab===t[0]?'selected':'')+'" data-action="usa50-profile-tab" data-value="'+t[0]+'" title="'+t[2]+'"><span>'+t[1]+'</span><small>'+t[2]+'</small></button>').join('')+'</div>'+gridPosts(person,profileTab)+'</section>';
};
const originalProfile=profileScreen;
profileScreen=function(){
 if(!store?.me)return originalProfile();
 if(settingsOpen)return '<button class="usa50-settings-back" data-action="usa50-profile-back">← Back to profile</button>'+originalProfile();
 return window.USA50RenderFanProfile(current(),true);
};
const previousBottom=bottomNav;
bottomNav=function(){
 const html=previousBottom();
 return html.replace(/(<button class="bottom-link[^>]*data-go="messages"[\s\S]*?<\/button>)/, '$1<button class="usa50-nav-compose" data-action="social-new-post" aria-label="Create social post" title="Create post">'+icon('plus',25)+'</button>');
};
function editProfile(){
 const p=current();if(!p)return;
 const owned=p.unlockedRings||['classic'];
 const pick=rings.map(r=>'<label class="usa50-ring-option"><input type="radio" name="ring" value="'+r+'" '+(p.ring===r?'checked ':'')+(!owned.includes(r)?'disabled':'')+'><span class="usa50-ring-swatch ring-'+r+'"></span><small>'+ringNames[r]+(owned.includes(r)?'':' · Locked')+'</small></label>').join('');
 showModal('Edit profile','<form class="form-grid" id="usa50-profile-form"><div class="form-field"><label>Profile photo</label><input type="file" name="avatar" accept="image/png,image/jpeg,image/webp"><small>Choose a picture (automatically resized before saving).</small></div><div class="form-field"><label>Bio</label><textarea name="bio" maxlength="180" rows="3">'+e(p.bio||'')+'</textarea></div><div class="form-field"><label>Decorative profile ring</label><div class="usa50-ring-options">'+pick+'</div><small>New rings can drop during photocard pulls.</small></div><button class="btn" type="submit">Save profile</button></form>');
}
function compressPhoto(file){
 return new Promise((resolve,reject)=>{
 if(!file.type.match(/^image\/(jpeg|png|webp)$/)||file.size>8000000)return reject(Error('Choose a JPG, PNG or WebP image under 8 MB.'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{try{const side=224,canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;const ctx=canvas.getContext('2d');const size=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-size)/2,(img.height-size)/2,size,size,0,0,side,side);URL.revokeObjectURL(url);const data=canvas.toDataURL('image/jpeg',.72);if(data.length>205000)throw Error('Image is too large.');resolve(data);}catch(err){reject(err);}};
 img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not read picture.'));};img.src=url;
 });
}
const previousAct=act;
act=async function(name,node){
 if(name==='usa50-settings'){settingsOpen=true;render();return;}
 if(name==='usa50-profile-back'){settingsOpen=false;render();return;}
 if(name==='usa50-edit-profile')return editProfile();
 if(name==='usa50-profile-tab'){profileTab=node.dataset.value;render();return;}
 if(name==='usa50-repost'){if(!store.me)return go('profile');if(!confirm('Repost this fan post to your profile?'))return;await request('/api/social/repost',{method:'POST',body:JSON.stringify({postId:node.dataset.value})});await refresh();toast('Reposted to your profile.');return;}
 if(name==='usa50-save'){if(!store.me)return go('profile');const response=await request('/api/social/save',{method:'POST',body:JSON.stringify({postId:node.dataset.value})});await refresh();toast(response.saved?'Post saved.':'Post removed from saved.');return;}
 return previousAct(name,node);
};
const previousSubmit=submitForm;
submitForm=async function(form){
 if(form.id==='usa50-profile-form'){
 const fd=new FormData(form),file=fd.get('avatar'),payload={bio:String(fd.get('bio')||''),ring:String(fd.get('ring')||'classic')};
 if(file&&file.size)payload.avatarUrl=await compressPhoto(file);
 await request('/api/social/profile',{method:'POST',body:JSON.stringify(payload)});
 hideModal();await refresh();toast('Profile updated.');return;
 }
 return previousSubmit(form);
};
const oldGo=go;
go=function(screen){
 if(screen==='profile')settingsOpen=false;
 return oldGo(screen);
};
})();
