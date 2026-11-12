/* USA50 Social: official uploads + idol Diary Entries. */
(function(){
'use strict';
const getData=()=>store?.officialDiary||{diaries:[],officialPosts:[],canPost:false,sourceStatus:{}};
const papers=['ruled','grid','dots','none'];
const pageNames={ruled:'Ruled paper',grid:'Boxed paper',dots:'Dotted paper',none:'Blank paper'};
const colors={Cream:'#fff9f0',Blush:'#ffe8f0',Lavender:'#eee7ff',Mint:'#e6f7ee',Blue:'#e5f3ff',White:'#ffffff'};
let diaryPhotos=[];
function textEscape(s){return e(s)}
function diaryDate(d){const t=new Date(d);return Number.isFinite(t.getTime())?t.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}):''}
function paperStyle(entry){
 const sheet=entry.paper||colors.Cream,lines=entry.lineColor||'#c6b7b0';
 const css=entry.layout==='grid'?'background-image:linear-gradient('+lines+'55 1px, transparent 1px),linear-gradient(90deg,'+lines+'55 1px,transparent 1px);background-size:26px 26px;':
 entry.layout==='dots'?'background-image:radial-gradient('+lines+' 1px, transparent 1.4px);background-size:20px 20px;':
 entry.layout==='ruled'?'background-image:repeating-linear-gradient(to bottom,transparent 0px,transparent 27px,'+lines+'55 28px,'+lines+'55 29px);':'';
 return 'background-color:'+sheet+';color:'+(entry.textColor||'#4c3c53')+';'+css;
}
function diaryMarkup(d){
 const serial=String(d.number||1).padStart(4,'0');
 const photos=(d.photos||[]).map(p=>'<figure class="diary-polaroid"><img src="'+textEscape(p.url)+'" alt="Polaroid photo"><figcaption>'+textEscape(p.caption||'A little moment')+'</figcaption></figure>').join('');
 const words=textEscape(d.text||'').replace(/\n/g,'<br>');
 return '<article class="diary-sheet" style="'+paperStyle(d)+'"><div class="diary-sheet-heading"><div><small>USA50 PRIVATE DIARY · '+textEscape(d.author)+'</small><h3>Entry No. '+serial+'</h3></div><time>'+diaryDate(d.publishedAt)+'</time></div><div class="diary-handwriting">'+words+'</div>'+(photos?'<div class="diary-polaroids">'+photos+'</div>':'')+(d.stickers?.length?'<div class="diary-stickers">'+d.stickers.map(textEscape).join(' ')+'</div>':'')+'<div class="diary-signature">with love, '+textEscape(d.author)+' ♡</div></article>';
}
function officialCard(p){
 const symbol=p.platform==='YouTube'?'▶':p.platform==='TikTok'?'♪':'◎';
 return '<a class="glass official-social-card" href="'+textEscape(p.url)+'" target="_blank" rel="noopener noreferrer"><div class="official-social-icon">'+symbol+'</div><div><span class="eyebrow">USA50 OFFICIAL · '+textEscape(p.platform)+'</span><h3>'+textEscape(p.title)+'</h3><small>'+diaryDate(p.publishedAt)+'</small></div><span class="official-open">↗</span></a>';
}
const storyPalette=['#b88ad7','#ef9cc6','#b29bdf','#91c7bb','#e1b5d2','#a5b6eb'];
let storyIdol=null,storyIndex=0,storyTimer=null,storyTouchStart=null,storyFocusReturn=null;
function diaryGroups(){
 const result=new Map(),ordered=(getData().diaries||[]).slice().sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));
 for(const d of ordered){
   const key=d.authorId||d.author;
   if(!result.has(key))result.set(key,{id:key,name:d.author,entries:[]});
   result.get(key).entries.push(d);
 }
 return [...result.values()].sort((a,b)=>Date.parse(b.entries.at(-1).publishedAt)-Date.parse(a.entries.at(-1).publishedAt));
}
function ringAvatar(group,index){
 const member=(store?.members||[]).find(m=>m.name?.toLowerCase()===group.name?.toLowerCase());
 const emoji=member?.emoji||'✦';
 const isArielle=(member?.id==='arielle'||group.name?.toLowerCase()==='arielle');
 const inner=isArielle&&typeof cardPhoto==='string'?'<img src="'+textEscape(cardPhoto)+'" alt="" loading="lazy">':'<span>'+textEscape(emoji)+'</span>';
 return '<span class="diary-story-ring" style="--diary-ring-color:'+storyPalette[index%storyPalette.length]+'"><span class="diary-story-avatar">'+inner+'</span></span>';
}
function diaryStoryStrip(groups,canPost){
 return '<div class="diary-story-strip" role="group" aria-label="USA50 diary story circles">'+
 (canPost?'<button class="diary-story-button diary-story-create" data-action="diary-new" aria-label="Write a diary entry"><span class="diary-story-ring create"><span class="diary-story-avatar"><span>＋</span></span></span><small>Your diary</small></button>':'')+
 groups.map((g,i)=>'<button type="button" class="diary-story-button" data-action="diary-story-open" data-value="'+textEscape(g.id)+'" aria-label="Open '+textEscape(g.name)+' diary, '+g.entries.length+' entries">'+ringAvatar(g,i)+'<small>'+textEscape(g.name)+'</small><span class="diary-story-count">'+g.entries.length+'</span></button>').join('')+
 '</div>';
}
function stopStoryTimer(){if(storyTimer){clearTimeout(storyTimer);storyTimer=null;}}
function closeDiaryStory(){
 stopStoryTimer();storyIdol=null;storyIndex=0;storyTouchStart=null;
 const overlay=document.getElementById('diary-story-overlay');
 if(overlay)overlay.remove();
 document.body.classList.remove('diary-story-open');
 if(storyFocusReturn?.isConnected)storyFocusReturn.focus();
 storyFocusReturn=null;
}
function showStory(){
 const group=diaryGroups().find(g=>g.id===storyIdol);
 if(!group||!group.entries.length){closeDiaryStory();return;}
 const entry=group.entries[storyIndex];if(!entry){closeDiaryStory();return;}
 stopStoryTimer();
 const owner=store?.me?.role==='admin'||store?.me?.id===entry.authorId;
 const progress=group.entries.map((p,i)=>'<span class="diary-story-progress '+(i<storyIndex?'complete':i===storyIndex?'current':'')+'" aria-label="Page '+(i+1)+' of '+group.entries.length+'"></span>').join('');
 const overlay=document.getElementById('diary-story-overlay')||document.createElement('div');
 overlay.id='diary-story-overlay';overlay.className='diary-story-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',group.name+' diary entries');
 const avatar=ringAvatar(group,storyPalette.length-1);
 overlay.innerHTML='<div class="diary-story-backdrop" data-action="diary-story-close"></div>'+
 '<div class="diary-story-viewer"><div class="diary-story-progress-row">'+progress+'</div>'+
 '<header class="diary-story-header">'+avatar+'<div class="diary-story-author"><b>'+textEscape(group.name)+'</b><small>Entry '+String(entry.number).padStart(4,'0')+' · '+diaryDate(entry.publishedAt)+'</small></div>'+
 (owner?'<button class="diary-story-menu" data-action="diary-delete" data-value="'+textEscape(entry.id)+'" aria-label="Delete diary entry">Delete</button>':'')+
 '<button class="diary-story-close" data-action="diary-story-close" aria-label="Close diary">×</button></header>'+
 '<div class="diary-story-paper" tabindex="0">'+diaryMarkup(entry)+'</div>'+
 '<button class="diary-story-nav previous" data-action="diary-story-prev" aria-label="Previous diary entry">‹</button>'+
 '<button class="diary-story-nav next" data-action="diary-story-next" aria-label="Next diary entry">›</button>'+
 '<footer class="diary-story-footer">USA50 · DIARY ENTRIES <span>'+String(storyIndex+1)+' / '+group.entries.length+'</span></footer></div>';
 if(!overlay.isConnected)document.body.appendChild(overlay);
 document.body.classList.add('diary-story-open');
 overlay.querySelector('.diary-story-close')?.focus({preventScroll:true});
 storyTimer=setTimeout(()=>moveStory(1),12000);
}
function moveStory(delta){
 const groups=diaryGroups(),ix=groups.findIndex(g=>g.id===storyIdol);
 if(ix<0){closeDiaryStory();return;}
 const next=storyIndex+delta;
 if(next>=0&&next<groups[ix].entries.length){storyIndex=next;showStory();return;}
 const following=groups[ix+(delta>0?1:-1)];
 if(!following){closeDiaryStory();return;}
 storyIdol=following.id;storyIndex=delta>0?0:following.entries.length-1;showStory();
}
function openDiaryStory(id){
 const group=diaryGroups().find(g=>g.id===id);
 if(!group)return;
 storyFocusReturn=document.activeElement;
 storyIdol=id;storyIndex=0;showStory();
}
function officialDiarySection(){
 const data=getData(),groups=diaryGroups(),official=data.officialPosts||[];
 return '<section class="official-diary-section"><div class="diary-stories-heading"><div><span class="eyebrow">FROM THE IDOLS · USA50</span><h2>Diary Entries ♡</h2></div><span class="diary-story-hint">Tap a story to read</span></div>'+
 (groups.length||data.canPost?diaryStoryStrip(groups,data.canPost):
 '<div class="glass panel diary-empty">The diary is waiting for its first page. ♡<p>New pages from the idols will appear here.</p></div>')+
 '<div class="official-social-block"><div class="social-section-heading"><div><span class="eyebrow">OFFICIAL USA50 UPDATES</span><h2>Official Channels</h2><p class="lead">Latest videos and posts from USA50.</p></div></div>'+
 (official.length?'<div class="official-social-grid">'+official.map(officialCard).join('')+'</div>':
 '<div class="glass panel official-social-empty">Official uploads will appear once the authorized channels are connected.</div>')+'</div>'+
 '<div class="diary-fan-divider"><span>✦ FAN COMMUNITY ✦</span><p>Continue scrolling for fan posts</p></div></section>';
}
const previousCommunity=communityScreen;
communityScreen=function(){const page=previousCommunity();return page.includes('class="social-tabs"')?page.replace('<div class="social-tabs"',officialDiarySection()+'<div class="social-tabs"'):page;};
function diaryNewModal(){
 diaryPhotos=[];
 const options=Object.entries(pageNames).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('');
 const colorChoices=Object.entries(colors).map(([label,value])=>'<option value="'+value+'">'+label+'</option>').join('');
 showModal('Create Diary Entry ♡','<form id="diary-entry-form" class="diary-form"><p class="lead">Your entries are numbered separately from other idols. The date and number are assigned when you publish.</p>'+
 '<div class="diary-form-row"><label>Paper style<select name="layout">'+options+'</select></label><label>Page color<select name="paper">'+colorChoices+'</select></label></div>'+
 '<div class="diary-form-row"><label>Line color<input type="color" name="lineColor" value="#c6b7b0"></label><label>Ink color<input type="color" name="textColor" value="#4c3c53"></label></div>'+
 '<label>What happened today?<textarea name="text" required maxlength="6000" rows="8" placeholder="Dear diary… ✦"></textarea></label>'+
 '<label>Stickers / emoji (choose several)</label><div class="diary-sticker-options">'+['♡','✦','☆','☁️','🌷','🐰','🎀','💌','🫧','🦋','🍒','⭐','🪼','🍀','🦄','✨','💗','🌸'].map(s=>'<button type="button" class="diary-sticker-pick" data-action="diary-sticker" data-value="'+s+'">'+s+'</button>').join('')+'</div>'+
 '<label>Polaroid photos <small>Up to 4 pictures, 700 KB each after resizing</small><input type="file" name="photos" id="diary-photo-picker" accept="image/*" multiple></label>'+
 '<div id="diary-photo-preview" class="diary-upload-preview"></div>'+
 '<div id="diary-live-preview" class="diary-preview"></div>'+
 '<button type="submit" class="btn">Publish Diary Entry ✦</button></form>');
 updateDiaryPreview();
}
function updateDiaryPreview(){
 const form=document.querySelector('#diary-entry-form');if(!form)return;
 const f=new FormData(form);
 const stickers=[...form.querySelectorAll('.diary-sticker-pick.selected')].map(x=>x.dataset.value);
 const item={number:0,author:store.me?.displayName||'USA50 Idol',publishedAt:new Date().toISOString(),text:f.get('text')||'Your diary preview…',layout:f.get('layout'),paper:f.get('paper'),lineColor:f.get('lineColor'),textColor:f.get('textColor'),stickers,photos:[]};
 const area=document.querySelector('#diary-live-preview');if(area)area.innerHTML=diaryMarkup(item);
}
function resizeDiaryPhoto(file){
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith('image/'))return reject(new Error('Choose an image file'));
  if(file.size>12000000)return reject(new Error('Photo must be under 12 MB'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    try{
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,960/Math.max(img.width,img.height));
      canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      let quality=.75,base64='';
      while(quality>=.3){
        base64=canvas.toDataURL('image/jpeg',quality).split(',')[1];
        if(base64.length<930000)break;
        quality-=.1;
      }
      URL.revokeObjectURL(url);
      if(base64.length>=930000)return reject(new Error('Image is too detailed; choose a smaller photo'));
      resolve({mime:'image/jpeg',data:base64,caption:file.name.replace(/\.[^.]+$/,'').slice(0,80)});
    }catch(ex){URL.revokeObjectURL(url);reject(ex);}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read photo'));};img.src=url;
 });
}
const previousDiaryAct=act;
act=async function(name,node){
 if(name==='diary-story-open'){openDiaryStory(node.dataset.value);return;}
 if(name==='diary-story-close'){closeDiaryStory();return;}
 if(name==='diary-story-next'){moveStory(1);return;}
 if(name==='diary-story-prev'){moveStory(-1);return;}
 if(name==='diary-new'){if(!getData().canPost)return toast('Only idol accounts can publish diary entries');return diaryNewModal();}
 if(name==='diary-sticker'){node.classList.toggle('selected');updateDiaryPreview();return;}
 if(name==='diary-delete'){
  if(!confirm('Delete this diary entry for everyone?'))return;
  await request('/api/diary/delete',{method:'POST',body:JSON.stringify({id:node.dataset.value})});closeDiaryStory();await refresh();return;
 }
 return previousDiaryAct(name,node);
};
document.addEventListener('click',event=>{
 const node=event.target.closest('#diary-story-overlay [data-action]');
 if(!node)return;
 event.preventDefault();event.stopPropagation();
 act(node.dataset.action,node).catch(err=>toast(err.message));
});
document.addEventListener('keydown',event=>{
 if(!storyIdol)return;
 if(event.key==='Escape'){closeDiaryStory();return;}
 if(event.key==='ArrowRight'){event.preventDefault();moveStory(1);}
 if(event.key==='ArrowLeft'){event.preventDefault();moveStory(-1);}
});
document.addEventListener('touchstart',event=>{
 if(!storyIdol||!event.target.closest('#diary-story-overlay'))return;
 storyTouchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};
},{passive:true});
document.addEventListener('touchend',event=>{
 if(!storyIdol||!storyTouchStart||!event.target.closest('#diary-story-overlay'))return;
 const dx=event.changedTouches[0].clientX-storyTouchStart.x,dy=event.changedTouches[0].clientY-storyTouchStart.y;
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)moveStory(dx<0?1:-1);
 storyTouchStart=null;
},{passive:true});
document.addEventListener('input',event=>{if(event.target.closest('#diary-entry-form'))updateDiaryPreview()});
document.addEventListener('change',async event=>{
 if(event.target?.id!=='diary-photo-picker')return;
 const files=Array.from(event.target.files||[]);
 if(files.length>4){toast('Choose up to 4 photos');event.target.value='';return;}
 try{diaryPhotos=await Promise.all(files.map(resizeDiaryPhoto));const area=document.querySelector('#diary-photo-preview');if(area)area.innerHTML=diaryPhotos.map(x=>'<span>📸 '+textEscape(x.caption)+'</span>').join(' ');}catch(err){diaryPhotos=[];toast(err.message);}
});
const previousDiaryAdmin=showAdmin;
showAdmin=async function(){
 await previousDiaryAdmin();
 const host=document.querySelector('#admin-content');
 if(!host||store.me?.role!=='admin')return;
 const settings=getData().settings||{};
 const input=(name,value,placeholder)=>'<label>'+name+'<input name="'+name+'" value="'+textEscape(value||'')+'" placeholder="'+placeholder+'"></label>';
 host.insertAdjacentHTML('beforeend','<section class="glass panel diary-admin-sources"><span class="eyebrow">USA50 OFFICIAL FEED</span><h3>Connect official channels</h3><p class="lead">YouTube checks for new videos approximately every ten minutes after you enter its channel ID. Instagram and TikTok need their approved platform/webhook integrations to push verified post events into the app.</p><form id="official-source-form" class="diary-form">'+
 input('youtubeChannelId',settings.youtubeChannelId,'UC… (24 characters)')+
 input('instagramUsername',settings.instagramUsername,'Official Instagram username')+
 input('tiktokUsername',settings.tiktokUsername,'Official TikTok username')+
 '<button class="btn" type="submit">Save official channels</button></form></section>');
};
const previousDiarySubmit=submitForm;
submitForm=async function(form){
 if(form.id==='official-source-form'){
  const fd=Object.fromEntries(new FormData(form));
  await request('/api/official/sources',{method:'POST',body:JSON.stringify(fd)});
  await refresh();toast('Official channel settings saved');return;
 }
 if(form.id!=='diary-entry-form')return previousDiarySubmit(form);
 const fd=new FormData(form);
 const stickers=[...form.querySelectorAll('.diary-sticker-pick.selected')].map(x=>x.dataset.value);
 const data={text:String(fd.get('text')||''),layout:fd.get('layout'),paper:fd.get('paper'),lineColor:fd.get('lineColor'),textColor:fd.get('textColor'),stickers,photos:diaryPhotos};
 await request('/api/diary/publish',{method:'POST',body:JSON.stringify(data)});
 hideModal();diaryPhotos=[];await refresh();toast('Diary Entry published! ♡');
};
})();