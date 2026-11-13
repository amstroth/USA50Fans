/* USA50 Collector Viewer v1.1 — 3D two-sided owned cards, pointer and keyboard rotation. */
(function installCollectorViewer(){
'use strict';
const previousAct=act;
let active=null;
function owned(card){
 return Number(store?.me?.state?.owned?.[card.id]||0)>0;
}
function findCard(id){
 const primary=(store?.cards||[]).find(c=>c.id===id);
 if(primary)return primary;
 for(const cards of Object.values(store?.packCards||{})){
   const found=cards.find(c=>c.id===id);
   if(found)return found;
 }
 return null;
}
function defaultBack(){
 return '<div class="collector-default-back"><div class="collector-back-orbit"></div>'+
   '<div class="collector-back-mark">✧</div><strong>USA50</strong><span>FAN CLUB</span>'+
   '<div class="collector-back-sub">⋆ closer to your stars ⋆</div><div class="collector-back-bottom">♡ ✦ ♡</div></div>';
}
function rotate(card,rotationX,rotationY){
 const el=document.getElementById('collector-rotator');
 if(!el)return;
 active={card,rotationX:Math.max(-36,Math.min(36,rotationX)),rotationY};
 el.style.transform='rotateX('+active.rotationX+'deg) rotateY('+active.rotationY+'deg)';
 const facingBack=(Math.cos(active.rotationY*Math.PI/180)<0);
 const tag=document.getElementById('collector-side-label');
 if(tag)tag.textContent=facingBack?'BACK':'FRONT';
}
function showCard(card){
 if(!owned(card))return toast('Obtain this card before unlocking its 3D view.');
 const name=card.title||'Photocard';
 const face=cardElement(card,false);
 const back=card.backArtUrl?
  '<img src="'+e(card.backArtUrl)+'" alt="'+e(name)+' back artwork" draggable="false" loading="eager">':defaultBack();
 const original=card.backSource==='card'?'Individual collector back':card.backSource==='set'?'Collection back':'USA50 collector back';
 showModal(name+' · Collector view','<div class="collector-universe" id="collector-universe" aria-label="Interactive three-dimensional photocard viewer">'+
   '<div class="collector-aura collector-aura-a"></div><div class="collector-aura collector-aura-b"></div>'+
   '<span class="collector-sparkle one">✧</span><span class="collector-sparkle two">✦</span><span class="collector-sparkle three">✧</span>'+
   '<div class="collector-info"><span>USA50 · DIGITAL COLLECTION</span><h3>'+e(name)+'</h3>'+
   '<p>'+e(card.member||'USA50')+' · '+e(card.rarity)+' · '+e(original)+'</p></div>'+
   '<div class="collector-3d-stage" id="collector-3d-stage" role="group" tabindex="0" aria-label="'+e(name)+'. Drag to rotate, or use the Flip card button.">'+
    '<div class="collector-rotator" id="collector-rotator">'+
      '<div class="collector-face collector-face-front">'+face+'</div>'+
      '<div class="collector-face collector-face-back">'+back+'</div>'+
      '<div class="collector-edge" aria-hidden="true"></div>'+
    '</div>'+
   '</div><div class="collector-status"><span id="collector-side-label">FRONT</span><p>Drag left or right to turn the card around</p></div>'+
   '<div class="collector-controls"><button type="button" class="collector-btn" data-action="collector-flip">↻ Flip card</button>'+
   '<button type="button" class="collector-btn subtle" data-action="collector-reset">Reset view</button></div>'+
   '</div>');
 const modal=document.querySelector('#modal-root .modal'),backdrop=document.querySelector('#modal-root .modal-backdrop');
 modal?.classList.add('collector-viewer-modal');
 backdrop?.classList.add('collector-viewer-backdrop');
 rotate(card,-7,12);
 const stage=document.getElementById('collector-3d-stage');
 if(!stage)return;
 let start=null;
 stage.addEventListener('pointerdown',event=>{
   if(event.button!==0 && event.pointerType==='mouse')return;
   start={id:event.pointerId,x:event.clientX,y:event.clientY,rx:active.rotationX,ry:active.rotationY};
   stage.setPointerCapture(event.pointerId);
   stage.classList.add('grabbing');
   event.preventDefault();
 });
 stage.addEventListener('pointermove',event=>{
   if(!start||event.pointerId!==start.id)return;
   rotate(card,start.rx-(event.clientY-start.y)*.33,start.ry+(event.clientX-start.x)*.5);
 });
 function stop(event){if(start?.id===event.pointerId){start=null;stage.classList.remove('grabbing');}}
 stage.addEventListener('pointerup',stop);
 stage.addEventListener('pointercancel',stop);
 stage.addEventListener('lostpointercapture',stop);
}
act=async function(name,node){
 if(name==='card-detail'){
   const card=findCard(node.dataset.value);
   if(card&&owned(card))return showCard(card);
   return previousAct(name,node);
 }
 if(name==='collector-flip'){
   if(active&&document.getElementById('collector-rotator'))
     rotate(active.card,active.rotationX,active.rotationY+180);
   return;
 }
 if(name==='collector-reset'){
   if(active&&document.getElementById('collector-rotator'))rotate(active.card,-7,12);
   return;
 }
 return previousAct(name,node);
};
document.addEventListener('keydown',event=>{
 if(!active||!document.getElementById('collector-rotator'))return;
 if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
   if(event.target?.matches('input,textarea'))return;
   event.preventDefault();
   rotate(active.card,active.rotationX,active.rotationY+(event.key==='ArrowRight'?22:-22));
 }
 if(event.key==='ArrowUp'||event.key==='ArrowDown'){
   event.preventDefault();rotate(active.card,active.rotationX+(event.key==='ArrowUp'?-10:10),active.rotationY);
 }
});
})();
