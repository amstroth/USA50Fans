/* USA50 STAR economy: read-only public catalog and admin-only no-payment QA. */
(function(){
'use strict';
const previousDrops=dropsScreen;
function starShop(){
 const c=store?.economy;
 if(!c)return '';
 const bonus=c.bonusAvailable!==false;
 return '<section class="usa50-starshop" id="usa50-starshop"><div class="usa50-starshop-heading"><span class="eyebrow">USA50 STAR ECONOMY</span><h2>STAR Shop ✦</h2><p class="lead">Explore proposed STAR packs. This is a development preview — no real purchases or charges are possible.</p></div>'+
 '<div class="usa50-starshop-offer"><strong>'+(bonus?'✦ First STAR purchase this month: +'+c.firstPurchaseBonusPercent+'% bonus':'Monthly first-purchase bonus already used')+'</strong><p>One bonus per account per calendar month (New York time), renewed automatically each month. Bonus applies to your first eligible pack only, not every pack.</p></div>'+
 '<div class="usa50-starshop-grid">'+c.bundles.map(p=>'<button type="button" class="usa50-starshop-pack" data-action="economy-preview" data-value="'+e(p.sku)+'"><span class="usa50-starshop-spark">✦</span><strong>'+e(p.name)+'</strong><b>'+cash(p.stars)+' STARS</b>'+(p.monthlyBonus?'<small>+ '+cash(p.monthlyBonus)+' monthly bonus</small>':'<small>Standard bundle</small>')+'<span class="usa50-starshop-price">$'+(p.usdCents/100).toFixed(2)+'</span></button>').join('')+'</div>'+
 '<p class="usa50-starshop-note">✦ One card: '+cash(c.singlePullStars)+' STARS · 10 cards: '+cash(c.tenPullStars)+' STARS (10% cheaper) · Free pull: '+cash(c.freePullPoints)+' Pull Points. Purchase prices are planning estimates; no payment or checkout is enabled. Fancall lottery entries remain free and separate from STARS.</p></section>';
}
dropsScreen=function(){
 const html=previousDrops();
 return html.replace('<div class="gacha-layout">',starShop()+'<div class="gacha-layout">');
};
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