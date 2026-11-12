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
function officialDiarySection(){
 const data=getData(),entries=data.diaries||[],official=data.officialPosts||[];
 const composer=data.canPost?'<button type="button" class="btn diary-publish" data-action="diary-new">✎ Write Diary Entry</button>':'';
 return '<section class="official-diary-section"><div class="social-section-heading"><div><span class="eyebrow">DIRECT FROM THE MEMBERS</span><h2>Diary Entries ♡</h2><p class="lead">Little pages from USA50, written by the idols themselves.</p></div>'+composer+'</div>'+
 (entries.length?'<div class="diary-scroll" aria-label="Idol diary entries">'+entries.map(di=>'<div class="diary-feed-item">'+diaryMarkup(di)+(store.me?.role==='admin'||(store.me?.id===di.authorId)?'<button class="text-btn diary-delete" data-action="diary-delete" data-value="'+textEscape(di.id)+'">Delete entry</button>':'')+'</div>').join('')+'</div>':
 '<div class="glass panel diary-empty">The diary is waiting for its first page. ♡'+(data.canPost?'<p>Write the first entry to introduce your day to fans.</p>':'<p>Check back for handwritten-style updates from your favorite idols.</p>')+'</div>')+
 '<div class="official-social-block"><div class="social-section-heading"><div><span class="eyebrow">AS SOON AS THEY ARE POSTED</span><h2>USA50 Official Channels</h2><p class="lead">New videos and posts from authorized USA50 channels.</p></div></div>'+
 (official.length?'<div class="official-social-grid">'+official.map(officialCard).join('')+'</div>':
 '<div class="glass panel official-social-empty">Official uploads will appear here when the channels are connected. YouTube feed sync needs its channel ID; Instagram and TikTok need approved provider integrations.</div>')+'</div>'+
 '<div class="diary-fan-divider"><span>✦ FAN COMMUNITY ✦</span><p>Keep scrolling to see the fan posts below</p></div></section>';
}
const priorSocialFeed=socialFeed;
socialFeed=function(){
 return officialDiarySection()+priorSocialFeed();
};
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
 if(name==='diary-new'){if(!getData().canPost)return toast('Only idol accounts can publish diary entries');return diaryNewModal();}
 if(name==='diary-sticker'){node.classList.toggle('selected');updateDiaryPreview();return;}
 if(name==='diary-delete'){
  if(!confirm('Delete this diary entry for everyone?'))return;
  await request('/api/diary/delete',{method:'POST',body:JSON.stringify({id:node.dataset.value})});await refresh();return;
 }
 return previousDiaryAct(name,node);
};
document.addEventListener('input',event=>{if(event.target.closest('#diary-entry-form'))updateDiaryPreview()});
document.addEventListener('change',async event=>{
 if(event.target?.id!=='diary-photo-picker')return;
 const files=Array.from(event.target.files||[]);
 if(files.length>4){toast('Choose up to 4 photos');event.target.value='';return;}
 try{diaryPhotos=await Promise.all(files.map(resizeDiaryPhoto));const area=document.querySelector('#diary-photo-preview');if(area)area.innerHTML=diaryPhotos.map(x=>'<span>📸 '+textEscape(x.caption)+'</span>').join(' ');}catch(err){diaryPhotos=[];toast(err.message);}
});
const previousDiarySubmit=submitForm;
submitForm=async function(form){
 if(form.id!=='diary-entry-form')return previousDiarySubmit(form);
 const fd=new FormData(form);
 const stickers=[...form.querySelectorAll('.diary-sticker-pick.selected')].map(x=>x.dataset.value);
 const data={text:String(fd.get('text')||''),layout:fd.get('layout'),paper:fd.get('paper'),lineColor:fd.get('lineColor'),textColor:fd.get('textColor'),stickers,photos:diaryPhotos};
 await request('/api/diary/publish',{method:'POST',body:JSON.stringify(data)});
 hideModal();diaryPhotos=[];socialTab='recent';await refresh();toast('Diary Entry published! ♡');
};
})();