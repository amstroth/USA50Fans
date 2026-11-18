// Presentation ordering only: never alters a gacha draw or its probabilities.
export const RARITY_ORDER=Object.freeze({UR:5,MR:4,SSR:3,SR:2,R:1});
export function isShowcaseReward(reward){
 return reward?.type==='card' && (RARITY_ORDER[String(reward.card?.rarity||'').toUpperCase()]||0)>=3;
}
export function arrangePullRewards(rewards=[]){
 const entries=(Array.isArray(rewards)?rewards:[]).map((reward,drawIndex)=>({reward,drawIndex}));
 const isCard=e=>e.reward?.type==='card'&&e.reward.card;
 const sortCards=(a,b)=>(RARITY_ORDER[String(b.reward.card.rarity||'R').toUpperCase()]||1)-(RARITY_ORDER[String(a.reward.card.rarity||'R').toUpperCase()]||1)||a.drawIndex-b.drawIndex;
 const rare=entries.filter(e=>isCard(e)&&isShowcaseReward(e.reward)).sort(sortCards);
 const extras=entries.filter(e=>!isCard(e)); // Preserve the original randomized draw order.
 const common=entries.filter(e=>isCard(e)&&!isShowcaseReward(e.reward)).sort(sortCards);
 return [...rare,...extras,...common];
}
export function buildPullRevealSteps(ordered=[]){
 const rare=ordered.filter(e=>isShowcaseReward(e.reward));
 const extras=ordered.filter(e=>e.reward?.type!=='card'||!e.reward.card);
 const common=ordered.filter(e=>e.reward?.type==='card'&&e.reward.card&&!isShowcaseReward(e.reward));
 return [
  ...rare.map(e=>({type:'showcase',items:[e],duration:2550})),
  ...extras.map(e=>({type:'collectible',items:[e],duration:1150})),
  ...(common.length?[{type:'common',items:common,duration:800}]:[])
 ];
}
