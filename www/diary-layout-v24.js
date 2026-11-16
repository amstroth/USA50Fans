/* Visual diary layout: idol-only pointer drag, scale and rotate, no external editor. */
(function(){
'use strict';
let decorations=[],photos=[],selected=-1,drag=null;
const clamp=(x,min,max)=>Math.min(max,Math.max(min,Number(x)||min));
const escapeText=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function htmlOne(item,index,photoList,edit){
 const x=clamp(item.x,6,94),y=clamp(item.y,5,95);
 const scale=clamp(item.scale,.45,2.5),rotation=clamp(item.rotation,-45,45);
 const style='left:'+x+'%;top:'+y+'%;transform:translate(-50%,-50%) rotate('+rotation+'deg) scale('+scale+');z-index:'+(index+3);
 const photo=photoList[item.photoIndex]||{};
 const inner=item.kind==='sticker'?'<span class="diary-deco-emoji">'+escapeText(item.emoji||'♡')+'</span>':
 '<figure class="diary-deco-polaroid"><img draggable="false" src="'+escapeText(photo.url||'')+'" alt="Diary polaroid"><figcaption>'+escapeText(photo.caption||'A little moment')+'</figcaption></figure>';
 return '<div class="diary-deco-item '+(edit?'draggable':'')+(edit&&index===selected?' selected':'')+'" style="'+style+'" data-deco-index="'+index+'"'+(edit?' role="button" tabindex="0" aria-label="Move '+(item.kind==='sticker'?'sticker':'polaroid')+', arrow keys reposition"':'')+'>'+inner+'</div>';
}
function layer(items,photoList,edit){
 return '<div class="diary-decorations '+(edit?'editing':'published')+'">'+items.map((item,index)=>htmlOne(item,index,photoList,edit)).join('')+'</div>';
}
function renderSaved(entry){
 if(!entry?.placedItems?.length)return '';
 return layer(entry.placedItems,entry.photos||[],false);
}
function currentPhotos(){
 return photos.map(p=>({url:'data:'+p.mime+';base64,'+p.data,caption:p.caption}));
}
function paint(){
 const target=document.querySelector('#diary-live-preview .diary-sheet');
 if(!target)return;
 target.querySelector('.diary-decorations')?.remove();
 target.insertAdjacentHTML('beforeend',layer(decorations,currentPhotos(),true));
 controls();
}
function controls(){
 const ctrl=document.querySelector('#usa50-diary-controls');
 if(!ctrl)return;
 const item=decorations[selected];
 ctrl.hidden=!item;
 if(!item)return;
 ctrl.querySelector('.diary-selection-label').textContent=item.kind==='sticker'?'Sticker '+item.emoji:'Polaroid '+(item.photoIndex+1);
 ctrl.querySelector('#diary-deco-scale').value=String(item.scale);
 ctrl.querySelector('#diary-deco-rotation').value=String(item.rotation);
 document.querySelectorAll('.diary-deco-item.draggable').forEach(el=>el.classList.toggle('selected',Number(el.dataset.decoIndex)===selected));
}
function sync(){
 if(document.querySelector('#diary-entry-form'))paint();
}
function select(index){selected=index;controls();}
function updateActive(){
 const item=decorations[selected],el=document.querySelector('#diary-live-preview .diary-deco-item[data-deco-index="'+selected+'"]');
 if(!item||!el)return;
 el.style.left=item.x+'%';el.style.top=item.y+'%';
 el.style.transform='translate(-50%,-50%) rotate('+item.rotation+'deg) scale('+item.scale+')';
 controls();
}
function addSticker(emoji){
 if(!document.querySelector('#diary-entry-form'))return;
 if(decorations.filter(x=>x.kind==='sticker').length>=18){toast('18 stickers maximum per page.');return;}
 const i=decorations.length;
 decorations.push({kind:'sticker',emoji,x:30+(i%4)*14,y:47+Math.floor(i/4)*8,scale:1,rotation:0});
 selected=decorations.length-1;paint();
}
function photosChanged(next){
 photos=Array.isArray(next)?next.slice(0,4):[];
 decorations=decorations.filter(x=>x.kind!=='photo');
 photos.forEach((p,i)=>decorations.push({kind:'photo',photoIndex:i,x:i%2?71:27,y:i<2?68:85,scale:1,rotation:i%2?5:-5}));
 selected=decorations.length?decorations.length-1:-1;paint();
}
function open(){
 reset();
 const preview=document.querySelector('#diary-live-preview');if(!preview)return;
 const tip=document.createElement('p');tip.className='diary-edit-tip';
 tip.textContent='✧ Drag stickers and polaroids anywhere on the diary page. Tap one to resize, rotate or remove it.';
 preview.before(tip);
 preview.insertAdjacentHTML('afterend','<div class="diary-edit-controls" id="usa50-diary-controls" hidden><strong class="diary-selection-label">Selected sticker</strong>'+
 '<div class="diary-slider-row"><label>Size<input id="diary-deco-scale" type="range" min="0.45" max="2.5" step="0.05" value="1"></label>'+
 '<label>Rotate<input id="diary-deco-rotation" type="range" min="-45" max="45" step="1" value="0"></label></div>'+
 '<div class="row wrap"><button type="button" class="btn tiny secondary" data-action="diary-deco-front">Bring forward</button>'+
 '<button type="button" class="btn tiny secondary" data-action="diary-deco-remove">Remove</button></div></div>');
 paint();
}
function reset(){decorations=[];photos=[];selected=-1;drag=null;}
document.addEventListener('pointerdown',event=>{
 const item=event.target.closest?.('#diary-live-preview .diary-deco-item.draggable');if(!item)return;
 const index=Number(item.dataset.decoIndex),sheet=item.closest('.diary-sheet');
 if(!decorations[index]||!sheet)return;
 event.preventDefault();select(index);
 const rect=sheet.getBoundingClientRect();
 drag={index,startX:event.clientX,startY:event.clientY,x:decorations[index].x,y:decorations[index].y,w:rect.width,h:rect.height,pointerId:event.pointerId};
 try{item.setPointerCapture(event.pointerId);}catch(_){}
});
document.addEventListener('pointermove',event=>{
 if(!drag||event.pointerId!==drag.pointerId)return;
 const record=decorations[drag.index];if(!record)return;
 record.x=clamp(drag.x+(event.clientX-drag.startX)*100/drag.w,6,94);
 record.y=clamp(drag.y+(event.clientY-drag.startY)*100/drag.h,5,95);
 updateActive();
});
function release(event){if(drag?.pointerId===event.pointerId)drag=null;}
document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);
document.addEventListener('input',event=>{
 const el=event.target;
 if(!['diary-deco-scale','diary-deco-rotation'].includes(el.id))return;
 event.stopImmediatePropagation();
 const item=decorations[selected];if(!item)return;
 if(el.id==='diary-deco-scale')item.scale=clamp(el.value,.45,2.5);
 else item.rotation=clamp(el.value,-45,45);
 updateActive();
},true);
document.addEventListener('keydown',event=>{
 const node=event.target.closest?.('#diary-live-preview .diary-deco-item.draggable');if(!node||!event.key.startsWith('Arrow'))return;
 const index=Number(node.dataset.decoIndex),item=decorations[index];if(!item)return;
 event.preventDefault();select(index);
 const step=event.shiftKey?5:1;
 if(event.key==='ArrowLeft')item.x=clamp(item.x-step,6,94);
 if(event.key==='ArrowRight')item.x=clamp(item.x+step,6,94);
 if(event.key==='ArrowUp')item.y=clamp(item.y-step,5,95);
 if(event.key==='ArrowDown')item.y=clamp(item.y+step,5,95);
 updateActive();
});
const previousAct=act;
act=async function(name,node){
 if(name==='diary-sticker'){addSticker(node.dataset.value);return;}
 if(name==='diary-deco-remove'){
  if(selected<0)return;
  const item=decorations[selected];
  if(item?.kind==='photo'){
   // Removing a polaroid from layout does not remove its uploaded photograph.
   // It will simply not be displayed on the page.
  }
  decorations.splice(selected,1);selected=-1;paint();return;
 }
 if(name==='diary-deco-front'){
  if(selected<0)return;
  decorations.push(decorations.splice(selected,1)[0]);selected=decorations.length-1;paint();return;
 }
 if(name==='diary-new'){const result=await previousAct(name,node);open();return result;}
 return previousAct(name,node);
};
window.USA50DiaryLayout={
 renderSaved,sync,open,photosChanged,reset,
 getStickerList:()=>decorations.filter(x=>x.kind==='sticker').map(x=>x.emoji),
 export:()=>decorations.map(x=>({...x}))
};
})();