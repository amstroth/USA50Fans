import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const create=require('../card-studio.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-studio-'));
let seq=0;
const admin={id:'admin',role:'admin',mustChangePassword:false};
const fan={id:'fan',role:'fan',state:{stars:9000,pullPoints:900,fancallTickets:0,owned:{'tl-01':1}}};
const db={users:{admin,fan},tradeListings:[]};
const base=[{id:'tl-01',title:'First Light',rarity:'R',member:'Arielle',albumId:'arielle-true-love',index:1}];
const app=create({
 db,save:()=>{},id:()=>('00000000-0000-4000-8000-'+String(++seq).padStart(12,'0')),
 dataDir:dir,baseCards:base,baseAlbums:[{id:'arielle-true-love',title:'True Love',member:'Arielle',team:'NYC50'},{id:'nyc50-debut',title:'NYC50 Debut',member:'NYC50',team:'NYC50'}],
 rarityWeights:{R:55,SR:27,SSR:12,MR:5,UR:1},packCost:300,hardPity:30,baseAlbumId:'arielle-true-love',
 now:()=>new Date().toISOString(),bodyText:(v,n)=>String(v||'').trim().slice(0,n),
 userFrom:req=>req.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true}
});
function post(user,what,data){const out={};app.handlePost({user},out,'/api/card-studio/'+what,data);return out;}
function get(user){const out={};app.handleGet({user},out,'/api/card-studio');return out;}
assert.equal(get(fan).status,403);
assert.equal(get({...admin,mustChangePassword:true}).status,403);
assert.equal(get(admin).body.face.width,660);
assert.equal(get(admin).body.face.height,1020);
const draft=post(admin,'save',{title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'draft',isTest:true,releaseAt:'2026-01-01T00:00:00Z',cards:[]});
assert.equal(draft.status,200);const packId=draft.body.pack.id;
assert.ok(!app.publicAlbums().some(p=>p.id===packId));
assert.equal(post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'published',cards:[{title:'First',rarity:'SSR',border:'none'}]}).status,400);
const header=Buffer.alloc(30);header.write('RIFF');header.writeUInt32LE(22,4);header.write('WEBP',8);header.write('VP8X',12);header.writeUInt32LE(10,16);
header.writeUIntLE(659,24,3);header.writeUIntLE(1019,27,3);
const img=post(admin,'upload',{dataUrl:'data:image/webp;base64,'+header.toString('base64')});
assert.equal(img.status,201);
const bad=Buffer.from(header);bad.writeUIntLE(799,24,3);
assert.equal(post(admin,'upload',{dataUrl:'data:image/webp;base64,'+bad.toString('base64')}).status,400);
const card={title:'First',rarity:'SSR',border:'none',artId:img.body.artId};
const scheduled=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'scheduled',releaseAt:'2099-06-01T12:00:00Z',cards:[card]});
assert.equal(scheduled.status,200);
assert.equal(app.publicAlbums().find(p=>p.id===packId).available,false);
assert.ok(!app.publicCardsByPack()[packId]);
const draftAgain=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'draft',releaseAt:'2026-01-01T00:00:00Z',cards:scheduled.body.pack.cards});
assert.equal(draftAgain.status,200);
assert.ok(!app.publicAlbums().some(p=>p.id===packId));
const released=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'published',cards:draftAgain.body.pack.cards});
assert.equal(released.status,200);
assert.equal(app.publicAlbums().find(p=>p.id===packId).available,true);
assert.equal(app.publicAlbums().find(p=>p.id===packId).odds.SSR,100);
assert.equal(app.publicCardsByPack()[packId][0].border,'none');
const pull={};app.customPull({user:fan},pull,'/api/cards/pull',{albumId:packId},fan);
assert.equal(pull.status,200);
assert.equal(pull.body.card.albumId,packId);
assert.equal(pull.body.fancallTicketsAwarded,2);
assert.equal(fan.state.stars,8700);
const unavailable={};app.customPull({user:fan},unavailable,'/api/cards/pull',{albumId:'nyc50-debut'},fan);
assert.equal(unavailable.status,400);
assert.equal(post(admin,'delete',{id:'arielle-true-love',confirm:'DELETE'}).status,403);
assert.equal(post(admin,'delete',{id:packId,confirm:'DELETE'}).status,200);
assert.equal(fan.state.owned[released.body.pack.cards[0].id],undefined);
fs.rmSync(dir,{recursive:true,force:true});
console.log('Card Studio tests passed: draft protection, management-only uploads, exact sizes, timed release, actual pack pulls, and test deletion');
