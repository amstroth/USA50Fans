import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const crypto=require('node:crypto');
const gacha=require('../gacha-rewards.js');
const NYC=['arielle','jaylene','kellie','z'];
const LA=['michelle','zoe','miu'];
assert.equal(gacha.PAID_ODDS.idolTicket,6,'Paid STARS draws must retain the published 6% idol ticket chance');
assert.equal(gacha.FREE_ODDS.idolTicket,1);
assert.deepEqual(gacha.ticketPoolForPack({member:'Miu',team:'LA50'}),['miu']);
assert.deepEqual(gacha.ticketPoolForPack({member:'Arielle',team:'NYC50'}),['arielle']);
assert.deepEqual(gacha.ticketPoolForPack({member:'NYC50',team:'NYC50'}),NYC);
assert.deepEqual(gacha.ticketPoolForPack({member:'LA50',team:'LA50'}),LA);
assert.equal(gacha.ticketPoolForPack({team:'USA50'}).length,7);
assert.deepEqual(gacha.ticketPoolForPack(null),[]);
function user(){return {state:{stars:2700,pullPoints:0,idolTickets:{},owned:{},merchCoupons:[]}};}
const originalRandom=crypto.randomInt;
try{
 // Set the reward-type random draw to 91 (6% idol-ticket band: 91–96)
 // so the actual award, persisted counter, and result display are verified
 // deterministically, not by a flaky probabilistic test.
 crypto.randomInt=(n)=>n===100?91:0;
 const miu=user();
 const result=gacha.rollRewards({u:miu,count:1,free:false,
  drawCard:()=>({id:'test-photo',rarity:'R'}),ticketPool:gacha.ticketPoolForPack({member:'Miu',team:'LA50'})});
 assert.equal(result.rewards[0].type,'idolTicket');
 assert.equal(result.rewards[0].idolId,'miu');
 assert.equal(result.rewards[0].idolName,'Miu');
 assert.equal(result.ticketsAwarded,1);
 assert.equal(result.fancallTickets,1);
 assert.equal(miu.state.fancallTickets,1);
 assert.equal(miu.state.idolTickets.miu,1);
 assert.equal(miu.state.idolTickets.arielle,undefined,'Never replace LA50 ticket with hardcoded Arielle ticket');
 const nyc=user();
 const more=gacha.rollRewards({u:nyc,count:1,free:false,
  drawCard:()=>({id:'test-photo',rarity:'R'}),ticketPool:gacha.ticketPoolForPack({team:'NYC50'})});
 assert.equal(more.rewards[0].idolId,'arielle','Ticket is selected from the requested group');
 const noPool=user();
 const converted=gacha.rollRewards({u:noPool,count:1,free:false,
  drawCard:()=>({id:'test-photo',rarity:'R'}),ticketPool:[]});
 assert.equal(converted.rewards[0].type,'pullPoints','An absent pool silently converts a ticket outcome');
}finally{crypto.randomInt=originalRandom;}
console.log('Paid STARS Fancall Ticket tests passed: 6% odds, idol/NYC/LA pools, deterministic ticket rewards and persisted inventory counters.');
