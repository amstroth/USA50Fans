/* USA50 Foil Lab — per-card editable masked shader layers and draggable 3D preview.
   Select/Mask tools: brush, erase, rectangle, lasso and color-region selection.
   Mask output: 660x1020 transparent PNG, independently stored per layer.
*/
(function(){
'use strict';
const W=660,H=1020;
const types=['holographic','iridescent','glitter'];
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const uid=()=>('layer-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now()));
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
function newLayer(type='holographic',pattern='star'){
 const id=uid();
 return {id,name:type==='glitter'?'Border sparkle':type==='iridescent'?'Iridescent glow':'Holographic star',
   type,enabled:true,maskArtId:null,maskUrl:null,colors:type==='iridescent'?['#b9f6a1','#f1e783']:['#e7a4ff','#a8dcff'],
   opacity:.72,intensity:.85,density:.55,scale:1,speed:.65,_pattern:pattern};
}
async function open({card,member,artUrl,borderUrl,upload,onApply}){
 const existing=document.getElementById('usa50-foil-lab');if(existing)existing.remove();
 const root=document.createElement('div');root.id='usa50-foil-lab';root.className='foil-lab-root';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','Foil Lab material editor');
 document.body.appendChild(root);
 const layers=copy(card.materialLayers||[]).map(l=>({...l,side:l.side==='back'?'back':'front'}));
 const maskMap=new Map(),modified=new Set(),undo=new Map();
 let viewSide='front',frontSource=null,backSource=null;
 let current=layers.findIndex(l=>l.side==='front'),tool='brush',size=28,tolerance=48,source=null,engine=null,drag=null,closed=false,previewStarted=false;
 function currentLayer(){const l=layers[current];return l?.side===viewSide?l:null;}
 function layerHTML(l,i){
  return '<button class="foil-layer-entry '+(i===current?'active':'')+'" data-foil="select" data-index="'+i+'">'+
    '<span class="foil-layer-dot '+e(l.type)+'"></span><span><strong>'+e(l.name)+'</strong><small>'+e(l.type)+' · '+(l.maskArtId||modified.has(l.id)?'masked':'full card')+'</small></span>'+
    '<span class="foil-layer-eye">'+(l.enabled!==false?'◉':'○')+'</span></button>';
 }
 function controlHTML(l){
  if(!l)return '<div class="foil-empty">Add a material layer to begin ✧</div>';
  const select=(items,value)=>items.map(x=>'<option value="'+e(x)+'" '+(value===x?'selected':'')+'>'+e(x.charAt(0).toUpperCase()+x.slice(1))+'</option>').join('');
  const field=(name,key,min,max,step)=>'<label class="foil-range"><span>'+name+' <em data-foil-output="'+key+'">'+Number(l[key]).toFixed(2)+'</em></span>'+
    '<input type="range" data-foil-prop="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+l[key]+'"></label>';
  return '<div class="foil-control-header"><label>Layer name<input maxlength="45" data-foil-prop="name" value="'+e(l.name)+'"></label>'+
    '<label>Material<select data-foil-prop="type">'+select(types,l.type)+'</select></label></div>'+
    '<div class="foil-color-pair"><label>Primary color<input type="color" data-foil-prop="color0" value="'+e(l.colors[0])+'"></label>'+
    '<label>Secondary color<input type="color" data-foil-prop="color1" value="'+e(l.colors[1])+'"></label></div>'+
    '<div class="foil-preset-row"><button data-foil="palette-lavender" type="button">Lavender / Pink</button>'+
    '<button data-foil="palette-citrus" type="button">Green / Yellow</button></div>'+
    field('Opacity','opacity',0,1,.01)+field('Reflection strength','intensity',0,2,.05)+
    field('Sparkle density','density',.05,1,.05)+field('Pattern size','scale',.2,5,.1)+
    field('Animation speed','speed',0,3,.1)+
    '<label class="foil-enabled"><input data-foil-prop="enabled" type="checkbox" '+(l.enabled!==false?'checked':'')+'> Effect enabled</label>';
 }
 function render(){
  root.innerHTML='<div class="foil-lab-head"><div><span>USA50 · CARD STUDIO</span><h2>Foil Lab <em>✧</em></h2>'+
    '<p>Paint a selection, then choose the material that shimmers inside it.</p></div>'+
    '<button data-foil="close" type="button" aria-label="Close Foil Lab" class="foil-close">✕</button></div>'+
    '<div class="foil-lab-main"><aside class="foil-layers"><div class="foil-side-switch" role="group" aria-label="Choose card face to edit">'+
    '<button type="button" data-foil="side-front" aria-pressed="'+(viewSide==='front')+'" class="'+(viewSide==='front'?'selected':'')+'">Front</button>'+
    '<button type="button" data-foil="side-back" aria-pressed="'+(viewSide==='back')+'" class="'+(viewSide==='back'?'selected':'')+'">Back</button></div>'+
    '<div class="foil-section-title">MATERIAL LAYERS <span>'+layers.length+' / 8 total</span></div>'+
    '<div id="foil-layer-list">'+layers.map((l,i)=>l.side===viewSide?layerHTML(l,i):'').join('')+'</div>'+
    '<button class="foil-primary" data-foil="add" type="button">+ Add material layer</button>'+
    '<div class="foil-shortcuts"><button data-foil="star" type="button">✧ Holographic star</button>'+
    '<button data-foil="border" type="button">✦ Glitter border</button></div>'+
    '<div class="foil-layers-actions"><button data-foil="up">↑ Move up</button><button data-foil="down">↓ Move down</button>'+
    '<button data-foil="delete" class="danger">Delete layer</button></div>'+
    '<div class="foil-advice">'+(viewSide==='back'?'You are editing the reverse face. Effects and masks here do not change the front of the card.':'You are editing the front face. Switch to Back for handwriting shimmer or foil on the reverse.')+' Masks stay separate from artwork.</div></aside>'+
    '<section class="foil-mask-workspace"><div class="foil-section-title">'+(viewSide==='back'?'BACK':'FRONT')+' · SELECT & MASK <span>660 × 1020</span></div>'+
    '<div class="foil-toolbox">'+['brush','erase','rect','lasso','magic'].map(t=>'<button type="button" data-foil-tool="'+t+'" class="'+(t===tool?'active':'')+'">'+
    ({brush:'Brush',erase:'Erase',rect:'Rectangle',lasso:'Lasso',magic:'Color select'})[t]+'</button>').join('')+'</div>'+
    '<div class="foil-mask-stage"><canvas id="foil-face-canvas" width="660" height="1020" aria-label="Photocard background"></canvas>'+
    '<canvas id="foil-mask-overlay" width="660" height="1020" aria-label="Draw or select a material mask"></canvas></div>'+
    '<div class="foil-tool-sliders"><label>Brush size <input type="range" min="4" max="140" value="'+size+'" id="foil-brush-size"><output id="foil-brush-label">'+size+'px</output></label>'+
    '<label>Color tolerance <input type="range" min="10" max="120" value="'+tolerance+'" id="foil-tolerance"><output id="foil-tolerance-label">'+tolerance+'</output></label></div>'+
    '<div class="foil-mask-actions"><button data-foil="undo">↶ Undo</button><button data-foil="fill">Fill mask</button>'+
    '<button data-foil="invert">Invert</button><button data-foil="clear">Clear</button></div>'+
    '<p class="foil-explain">Paint with Brush; use Rectangle or Lasso to select a shape. Color select fills a connected area of similar color in the photograph. Blue areas show where foil will appear.</p></section>'+
    '<aside class="foil-preview-controls"><div class="foil-section-title">LIVE 3D PREVIEW <span>'+viewSide.toUpperCase()+' · DRAG TO ROTATE</span></div>'+
    '<div id="foil-three-preview" class="foil-three-preview">Preparing 3D card…</div>'+
    '<div class="foil-preview-actions"><button data-foil="flip">↻ Flip</button><button data-foil="reset">Reset</button></div>'+
    '<div class="foil-section-title" style="margin-top:14px">MATERIAL PROPERTIES</div>'+
    '<div id="foil-property-controls">'+controlHTML(currentLayer())+'</div></aside></div>'+
    '<div class="foil-footer"><span id="foil-status">Mask editing is local until you apply the layers.</span>'+
    '<div><button class="foil-cancel" data-foil="close">Cancel</button><button class="foil-primary" data-foil="apply">Apply layers to card</button></div></div>';
  const previewCanvas=root.querySelector('#foil-face-canvas');if(source)previewCanvas.getContext('2d').drawImage(source,0,0);
  if(engine){engine.destroy();engine=null;}
  if(previewStarted)startPreview(root.querySelector('#foil-three-preview'));
  updateOverlay();
 }
 function makeMask(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}
 function ctxMask(){const layer=currentLayer();return layer?maskMap.get(layer.id):null;}
 async function initMask(layer){
  if(maskMap.has(layer.id))return maskMap.get(layer.id);
  const c=makeMask(),g=c.getContext('2d');
  if(layer.maskUrl){
   try{
    const img=await window.USA50ThreeCard.image(layer.maskUrl,true);g.drawImage(img,0,0,W,H);
   }catch(e){setStatus('Could not read saved mask: '+e.message);}
  }else if(layer._pattern==='star')paintStar(c);
  else if(layer._pattern==='border')paintBorder(c);
  delete layer._pattern;
  maskMap.set(layer.id,c);return c;
 }
 function setStatus(message){const el=root.querySelector('#foil-status');if(el)el.textContent=message;}
 function remember(){
  const c=ctxMask();if(!c)return;
  const list=undo.get(currentLayer().id)||[];
  list.push(c.getContext('2d').getImageData(0,0,W,H));
  if(list.length>8)list.shift();
  undo.set(currentLayer().id,list);
 }
 function paintStar(c){
  const g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();
  const cx=W*.72,cy=H*.23,outer=105,inner=38;
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
   if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}
  g.closePath();g.fill();
 }
 function paintBorder(c){
  const g=c.getContext('2d');g.strokeStyle='#fff';g.lineWidth=55;g.strokeRect(28,28,W-56,H-56);
 }
 function point(ev){
  const box=root.querySelector('#foil-mask-overlay').getBoundingClientRect();
  return {x:clamp((ev.clientX-box.left)*W/box.width,0,W),y:clamp((ev.clientY-box.top)*H/box.height,0,H)};
 }
 function updateOverlay(temp=null){
  const overlay=root.querySelector('#foil-mask-overlay');if(!overlay)return;
  const g=overlay.getContext('2d'),mask=ctxMask();
  g.clearRect(0,0,W,H);if(!mask)return;
  g.drawImage(mask,0,0,W,H);
  g.globalCompositeOperation='source-in';g.fillStyle='#55d5ff';g.fillRect(0,0,W,H);
  g.globalCompositeOperation='source-over';g.globalAlpha=.55;
  // The blue preview is semi-transparent, while the real mask stays white.
  const copy=document.createElement('canvas');copy.width=W;copy.height=H;
  const cc=copy.getContext('2d');cc.drawImage(overlay,0,0);
  g.clearRect(0,0,W,H);g.drawImage(copy,0,0);g.globalAlpha=1;
  if(temp?.length){g.strokeStyle='#fff';g.lineWidth=3;g.setLineDash([9,8]);g.beginPath();
   g.moveTo(temp[0].x,temp[0].y);for(const p of temp.slice(1))g.lineTo(p.x,p.y);g.stroke();g.setLineDash([]);}
  const layer=currentLayer();if(engine&&layer)engine.updateMask(layer.id,mask);
 }
 function brushLine(a,b,erase=false){
  const c=ctxMask();if(!c)return;const g=c.getContext('2d');
  g.save();g.globalCompositeOperation=erase?'destination-out':'source-over';
  g.strokeStyle='#fff';g.lineWidth=size;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.restore();
 }
 function polygon(points){
  if(!points.length)return;const g=ctxMask().getContext('2d');
  g.fillStyle='#fff';g.beginPath();g.moveTo(points[0].x,points[0].y);
  for(const p of points.slice(1))g.lineTo(p.x,p.y);g.closePath();g.fill();
 }
 function colorSelect(start){
  if(!source)return;
  const pixels=source.getContext('2d').getImageData(0,0,W,H).data;
  const c=ctxMask(),g=c.getContext('2d'),img=g.getImageData(0,0,W,H),output=img.data;
  const x=Math.floor(start.x),y=Math.floor(start.y),first=(y*W+x)*4;
  const r=pixels[first],green=pixels[first+1],b=pixels[first+2];
  const seen=new Uint8Array(W*H),queue=new Int32Array(W*H);
  let head=0,tail=0;const origin=y*W+x;queue[tail++]=origin;seen[origin]=1;
  while(head<tail){
   const idx=queue[head++],off=idx*4;
   const delta=Math.abs(pixels[off]-r)+Math.abs(pixels[off+1]-green)+Math.abs(pixels[off+2]-b);
   if(delta>tolerance*3)continue;
   output[off]=255;output[off+1]=255;output[off+2]=255;output[off+3]=255;
   const px=idx%W;
   for(const neighbor of [px>0?idx-1:-1,px<W-1?idx+1:-1,idx>=W?idx-W:-1,idx<W*(H-1)?idx+W:-1]){
    if(neighbor>=0&&!seen[neighbor]){seen[neighbor]=1;queue[tail++]=neighbor;}
   }
  }
  g.putImageData(img,0,0);
 }
 function mark(){const layer=currentLayer();if(!layer)return;
   modified.add(layer.id);setStatus('Mask changed · Apply layers to upload and save.');updateOverlay();}
 async function changeLayer(index){
  if(index<0||index>=layers.length||layers[index].side!==viewSide)return;current=index;render();
  await initMask(currentLayer());updateOverlay();
  await updatePreviewLayers();
 }
 async function startPreview(container){
  if(!container?.isConnected)return;
  try{
   const instance=await window.USA50ThreeCard.create({container,card:{...card,artUrl,borderUrl},
      layers:layers.map(l=>({...l,maskCanvas:maskMap.get(l.id)||undefined})),
      initialRotation:viewSide==='back'?192:12,
      onWarning:setStatus});
   if(!container.isConnected || closed){instance.destroy();return;}
   engine=instance;
   // Masks may have finished loading or been painted while Three.js was
   // asynchronously initializing. Always apply the newest editor state.
   await instance.setLayers(layers.map(l=>({...l,maskCanvas:maskMap.get(l.id)||undefined})));
   if(!container.isConnected){instance.destroy();if(engine===instance)engine=null;}
  }catch(err){if(container.isConnected)container.textContent='3D preview unavailable: '+err.message;}
 }
 async function switchSide(nextSide){
  if(nextSide===viewSide)return;
  if(nextSide==='back'&&!backSource){
    if(card.backArtUrl){
      try{
        const img=await window.USA50ThreeCard.image(card.backArtUrl,true);
        backSource=makeMask();
        backSource.getContext('2d').drawImage(img,0,0,W,H);
      }catch(err){
        setStatus('Card back preview could not load: '+err.message);
        backSource=window.USA50ThreeCard.generatedBack();
      }
    }else backSource=window.USA50ThreeCard.generatedBack();
  }
  viewSide=nextSide;
  source=viewSide==='back'?backSource:frontSource;
  current=layers.findIndex(l=>l.side===viewSide);
  render();
  if(currentLayer()){await initMask(currentLayer());updateOverlay();}
 }
 async function updatePreviewLayers(){
  if(!engine)return;
  await engine.setLayers(layers.map(l=>({...l,maskCanvas:maskMap.get(l.id)||undefined})));
  const layer=currentLayer();if(layer&&maskMap.get(layer.id))engine.updateMask(layer.id,maskMap.get(layer.id));
 }
 function close(){closed=true;engine?.destroy();engine=null;root.remove();document.removeEventListener('keydown',onKey);}
 function onKey(ev){if(ev.key==='Escape'&&root.isConnected)close();}
 document.addEventListener('keydown',onKey);
 render();
 try{frontSource=await window.USA50CardFace.composite({artUrl,borderUrl,overlayText:card.overlayText});}
 catch(err){setStatus('Artwork preview failed: '+err.message);}
 if(closed)return;
 source=frontSource;
 if(source)root.querySelector('#foil-face-canvas').getContext('2d').drawImage(source,0,0);
 if(layers.length){await initMask(currentLayer());updateOverlay();}
 previewStarted=true;await startPreview(root.querySelector('#foil-three-preview'));
 root.addEventListener('pointerdown',ev=>{
  if(!ev.target.matches('#foil-mask-overlay')||!currentLayer())return;
  const p=point(ev);remember();drag={pointerId:ev.pointerId,last:p,first:p,points:[p]};
  ev.target.setPointerCapture(ev.pointerId);
  if(tool==='brush'||tool==='erase')brushLine(p,p,tool==='erase');
  else if(tool==='magic'){colorSelect(p);drag=null;mark();}
  ev.preventDefault();
 });
 root.addEventListener('pointermove',ev=>{
  if(!drag||ev.pointerId!==drag.pointerId)return;
  const p=point(ev);if(tool==='brush'||tool==='erase'){brushLine(drag.last,p,tool==='erase');drag.last=p;mark();}
  else if(tool==='lasso'){drag.points.push(p);updateOverlay(drag.points);}
  else if(tool==='rect'){updateOverlay([drag.first,{x:p.x,y:drag.first.y},p,{x:drag.first.x,y:p.y},drag.first]);}
 });
 root.addEventListener('pointerup',ev=>{
  if(!drag||ev.pointerId!==drag.pointerId)return;
  const p=point(ev);if(tool==='rect'){
   const g=ctxMask().getContext('2d');g.fillStyle='#fff';g.fillRect(Math.min(p.x,drag.first.x),Math.min(p.y,drag.first.y),Math.abs(p.x-drag.first.x),Math.abs(p.y-drag.first.y));
  }else if(tool==='lasso')polygon(drag.points);
  drag=null;mark();
 });
 root.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-foil]');if(!el)return;
  const action=el.dataset.foil;
  try{
   if(action==='close'){close();return;}
   if(action==='flip'){engine?.flip();return;}
   if(action==='reset'){engine?.reset();return;}
   if(action==='side-front'||action==='side-back'){await switchSide(action==='side-back'?'back':'front');return;}
   if(action==='select'){await changeLayer(Number(el.dataset.index));return;}
   if(action==='add'||action==='star'||action==='border'){
    if(layers.length>=8){setStatus('Maximum eight layers per card.');return;}
    const type=action==='border'?'glitter':'holographic';
    const l=newLayer(type,action==='border'?'border':action==='star'?'star':'none');
    l.side=viewSide;layers.push(l);current=layers.length-1;render();await initMask(l);mark();await updatePreviewLayers();return;
   }
   if(action==='delete'){if(!currentLayer())return;maskMap.delete(currentLayer().id);layers.splice(current,1);
    current=layers.findIndex(l=>l.side===viewSide);render();if(currentLayer())await initMask(currentLayer());await updatePreviewLayers();return;}
   if(action==='up'||action==='down'){
    const sameSide=layers.map((l,i)=>l.side===viewSide?i:-1).filter(i=>i>=0);
    const j=sameSide[sameSide.indexOf(current)+(action==='up'?-1:1)];
    if(j===undefined)return;
    [layers[current],layers[j]]=[layers[j],layers[current]];current=j;render();await updatePreviewLayers();return;}
   const l=currentLayer();if(!l)return;
   if(action==='undo'){const arr=undo.get(l.id)||[];const prior=arr.pop();if(!prior)return;
    ctxMask().getContext('2d').putImageData(prior,0,0);mark();return;}
   if(action==='fill'||action==='clear'||action==='invert'){remember();const c=ctxMask(),g=c.getContext('2d');
    if(action==='clear')g.clearRect(0,0,W,H);
    else if(action==='fill'){g.fillStyle='#fff';g.fillRect(0,0,W,H);}
    else{const img=g.getImageData(0,0,W,H);
      for(let i=0;i<img.data.length;i+=4){img.data[i]=255;img.data[i+1]=255;img.data[i+2]=255;img.data[i+3]=255-img.data[i+3];}
      g.putImageData(img,0,0);
    }mark();return;}
   if(action==='palette-citrus'){l.colors=['#9be17c','#f8df68'];}
   if(action==='palette-lavender'){l.colors=['#e6a2ff','#a4c8ff'];}
   if(action.startsWith('palette-')){root.querySelector('[data-foil-prop=color0]').value=l.colors[0];root.querySelector('[data-foil-prop=color1]').value=l.colors[1];engine?.updateLayer(l);return;}
   if(action==='apply'){
    el.disabled=true;setStatus('Uploading foil masks…');
    try{
     for(const layer of layers){
      if(!modified.has(layer.id))continue;
      const mask=maskMap.get(layer.id);if(!mask)continue;
      const dataUrl=mask.toDataURL('image/png');
      const result=await upload(dataUrl);layer.maskArtId=result.artId;layer.maskUrl=result.url;
     }
     const output=layers.map(l=>{
      const x=copy(l);delete x._pattern;delete x.maskUrl;delete x.maskCanvas;return x;
     });
     onApply(output);close();
    }catch(err){setStatus('Could not save foil masks: '+err.message);el.disabled=false;}
   }
  }catch(err){setStatus(err.message);}
 });
 root.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-foil-tool]');if(!el)return;
  tool=el.dataset.foilTool;
  root.querySelectorAll('[data-foil-tool]').forEach(x=>x.classList.toggle('active',x.dataset.foilTool===tool));
 });
 root.addEventListener('input',ev=>{
  if(ev.target.id==='foil-brush-size'){size=Number(ev.target.value);root.querySelector('#foil-brush-label').textContent=size+'px';return;}
  if(ev.target.id==='foil-tolerance'){tolerance=Number(ev.target.value);root.querySelector('#foil-tolerance-label').textContent=tolerance;return;}
  const key=ev.target.dataset.foilProp,layer=currentLayer();if(!layer||!key)return;
  const val=ev.target.type==='checkbox'?ev.target.checked:ev.target.type==='range'?Number(ev.target.value):ev.target.value;
  if(key==='color0')layer.colors[0]=val;else if(key==='color1')layer.colors[1]=val;else layer[key]=val;
  root.querySelectorAll('[data-foil-output]').forEach(x=>{if(x.dataset.foilOutput===key)x.textContent=Number(val).toFixed(2);});
  engine?.updateLayer(layer);
  const visibleEntry=root.querySelector('.foil-layer-entry[data-index="'+current+'"]');
  if(key==='name'&&visibleEntry)visibleEntry.querySelector('strong').textContent=val;
  if(key==='type'&&visibleEntry)visibleEntry.querySelector('small').textContent=val+' · editable mask';
 });
}
window.USA50FoilLab=Object.freeze({open});
})();