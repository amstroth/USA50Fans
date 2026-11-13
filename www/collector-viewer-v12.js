/* USA50 Collector v1.2: real Three.js front/back, thin physical edge, drag/flip. */
(function(){
'use strict';
const previousAct=act;
let openEngine=null;
function findCard(id){
 const base=(store?.cards||[]).find(c=>c.id===id);if(base)return base;
 for(const set of Object.values(store?.packCards||{})){
  const c=set.find(c=>c.id===id);if(c)return c;
 }
 return null;
}
function owns(c){return Number(store?.me?.state?.owned?.[c.id]||0)>0;}
async function show(card){
 if(!owns(card))return toast('This view unlocks when you obtain the photocard.');
 openEngine?.destroy();openEngine=null;
 const name=card.title||'Photocard';
 const source=card.backSource==='card'?'Individual collector back':card.backSource==='set'?'Set default back':'USA50 default back';
 showModal(name+' · Collector view','<div class="collector-universe" id="collector-universe">'+
 '<div class="collector-aura collector-aura-a"></div><div class="collector-aura collector-aura-b"></div>'+
 '<span class="collector-sparkle one">✧</span><span class="collector-sparkle two">✦</span>'+
 '<div class="collector-info"><span>USA50 · DIGITAL COLLECTION</span><h3>'+e(name)+'</h3>'+
 '<p>'+e(card.member||'USA50')+' · '+e(card.rarity)+' · '+e(source)+'</p></div>'+
 '<div class="collector-3d-stage" id="collector-3d-stage" tabindex="0" role="group" aria-label="3D photocard. Drag to rotate or choose Flip card.">'+
 '<div id="collector-three-container" class="collector-three-container"><span class="collector-loading">Preparing your card ✧</span></div></div>'+
 '<div class="collector-status"><span id="collector-side-label">FRONT</span>'+
 '<p id="collector-viewer-help">Drag left or right to see both sides</p></div>'+
 '<div class="collector-controls"><button type="button" class="collector-btn" data-action="collector-flip">↻ Flip card</button>'+
 '<button type="button" class="collector-btn subtle" data-action="collector-reset">Reset view</button></div></div>');
 document.querySelector('#modal-root .modal')?.classList.add('collector-viewer-modal');
 document.querySelector('#modal-root .modal-backdrop')?.classList.add('collector-viewer-backdrop');
 const container=document.getElementById('collector-three-container');
 if(!container)return;
 try{
  const engine=await window.USA50ThreeCard.create({container,card,layers:card.materialLayers||[],
   onSide:side=>{const x=document.getElementById('collector-side-label');if(x)x.textContent=side;},
   onWarning:warning=>{const x=document.getElementById('collector-viewer-help');if(x)x.textContent=warning;}
  });
  if(!container.isConnected){engine.destroy();return;}
  openEngine=engine;
 }catch(err){
  if(!container.isConnected)return;
  const back=card.backArtUrl?'A custom card back exists, but the interactive renderer could not load it.':'This card uses the USA50 default back.';
  container.innerHTML='<div class="collector-fallback">'+cardElement(card,false)+'<p>'+e(err.message)+'</p><small>'+e(back)+'</small></div>';
  const info=document.getElementById('collector-viewer-help');if(info)info.textContent='Try enabling hardware acceleration to use the 3D viewer.';
 }
}
act=async function(name,node){
 if(name==='card-detail'){
  const card=findCard(node.dataset.value);
  if(card&&owns(card))return show(card);
  return previousAct(name,node);
 }
 if(name==='collector-flip')return openEngine?.flip();
 if(name==='collector-reset')return openEngine?.reset();
 if(name==='close-modal'){openEngine?.destroy();openEngine=null;return previousAct(name,node);}
 return previousAct(name,node);
};
document.addEventListener('keydown',event=>{
 if(!openEngine||!document.getElementById('collector-three-container'))return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
  if(event.target?.matches('input,textarea'))return;
  event.preventDefault();
  const side=Number(document.getElementById('collector-side-label')?.textContent==='BACK');
  // Arrow keys rotate a small increment; Flip button always turns 180 degrees.
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    const x=event.key==='ArrowRight'?16:-16;
    window.USA50CollectorKeyAngle=(window.USA50CollectorKeyAngle||12)+x;
    openEngine.rotation(-7,window.USA50CollectorKeyAngle);
  }else{
    window.USA50CollectorKeyTilt=Math.max(-35,Math.min(35,(window.USA50CollectorKeyTilt||-7)+(event.key==='ArrowUp'?-10:10)));
    openEngine.rotation(window.USA50CollectorKeyTilt,window.USA50CollectorKeyAngle||12);
  }
 }
});
})();
