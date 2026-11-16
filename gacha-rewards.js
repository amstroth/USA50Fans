'use strict';
/* Shared demo-only gacha reward tables. Each draw is ONE reward, not a card plus extra rewards.
   Idol tickets are collectible counters only and never improve free fancall lottery odds. */
const crypto=require('node:crypto');
const IDOLS=[['arielle','Arielle'],['jaylene','Jaylene'],['kellie','Kellie'],['z','Z'],['michelle','Michelle'],['zoe','Zoe'],['miu','Miu']];
const PAID_ODDS=Object.freeze({card:65,vipXP:16,pullPoints:10,idolTicket:6,merchCoupon:3});
const FREE_ODDS=Object.freeze({card:60,vipXP:30,pullPoints:9,idolTicket:1,merchCoupon:0});
const VIP_THRESHOLDS=[0,150,400,800,1400,2200,3200,4500,6100,8000];
const VIP_LABELS=VIP_THRESHOLDS.map((_,i)=>'VIP'+(i+1));
function tier(total){const xp=Math.max(0,Number(total)||0);let i=0;while(i<VIP_THRESHOLDS.length-1&&xp>=VIP_THRESHOLDS[i+1])i++;return {level:i+1,label:VIP_LABELS[i],xp,nextAt:VIP_THRESHOLDS[i+1]??null};}
function choose(weights){
 let n=crypto.randomInt(100);
 for(const [key,p] of Object.entries(weights)){n-=p;if(n<0)return key;}
 return 'card';
}
function rollRewards({u,count,free,drawCard,save}){
 if(!Number.isInteger(count)||count<1||count>10||typeof drawCard!=='function')throw Error('Invalid draw.');
 u.state||={};u.state.owned||={};u.state.idolTickets||={};u.state.merchCoupons||=[];
 u.state.vipXP=Number(u.state.vipXP||0);u.state.pullPoints=Number(u.state.pullPoints||0);
 const results=[],cards=[],weights=free?FREE_ODDS:PAID_ODDS;
 for(let i=0;i<count;i++){
  const type=choose(weights);
  let reward;
  if(type==='card'){
   const card=drawCard();
   if(!card||!card.id)throw Error('No published card is available.');
   u.state.owned[card.id]=(u.state.owned[card.id]||0)+1;
   cards.push(card);reward={type,card};
  }else if(type==='vipXP'){
   const amount=free?[10,15,20,25,30][crypto.randomInt(5)]:[40,50,60,70,80][crypto.randomInt(5)];
   u.state.vipXP+=amount;reward={type,amount};
  }else if(type==='pullPoints'){
   const amount=free?[20,30,40][crypto.randomInt(3)]:[75,100,125][crypto.randomInt(3)];
   u.state.pullPoints+=amount;reward={type,amount};
  }else if(type==='idolTicket'){
   const idol=IDOLS[crypto.randomInt(IDOLS.length)];
   u.state.idolTickets[idol[0]]=Number(u.state.idolTickets[idol[0]]||0)+1;
   // Legacy total remains a read-only combined total for older UI components.
   u.state.fancallTickets=Number(u.state.fancallTickets||0)+1;
   reward={type,idolId:idol[0],idolName:idol[1],amount:1};
  }else{
   const discount=crypto.randomInt(6)===0?20:10;
   const coupon={id:crypto.randomUUID(),discountPercent:discount,status:'DEMO_NOT_REDEEMABLE',createdAt:new Date().toISOString()};
   u.state.merchCoupons.push(coupon);reward={type,discountPercent:discount};
  }
  results.push(reward);
 }
 // At least one photo card in a paid ten-draw batch. Free ten-draw batches use the same guarantee.
 if(count===10&&cards.length===0){
  const card=drawCard();if(!card||!card.id)throw Error('No published card available.');
  const replaced=results[9];
  if(replaced.type==='vipXP'){u.state.vipXP-=replaced.amount;}
  if(replaced.type==='pullPoints'){u.state.pullPoints-=replaced.amount;}
  if(replaced.type==='idolTicket'){
   u.state.idolTickets[replaced.idolId]-=1;
   u.state.fancallTickets=Math.max(0,Number(u.state.fancallTickets||0)-1);
  }
  if(replaced.type==='merchCoupon')u.state.merchCoupons.pop();
  u.state.owned[card.id]=(u.state.owned[card.id]||0)+1;cards.push(card);
  results[9]={type:'card',card,guaranteed:true};
 }
 u.state.vipLevel=tier(u.state.vipXP).label;
 return {rewards:results,cards,card:cards[0]||null,vipXP:u.state.vipXP,vipLevel:u.state.vipLevel,
   idolTickets:{...u.state.idolTickets},fancallTickets:Number(u.state.fancallTickets||0),pullPoints:u.state.pullPoints,
   ticketsAwarded:results.filter(r=>r.type==='idolTicket').length,
   fancallTicketsAwarded:results.filter(r=>r.type==='idolTicket').length,
   pullPointsAwarded:results.filter(r=>r.type==='pullPoints').reduce((sum,r)=>sum+r.amount,0),
   vipXPAwarded:results.filter(r=>r.type==='vipXP').reduce((sum,r)=>sum+r.amount,0),
   couponsAwarded:results.filter(r=>r.type==='merchCoupon').length};
}
function publicInfo(u){return {paidOdds:PAID_ODDS,freeOdds:FREE_ODDS,vipThresholds:VIP_THRESHOLDS,vipLevel:tier(u?.state?.vipXP),idolTickets:u?.state?.idolTickets||{},merchCoupons:u?.state?.merchCoupons||[],notes:'Each pull awards one item. A 10-draw batch guarantees at least one card; the other draws can contain cards or currency. Idol tickets and discount coupons are nonredeemable demo collectibles and do not increase chances in free fancall lotteries.'};}
module.exports={rollRewards,publicInfo,tier,PAID_ODDS,FREE_ODDS};
