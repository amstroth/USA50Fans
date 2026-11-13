import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const makeStudio=require('../card-studio.js');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-idol-studio-'));
let counter=0;
const admin={id:'a',role:'admin',mustChangePassword:false};
const arielle={id:'i',role:'idol',idolId:'arielle',mustChangePassword:false};
const jaylene={id:'j',role:'idol',idolId:'jaylene',mustChangePassword:false};
const early={id:'e',role:'idol',idolId:'arielle',mustChangePassword:true};
const fan={id:'f',role:'fan',mustChangePassword:false};
const db={users:{a:admin,i:arielle,j:jaylene,e:early,f:fan},tradeListings:[]};
const studio=makeStudio({
 db,dataDir,save:()=>{},id:()=>('00000000-0000-4000-8000-'+String(++counter).padStart(12,'0')),
 now:()=>new Date().toISOString(),bodyText:(value,max)=>String(value||'').trim().slice(0,max),
 rarityWeights:{R:55,SR:27,SSR:12,MR:5,UR:1},packCost:300,hardPity:30,baseAlbumId:'arielle-true-love',
 baseCards:[{id:'tl-01',title:'First Light',rarity:'R',member:'Arielle'}],
 baseAlbums:[{id:'arielle-true-love',title:'True Love',member:'Arielle',team:'NYC50'},
            {id:'nyc50-debut',title:'NYC50 Debut',member:'NYC50',team:'NYC50'}],
 userFrom:req=>req.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}
});
const get=(user,path='/api/card-studio')=>{const res={};studio.handleGet({user},res,path);return res;};
const post=(user,endpoint,data)=>{const res={};studio.handlePost({user},res,'/api/card-studio/'+endpoint,data);return res;};
assert.equal(get(fan).status,403);
assert.equal(get(early).status,403);
assert.equal(get(admin).status,200);
const idolView=get(arielle);
assert.equal(idolView.status,200);
assert.equal(idolView.body.role,'idol');
assert.equal(idolView.body.member,'arielle');
assert.ok(idolView.body.packs.some(p=>p.id==='arielle-true-love'));
assert.ok(!idolView.body.packs.some(p=>p.id==='nyc50-debut'));
assert.equal(get(jaylene).status,200);
assert.ok(!get(jaylene).body.packs.some(p=>p.id==='arielle-true-love'));
const wrong=post(arielle,'save',{title:'Foreign pack',member:'Jaylene',team:'NYC50',status:'draft',isTest:true,cards:[]});
assert.equal(wrong.status,403);
const added=post(arielle,'save',{title:'Arielle personal cards',member:'Arielle',team:'NYC50',
 subgroup:'NYC50',status:'draft',isTest:true,cards:[]});
assert.equal(added.status,200);
const id=added.body.pack.id;
assert.ok(get(arielle).body.packs.some(p=>p.id===id));
assert.ok(!get(jaylene).body.packs.some(p=>p.id===id));
const editOther=post(jaylene,'save',{id,title:'Taken',member:'Jaylene',team:'NYC50',status:'draft',cards:[]});
assert.equal(editOther.status,403);
assert.equal(post(jaylene,'delete',{id,confirm:'DELETE'}).status,403);
assert.equal(post(arielle,'delete',{id,confirm:'DELETE'}).status,200);
const webp=Buffer.alloc(30);webp.write('RIFF');webp.writeUInt32LE(22,4);webp.write('WEBP',8);webp.write('VP8X',12);
webp.writeUInt32LE(10,16);webp.writeUIntLE(659,24,3);webp.writeUIntLE(1019,27,3);
const dataUrl='data:image/webp;base64,'+webp.toString('base64');
assert.equal(post(fan,'upload',{kind:'face',dataUrl}).status,403);
assert.equal(post(early,'upload',{kind:'face',dataUrl}).status,403);
const own=post(arielle,'upload',{kind:'face',dataUrl});
assert.equal(own.status,201);
assert.equal(get(jaylene,'/api/card-studio/art/'+own.body.artId).status,403);
const named=post(arielle,'border/save',{name:'Arielle Iridescence',artId:own.body.artId});
assert.equal(named.status,400,'face art must not be used as a border preset');
fs.rmSync(dataDir,{recursive:true,force:true});
console.log('Idol Card Studio tests passed: own-pack access, temporary-password gate, account isolation, secure uploads.');
