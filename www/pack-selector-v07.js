/* USA50 gacha carousel — published packs share the same secure server pull endpoints. */
(function installPackSelector(){
'use strict';
let selectedId='arielle-true-love';
const priorDrops=dropsScreen;
const baseId='arielle-true-love';
const choices=()=>store?.albums||[];
const selected=()=>choices().find(a=>a.id===selectedId)||choices()[0]||null;
function nav(){
  const list=choices(),pack=selected();if(!pack)return '';
  const i=list.indexOf(pack),available=pack.available;
  return '<section class="pack-selector glass"><div class="pack-selector-eyebrow">SELECT YOUR PACK · '+(i+1)+' OF '+list.length+'</div>'+
    '<div class="pack-selector-row"><button class="pack-arrow" type="button" data-action="pack-prev" aria-label="Previous card pack">‹</button>'+
    '<div class="pack-selector-center"><div class="pack-set-name">'+e(pack.member)+' · '+e(pack.subgroup||pack.team)+'</div>'+
    '<h2>'+e(pack.title)+' <span>✧</span></h2>'+
    '<p>'+e(pack.team)+(pack.isTest?' · Development test pack':' · Collector edition')+'</p>'+
    '<span class="pack-state '+(available?'ready':'locked')+'">'+(available?'Available for pulls':'Not released · Preview')+'</span></div>'+
    '<button class="pack-arrow" type="button" data-action="pack-next" aria-label="Next card pack">›</button></div>'+
    '<div class="pack-dots">'+list.map((p,j)=>'<button type="button" class="'+(i===j?'on':'')+'" aria-current="'+(i===j)+'" aria-label="'+e(p.title)+'" data-action="pack-select" data-value="'+e(p.id)+'"></button>').join('')+'</div></section>';
}
dropsScreen=function(){
  const pack=selected();
  if(!pack)return priorDrops();
  const originalOdds=store.rarities;
  store.rarities=pack.available && pack.odds?pack.odds:originalOdds;
  let html;try{html=priorDrops();}finally{store.rarities=originalOdds;}
  const other=pack.id!==baseId;
  if(other){
    html=html.replace('NEW DROP · ARIELLE',e((pack.available?'NEW COLLECTION':'COMING SOON')+' · '+pack.member.toUpperCase()));
    html=html.replace('Sweet &amp; Sour',e(pack.title));
    html=html.replace('True Love Photocard Pack',e(pack.subgroup||pack.team)+' Photocard Pack');
    html=html.replace('<div class="dream-pack-sub">True Love</div>','<div class="dream-pack-sub">'+e(pack.title)+'</div>');
    html=html.replace("Arielle · True Love",e(pack.member)+' · '+e(pack.title));
    const progress=store.me?.state?.packProgress?.[pack.id]||{paidPulls:0,pityAchieved:false};
    html=html.replace(/(<div class="pity-number">[\s\S]*?<span>)([^<]*)(<\/span>)/,'$1'+progress.paidPulls+' / 30$3');
    const percent=Math.min(100,Math.round(100*progress.paidPulls/30));
    html=html.replace(/(<div class="progress"><span style="width:)(\d+)(%")/,'$1'+percent+'$3');
  }
  if(!pack.available){
    html=html.replace(/(<button\b[^>]*data-action="(?:pull|pull10|pull-free)"[^>]*)(>)/g,(_m,a,z)=>a+' disabled aria-disabled="true"'+z);
    html=html.replace('<div class="gacha-layout">','<p class="pack-coming-notice">This collection is not released. Management can complete its artwork and schedule publication in Card Studio.</p><div class="gacha-layout">');
  }else html=html.replace('<div class="gacha-layout">','<p class="pack-current-note">Now selected: '+e(pack.member)+' · '+e(pack.title)+'</p><div class="gacha-layout">');
  return html.replace('<div class="gacha-layout">',nav()+'<div class="gacha-layout">');
};
const oldAct=act;
act=async function(name,node){
  const pack=selected();
  if(['pack-prev','pack-next','pack-select'].includes(name)){
    const list=choices();
    if(!list.length)return;
    let i=list.findIndex(a=>a.id===selected()?.id);
    if(name==='pack-next')i=(i+1)%list.length;
    if(name==='pack-prev')i=(i-1+list.length)%list.length;
    if(name==='pack-select')i=Math.max(0,list.findIndex(a=>a.id===node.dataset.value));
    selectedId=list[i].id;render();return;
  }
  if(['pull','pull10','pull-free','pull-from-modal'].includes(name)){
    if(!pack?.available)return toast('This collection is not released. Pick an available pack.');
    if(pack.id!==baseId){
      if(!store.me)return go('profile');
      const ten=name==='pull10',free=name==='pull-free';
      const endpoint=ten?'/api/cards/pull10':free?'/api/cards/pull-points':'/api/cards/pull';
      const result=await request(endpoint,{method:'POST',body:JSON.stringify({albumId:pack.id})});
      await refresh();showPackOpening(result,free);return;
    }
  }
  return oldAct(name,node);
};
window.USA50_SelectedPack=()=>selected();
})();
