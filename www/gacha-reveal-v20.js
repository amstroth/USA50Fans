/* USA50 multi-reward gacha reveal and published odds (demo, no purchases). */
(function(){
'use strict';
const previousDrops=dropsScreen;
function rewardLabel(r){
 if(r.type==='card')return {icon:'🃏',title:r.card?.title||'Photocard',subtitle:(r.card?.rarity||'')+' Photocard'};
 if(r.type==='vipXP')return {icon:'✧',title:'+'+r.amount+' VIP XP',subtitle:'VIP progression'};
 if(r.type==='idolTicket')return {icon:'🎫',title:r.idolName+' Ticket',subtitle:'Collectible · demo only'};
 if(r.type==='merchCoupon')return {icon:'%',title:r.discountPercent+'% off merch',subtitle:'Coupon preview · not redeemable'};
 return {icon:'◎',title:'+'+r.amount+' Pull Points',subtitle:'Free-play currency'};
}
const oldReveal=dreamReveal;
dreamReveal=function(result){
 if(!Array.isArray(result?.rewards))return oldReveal(result);
 const modal=document.querySelector('#modal-root .modal');if(!modal)return;
 const multi=result.rewards.length>1;
 modal.classList.toggle('batch-reveal',multi);
 const tiles=result.rewards.map((reward,index)=>{
  const info=rewardLabel(reward);
  return '<div class="usa50-gacha-reward '+(reward.type==='card'?'usa50-gacha-card':'')+'" style="animation-delay:'+index*45+'ms">'+(reward.type==='card'?'<div class="usa50-gacha-card-art">'+cardElement(reward.card)+'</div>':'<div class="usa50-gacha-icon">'+info.icon+'</div>')+
   '<strong>'+e(info.title)+'</strong><small>'+e(info.subtitle)+'</small></div>';
 }).join('');
 const results='<div class="usa50-gacha-reward-grid '+(multi?'batch':'single')+'">'+tiles+'</div>';
 const wallet=result.idolTickets||{},ticketSummary=Object.entries(wallet).filter(x=>x[1]>0).map(([name,n])=>'<span class="reward-pill">'+e(name)+' ×'+n+'</span>').join('');
 modal.innerHTML='<div class="modal-head"><h2>'+result.rewards.length+' Reward'+(multi?'s':'')+' ✦</h2><button class="icon-btn" data-action="close-modal" aria-label="Close dialog">'+icon('close')+'</button></div>'+
 '<div class="reveal-wrap dream-result">'+results+
 (result.guaranteed?.length?'<div class="cooldown"><strong>Collector guarantee reached ✦</strong><p class="lead">'+result.guaranteed.length+' missing photocards unlocked in addition to the drawn rewards.</p></div>':'')+
 '<div class="usa50-gacha-summary"><strong>'+result.cards.length+' photocards · +'+(result.vipXPAwarded||0)+' VIP XP · '+(result.ticketsAwarded||0)+' idol tickets</strong><p class="lead">VIP '+e(result.vipLevel||'VIP1')+' · '+cash(result.vipXP||0)+' total XP · '+cash(result.stars||0)+' STARS left</p>'+
 (ticketSummary?'<div class="usa50-gacha-tickets">'+ticketSummary+'</div>':'')+'</div>'+
 '<div class="modal-actions"><button class="btn" data-action="'+(multi?'pull10':'pull-from-modal')+'">Open '+(multi?'×10':'another')+'</button><button class="btn secondary" data-go="collection">View collection</button></div></div>';
};
function oddsGrid(g){
 const labels={card:'Photocard',vipXP:'VIP XP',pullPoints:'Pull Points',idolTicket:'Idol-specific ticket',merchCoupon:'10% or 20% merch coupon'};
 return '<div class="usa50-gacha-odds"><h3>Reward probabilities per draw</h3><p class="lead">One reward per draw. A 10-draw batch guarantees at least one card, replacing the last reward if necessary.</p><table><thead><tr><th>Reward</th><th>STAR pull</th><th>Free pull</th></tr></thead><tbody>'+
 Object.keys(g.paidOdds).map(k=>'<tr><td>'+labels[k]+'</td><td>'+g.paidOdds[k]+'%</td><td>'+g.freeOdds[k]+'%</td></tr>').join('')+'</tbody></table>'+
 '<p class="lead">Merch coupons are demo-only and are not redeemable yet. Idol tickets are collectibles only and do not improve the free fancall lottery odds.</p></div>';
}
function wallet(g){
 const s=store.me?.state||{},xp=Number(s.vipXP||0),lvl=g.vipLevel||{level:1,label:'VIP1',xp:0,nextAt:150};
 const items=(store.members||[]).filter(m=>(g.idolTickets?.[m.id]||0)>0);
 return '<section class="glass panel usa50-vip-wallet"><h3>✦ VIP Progress · '+e(lvl.label)+'</h3><p class="lead">'+cash(xp)+' VIP XP earned'+(lvl.nextAt?' · '+cash(Math.max(0,lvl.nextAt-xp))+' XP to VIP'+(lvl.level+1):' · Maximum VIP tier')+'</p><div class="progress"><span style="width:'+(lvl.nextAt?Math.min(100,100*xp/lvl.nextAt):100)+'%"></span></div>'+
 '<h3 style="margin-top:16px">Idol ticket collection</h3><div class="usa50-idol-wallet">'+(items.length?items.map(m=>'<span class="reward-pill">'+e(m.name)+' ×'+g.idolTickets[m.id]+'</span>').join(''):'<p class="lead">No idol tickets collected yet.</p>')+'</div>'+
 '<p class="lead">VIP1–VIP10 thresholds: '+g.vipThresholds.map((n,i)=>'VIP'+(i+1)+' '+cash(n)).join(' · ')+'</p></section>';
}
dropsScreen=function(){
 let html=previousDrops();
 const g=store?.gacha;if(!g)return html;
 html=html.replace('Pull packs, earn Fancall Tickets, and build free pulls from daily tasks.','Draw photocards, collectible idol tickets, VIP XP, and other rewards.');
 html=html.replace(/Every pull gives <strong>1 photocard<\/strong> \+ <strong>2 Fancall Tickets<\/strong> \+ <strong>100 Pull Points<\/strong>\./,'Every draw awards one random item. Open ×10 for 1–10 cards plus other rewards.');
 html=html.replace(/<div class="reward-trio"><div class="reward-pill">1 Card<\/div><div class="reward-pill">2 Fancall Tickets<\/div><div class="reward-pill">100 Pull Points<\/div><\/div>/,'<div class="reward-trio"><span class="reward-pill">Photocards</span><span class="reward-pill">VIP XP</span><span class="reward-pill">Idol tickets</span><span class="reward-pill">Pull Points</span><span class="reward-pill">Rare merch coupons</span></div>');
 html=html.replace(/<div class="row"><h3>Drop probabilities<\/h3>[\s\S]*?<div class="price-note" style="margin-top:15px">/,'<div class="row"><h3>Photocard rarity (when a card drops)</h3>'+icon('info',16)+'</div>'+Object.entries(store.rarities||{}).map(([r,p])=>'<div class="odds-row"><span class="rarity-tag '+r+'">'+r+'</span><strong>'+p+'%</strong></div>').join('')+oddsGrid(g)+'<div class="price-note" style="margin-top:15px">');
 html=html.replace('Exact published demo odds. Daily tasks create a free route to future fancall entries by earning Pull Points for additional pulls.','Free daily tasks earn Pull Points; free draws rarely give idol tickets (1%). Free fancall lotteries remain open without paid purchases.');
 return html.replace('</div></div>', '</div></div>')+wallet(g);
};
})();