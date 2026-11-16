/* USA50 STAR economy: read-only public catalog and admin-only no-payment QA. */
(function(){
'use strict';
const previousShop=shopScreen;
function starShape(x,y,r,rotation=0){
 const pts=[];for(let i=0;i<10;i++){const a=(i*Math.PI/5-Math.PI/2)+rotation,d=i%2?r*.46:r;pts.push((x+Math.cos(a)*d).toFixed(1)+','+(y+Math.sin(a)*d).toFixed(1));}
 return '<polygon points="'+pts.join(' ')+'" fill="url(#starGold)" stroke="#fff6da" stroke-width="2.4"/>';
}
function starArt(sku){
 let parts='';
 if(sku==='spark')parts=starShape(80,65,34)+'<circle cx="115" cy="28" r="3" fill="#fff"/><circle cx="42" cy="104" r="4" fill="#fff"/>';
 if(sku==='glow')parts=starShape(51,83,24,-.1)+starShape(88,71,29,.23)+starShape(115,95,20,-.18)+starShape(79,42,17);
 if(sku==='shimmer')parts='<path d="M36 57 L82 36 L129 57 L82 80Z" fill="#f7c4ee" stroke="#fff" stroke-width="3"/><path d="M36 57 L82 80 L82 122 L36 99Z" fill="#d49bec" stroke="#fff" stroke-width="3"/><path d="M82 80 L129 57 L129 99 L82 122Z" fill="#a981de" stroke="#fff" stroke-width="3"/>'+starShape(81,35,23)+starShape(115,22,12);
 if(sku==='starlight')parts='<path d="M41 46 Q41 36 53 36 H110 Q120 36 121 46 L130 119 Q82 128 33 119Z" fill="#cd9deb" stroke="#fff" stroke-width="3"/><path d="M61 51 V37 Q61 13 81 13 Q101 13 101 37 V51" fill="none" stroke="#fff3fc" stroke-width="8" stroke-linecap="round"/>'+starShape(82,79,23)+starShape(115,31,13);
 if(sku==='galaxy')parts='<path d="M16 72 L87 72 L102 91 L102 118 L16 118Z" fill="#b68bdf" stroke="#fff" stroke-width="3"/><path d="M102 90 L129 90 L145 104 L145 118 L102 118Z" fill="#e8b7ed" stroke="#fff" stroke-width="3"/><rect x="114" y="96" width="17" height="12" rx="3" fill="#e9f8ff"/><circle cx="43" cy="119" r="12" fill="#705089" stroke="#f6ddff" stroke-width="4"/><circle cx="121" cy="119" r="12" fill="#705089" stroke="#f6ddff" stroke-width="4"/>'+starShape(32,52,19)+starShape(59,48,23)+starShape(84,54,18)+starShape(106,59,13);
 return '<svg viewBox="0 0 160 145" role="img" aria-label="'+sku+' star bundle illustration" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="starGold" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff8bf"/><stop offset=".55" stop-color="#ffd66e"/><stop offset="1" stop-color="#efa8ca"/></linearGradient></defs><ellipse cx="80" cy="127" rx="53" ry="9" fill="#b881cc" opacity=".12"/>'+parts+'</svg>';
}

function starShop(){
 const c=store?.economy;
 if(!c)return '';
 const bonus=c.bonusAvailable!==false;
 return '<section class="usa50-starshop" id="usa50-starshop"><div class="usa50-starshop-heading"><span class="eyebrow">USA50 STAR ECONOMY</span><h2>STAR Shop ✦</h2><p class="lead">Current balance: <strong>✦ '+cash(store?.me?.state?.stars||0)+' STARS</strong></p><p class="lead">Explore proposed STAR packs. This is a development preview — no real purchases or charges are possible.</p></div>'+
 '<div class="usa50-starshop-offer"><strong>'+(bonus?'✦ First STAR purchase this month: +'+c.firstPurchaseBonusPercent+'% bonus':'Monthly first-purchase bonus already used')+'</strong><p>One bonus per account per calendar month (New York time), renewed automatically each month. Bonus applies to your first eligible pack only, not every pack.</p></div>'+
 '<div class="usa50-starshop-grid">'+c.bundles.map(p=>'<button type="button" class="usa50-starshop-pack" data-action="economy-preview" data-value="'+e(p.sku)+'"><span class="usa50-starpack-art">'+starArt(p.sku)+'</span><strong>'+e(p.name)+'</strong><b>'+cash(p.stars)+' STARS</b>'+(p.monthlyBonus?'<small>+ '+cash(p.monthlyBonus)+' monthly bonus</small>':'<small>Standard bundle</small>')+'<span class="usa50-starshop-price">$'+(p.usdCents/100).toFixed(2)+'</span></button>').join('')+'</div>'+
 '<p class="usa50-starshop-note">✦ One reward draw: '+cash(c.singlePullStars)+' STARS · 10 reward draws: '+cash(c.tenPullStars)+' STARS (10% cheaper) · Free pull: '+cash(c.freePullPoints)+' Pull Points. Purchase prices are planning estimates; no payment or checkout is enabled. Fancall lottery entries remain free and separate from STARS.</p></section>';
}
shopScreen=function(){return starShop()+previousShop();};
const prevAct=act;
act=async function(name,node){
 if(name==='economy-preview'){
  const c=store?.economy,p=c?.bundles?.find(x=>x.sku===node.dataset.value);
  if(!p)return;
  const admin=store?.me?.role==='admin';
  return showModal('✦ '+e(p.name)+' STAR Pack','<div class="usa50-pack-quote"><span class="usa50-starshop-spark">✦</span><h2>'+cash(p.stars)+' STARS</h2><strong>$'+(p.usdCents/100).toFixed(2)+' proposed price</strong>'+(p.monthlyBonus?'<p class="lead">Monthly bonus +'+cash(p.monthlyBonus)+' · Total '+cash(p.totalStars)+' STARS</p>':'<p class="lead">Monthly bonus already used for this account.</p>')+'</div><p class="lead">Preview only. Purchased STARS will not expire, once checkout is available. No charges can be made here.</p>'+(admin?'<div class="modal-actions"><button class="btn" data-action="economy-demo-buy" data-value="'+e(p.sku)+'">Simulate purchase (admin · $0)</button></div>':'<div class="modal-actions"><button class="btn secondary" data-action="close-modal">Coming soon</button></div>'));
 }
 if(name==='economy-demo-buy'){
  if(store?.me?.role!=='admin')return toast('Admin testing only.');
  if(!confirm('Grant demo STARS to your admin account? No payment will be processed.'))return;
  const r=await request('/api/economy/demo-purchase',{method:'POST',body:JSON.stringify({sku:node.dataset.value})});
  hideModal();await refresh();toast('Credited '+cash(r.creditedDemoStars)+' demo STARS, no charge.');return;
 }
 return prevAct(name,node);
};
})();