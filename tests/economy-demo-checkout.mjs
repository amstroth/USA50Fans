import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const economy=require('../economy-pricing.js');
const users={
 fan:{id:'fan',role:'fan',state:{stars:200}},
 idol:{id:'idol',role:'idol',state:{stars:50}},
 admin:{id:'admin',role:'admin',state:{stars:0}},
 locked:{id:'locked',role:'fan',mustChangePassword:true,state:{stars:0}},
};
let saves=0;
function checkout(uid,sku){
 const response={};
 const used=economy.handlePost({uid},response,'/api/economy/demo-purchase',{sku},{
  userFrom:req=>users[req.uid]||null,save:()=>saves++,
  json:(res,status,data)=>{res.status=status;res.data=data;return true;},
  fail:(res,status,error)=>{res.status=status;res.data={error};return true;},
 });
 assert.equal(used,true,'Demo checkout should handle its own route');
 return response;
}
assert.equal(checkout('missing','spark').status,401,'Guests must sign in');
assert.equal(checkout('locked','spark').status,403,'Temporary password must be changed');
assert.equal(checkout('fan','bad-sku').status,400);
const bundles=economy.info(users.fan).bundles;
assert.equal(bundles.length,5,'Five known price tiers remain available');
const spark=bundles.find(b=>b.sku==='spark');
assert.equal(spark.stars,300);
assert.equal(spark.monthlyBonus,150);
assert.equal(spark.totalStars,450);
const fanFirst=checkout('fan','spark');
assert.equal(fanFirst.status,200);
assert.equal(fanFirst.data.creditedDemoStars,450);
assert.equal(fanFirst.data.newBalance,650,'Demo STARS credit immediately to this fan');
assert.equal(fanFirst.data.monthlyBonus,150);
assert.equal(users.fan.state.economyDemoPurchases[0].status,'DEMO_NO_PAYMENT');
assert.equal(users.fan.state.economyDemoPurchases[0].usdCentsSimulated,199);
assert.equal(economy.info(users.fan).bonusAvailable,false);
const fanNext=checkout('fan','spark');
assert.equal(fanNext.status,200);
assert.equal(fanNext.data.creditedDemoStars,300,'Monthly bonus only once');
assert.equal(fanNext.data.newBalance,950);
const glow=checkout('idol','glow');
assert.equal(glow.status,200,'Idols may also use the demo checkout');
assert.equal(glow.data.newBalance,50+850+425);
const admin=checkout('admin','galaxy');
assert.equal(admin.status,200,'Existing management demo checkout still works');
assert.equal(admin.data.newBalance,10500+5250);
assert.equal(economy.info(users.fan).realPaymentsEnabled,false,'No real payment processing');
assert.equal(users.fan.state.economyDemoPurchases.length,2);
for(let i=users.fan.state.economyDemoPurchases.length;i<30;i++)assert.equal(checkout('fan','spark').status,200);
assert.equal(checkout('fan','spark').status,429,'Keep demo purchase cap');
assert.equal(users.fan.state.economyDemoPurchases.length,30);
assert.equal(saves,32);
console.log('Demo STAR checkout tests passed: sign-in, five bundles, instant fan/idol/admin credits, monthly bonus, account cap and no real payments.');
