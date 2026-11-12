import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';

const dir=mkdtempSync(path.join(tmpdir(),'usa50-test-'));
const port=34000+crypto.randomInt(10000);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.js'],{cwd:path.resolve('.'),env:{...process.env,PORT:String(port),DATA_DIR:dir,SESSION_SECRET:'test-session-secret-long-enough',ADMIN_PASSWORD:'TEST-ONLY-ADMIN-PASSWORD'},stdio:'ignore'});
let passed=0;
async function api(route,data=null,token=''){
 const r=await fetch(base+route,{method:data===null?'GET':'POST',headers:{...(data===null?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},body:data===null?undefined:JSON.stringify(data)});
 const result=await r.json();return {...result,httpStatus:r.status};
}
async function wait(){for(let i=0;i<45;i++){try{const r=await api('/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server did not start');}
try{
 await wait();assert.equal((await api('/api/health')).ok,true);passed++;
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
 console.log(`USA50 smoke tests passed: ${passed}`);
}finally{child.kill('SIGTERM');rmSync(dir,{recursive:true,force:true});}
