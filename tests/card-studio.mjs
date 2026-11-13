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

const alpha=Buffer.alloc(33);
Buffer.from('89504e470d0a1a0a','hex').copy(alpha,0);
alpha.writeUInt32BE(13,8);alpha.write('IHDR',12);
alpha.writeUInt32BE(660,16);alpha.writeUInt32BE(1020,20);
alpha[24]=8;alpha[25]=6;
const borderUpload=post(admin,'upload',{kind:'border',dataUrl:'data:image/png;base64,'+alpha.toString('base64')});
assert.equal(borderUpload.status,201);
assert.equal(borderUpload.body.kind,'border');
const opaque=Buffer.from(alpha);opaque[25]=2;
assert.equal(post(admin,'upload',{kind:'border',dataUrl:'data:image/png;base64,'+opaque.toString('base64')}).status,400);
assert.equal(post(fan,'upload',{kind:'border',dataUrl:'data:image/png;base64,'+alpha.toString('base64')}).status,403);
const newBorder=post(admin,'border/save',{name:'Dreamy Pink Frame',rarity:'UR',artId:borderUpload.body.artId});
assert.equal(newBorder.status,200);
const borderId=newBorder.body.preset.id;
assert.ok(borderId.startsWith('border-'));
assert.ok(get(admin).body.borderPresets.some(b=>b.id===borderId));
assert.equal(post(admin,'border/save',{name:'Dreamy Pink Frame',artId:borderUpload.body.artId}).status,409);
assert.equal(post(admin,'border/delete',{id:'R',confirm:'DELETE'}).status,404);
const card={title:'First',rarity:'SSR',border:'none',artId:img.body.artId,
 overlayText:{value:'Kellie',fontFamily:'Georgia',fontSize:74,x:46.5,y:88,color:'#9057A9',align:'center',weight:'700',italic:true}};
const scheduled=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'scheduled',releaseAt:'2099-06-01T12:00:00Z',cards:[card]});
assert.equal(scheduled.status,200);
assert.deepEqual(scheduled.body.pack.cards[0].overlayText,card.overlayText);
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
assert.deepEqual(app.publicCardsByPack()[packId][0].overlayText,card.overlayText);
assert.equal(app.publicCardsByPack()[packId][0].title,'First');
const sanitized=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'published',
 cards:[{...released.body.pack.cards[0],overlayText:{value:'custom name',fontFamily:'Unknown<script>',fontSize:999,x:-10,y:150,color:'expression(red)',weight:'900',align:'bad'}}]});
assert.equal(sanitized.status,200);
const safe=sanitized.body.pack.cards[0].overlayText;
assert.equal(safe.value,'custom name');
assert.equal(safe.fontFamily,'Georgia');assert.equal(safe.fontSize,160);
assert.equal(safe.x,0);assert.equal(safe.y,100);
assert.equal(safe.color,'#68577D');assert.equal(safe.weight,'400');
assert.equal(app.publicCardsByPack()[packId][0].overlayText.value,'custom name');

const styled=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'published',
 cards:[{...released.body.pack.cards[0],border:borderId}]});
assert.equal(styled.status,200);
assert.equal(app.publicCardsByPack()[packId][0].borderUrl,'/api/card-studio/art/'+borderUpload.body.artId);
assert.equal(post(admin,'border/delete',{id:borderId,confirm:'DELETE'}).status,409);
const unstyled=post(admin,'save',{id:packId,title:'Test comeback',member:'Kellie',team:'NYC50',subgroup:'NYC50',status:'published',
 cards:[{...styled.body.pack.cards[0],border:'none'}]});
assert.equal(unstyled.status,200);
assert.equal(post(admin,'border/delete',{id:borderId,confirm:'DELETE'}).status,200);
assert.ok(!get(admin).body.borderPresets.some(b=>b.id===borderId));
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
