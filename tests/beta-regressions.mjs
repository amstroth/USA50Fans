import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {ticketPoolForPack,PAID_ODDS,FREE_ODDS}=require('../gacha-rewards.js');
const createSocial=require('../social-hub.js');

// A desktop idol must always retain navigable sidebar controls while
// the Messages panel fills the content area. This complements manual UI QA.
const css=readFileSync('www/social-roles-v22.css','utf8');
const behavior=readFileSync('www/social-roles-v22.js','utf8');
const html=readFileSync('www/index.html','utf8');
assert.match(behavior,/classList\.toggle\('usa50-idol-messages-active',view==='messages'&&store\?\.me\?\.role==='idol'\)/);
assert.match(css,/@media\s*\(min-width:781px\)\s*\{/);
assert.match(css,/\.app-shell\.usa50-idol-messages-active\s*>\s*\.sidebar\s*\{[^}]*display:flex!important/s);
assert.match(css,/\.app-shell\.usa50-idol-messages-active\s*>\s*\.content-area\s*\{[^}]*flex:1 1 0%!important/s);
assert.match(html,/href="\/social-roles-v22\.css\?v=\d+"/);

// Gacha ticket eligibility must come from the selected pack, not all idols.
assert.deepEqual(ticketPoolForPack({member:'Arielle',team:'NYC50'}),['arielle']);
assert.deepEqual(ticketPoolForPack({member:'Miu',team:'LA50'}),['miu']);
assert.deepEqual(ticketPoolForPack({member:'NYC50',team:'NYC50'}),['arielle','jaylene','kellie','z']);
assert.deepEqual(ticketPoolForPack({member:'LA50',team:'LA50'}),['michelle','zoe','miu']);
assert.deepEqual(ticketPoolForPack({member:'Unknown',team:'Unknown'}),[]);
assert.equal(Object.values(PAID_ODDS).reduce((a,b)=>a+b,0),100);
assert.equal(Object.values(FREE_ODDS).reduce((a,b)=>a+b,0),100);
assert.equal(FREE_ODDS.idolTicket,1);
assert.equal(FREE_ODDS.merchCoupon,0);

// Idol heart rewards are role-restricted and idempotent: same idol cannot
// generate another 150 Fan XP by submitting a second request.
const fan={id:'fan',role:'fan',displayName:'Fan',state:{unlockedRings:['classic']}};
const idol={id:'idol',role:'idol',displayName:'Arielle',state:{unlockedRings:['classic']}};
const staff={id:'staff',role:'management',displayName:'Management',state:{unlockedRings:['classic']}};
const db={users:{fan,idol,staff},posts:[],fansites:[],
 social:{profiles:{},posts:[{id:'post1',authorId:fan.id,
 caption:'An original #Arielle fan edit',url:'https://example.com',
 createdAt:'2026-11-16T00:00:00.000Z',hidden:false}],
 votes:{},follows:{},bans:{},reports:[],ticketMilestones:{},dailyCredits:{}}};
const notices=[];
let num=0;
const social=createSocial({db,save:()=>{},id:()=>String(++num),
 now:()=>new Date().toISOString(),bodyText:(value,max)=>String(value||'').trim().slice(0,max),
 userFrom:req=>req.user,
 json:(res,status,body)=>{res.status=status;res.body=body;},
 fail:(res,status,message)=>{res.status=status;res.body={error:message};},
 notify:(uid,type,message)=>notices.push({uid,type,message}),rankNotice:()=>{}});
async function heart(user){
 const res={};await social.handlePost({user},res,'/api/social/heart',{postId:'post1'});return res;
}
assert.equal((await heart(fan)).status,403);
assert.equal((await heart(staff)).status,403);
assert.equal((await heart(idol)).status,200);
assert.equal(social.info(fan).myProfile.fanXP,150);
const second=await heart(idol);
assert.equal(second.status,200);
assert.equal(second.body.alreadyHearted,true);
assert.equal(social.info(fan).myProfile.fanXP,150);
assert.equal(notices.length,1);
assert.equal(notices[0].message,'Arielle hearted your post! +150 Fan XP');
console.log('USA50 beta regressions passed: desktop idol navigation, scoped ticket pools, idol-only heart XP.');
