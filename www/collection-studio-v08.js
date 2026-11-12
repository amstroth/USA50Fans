/* Collection albums created in Card Studio appear in fan-facing galleries when released. */
(function(){
 'use strict';
 let albumId='arielle-true-love';
 const mainAlbum='arielle-true-love',oldCollection=collectionScreen,oldAct=act;
 function current(){return store.albums.find(a=>a.id===albumId)||store.albums[0];}
 function amount(c){return Number(store.me?.state?.owned?.[c.id]||0);}
 function tile(c){
  const n=amount(c);
  return '<button class="card-tile '+(n?'':'locked')+'" data-action="card-detail" data-value="'+e(c.id)+'">'+cardElement(c,!n)+
    '<div class="card-caption">'+e(c.title)+'</div><div class="card-meta">'+e(c.rarity)+' · '+(n?'Owned ×'+n:'Not found')+'</div></button>';
 }
 collectionScreen=function(){
  const active=current();
  if(!active||active.id===mainAlbum)return oldCollection();
  const cards=store.packCards?.[active.id]||[],have=cards.filter(c=>amount(c)>0).length;
  const complete=cards.length&&have===cards.length;
  const pct=cards.length?Math.round(have*100/cards.length):0;
  const header=screenTop(active.member+' · '+active.title,'Collect all the cards in this USA50 album.',
    '<button class="btn secondary" data-action="album" data-value="'+mainAlbum+'">← True Love collection</button>');
  const albums='<div class="grid grid-3" style="margin:18px 0">'+store.albums.map(p=>'<button class="glass album-tile '+(!p.available?'inactive':'')+'" data-action="album" data-value="'+e(p.id)+'">'+
    '<div class="album-cover"><div class="eyebrow" style="color:#fff">'+e(p.subgroup||p.team)+'</div><h2>'+e(p.title)+'</h2><p>'+p.count+' cards '+(p.available?'':' · Coming soon')+'</p><div class="bubble-graphic">✧</div></div>'+
    '<div class="album-foot"><strong>'+e(p.member)+' Collection</strong><div class="album-progress"><span>'+e(p.id===active.id?'Selected':p.available?'View album':'Locked')+'</span><span>'+e(p.isTest?'Test pack':'USA50')+'</span></div></div></button>').join('')+'</div>';
  return header+albums+'<section class="glass panel" style="margin-bottom:16px"><div class="eyebrow">'+e(active.subgroup||active.team)+' · '+e(active.title)+'</div>'+
    '<div class="row"><h3>Collection Progress</h3><strong>'+have+' / '+cards.length+' · '+pct+'%</strong></div><div class="progress"><span style="width:'+pct+'%"></span></div>'+
    '<p class="lead">'+(complete?'Digital album complete! ✧':'Keep pulling from this set to fill your album.')+'</p>'+
    '<button class="btn" data-go="drops">Open card packs</button></section>'+
    '<div class="section-row"><h2>Album cards</h2><span class="lead">'+cards.filter(c=>amount(c)>1).length+' duplicate types</span></div>'+
    (cards.length?'<div class="card-grid">'+cards.map(tile).join('')+'</div>':'<div class="glass panel">No cards available.</div>');
 };
 act=async function(name,node){
   if(name==='album'){
     const next=store.albums.find(a=>a.id===node.dataset.value);
     if(!next)return toast('Album not found.');
     if(!next.available)return toast('This album has not been released yet.');
     albumId=next.id;render();window.scrollTo(0,0);return;
   }
   if(name==='card-detail'&&albumId!==mainAlbum){
     const pack=current(),c=store.packCards?.[albumId]?.find(x=>x.id===node.dataset.value);
     if(c){
       const n=amount(c);
       return showModal(c.title,'<div style="max-width:245px;margin:auto">'+cardElement(c,!n)+'</div>'+
         '<div class="row" style="margin-top:15px"><strong>'+e(c.title)+' · '+e(c.rarity)+'</strong><span class="badge">'+(n?'Owned ×'+n:'Not found')+'</span></div>'+
         '<p class="lead">'+e(pack.member)+' · '+e(pack.title)+' · Card #'+c.index+'</p><div class="modal-actions"><button class="btn secondary" data-go="drops">Card Drops</button></div>');
     }
   }
   return oldAct(name,node);
 };
})();
