import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';

const dir=mkdtempSync(path.join(tmpdir(),'usa50-test-'));
const port=34000+crypto.randomInt(10000);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.js'],{cwd:path.resolve('.'),env:{...process.env,PORT:String(port),DATA_DIR:dir,SESSION_SECRET:'test-session-secret-long-enough',ADMIN_PASSWORD:'TEST-ONLY-ADMIN-PASSWORD',USA50_IDOL_BOOTSTRAP_PASSWORD:'SeedIdolTemporaryPassword2048',USA50_ADMIN_BOOTSTRAP_PASSWORD:'SeedAdminTemporaryPassword2048'},stdio:'ignore'});
let passed=0;
async function api(route,data=null,token=''){
 const r=await fetch(base+route,{method:data===null?'GET':'POST',headers:{...(data===null?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},body:data===null?undefined:JSON.stringify(data)});
 const result=await r.json();return {...result,httpStatus:r.status};
}
async function wait(){for(let i=0;i<45;i++){try{const r=await api('/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server did not start');}
try{
 await wait();assert.equal((await api('/api/health')).ok,true);passed++;
 // File uploads use blob: preview images; static CSP must allow them.
 const studioPage=await fetch(base+'/studio.html');
 assert.equal(studioPage.status,200);
 assert.ok(studioPage.headers.get('content-security-policy')?.includes("img-src 'self' data: blob: https:"));
 const studioHtml=await studioPage.text();
 assert.ok(studioHtml.includes('id="studio-art-picker"'));
 assert.ok(studioHtml.includes('id="studio-border-picker"'));
 assert.equal((await fetch(base+'/studio.js')).status,200);
 passed++;
 const username=()=>`fan-${crypto.randomBytes(6).toString('hex')}@example.com`;
 const a=await api('/api/auth/register',{displayName:'Test Fan Alpha',email:username(),password:'a secure demo password!'});
 const b=await api('/api/auth/register',{displayName:'Test Fan Beta',email:username(),password:'a secure demo password!'});
 assert.equal(a.httpStatus,201);assert.equal(b.httpStatus,201);passed++;
 const ta=a.token,tb=b.token;
 const initial=await api('/api/bootstrap',null,ta);assert.equal(initial.me.state.owned['tl-01'],2);passed++;
 const noTrade=await api('/api/trades/create',{cardId:'tl-06'},ta);assert.equal(noTrade.httpStatus,400);passed++;
 const trade=await api('/api/trades/create',{cardId:'tl-01'},ta);assert.equal(trade.httpStatus,200);passed++;
 const code=b.me.state.demoClaimCode;const claim=await api('/api/cards/redeem',{code},tb);assert.equal(claim.httpStatus,200);assert.equal((await api('/api/cards/redeem',{code},tb)).httpStatus,400);passed++;
 const paidReward=await api('/api/cards/pull',{},tb);
 assert.equal(paidReward.httpStatus,200);assert.equal(paidReward.fancallTicketsAwarded,2);assert.equal(paidReward.pullPointsAwarded,100);passed++;
 const freeReward=await api('/api/cards/pull-points',{},tb);
 assert.equal(freeReward.httpStatus,200);assert.equal(freeReward.fancallTickets,4);assert.equal(freeReward.paidPulls,1);passed++;
 const task=await api('/api/daily/claim',{task:'checkin'},tb);
 assert.equal(task.httpStatus,200);assert.equal(task.pullPointsAwarded,100);
 assert.equal((await api('/api/daily/claim',{task:'checkin'},tb)).httpStatus,400);
 assert.equal((await api('/api/daily/claim',{task:'fake-task'},tb)).httpStatus,400);passed++;

 for(let i=0;i<29;i++){let p=await api('/api/cards/pull',{},ta);assert.equal(p.httpStatus,200);}
 let last=await api('/api/cards/pull',{},ta);assert.equal(last.paidPulls,30);assert.equal(last.albumComplete,true);assert.equal(last.pityAchieved,true);assert.equal(last.stars,0);passed++;
 let order=await api('/api/cards/physical-order-preview',{},ta);assert.equal(order.free,true);assert.equal((await api('/api/cards/physical-order-preview',{},ta)).httpStatus,400);passed++;
 const app=await api('/api/fansites/apply',{name:'Camera Fansite',camera:'Sony a7 IV with 70-200mm lens',portfolioUrl:'https://www.instagram.com/example',description:'I photograph USA50 performances and publish high-quality fan edits regularly.'},tb);assert.equal(app.httpStatus,201);passed++;
 const post=await api('/api/posts/create',{text:'A test edit!',url:'https://www.tiktok.com/@example/video/123'},ta);assert.equal(post.httpStatus,201);passed++;

 const idolStart=await api('/api/auth/login',{email:'amstrotherusa50@gmail.com',password:'SeedIdolTemporaryPassword2048'});
 const adminStart=await api('/api/auth/login',{email:'arielstrotherb@gmail.com',password:'SeedAdminTemporaryPassword2048'});
 assert.equal(idolStart.me.role,'idol');assert.equal(adminStart.me.role,'admin');passed++;
 assert.equal((await api('/api/idol/post',{body:'Before reset'},idolStart.token)).httpStatus,403);passed++;
 const iReset=await api('/api/account/change-password',{currentPassword:'SeedIdolTemporaryPassword2048',newPassword:'UpdatedIdolPassword2048'},idolStart.token);
 const aReset=await api('/api/account/change-password',{currentPassword:'SeedAdminTemporaryPassword2048',newPassword:'UpdatedAdminPassword2048'},adminStart.token);
 assert.equal(iReset.httpStatus,200);assert.equal(aReset.httpStatus,200);
 assert.equal((await api('/api/bootstrap',null,idolStart.token)).me,null);
 const idol=await api('/api/auth/login',{email:'amstrotherusa50@gmail.com',password:'UpdatedIdolPassword2048'});
 const admin=await api('/api/auth/login',{email:'arielstrotherb@gmail.com',password:'UpdatedAdminPassword2048'});passed++;
 // Regression: the management UI reads /api/admin/overview with GET.
 assert.equal((await api('/api/admin/overview')).httpStatus,403);
 assert.equal((await api('/api/admin/overview',null,ta)).httpStatus,403);
 assert.equal((await api('/api/admin/overview',null,adminStart.token)).httpStatus,403);
 const overview=await api('/api/admin/overview',null,admin.token);
 assert.equal(overview.httpStatus,200);
 assert.ok(Array.isArray(overview.fansiteApplications));
 assert.equal(typeof overview.users,'number');
 assert.equal((await api('/api/admin/overview',{},admin.token)).httpStatus,200);
 const studioOverview=await api('/api/card-studio',null,admin.token);
 assert.equal(studioOverview.httpStatus,200);
 assert.ok(Array.isArray(studioOverview.packs));
 passed++;
 const sent=await api('/api/idol/post',{body:'Hello USA50 fans from Arielle!'},idol.token);assert.equal(sent.httpStatus,201);
 assert.equal((await api('/api/messages/fan-reply',{postId:sent.post.id,text:'Hello!'},tb)).httpStatus,403);
 await api('/api/demo/subscriber-preview',{enabled:true},tb);
 const privateReply=await api('/api/messages/fan-reply',{postId:sent.post.id,text:'I am your fan!'},tb);
 assert.equal(privateReply.httpStatus,201);passed++;
 const fanA=await api('/api/bootstrap',null,ta);
 const fanB=await api('/api/bootstrap',null,tb);
 const idolInbox=await api('/api/bootstrap',null,idol.token);
 const adminInbox=await api('/api/bootstrap',null,admin.token);
 assert.equal(fanA.messaging.replies.length,0);
 assert.ok(fanB.messaging.replies.some(r=>r.id===privateReply.reply.id));
 assert.ok(idolInbox.messaging.replies.some(r=>r.id===privateReply.reply.id));
 assert.equal(adminInbox.messaging.replies.length,0);passed++;
 const privateResponse=await api('/api/idol/reply',{replyId:privateReply.reply.id,text:'Thanks for supporting us!'},idol.token);
 assert.equal(privateResponse.httpStatus,200);
 assert.equal((await api('/api/bootstrap',null,tb)).messaging.replies.find(r=>r.id===privateReply.reply.id).idolResponse.text,'Thanks for supporting us!');passed++;
 const ban=await api('/api/admin/messaging-ban',{userId:b.me.id,banned:true},admin.token);
 assert.equal(ban.httpStatus,200);
 assert.equal((await api('/api/messages/fan-reply',{postId:sent.post.id,text:'Hello'},tb)).httpStatus,403);
 assert.equal((await api('/api/admin/messaging-ban',{userId:b.me.id,banned:false},admin.token)).httpStatus,200);passed++;
 await api('/api/demo/refill',{},tb);
 const ten=await api('/api/cards/pull10',{},tb);
 assert.equal(ten.httpStatus,200);assert.equal(ten.cards.length,10);assert.equal(ten.fancallTicketsAwarded,20);assert.equal(ten.pullPointsAwarded,1000);passed++;

 const linkA=await api('/api/social/post',{caption:'My latest USA50 fancam edit!',url:'https://www.tiktok.com/@creator/video/7341234567890123456'},ta);
 assert.equal(linkA.httpStatus,201);
 const voteB=await api('/api/social/vote',{postId:linkA.postId,vote:1},tb);
 assert.equal(voteB.upvotes,1);
 const followB=await api('/api/social/follow',{userId:a.me.id},tb);
 assert.equal(followB.following,true);
 const hub=await api('/api/bootstrap',null,tb);
 assert.ok(hub.social.posts.some(p=>p.id===linkA.postId));
 assert.ok(hub.social.rankings.some(p=>p.id===a.me.id));
 passed++;
 console.log(`USA50 smoke tests passed: ${passed}`);

}finally{child.kill('SIGTERM');rmSync(dir,{recursive:true,force:true});}
