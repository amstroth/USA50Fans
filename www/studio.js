/* USA50 Card Studio — desktop management art editor.
 * Browser canvas exports an exact 660x1020 photocard face; the server validates
 * dimensions, file type, role, draft publication, and pack ownership.
 */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultCard=()=>({id:null,title:'New photocard',rarity:'R',border:'R',artId:null,legacy:false,artUrl:null});
const token=()=>localStorage.getItem('usa50_dev_token')||'';
const sizes={width:660,height:1020};
let catalogue=null,working=null,cardIndex=0,isDirty=false,activeCrop=null;
async function api(url,payload){
  const res=await fetch(url,{method:payload===undefined?'GET':'POST',credentials:'include',
    headers:{...(payload!==undefined?{'Content-Type':'application/json'}:{}),...(token()?{Authorization:'Bearer '+token()}:{})},
    ...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
  const result=await res.json().catch(()=>({error:'The server did not return a valid response.'}));
  if(!res.ok)throw new Error(result.error||'Request failed.');
  return result;
}
function toast(message){
 const node=byId('studio-toast');node.textContent=message;node.classList.add('visible');
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('visible'),3500);
}
function alertUser(message){
 const el=byId('studio-error');el.hidden=!message;el.textContent=message||'';
 if(message)window.scrollTo({top:0,behavior:'smooth'});
}
function copy(value){return JSON.parse(JSON.stringify(value));}
function nextDate(iso){
 if(!iso||!Number.isFinite(Date.parse(iso)))return '';
 const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function statusText(p){
 if(p.effectiveStatus==='published')return 'Published';
 return p.status==='preview'?'Preview':p.status==='scheduled'?'Scheduled':p.status==='published'?'Published':'Draft';
}
function choose(id,force=false){
 if(!force && isDirty && !confirm('Discard your unsaved Card Studio changes?'))return;
 const source=catalogue.packs.find(p=>p.id===id);
 if(!source)return;
 working=copy(source);
 if(working.status==='preview')working.status='draft';
 cardIndex=0;isDirty=false;alertUser('');
 render();
}
function newPack(){
 if(isDirty && !confirm('Discard your unsaved changes?'))return;
 working={id:null,title:'New USA50 Pack',member:'Arielle',team:'NYC50',subgroup:'NYC50',
   description:'',releaseAt:null,status:'draft',isTest:true,cards:[],ready:false};
 cardIndex=0;isDirty=false;alertUser('');render();
}
function markDirty(){isDirty=true;renderSidebar();renderPublish();}
function selectedCard(){return working?.cards?.[cardIndex]||null;}
function cardArt(card){
 return card.artUrl|| (card.artId?'/api/card-studio/art/'+encodeURIComponent(card.artId):null);
}
function facePreview(card){
 const src=cardArt(card),border=card.border||'none';
 return '<div class="card-preview">'+
   (src?'<img class="face" src="'+esc(src)+'" alt="Photocard artwork preview">':'<span class="preview-label">'+(card.legacy?'Existing image':'Upload artwork')+'</span>')+
   (border==='none'?'':'<img class="frame" src="/assets/frames/'+esc(border)+'.webp" alt="">')+
   '</div>';
}
function renderSidebar(){
 const list=byId('studio-packs');
 if(!catalogue)return;
 list.innerHTML=catalogue.packs.map(p=>'<button class="pack-entry" aria-current="'+String(working?.id===p.id)+'" data-studio-action="select" data-id="'+esc(p.id)+'">'+
   '<strong>'+esc(p.title)+'</strong><small>'+esc(p.subgroup||p.team)+' · '+p.cards.length+' cards'+(p.isTest?' · Test':'')+'</small>'+
   '<span class="studio-status '+esc(p.effectiveStatus||p.status)+'">'+esc(statusText(p))+'</span></button>').join('')+
   (working?.id==null?'<p class="subtle">New collection not yet saved.</p>':'');
}
function renderMeta(){
 return '<section class="soft-panel"><h2>Collection details</h2><div class="pack-form">'+
 field('Pack name','title','text','e.g. Sweet & Sour')+
 field('Member / group','member','text','Arielle, NYC50, etc.')+
 '<div class="field"><label>Sub-group / team</label><select data-pack-field="team">'+['NYC50','LA50','USA50','ATL50'].map(v=>'<option value="'+v+'" '+(working.team===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
 field('Collection label','subgroup','text','NYC50 · Sub-unit')+
 '<div class="field wide"><label>Description</label><textarea data-pack-field="description" maxlength="240" placeholder="About this photocard collection…">'+esc(working.description||'')+'</textarea></div>'+
 '<div class="field wide"><label>Release date and time (your local time)</label><input data-pack-field="releaseAt" type="datetime-local" value="'+esc(nextDate(working.releaseAt))+'"><span class="helper">For Scheduled packs, publishing begins when this time is reached. Drafts remain private even after their selected date.</span></div>'+
 '</div></section>';
}
function field(label,name,type,placeholder){
 return '<div class="field"><label>'+label+'</label><input data-pack-field="'+name+'" type="'+type+'" maxlength="80" value="'+esc(working[name]||'')+'" placeholder="'+esc(placeholder)+'"></div>';
}
function renderCardList(){
 return '<section class="soft-panel"><div class="studio-toolbar"><div><h2 style="margin:0">Card faces</h2><span class="helper">'+working.cards.length+' / 50 cards · 55 × 85 mm</span></div><button class="studio-button secondary" data-studio-action="add-card" type="button">+ Add card</button></div>'+
 '<div class="card-item-list">'+(working.cards.length?working.cards.map((c,i)=>'<button type="button" class="card-item" aria-current="'+String(cardIndex===i)+'" data-studio-action="select-card" data-index="'+i+'">'+
 '<div class="art-mini">'+(cardArt(c)?'<img src="'+esc(cardArt(c))+'" alt="">':'<span class="blank-art">✧</span>')+'</div><strong>'+esc(c.title)+'</strong><small>'+esc(c.rarity)+' · '+esc(c.border==='none'?'Custom face':c.border+' border')+'</small></button>').join(''):
 '<div class="helper">No cards yet. Add one to start designing the album.</div>')+
 '</div></section>';
}
function renderCardEditor(){
 const c=selectedCard();if(!c)return '';
 return '<section class="soft-panel"><div class="studio-toolbar"><h2 style="margin:0">Design card '+(cardIndex+1)+'</h2><button class="studio-button danger small" data-studio-action="remove-card" type="button">Remove card</button></div>'+
 '<div class="editor-grid"><div>'+facePreview(c)+'<div class="card-preview-note">Exactly 660 × 1020 px · 11:17<br>Rarity overlay is optional.</div></div>'+
 '<div class="editor-fields">'+
 '<div class="field"><label>Card title</label><input data-card-field="title" maxlength="80" value="'+esc(c.title)+'"></div>'+
 '<div class="field"><label>Rarity / gacha probability tier</label><select data-card-field="rarity">'+catalogue.rarities.map(r=>'<option value="'+r+'" '+(c.rarity===r?'selected':'')+'>'+r+'</option>').join('')+'</select></div>'+
 '<div class="field"><label>Face border</label><select data-card-field="border"><option value="none" '+(c.border==='none'?'selected':'')+'>No border — fully custom face</option>'+
 catalogue.rarities.map(r=>'<option value="'+r+'" '+(c.border===r?'selected':'')+'>'+r+' preset border</option>').join('')+'</select>'+
 '<span class="helper">Border style is independent of rarity. Your artwork remains unchanged.</span></div>'+
 '<button type="button" class="studio-button" data-studio-action="upload-art">'+(c.artId?'Replace / recrop artwork':'Upload, crop & resize artwork')+'</button>'+
 '<input id="studio-art-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+
 (c.legacy?'<span class="helper">Legacy True Love card: the existing default image stays until you upload new artwork.</span>':'')+
 '</div></div></section>';
}
function renderPublish(){
 const el=byId('studio-publish-panel');if(!el)return;
 if(!working){el.innerHTML='';return;}
 const status=working.status||'draft';
 const full=working.cards.length>0 && working.cards.every(c=>(c.artId||c.legacy)&&c.title&&c.rarity&&c.border);
 const release=working.releaseAt?new Date(working.releaseAt).toLocaleString():'Not specified';
 el.innerHTML='<span class="eyebrow">RELEASE CONTROL</span><h2 style="font:italic 29px Georgia,serif;margin:12px 0">Publication</h2>'+
 '<div class="publish-status"><div class="publish-state-card"><span class="status-lamp '+esc(status)+'"></span><div><strong>'+esc(status.charAt(0).toUpperCase()+status.slice(1))+'</strong><small>'+working.cards.length+' cards · '+(full?'Artwork ready':'Still being prepared')+'</small></div></div></div>'+
 '<div class="publish-actions">'+
 '<div class="field"><label>Publishing state</label><select data-pack-field="status">'+
 ['draft','scheduled','published'].map(v=>'<option value="'+v+'" '+(status===v?'selected':'')+'>'+v.charAt(0).toUpperCase()+v.slice(1)+'</option>').join('')+'</select></div>'+
 '<p class="publish-note"><strong>Draft</strong> never publishes automatically, even after the release date. <strong>Scheduled</strong> requires a future date and completed cards. <strong>Published</strong> makes the pack available immediately.</p>'+
 '<div class="helper">Release: '+esc(release)+'</div>'+
 (working.id==null?'<label class="field" style="display:flex;flex-direction:row;align-items:center"><input type="checkbox" data-pack-field="isTest" '+(working.isTest?'checked':'')+'>Mark as test pack</label>':
 '<span class="helper">'+(working.isTest?'Test pack · can be deleted':'Official collection · cannot be permanently deleted')+'</span>')+
 '<button class="studio-button block" data-studio-action="save" type="button">'+(isDirty?'Save changes ✦':'Save pack ✦')+'</button>'+
 (working.id&&working.isTest?'<button class="studio-button danger block" data-studio-action="delete-pack" type="button">Delete entire test pack</button>':'')+
 '</div><div class="studio-sidebar-note" style="padding:18px 0"><strong>Printing standard</strong><p>Face: 55 × 85 mm. Cropped master: 660 × 1020 px. Preset borders are separate app overlays; export the original clean master for production printing.</p></div>';
}
function render(){
 if(!catalogue||!working)return;
 renderSidebar();renderPublish();
 byId('studio-main-content').innerHTML=renderMeta()+renderCardList()+renderCardEditor();
}
async function load(selectId){
 const result=await api('/api/card-studio');
 catalogue=result;
 const old=selectId||working?.id;
 working=null;
 if(old&&result.packs.some(p=>p.id===old))choose(old,true);
 else if(result.packs.length)choose(result.packs[0].id,true);
 else newPack();
}
function updateFormField(target){
 if(!working)return;
 const packField=target.dataset.packField,cardField=target.dataset.cardField;
 if(packField){
   let value=target.type==='checkbox'?target.checked:target.value;
   if(packField==='releaseAt'){
     value=value?new Date(value).toISOString():null;
   }
   working[packField]=value;markDirty();
 } else if(cardField&&selectedCard()){
   selectedCard()[cardField]=target.value;markDirty();
 }
}
async function savePack(){
 if(!working)return;
 alertUser('');
 const payload=copy(working);
 delete payload.ready;delete payload.effectiveStatus;delete payload.cardCount;
 for(const c of payload.cards){delete c.artUrl;delete c.index;delete c.member;delete c.team;delete c.albumId;}
 const result=await api('/api/card-studio/save',payload);
 toast(result.pack.status==='published'?'Collection published ✧':result.pack.status==='scheduled'?'Collection scheduled ✦':'Draft saved ♡');
 await load(result.pack.id);
}
async function deletePack(){
 if(!working?.id||!working.isTest)return alertUser('Only test packs can be deleted.');
 const typed=prompt('This will erase the entire test pack and its demo card ownership. Type DELETE to confirm:');
 if(typed!=='DELETE')return;
 await api('/api/card-studio/delete',{id:working.id,confirm:'DELETE'});
 toast('Test collection deleted.');
 await load();
}
function imageEditor(file){
 if(!file)return;
 if(file.size>15000000)return alertUser('Choose an image smaller than 15 MB.');
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))return alertUser('Use a PNG, JPEG or WebP file.');
 const blobUrl=URL.createObjectURL(file);
 const img=new Image();
 img.onload=()=>{
   if(img.naturalWidth*img.naturalHeight>38000000){URL.revokeObjectURL(blobUrl);return alertUser('Use an image smaller than 38 megapixels.');}
   const originalIndex=cardIndex;
   activeCrop={img,blobUrl,cardIndex:originalIndex,zoom:1,angle:0,dx:0,dy:0};
   showCrop();
 };
 img.onerror=()=>{URL.revokeObjectURL(blobUrl);alertUser('The image could not be loaded.');};
 img.src=blobUrl;
}
function canvasDraw(canvas){
 if(!activeCrop)return;
 const {img,angle,zoom}=activeCrop;
 const w=canvas.width=sizes.width,h=canvas.height=sizes.height;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
 const radians=angle*Math.PI/180;
 const turned=angle%180!==0;
 const effectiveW=turned?img.naturalHeight:img.naturalWidth;
 const effectiveH=turned?img.naturalWidth:img.naturalHeight;
 const scale=Math.max(w/effectiveW,h/effectiveH)*zoom;
 const maxX=Math.max(0,(effectiveW*scale-w)/2);
 const maxY=Math.max(0,(effectiveH*scale-h)/2);
 activeCrop.dx=Math.min(maxX,Math.max(-maxX,activeCrop.dx));
 activeCrop.dy=Math.min(maxY,Math.max(-maxY,activeCrop.dy));
 ctx.save();ctx.translate(w/2+activeCrop.dx,h/2+activeCrop.dy);ctx.rotate(radians);ctx.scale(scale,scale);
 ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);ctx.restore();
}
function showCrop(){
 const modal=byId('studio-crop-modal');const border=selectedCard()?.border||'none';
 modal.hidden=false;
 modal.innerHTML='<div class="crop-panel"><div class="crop-top"><div><span class="eyebrow">CROP & RESIZE</span><h2>Frame your card ✧</h2></div><button data-studio-action="close-crop" type="button" class="studio-button secondary small">Close ✕</button></div>'+
 '<div class="crop-body"><div class="crop-face"><canvas id="studio-crop-canvas" width="660" height="1020" aria-label="Drag the photo to reposition the crop"></canvas>'+
 (border==='none'?'':'<img class="frame" src="/assets/frames/'+esc(border)+'.webp" alt="">')+'</div>'+
 '<div class="crop-controls"><p>Drag the image to position it within the <strong>55 × 85 mm</strong> photocard. Zoom or rotate, then export an exact <strong>660 × 1020 px</strong> cropped face.</p>'+
 '<div class="field"><label>Zoom</label><input id="studio-crop-zoom" type="range" min="1" max="3" step=".02" value="1"></div>'+
 '<button class="studio-button secondary" type="button" data-studio-action="rotate">Rotate 90° ↻</button>'+
 '<button class="studio-button secondary" type="button" data-studio-action="crop-reset">Reset crop</button>'+
 '<p class="helper">The border is preview-only and stays separate from the saved photo. Choose “No border” for custom artwork that already includes your own design.</p>'+
 '<div class="crop-buttons"><button class="studio-button" type="button" data-studio-action="crop-export">Apply cropped artwork</button><button class="studio-button secondary" type="button" data-studio-action="close-crop">Cancel</button></div>'+
 '</div></div></div>';
 const canvas=byId('studio-crop-canvas');
 let moving=null;
 canvas.addEventListener('pointerdown',e=>{moving={id:e.pointerId,x:e.clientX,y:e.clientY,dx:activeCrop.dx,dy:activeCrop.dy};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{
   if(!moving||moving.id!==e.pointerId)return;
   const rect=canvas.getBoundingClientRect();
   activeCrop.dx=moving.dx+(e.clientX-moving.x)*sizes.width/rect.width;
   activeCrop.dy=moving.dy+(e.clientY-moving.y)*sizes.height/rect.height;
   canvasDraw(canvas);
 });
 canvas.addEventListener('pointerup',()=>moving=null);
 canvas.addEventListener('pointercancel',()=>moving=null);
 byId('studio-crop-zoom').addEventListener('input',ev=>{activeCrop.zoom=Number(ev.target.value);canvasDraw(canvas)});
 canvasDraw(canvas);
}
function closeCrop(){
 const modal=byId('studio-crop-modal');modal.hidden=true;modal.innerHTML='';
 if(activeCrop?.blobUrl)URL.revokeObjectURL(activeCrop.blobUrl);
 activeCrop=null;
}
async function exportCrop(button){
 if(!activeCrop)return;
 button.disabled=true;button.textContent='Processing artwork…';
 try{
   const canvas=byId('studio-crop-canvas');canvasDraw(canvas);
   let dataUrl=canvas.toDataURL('image/webp',.86);
   if(dataUrl.startsWith('data:image/webp')&&dataUrl.length>2200000)dataUrl=canvas.toDataURL('image/webp',.72);
   if(!dataUrl.startsWith('data:image/webp'))dataUrl=canvas.toDataURL('image/png');
   const {artId,url}=await api('/api/card-studio/upload',{dataUrl});
   const card=working?.cards?.[activeCrop.cardIndex];
   if(!card)throw new Error('Card no longer exists.');
   card.artId=artId;card.artUrl=url;card.legacy=false;isDirty=true;closeCrop();render();
   toast('Artwork uploaded. Save the pack to keep your changes.');
 }catch(err){alertUser(err.message);button.disabled=false;button.textContent='Apply cropped artwork';}
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-studio-action]');if(!target)return;
 event.preventDefault();
 const a=target.dataset.studioAction;
 try{
   if(a==='select')return choose(target.dataset.id);
   if(a==='new')return newPack();
   if(a==='add-card'){
     if(working.cards.length>=50)return toast('Maximum 50 cards in one pack.');
     working.cards.push(defaultCard());cardIndex=working.cards.length-1;markDirty();return render();
   }
   if(a==='select-card'){cardIndex=Number(target.dataset.index)||0;return render();}
   if(a==='remove-card'){
     if(!confirm('Remove this card from the pack?'))return;
     working.cards.splice(cardIndex,1);cardIndex=Math.max(0,Math.min(cardIndex,working.cards.length-1));markDirty();return render();
   }
   if(a==='upload-art')return byId('studio-art-file')?.click();
   if(a==='save')return await savePack();
   if(a==='delete-pack')return await deletePack();
   if(a==='close-crop')return closeCrop();
   if(a==='rotate'){activeCrop.angle=(activeCrop.angle+90)%360;activeCrop.dx=0;activeCrop.dy=0;return canvasDraw(byId('studio-crop-canvas'));}
   if(a==='crop-reset'){activeCrop.zoom=1;activeCrop.angle=0;activeCrop.dx=0;activeCrop.dy=0;byId('studio-crop-zoom').value='1';return canvasDraw(byId('studio-crop-canvas'));}
   if(a==='crop-export')return await exportCrop(target);
 }catch(err){alertUser(err.message);}
});
document.addEventListener('change',event=>{
 const target=event.target;
 if(target.id==='studio-art-file'){imageEditor(target.files[0]);target.value='';return;}
 if(target.matches('[data-pack-field], [data-card-field]')){
   try{updateFormField(target);}catch(err){alertUser(err.message);}
   // Card labels and border options update when selecting cards or saving to avoid input focus loss.
   if(target.dataset.cardField==='rarity'||target.dataset.cardField==='border')render();
 }
});
document.addEventListener('input',event=>{
 const target=event.target;
 if(!target.matches('input[data-pack-field],textarea[data-pack-field],input[data-card-field]'))return;
 // Do not rerender while typing.
 if(target.dataset.packField&&target.dataset.packField!=='releaseAt'){
   working[target.dataset.packField]=target.value;isDirty=true;
 }else if(target.dataset.cardField && selectedCard()){
   selectedCard()[target.dataset.cardField]=target.value;isDirty=true;
 }
});
byId('studio-new').addEventListener('click',newPack);
window.addEventListener('beforeunload',event=>{if(isDirty){event.preventDefault();event.returnValue='';}});
load().catch(error=>{
 alertUser(error.message);
 byId('studio-packs').innerHTML='<p class="subtle">Management account required.</p>';
 byId('studio-main-content').innerHTML='<section class="soft-panel"><h2>Management access required</h2><p>Sign in with the USA50 management account and finish the required password change, then reopen Card Studio.</p><a href="/">Return to USA50 Fan Club</a></section>';
});
})();