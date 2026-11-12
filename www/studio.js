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
let studioMode='packs',borderDraft=null;
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
 return card.artUrl||(card.artId?'/api/card-studio/art/'+encodeURIComponent(card.artId):null)||
   (card.legacy?'/assets/portraits/arielle_real.webp':null);
}
function borderURL(border){return catalogue?.borderPresets?.find(b=>b.id===border)?.url||(border==='none'?null:'/assets/frames/'+border+'.webp');}
function facePreview(card){
 const src=cardArt(card),border=card.border||'none';
 return '<div class="card-preview">'+
   (src?'<img class="face" src="'+esc(src)+'" alt="Photocard artwork preview">':'<span class="preview-label">'+(card.legacy?'Existing image':'Upload artwork')+'</span>')+
   (border==='none'?'':'<img class="frame" src="'+esc(borderURL(border))+'" alt="">')+
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
 '<div class="field"><label>Face border</label><select data-card-field="border">'+
 catalogue.borderPresets.map(b=>'<option value="'+esc(b.id)+'" '+(c.border===b.id?'selected':'')+'>'+esc(b.name)+(b.builtin?' · Default':' · Custom')+'</option>').join('')+'</select>'+
 '<span class="helper">Border style is independent of rarity. Your artwork remains unchanged.</span></div>'+
 '<label class="studio-button studio-file-label" for="studio-art-picker">'+(c.artId?'Replace / recrop artwork':'Upload, crop & resize artwork')+'</label>'+
 '<span class="helper">Choose a JPG, PNG or WebP image. The crop editor opens immediately after selection.</span>'+
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
 if(!catalogue)return;
 const borders=studioMode==='borders';
 byId('studio-border-library').hidden=borders;
 byId('studio-pack-library').hidden=!borders;
 byId('studio-new').hidden=borders;
 byId('studio-packs').hidden=borders;
 if(borders){
   byId('studio-main-content').innerHTML=renderBorderLibrary();
   byId('studio-publish-panel').innerHTML=borderHelp();
   return;
 }
 if(!working)return;
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
function imageEditor(file,mode='face'){
 if(!file)return;
 if(file.size>15000000)return alertUser('Choose an image smaller than 15 MB.');
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))return alertUser('Use a PNG, JPEG or WebP file.');
 if(mode==='border' && file.type==='image/jpeg')return alertUser('Border overlays need transparency. Use PNG or WebP, not JPEG.');
 const blobUrl=URL.createObjectURL(file);
 const img=new Image();
 img.onload=()=>{
   if(img.naturalWidth*img.naturalHeight>38000000){URL.revokeObjectURL(blobUrl);return alertUser('Use an image smaller than 38 megapixels.');}
   const originalIndex=cardIndex;
   activeCrop={img,blobUrl,cardIndex:originalIndex,mode,zoom:1,angle:0,dx:0,dy:0,fit:'stretch',stretchX:1,stretchY:1};
   showCrop();
 };
 img.onerror=()=>{URL.revokeObjectURL(blobUrl);alertUser('The image could not be loaded.');};
 img.src=blobUrl;
}
function cropGeometry(){
 if(!activeCrop)return null;
 const crop=activeCrop,img=crop.img,turned=crop.angle%180!==0;
 const imageW=turned?img.naturalHeight:img.naturalWidth;
 const imageH=turned?img.naturalWidth:img.naturalHeight;
 const uniform=Math.max(sizes.width/imageW,sizes.height/imageH);
 const baseX=crop.fit==='stretch'?sizes.width/imageW:uniform;
 const baseY=crop.fit==='stretch'?sizes.height/imageH:uniform;
 return {width:imageW*baseX*crop.zoom*crop.stretchX,
         height:imageH*baseY*crop.zoom*crop.stretchY,
         baseX,baseY,imageW,imageH};
}
function redrawTransformHandles(){
 const box=byId('studio-transform-box'),crop=activeCrop;
 if(!box||!crop)return;
 const g=cropGeometry();
 box.style.left=((sizes.width/2+crop.dx-g.width/2)/sizes.width*100)+'%';
 box.style.top=((sizes.height/2+crop.dy-g.height/2)/sizes.height*100)+'%';
 box.style.width=(g.width/sizes.width*100)+'%';
 box.style.height=(g.height/sizes.height*100)+'%';
}
function stretchToWindow(){
 if(!activeCrop)return;
 Object.assign(activeCrop,{fit:'stretch',zoom:1,stretchX:1,stretchY:1,dx:0,dy:0});
 const fit=byId('studio-crop-fit');if(fit)fit.value='stretch';
 const slider=byId('studio-crop-zoom');if(slider)slider.value='1';
 for(const suffix of ['x','y']){const el=byId('studio-stretch-'+suffix);if(el)el.value='1';}
 for(const id of ['studio-zoom-value','studio-stretch-x-value','studio-stretch-y-value']){const el=byId(id);if(el)el.textContent='100%';}
 canvasDraw(byId('studio-crop-canvas'));
}
function canvasDraw(canvas){
 if(!activeCrop)return;
 const crop=activeCrop,{img,angle,zoom}=crop;
 const w=canvas.width=sizes.width,h=canvas.height=sizes.height;
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 ctx.clearRect(0,0,w,h);
 if(crop.mode!=='border'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
 const rotated=angle%180!==0;
 const imageW=rotated?img.naturalHeight:img.naturalWidth;
 const imageH=rotated?img.naturalWidth:img.naturalHeight;
 // Cover keeps the aspect ratio; Stretch fills the entire 11:17 master,
 // then allows independent horizontal and vertical distortion.
 const baseX=crop.fit==='stretch'?w/imageW:Math.max(w/imageW,h/imageH);
 const baseY=crop.fit==='stretch'?h/imageH:Math.max(w/imageW,h/imageH);
 const sx=baseX*zoom*crop.stretchX,sy=baseY*zoom*crop.stretchY;
 const visibleW=imageW*sx,visibleH=imageH*sy;
 // Crop-to-fill may be panned only to the edge; stretch can be repositioned
 // across the canvas even if that intentionally reveals transparency.
 if(crop.fit==='cover'){
   const maxX=Math.max(0,(visibleW-w)/2),maxY=Math.max(0,(visibleH-h)/2);
   crop.dx=Math.min(maxX,Math.max(-maxX,crop.dx));
   crop.dy=Math.min(maxY,Math.max(-maxY,crop.dy));
 }else{
   crop.dx=Math.min(w,Math.max(-w,crop.dx));
   crop.dy=Math.min(h,Math.max(-h,crop.dy));
 }
 ctx.save();
 ctx.translate(w/2+crop.dx,h/2+crop.dy);
 ctx.rotate(angle*Math.PI/180);
 // For 90° rotations, swap the scale factors to keep stretch X/Y aligned
 // with the card's horizontal/vertical axes rather than the source axes.
 ctx.scale(rotated?sy:sx,rotated?sx:sy);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
 ctx.restore();
 redrawTransformHandles();
}
function showCrop(){
 const modal=byId('studio-crop-modal');const border=activeCrop.mode==='border'?'none':selectedCard()?.border||'none';
 modal.hidden=false;
 modal.innerHTML='<div class="crop-panel"><div class="crop-top"><div><span class="eyebrow">CROP & RESIZE</span><h2>Frame your card ✧</h2></div><button data-studio-action="close-crop" type="button" class="studio-button secondary small">Close ✕</button></div>'+
 '<div class="crop-body"><div class="crop-face '+(activeCrop.mode==='border'?'crop-transparent':'')+'"><canvas id="studio-crop-canvas" width="660" height="1020" aria-label="Drag the photo to reposition it"></canvas><div class="studio-transform-box" id="studio-transform-box" aria-label="Drag the handles to reshape the image">' + ['nw','n','ne','e','se','s','sw','w'].map(h=>'<button type="button" class="studio-transform-handle handle-'+h+'" data-transform-handle="'+h+'" aria-label="Drag '+h+' handle to reshape image"></button>').join('') + '</div>'+
 (border==='none'?'':'<img class="frame" src="'+esc(borderURL(border))+'" alt="">')+'</div>'+
 '<div class="crop-controls"><p>'+(activeCrop.mode==='border'?'Position your border while preserving its transparent center. The checkerboard means transparency, and it will overlay the photo without covering it.':'Drag to reposition your artwork within a 55 × 85 mm photocard.')+' Zoom or rotate, then export exactly <strong>660 × 1020 px</strong>.</p>'+
 '<button type="button" class="studio-button crop-fit-button" data-studio-action="fit-window">Fit whole image into card (squish)</button>'+
 '<p class="helper">Drag the small square handles around the picture to squish it horizontally or vertically. Drag inside the image to move it. This works on borders and card faces.</p>'+
 '<div class="field"><label>Fit method</label><select id="studio-crop-fit"><option value="stretch" selected>Stretch to fit · whole image</option><option value="cover">Crop to fill · keep proportions</option></select></div>'+
 '<div class="field"><label>Zoom <output id="studio-zoom-value">100%</output></label><input id="studio-crop-zoom" type="range" min=".1" max="1.9" step=".01" value="1"><span class="helper">100% is the center; slide left to shrink or right to enlarge.</span></div>'+
 '<div class="crop-distortion" role="group" aria-label="Squish and stretch controls"><div class="field"><label>Horizontal stretch <output id="studio-stretch-x-value">100%</output></label><input id="studio-stretch-x" type="range" min=".1" max="5" step=".01" value="1" aria-label="Horizontal stretch of artwork"></div>'+
 '<div class="field"><label>Vertical stretch <output id="studio-stretch-y-value">100%</output></label><input id="studio-stretch-y" type="range" min=".1" max="5" step=".01" value="1" aria-label="Vertical stretch of artwork"></div></div>'+
 '<span class="helper">Width and height are independent. Drag edges of the image or use these two sliders. Reset returns to 100%.</span>'+
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
 const handles=modal.querySelectorAll('[data-transform-handle]');
 handles.forEach(handle=>{
   let start=null;
   handle.addEventListener('pointerdown',event=>{
     event.preventDefault();event.stopPropagation();
     handle.setPointerCapture(event.pointerId);
     const g=cropGeometry();
     start={pointer:event.pointerId,x:event.clientX,y:event.clientY,
       width:g.width,height:g.height,dx:activeCrop.dx,dy:activeCrop.dy,
       zoom:activeCrop.zoom,stretchX:activeCrop.stretchX,stretchY:activeCrop.stretchY,
       imageW:g.imageW,imageH:g.imageH,baseX:g.baseX,baseY:g.baseY};
   });
   handle.addEventListener('pointermove',event=>{
     if(!start||event.pointerId!==start.pointer)return;
     event.preventDefault();
     const bounds=canvas.getBoundingClientRect();
     const deltaX=(event.clientX-start.x)*sizes.width/bounds.width;
     const deltaY=(event.clientY-start.y)*sizes.height/bounds.height;
     const direction=handle.dataset.transformHandle;
     const hx=direction.includes('w')?-1:direction.includes('e')?1:0;
     const hy=direction.includes('n')?-1:direction.includes('s')?1:0;
     // Dragging an edge moves ONLY that edge; the opposite side stays anchored.
     if(hx){
       const changeX=Math.max(24-start.width,hx*deltaX);
       activeCrop.stretchX=Math.min(5,Math.max(.05,(start.width+changeX)/(start.imageW*start.baseX*start.zoom)));
       activeCrop.dx=start.dx+changeX*hx/2;
     }
     if(hy){
       const changeY=Math.max(24-start.height,hy*deltaY);
       activeCrop.stretchY=Math.min(5,Math.max(.05,(start.height+changeY)/(start.imageH*start.baseY*start.zoom)));
       activeCrop.dy=start.dy+changeY*hy/2;
     }
     activeCrop.fit='stretch';byId('studio-crop-fit').value='stretch';
     byId('studio-stretch-x').value=String(Math.max(.1,Math.min(5,activeCrop.stretchX)));
     byId('studio-stretch-y').value=String(Math.max(.1,Math.min(5,activeCrop.stretchY)));
     byId('studio-stretch-x-value').textContent=Math.round(activeCrop.stretchX*100)+'%';
     byId('studio-stretch-y-value').textContent=Math.round(activeCrop.stretchY*100)+'%';
     canvasDraw(canvas);
   });
   const stop=()=>{start=null};
   handle.addEventListener('pointerup',stop);
   handle.addEventListener('pointercancel',stop);
   handle.addEventListener('lostpointercapture',stop);
 });
 const updateValue=(id,value)=>{const label=byId(id);if(label)label.textContent=Math.round(value*100)+'%';};
 byId('studio-crop-fit').addEventListener('change',e=>{
   activeCrop.fit=e.target.value;activeCrop.dx=0;activeCrop.dy=0;canvasDraw(canvas);
 });
 byId('studio-crop-zoom').addEventListener('input',e=>{activeCrop.zoom=Number(e.target.value);updateValue('studio-zoom-value',activeCrop.zoom);canvasDraw(canvas)});
 byId('studio-stretch-x').addEventListener('input',e=>{activeCrop.stretchX=Number(e.target.value);updateValue('studio-stretch-x-value',activeCrop.stretchX);canvasDraw(canvas)});
 byId('studio-stretch-y').addEventListener('input',e=>{activeCrop.stretchY=Number(e.target.value);updateValue('studio-stretch-y-value',activeCrop.stretchY);canvasDraw(canvas)});
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
   const kind=activeCrop.mode==='border'?'border':'face';
   let dataUrl=kind==='border'?canvas.toDataURL('image/png'):canvas.toDataURL('image/webp',.87);
   if(kind==='face'&&dataUrl.length>2400000)dataUrl=canvas.toDataURL('image/webp',.72);
   if(kind==='border'&&dataUrl.length>6800000){
     // WebP retains transparent pixels on supported browsers and is smaller.
     const compressed=canvas.toDataURL('image/webp',.94);
     if(compressed.startsWith('data:image/webp'))dataUrl=compressed;
   }
   if(kind==='face'&&!dataUrl.startsWith('data:image/webp'))dataUrl=canvas.toDataURL('image/png');
   if(dataUrl.length>7100000)throw new Error('Cropped image is too large. Try a simpler image or compress the source.');
   const {artId,url}=await api('/api/card-studio/upload',{dataUrl,kind});
   if(kind==='border'){
     if(!borderDraft)throw new Error('Border editor was closed.');
     borderDraft.artId=artId;borderDraft.url=url;
     isDirty=true;closeCrop();render();
     toast('Transparent border uploaded. Click Save border to keep it.');
   }else{
     const card=working?.cards?.[activeCrop.cardIndex];
     if(!card)throw new Error('Card no longer exists.');
     card.artId=artId;card.artUrl=url;card.legacy=false;
     isDirty=true;closeCrop();render();
     toast('Artwork uploaded. Click Save pack to keep changes.');
   }
 }catch(err){alertUser(err.message);button.disabled=false;button.textContent='Apply cropped artwork';}
}

function switchMode(mode){
 if(mode===studioMode)return;
 if(isDirty && !confirm('Discard unsaved Card Studio changes?'))return;
 studioMode=mode;isDirty=false;alertUser('');
 if(mode==='borders')borderDraft={id:null,name:'New custom border',rarity:'',artId:null,url:null};
 render();
}
function borderHelp(){
 return '<span class="eyebrow">BORDER LIBRARY</span><h2 style="font:italic 29px Georgia,serif">Preset overlays ✧</h2>'+
 '<div class="soft-panel"><p class="subtle">Every border is a reusable transparent overlay at 660 × 1020 px.</p>'+
 '<p class="subtle">Crop and resize transparent PNG or WebP designs here, then apply them to any R, SR, SSR, MR or UR card.</p>'+
 '<p class="subtle">Default borders are protected. A custom preset must be removed from all card designs before you can delete it.</p></div>';
}
function renderBorderLibrary(){
 const presets=catalogue.borderPresets||[];
 const chosen=borderDraft||{id:null,name:'New custom border',rarity:'',artId:null,url:null};
 const gallery=presets.filter(b=>b.id!=='none').map(b=>
 '<button type="button" class="studio-border-tile" data-studio-action="pick-border" data-id="'+esc(b.id)+'" aria-current="'+String(b.id===chosen.id)+'">'+
 '<span class="studio-border-thumb"><img src="/assets/portraits/arielle_real.webp" alt="">'+(b.url?'<img class="studio-border-overlay" src="'+esc(b.url)+'" alt="">':'')+'</span>'+
 '<strong>'+esc(b.name)+'</strong><small>'+(b.builtin?'Protected default':'Custom preset')+(b.rarity?' · '+esc(b.rarity):'')+'</small></button>').join('');
 const preview='<div class="card-preview studio-border-large"><img class="face" src="/assets/portraits/arielle_real.webp" alt="Example photocard">'+
 (chosen.url?'<img class="frame" src="'+esc(chosen.url)+'" alt="Border overlay preview">':'')+'</div>';
 return '<section class="soft-panel"><div class="studio-toolbar"><div><h2 style="margin:0">Border Library</h2><span class="helper">Upload, crop, resize, and reuse transparent borders across packs.</span></div>'+
 '<button type="button" class="studio-button" data-studio-action="new-border">+ Create custom border</button></div>'+
 '<div class="studio-border-grid">'+gallery+'</div></section>'+
 '<section class="soft-panel"><h2>'+(chosen.id?'Preset details':'New custom border')+'</h2>'+
 '<div class="editor-grid"><div>'+preview+'<p class="card-preview-note">Transparent overlay · 660 × 1020 px</p></div><div class="editor-fields">'+
 '<div class="field"><label>Preset name</label><input data-border-field="name" maxlength="54" value="'+esc(chosen.name)+'" '+(chosen.builtin?'disabled':'')+'></div>'+
 '<div class="field"><label>Suggested rarity (optional)</label><select data-border-field="rarity" '+(chosen.builtin?'disabled':'')+'><option value="">Any rarity</option>'+
 catalogue.rarities.map(r=>'<option value="'+r+'" '+(chosen.rarity===r?'selected':'')+'>'+r+'</option>').join('')+'</select></div>'+
 (chosen.builtin?'<p class="helper">Built-in borders cannot be replaced or deleted. Create a new custom preset instead.</p>':
 '<label class="studio-button studio-file-label" for="studio-border-picker">'+(chosen.artId?'Replace / recrop border':'Upload transparent border')+'</label>'+
 '<p class="helper">PNG or WebP with a transparent center. Drag, rotate, and zoom before exporting. Artwork stays separate from the photocard image.</p>'+
 '<button class="studio-button" data-studio-action="save-border" type="button">Save border preset ✧</button>'+
 (chosen.id?'<button class="studio-button danger" data-studio-action="delete-border" type="button">Delete custom border</button>':''))+
 '</div></div></section>';
}
async function saveBorder(){
 if(!borderDraft||borderDraft.builtin)return;
 const result=await api('/api/card-studio/border/save',{id:borderDraft.id||null,name:borderDraft.name,rarity:borderDraft.rarity||null,artId:borderDraft.artId});
 catalogue=await api('/api/card-studio');borderDraft={...result.preset};
 isDirty=false;render();toast('Border preset saved. It is now available for card faces.');
}
async function deleteBorder(){
 if(!borderDraft?.id||borderDraft.builtin)return;
 if(prompt('Type DELETE to permanently remove this custom border:')!=='DELETE')return;
 await api('/api/card-studio/border/delete',{id:borderDraft.id,confirm:'DELETE'});
 catalogue=await api('/api/card-studio');borderDraft={id:null,name:'New custom border',rarity:'',artId:null,url:null};
 isDirty=false;render();toast('Custom border deleted.');
}

document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-studio-action]');if(!target)return;
 event.preventDefault();
 const a=target.dataset.studioAction;
 try{
   if(a==='select')return choose(target.dataset.id);
   if(a==='pick-border'){const p=catalogue.borderPresets.find(b=>b.id===target.dataset.id);if(!p)return;if(isDirty&&!confirm('Discard unsaved border edits?'))return;borderDraft={...p};isDirty=false;return render();}
   if(a==='new-border'){if(isDirty&&!confirm('Discard unsaved border edits?'))return;borderDraft={id:null,name:'New custom border',rarity:'',artId:null,url:null};isDirty=false;return render();}
   if(a==='save-border')return await saveBorder();
   if(a==='delete-border')return await deleteBorder();
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
   if(a==='upload-art')return byId('studio-art-picker')?.click();
   if(a==='save')return await savePack();
   if(a==='delete-pack')return await deletePack();
   if(a==='close-crop')return closeCrop();
   if(a==='rotate'){activeCrop.angle=(activeCrop.angle+90)%360;activeCrop.dx=0;activeCrop.dy=0;return canvasDraw(byId('studio-crop-canvas'));}
   if(a==='fit-window')return stretchToWindow();
   if(a==='crop-reset'){
     Object.assign(activeCrop,{zoom:1,angle:0,dx:0,dy:0,fit:'stretch',stretchX:1,stretchY:1});
     for(const id of ['studio-crop-zoom','studio-stretch-x','studio-stretch-y'])byId(id).value='1';
     byId('studio-crop-fit').value='stretch';
     for(const id of ['studio-zoom-value','studio-stretch-x-value','studio-stretch-y-value'])byId(id).textContent='100%';
     return canvasDraw(byId('studio-crop-canvas'));
   }
   if(a==='crop-export')return await exportCrop(target);
 }catch(err){alertUser(err.message);}
});
document.addEventListener('change',event=>{
 const target=event.target;
 if(target.id==='studio-art-picker'){imageEditor(target.files[0],'face');target.value='';return;}
 if(target.id==='studio-border-picker'){imageEditor(target.files[0],'border');target.value='';return;}
 if(target.matches('[data-border-field]')){if(borderDraft){borderDraft[target.dataset.borderField]=target.value;isDirty=true;}return;}
 if(target.matches('[data-pack-field], [data-card-field]')){
   try{updateFormField(target);}catch(err){alertUser(err.message);}
   // Card labels and border options update when selecting cards or saving to avoid input focus loss.
   if(target.dataset.cardField==='rarity'||target.dataset.cardField==='border')render();
 }
});
document.addEventListener('input',event=>{
 const target=event.target;
 if(target.matches('input[data-border-field]')){if(borderDraft){borderDraft[target.dataset.borderField]=target.value;isDirty=true;}return;}
 if(!target.matches('input[data-pack-field],textarea[data-pack-field],input[data-card-field]'))return;
 // Do not rerender while typing.
 if(target.dataset.packField&&target.dataset.packField!=='releaseAt'){
   working[target.dataset.packField]=target.value;isDirty=true;
 }else if(target.dataset.cardField && selectedCard()){
   selectedCard()[target.dataset.cardField]=target.value;isDirty=true;
 }
});
byId('studio-new').addEventListener('click',newPack);
byId('studio-border-library').addEventListener('click',()=>switchMode('borders'));
byId('studio-pack-library').addEventListener('click',()=>switchMode('packs'));
window.addEventListener('beforeunload',event=>{if(isDirty){event.preventDefault();event.returnValue='';}});
load().catch(error=>{
 alertUser(error.message);
 byId('studio-packs').innerHTML='<p class="subtle">Management account required.</p>';
 byId('studio-main-content').innerHTML='<section class="soft-panel"><h2>Management access required</h2><p>Sign in with the USA50 management account and finish the required password change, then reopen Card Studio.</p><a href="/">Return to USA50 Fan Club</a></section>';
});
})();