'use strict';
/* USA50 STAR economy proposal. No real checkout, payments or merchandise claims. */
const crypto=require('node:crypto');
const BUNDLES=Object.freeze([
 {sku:'spark',name:'Spark',usdCents:199,stars:300},
 {sku:'glow',name:'Glow',usdCents:499,stars:850},
 {sku:'shimmer',name:'Shimmer',usdCents:999,stars:1850},
 {sku:'starlight',name:'Starlight',usdCents:1999,stars:4000},
 {sku:'galaxy',name:'Galaxy',usdCents:4999,stars:10500}
]);
const SINGLE_PULL=300,TEN_PULL=2700,FREE_PULL_POINTS=300,MONTHLY_BONUS_PERCENT=50;
function monthKey(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit'}).formatToParts(date);
 return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;
}
function history(u){return Array.isArray(u?.state?.economyDemoPurchases)?u.state.economyDemoPurchases:[];}
function eligible(u){return !!u&&!history(u).some(p=>p.month===monthKey()&&p.monthlyBonus>0);}
function quote(u,sku){
 const pack=BUNDLES.find(x=>x.sku===sku);if(!pack)return null;
 const monthlyBonus=(!u||eligible(u))?Math.floor(pack.stars*MONTHLY_BONUS_PERCENT/100):0;
 return {...pack,monthlyBonus,totalStars:pack.stars+monthlyBonus};
}
function info(u){
 return {mode:'preview',currency:'USD',realPaymentsEnabled:false,
  singlePullStars:SINGLE_PULL,tenPullStars:TEN_PULL,freePullPoints:FREE_PULL_POINTS,
  firstPurchaseBonusPercent:MONTHLY_BONUS_PERCENT,month:monthKey(),
  bonusAvailable:u?eligible(u):null,
  bundles:BUNDLES.map(x=>quote(u,x.sku)),
  disclaimer:'These are proposed real-world prices in a demo catalog. No payment can be made here. The monthly bonus is one use per account per month, not per pack. Purchased STARS will never expire when real checkout is enabled.'};
}
function handlePost(req,res,endpoint,data,{userFrom,save,json,fail}){
 if(endpoint!=='/api/economy/demo-purchase')return false;
 const u=userFrom(req);
 if(!u){fail(res,401,'Sign in to receive demo STARS.');return true;}
 if(u.mustChangePassword){fail(res,403,'Change your temporary password first.');return true;}
 const pack=quote(u,String(data.sku||''));
 if(!pack){fail(res,400,'Unknown STAR bundle.');return true;}
 u.state ||= {};u.state.economyDemoPurchases ||= [];
 if(u.state.economyDemoPurchases.length>=30){fail(res,429,'Demo checkout limit reached for this account.');return true;}
 u.state.stars=Number(u.state.stars||0)+pack.totalStars;
 u.state.economyDemoPurchases.push({id:crypto.randomUUID(),sku:pack.sku,month:monthKey(),baseStars:pack.stars,monthlyBonus:pack.monthlyBonus,usdCentsSimulated:pack.usdCents,createdAt:new Date().toISOString(),status:'DEMO_NO_PAYMENT'});
 save();
 json(res,200,{ok:true,creditedDemoStars:pack.totalStars,monthlyBonus:pack.monthlyBonus,newBalance:u.state.stars,economy:info(u)});
 return true;
}
module.exports={info,handlePost,SINGLE_PULL,TEN_PULL,FREE_PULL_POINTS};
