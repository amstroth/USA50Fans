/* USA50 social roles, idol awards and oshi profile surfaces. */
(function(){
'use strict';
const idolNames=()=>store?.members||[];
const profileInfo=()=>store?.social?.myProfile||null;
let idolTab='hashtag';
function verified(){
 return '<span class="usa50-idol-verified" title="Verified USA50 idol" aria-label="Verified USA50 idol">★<i>✓</i></span>';
}
function previewPost(p){
 const image=p.thumbnailUrl&&/^https:\/\//.test(p.thumbnailUrl)?'<img loading="lazy" alt="Shared social post" src="'+e(p.thumbnailUrl)+'">':
 p.platform==='TikTok'&&/^\d{12,25}$/.test(p.embedId||'')?'<iframe title="TikTok shared post" loading="lazy" tabindex="-1" src="https://www.tiktok.com/player/v1/'+e(p.embedId)+'?controls=0&autoplay=0"></iframe>':
 '<span class="usa50-no-image">'+(p.platform==='TikTok'?'♪':'◎')+'</span>';
 return '<button class="usa50-profile-tile" data-action="social-open-post" data-value="'+e(p.id)+'" aria-label="Open post">'+image+'</button>';
}
function enhanceProfile(html,person,own){
 if(!person)return html;
 const root=document.createElement('div');root.innerHTML=html;
 const title=root.querySelector('.usa50-profile-title strong');
 if(title&&person.verifiedIdol)title.insertAdjacentHTML('afterend',verified());
 const avatar=root.querySelector('.usa50-avatar-frame');
 if(avatar){
  const ring=person.ring||'classic';
  const auto=person.rankBorder&&(ring==='classic'||ring==='rank-auto');
  if(person.verifiedIdol){
   avatar.classList.add('usa50-idol-avatar');
   avatar.style.setProperty('--idol-border-color',person.idolBorderColor||'#F4A1C8');
   avatar.insertAdjacentHTML('beforeend','<span class="usa50-avatar-award star">★<i>✓</i></span>');
  }else if(auto){
   avatar.classList.add('usa50-ranked-avatar','usa50-ranked-'+person.rankBorder);
   avatar.insertAdjacentHTML('beforeend','<span class="usa50-avatar-award">'+(person.rankBorder==='gold'?'🏆':person.rankBorder==='silver'?'🥈':person.rankBorder==='bronze'?'🥉':'✦')+'</span>');
  }
 }
 if(person.verifiedIdol){
  const stats=root.querySelector('.usa50-profile-stats');
  if(stats)stats.insertAdjacentHTML('beforeend','<div><b>'+Number(person.oshiCount||0)+'</b><small>Oshi fans</small></div>');
  const oldTabs=root.querySelector('.usa50-profile-tabs');
  const oldGrid=root.querySelector('.usa50-profile-grid,.usa50-profile-empty');
  const all=store?.social?.posts||[];
  const hashtag='#'+String(person.handle||person.displayName).toLowerCase();
  const posts=all.filter(p=>idolTab==='hearted'?(p.heartedBy||[]).some(h=>h.id===person.id):idolTab==='hashtag'?(p.caption||'').toLowerCase().includes(hashtag):p.authorId===person.id).slice().reverse();
  const tabs='<div class="usa50-profile-tabs usa50-idol-post-tabs">'+[['hashtag','#','Hashtag'],['hearted','♥','Hearted'],['posts','▦','Posts']].map(([key,ico,label])=>'<button type="button" class="'+(idolTab===key?'selected':'')+'" data-action="usa50-idol-tab" data-value="'+key+'"><span>'+ico+'</span><small>'+label+'</small></button>').join('')+'</div>';
  if(oldTabs)oldTabs.outerHTML=tabs;
  const grid=posts.length?'<div class="usa50-profile-grid">'+posts.map(previewPost).join('')+'</div>':'<div class="usa50-profile-empty">No '+(idolTab==='hashtag'?hashtag+' posts':idolTab==='hearted'?'hearted posts':'posts')+' yet.</div>';
  if(oldGrid)oldGrid.outerHTML=grid;else root.querySelector('.usa50-idol-post-tabs')?.insertAdjacentHTML('afterend',grid);
 }
 if(person.oshiIds?.length){
  const badges='<div class="usa50-oshi-badges">'+person.oshiIds.map(id=>'<span>♡ '+e(idolNames().find(m=>m.id===id)?.name||id)+' Oshi</span>').join('')+'</div>';
  const row=root.querySelector('.usa50-vip-row');
  if(row)row.insertAdjacentHTML('beforeend',badges);
 }
 if(own){
  const unread=(store?.social?.notifications||[]).filter(n=>!n.read);
  if(unread.length){
   const notice='<div class="usa50-heart-notifications"><strong>New idol hearts ✦</strong>'+unread.slice(0,8).map(n=>'<p>♥ '+e(n.text)+'</p>').join('')+'<button class="btn tiny secondary" data-action="usa50-notifications-read">Mark read</button></div>';
   root.querySelector('.usa50-profile-title')?.insertAdjacentHTML('afterend',notice);
  }
 }
 return root.innerHTML;
}
const originalRenderer=window.USA50RenderFanProfile;
if(typeof originalRenderer==='function'){
 window.USA50RenderFanProfile=function(person,own){return enhanceProfile(originalRenderer(person,own),person,own)};
}
function editProfileExtended(){
 const p=profileInfo();if(!p)return;
 const opts=(idolNames()).map(m=>'<label class="usa50-oshi-option"><input type="checkbox" name="oshiIds" value="'+e(m.id)+'" '+((p.oshiIds||[]).includes(m.id)?'checked':'')+'> ♡ '+e(m.name)+'</label>').join('');
 const unlocked=p.unlockedRings||['classic'];
 const rings=[['rank-auto','Rank award (automatic)'],['classic','Classic'],['starlight','Starlight'],['pink-ribbon','Pink Ribbon'],['moonlight','Moonlight'],['golden-hour','Golden Hour']];
 const ringChoices=rings.map(([r,label])=>'<label class="usa50-custom-ring"><input type="radio" name="ring" value="'+r+'" '+((p.ring||'classic')===r?'checked':'')+' '+((r!=='rank-auto'&&!unlocked.includes(r))?'disabled':'')+'> '+e(label)+'</label>').join('');
 const identity=p.verifiedIdol?'<p class="lead">Verified username: @'+e(p.handle)+'</p><label>Official star border color <input name="idolBorderColor" type="color" value="'+e(p.idolBorderColor||'#F4A1C8')+'"></label>':
 '<label>Username <input name="handle" value="'+e(p.handle)+'" required minlength="3" maxlength="22" pattern="[A-Za-z][A-Za-z0-9_]{2,21}"></label><label>Profile picture border <div class="usa50-custom-rings">'+ringChoices+'</div></label>';
 showModal('Edit your profile','<form id="usa50-extended-profile" class="form-grid"><label>Profile picture<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp"></label>'+identity+
 '<label>Bio<textarea name="bio" maxlength="180" rows="3">'+e(p.bio||'')+'</textarea></label>'+
 '<div class="form-field"><label>Your oshi / bias (select multiple)</label><div class="usa50-oshi-options">'+opts+'</div></div>'+
 '<button class="btn full" type="submit">Save profile</button></form>');
}
async function readPhoto(file){
 if(!file||!file.size)return null;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8000000)throw Error('Choose a JPEG, PNG or WebP under 8MB.');
 return await new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{try{
   const side=224,can=document.createElement('canvas'),ctx=can.getContext('2d');can.width=side;can.height=side;
   const edge=Math.min(img.width,img.height);
   ctx.drawImage(img,(img.width-edge)/2,(img.height-edge)/2,edge,edge,0,0,side,side);
   URL.revokeObjectURL(url);resolve(can.toDataURL('image/jpeg',0.72));
  }catch(err){reject(err)}};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Unable to read image.'))};
  img.src=url;
 });
}
const priorAct=act;
act=async function(name,node){
 if(name==='usa50-edit-profile')return editProfileExtended();
 if(name==='usa50-idol-tab'){idolTab=node.dataset.value;render();return;}
 if(name==='usa50-notifications-read'){
  await request('/api/social/notifications-read',{method:'POST',body:'{}'});await refresh();return;
 }
 return priorAct(name,node);
};
const priorSubmit=submitForm;
submitForm=async function(form){
 if(form.id!=='usa50-extended-profile')return priorSubmit(form);
 const fd=new FormData(form),payload={bio:String(fd.get('bio')||''),oshiIds:fd.getAll('oshiIds').map(String)};
 for(const key of ['handle','ring','idolBorderColor'])if(fd.has(key))payload[key]=String(fd.get(key)||'');
 const img=await readPhoto(fd.get('avatar'));if(img)payload.avatarUrl=img;
 await request('/api/social/profile',{method:'POST',body:JSON.stringify(payload)});
 hideModal();await refresh();toast('Profile updated.');return;
};
const originalMessagesScreen=messagesScreen;
messagesScreen=function(){
 const page=originalMessagesScreen();
 if(!store?.me||store.me.role==='idol')return page;
 const notes=(store?.social?.notifications||[]).filter(n=>n.type==='idol-heart');
 if(!notes.length)return page;
 const notice='<section class="usa50-heart-message-list"><div class="eyebrow">OFFICIAL IDOL HEARTS</div>'+
 notes.slice(0,8).map(n=>'<div class="usa50-heart-message"><span>♥</span><div><strong>'+e(n.text)+'</strong><small>'+e(new Date(n.createdAt).toLocaleDateString())+'</small></div></div>').join('')+
 '<button type="button" class="btn tiny secondary" data-action="usa50-notifications-read">Mark all as read</button></section>';
 return notice+page;
};
const priorRender=render;
render=function(){
 priorRender();
 document.querySelector('.app-shell')?.classList.toggle('usa50-idol-messages-active',view==='messages'&&store?.me?.role==='idol');
};
})();