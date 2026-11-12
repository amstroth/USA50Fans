/* USA50 Card Drops v0.7 — switch between current and future albums. */
(function installPackSelector(){
'use strict';
let selectedIndex=0;
const oldDropsScreen=dropsScreen;
const albums=()=>store?.albums||[];
const selected=()=>albums()[Math.min(selectedIndex,Math.max(0,albums().length-1))];
function packSelector(){
 const list=albums(),item=selected();if(!item)return '';
 const i=Math.max(0,list.indexOf(item)),name=item.title||'Photocard Collection';
 const available=!!item.available;
 const viewLabel=item.member==='Arielle'?'Sweet & Sour · Arielle':item.team+' · '+name;
 return '<section class="pack-selector glass" aria-label="Choose a photocard pack">'+
   '<div class="pack-selector-eyebrow">CHOOSE YOUR PACK · '+(i+1)+' OF '+list.length+'</div>'+
   '<div class="pack-selector-row">'+
     '<button class="pack-arrow" data-action="pack-prev" type="button" aria-label="Previous pack">‹</button>'+
     '<div class="pack-selector-center">'+
       '<div class="pack-set-name">'+e(viewLabel)+'</div>'+
       '<h2>'+e(name)+' <span>✧</span></h2>'+
       '<p>'+e(item.team||'USA50')+' · '+(available?'Now available':'Coming soon')+'</p>'+
       '<span class="pack-state '+(available?'ready':'locked')+'">'+(available?'Available to pull':'Preview only · Locked')+'</span>'+
     '</div>'+
     '<button class="pack-arrow" data-action="pack-next" type="button" aria-label="Next pack">›</button>'+
   '</div>'+
   '<div class="pack-dots" aria-label="Pack selection">'+list.map((a,j)=>'<button type="button" aria-label="'+e(a.title)+'" aria-current="'+(j===i?'true':'false')+'" data-action="pack-select" data-value="'+j+'" class="'+(j===i?'on':'')+'"></button>').join('')+'</div>'+
   '</section>';
}
dropsScreen=function(){
 let output=oldDropsScreen(),item=selected(),active=!!item?.available;
 if(!item)return output;
 // The True Love content currently is the only released banner on the backend.
 // Upcoming sets must never spend STARS or silently award a different set.
 if(!active){
   output=output.replace(/(<button\b[^>]*\bdata-action="(?:pull|pull10|pull-free)"[^>]*)(>)/g,(m,attrs,end)=>attrs+' disabled aria-disabled="true"'+end);
   output=output.replace('True Love Photocard Pack',e(item.title)+' · PREVIEW');
   output=output.replace('<div class="dream-pack-sub">True Love</div>','<div class="dream-pack-sub">'+e(item.title)+'</div>');
   output=output.replace('Sweet &amp; Sour',e(item.team)+' Photocard Collection');
   output=output.replace('NEW DROP · ARIELLE','COMING SOON · '+e(item.team));
   output=output.replace('On paid-style pull 30,','When this album becomes available, on paid-style pull 30,');
   output=output.replace('<div class="gacha-layout">','<div class="pack-coming-notice">This pack is a preview. Pulls and rarity guarantees will unlock when USA50 releases the set.</div><div class="gacha-layout">');
 } else {
   output=output.replace('<div class="gacha-layout">','<div class="pack-current-note">Selected: '+e(item.title)+' · pulls will add cards to this album.</div><div class="gacha-layout">');
 }
 return output.replace('<div class="gacha-layout">',packSelector()+'<div class="gacha-layout">');
};
const oldAct=act;
act=async function(name,node){
 if(name==='pack-prev'||name==='pack-next'||name==='pack-select'){
   const list=albums();if(!list.length)return;
   if(name==='pack-select')selectedIndex=Math.max(0,Math.min(list.length-1,Number(node.dataset.value)||0));
   else selectedIndex=(selectedIndex+(name==='pack-next'?1:-1)+list.length)%list.length;
   render();return;
 }
 if(['pull','pull10','pull-free','pull-from-modal'].includes(name)&&!selected()?.available){
   return toast('This collection has not been released. Select an available pack to pull.');
 }
 return oldAct(name,node);
};
// Expose the current set to the animation overlay for consistent pack labels.
window.USA50_SelectedPack=function(){return selected()||null;};
})();