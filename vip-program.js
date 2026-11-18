'use strict';
// Single VIP metric: one VIP XP equals one verified USD spent. Demo STAR grants and card draws do not count.
const TIERS=Object.freeze([
 {level:0,thresholdCents:0,name:'VIP 0',color:'none',benefit:'Standard fan access; free posts, community and public idol updates'},
 {level:1,thresholdCents:1000,name:'VIP 1',color:'purple',benefit:'Purple profile badge and member-only digital wallpaper'},
 {level:2,thresholdCents:3000,name:'VIP 2',color:'pink',benefit:'Pink badge, VIP digital wallpaper collection and early content previews'},
 {level:3,thresholdCents:10000,name:'VIP 3',color:'bronze',benefit:'Bronze badge, early digital previews and VIP profile accent'},
 {level:4,thresholdCents:25000,name:'VIP 4',color:'silver',benefit:'Silver badge, exclusive digital behind-the-scenes posts and profile accent'},
 {level:5,thresholdCents:50000,name:'VIP 5',color:'gold',benefit:'Gold badge and early access to selected merch announcements'},
 {level:6,thresholdCents:100000,name:'VIP 6',color:'ruby',benefit:'Ruby badge, bonus digital member Q&A content and anniversary wallpaper'},
 {level:7,thresholdCents:200000,name:'VIP 7',color:'rainbow',benefit:'Rainbow badge, selected digital collectible designs and early release previews'},
 {level:8,thresholdCents:350000,name:'VIP 8',color:'emerald',benefit:'Emerald badge, priority notice of selected ticket presales when offered'},
 {level:9,thresholdCents:550000,name:'VIP 9',color:'jade',benefit:'Jade badge, exclusive digital anniversary content and members-first merch previews'},
 {level:10,thresholdCents:1000000,name:'VIP 10',color:'iridescent',benefit:'Iridescent badge, commemorative digital VIP certificate and top-tier virtual recognition'}
]);
// Only server-confirmed payments may be recorded with this source and status.
// The existing preview has no real checkout, so balances remain zero.
function verifiedSpendCents(user){
 const purchases=Array.isArray(user?.state?.verifiedPurchases)?user.state.verifiedPurchases:[];
 return purchases.reduce((sum,p)=>{
  if(p?.source!=='verified-checkout'||p.status!=='PAID'||!Number.isSafeInteger(p.paidCents)||p.paidCents<=0)return sum;
  return sum+p.paidCents;
 },0);
}
function levelFromSpent(cents){
 let level=0;for(const tier of TIERS)if(cents>=tier.thresholdCents)level=tier.level;
 return level;
}
function publicInfo(user){
 const spentCents=verifiedSpendCents(user),level=levelFromSpent(spentCents),next=TIERS[level+1]||null,nowTier=TIERS[level];
 return {status:'PROPOSED_NOT_ACTIVE',level,label:nowTier.name,spentCents,vipXP:spentCents/100,
  currentAtCents:nowTier.thresholdCents,nextAtCents:next?.thresholdCents??null,
  remainingCents:next?Math.max(0,next.thresholdCents-spentCents):0,
  progressPercent:next?Math.min(100,Math.floor(spentCents/next.thresholdCents*100)):100,
  tiers:TIERS,terms:'One VIP XP equals $1 of cumulative verified eligible spending. Demo grants, free rewards, refunds and chargebacks do not qualify. VIP benefits are proposed and not yet redeemable; no lottery odds or fancalls are guaranteed.'};
}
module.exports={TIERS,verifiedSpendCents,levelFromSpent,publicInfo};