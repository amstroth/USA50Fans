/* Compact album carousel and non-card inventory, added after Collection Studio. */
(function(){
'use strict';
let tab='albums';
const previousCollection=collectionScreen;
function tabs(){
 return '<nav class="usa50-collection-tabs" aria-label="Collection sections">'+
 '<button type="button" class="'+(tab==='albums'?'active':'')+'" data-action="usa50-collection-tab" data-value="albums">▦ Albums & Cards</button>'+
 '<button type="button" class="'+(tab==='inventory'?'active':'')+'" data-action="usa50-collection-tab" data-value="inventory">🎫 Inventory</button></nav>';
}
function inventoryScreen(){
 const tickets=store?.me?.state?.idolTickets||store?.gacha?.idolTickets||{};
 const coupons=store?.me?.state?.merchCoupons||store?.gacha?.merchCoupons||[];
 const list=(store?.members||[]).filter(p=>(tickets[p.id]||0)>0);
 const ticketCount=Object.values(tickets).reduce((n,v)=>n+(Number(v)||0),0);
 const entries=list.map(p=>'<div class="usa50-inventory-item"><div class="usa50-inventory-art">🎫</div><div><strong>'+e(p.name)+' Ticket</strong><small>'+e(p.team)+' · Demo collectible</small></div><b>×'+cash(tickets[p.id])+'</b></div>').join('');
 const couponItems=coupons.map(c=>'<div class="usa50-inventory-item"><div class="usa50-inventory-art">🏷️</div><div><strong>'+Number(c.discountPercent||0)+'% Merch Coupon</strong><small>Preview only · not redeemable</small></div><b>×1</b></div>').join('');
 return screenTop('Inventory','Your collected idol tickets, coupons and other rewards.')+tabs()+
 '<section class="usa50-inventory-info"><div><strong>'+cash(ticketCount)+'</strong><small>Idol tickets</small></div><div><strong>'+coupons.length+'</strong><small>Merch coupons</small></div></section>'+
 '<section class="usa50-inventory-section"><h2>Idol tickets</h2><p class="lead">Ticket types are specific to the idol or unit whose card pack awarded them.</p>'+
 (entries||'<div class="glass panel"><p class="lead">You have not received any idol tickets yet. Open an available pack to collect some.</p></div>')+
 '<p class="lead">These are demo collectibles and do not guarantee a call or change your odds in free fancall lotteries.</p></section>'+
 '<section class="usa50-inventory-section"><h2>Merch coupons</h2>'+ (couponItems||'<p class="lead">No merch coupons collected yet.</p>')+'</section>';
}
collectionScreen=function(){
 if(tab==='inventory')return inventoryScreen();
 let html=previousCollection();
 const anchor='class="grid grid-3"';
 if(html.includes(anchor)){
  html=html.replace(anchor,'class="grid grid-3 usa50-album-carousel"');
  // Tabs appear immediately above the carousel and album artwork.
  html=html.replace('<div class="grid grid-3 usa50-album-carousel"',tabs()+'<div class="grid grid-3 usa50-album-carousel"');
 }else html=tabs()+html;
 return html;
};
const priorAct=act;
act=async function(name,node){
 if(name==='usa50-collection-tab'){
  tab=node.dataset.value==='inventory'?'inventory':'albums';
  render();window.scrollTo(0,0);return;
 }
 return priorAct(name,node);
};
})();
