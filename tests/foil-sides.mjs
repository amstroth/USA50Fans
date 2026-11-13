import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=(f)=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const makeStudio=require('../card-studio.js');
const three=read('www/collector-three-v12.js');
const foil=read('www/foil-lab-v12.js');
const social=read('www/social-v05.js');
const app=read('www/app.js');
assert.match(three,/function roundedCardShape\(THREE\)/);
assert.match(three,/new THREE\.ExtrudeGeometry\(shape/);
assert.match(three,/new THREE\.ShapeGeometry\(shape/);
assert.match(three,/layer\.side==='back'/);
assert.match(three,/mesh\.rotation\.y=Math\.PI/);
assert.match(foil,/data-foil="side-front"/);
assert.match(foil,/data-foil="side-back"/);
assert.match(foil,/initialRotation:viewSide==='back'\?192:12/);
assert.match(foil,/l\.side=viewSide/);
assert.doesNotMatch(social,/Every fan is part of the story/);
assert.match(social,/social-compact-heading/);
assert.match(app,/profile-overview-stats/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-foil-sides-'));
let seq=0;
const admin={id:'a',role:'admin',mustChangePassword:false};
const appStudio=makeStudio({
 db:{users:{a:admin},tradeListings:[]},dataDir:tmp,
 id:()=>('00000000-0000-4000-8000-'+String(++seq).padStart(12,'0')),
 save:()=>{},now:()=>new Date().toISOString(),
 bodyText:(x,n)=>String(x||'').trim().slice(0,n),
 baseCards:[{id:'tl-01',title:'First Light',rarity:'R',member:'Arielle'}],
 baseAlbums:[{id:'arielle-true-love',title:'True Love',member:'Arielle',team:'NYC50'}],
 rarityWeights:{R:55,SR:27,SSR:12,MR:5,UR:1},packCost:300,hardPity:30,baseAlbumId:'arielle-true-love',
 userFrom:req=>req.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}
});
const post=(action,data)=>{const out={};appStudio.handlePost({user:admin},out,'/api/card-studio/'+action,data);return out;};
const bytes=Buffer.alloc(30);
bytes.write('RIFF');bytes.writeUInt32LE(22,4);bytes.write('WEBP',8);bytes.write('VP8X',12);
bytes.writeUInt32LE(10,16);bytes.writeUIntLE(659,24,3);bytes.writeUIntLE(1019,27,3);
const dataUrl='data:image/webp;base64,'+bytes.toString('base64');
const face=post('upload',{kind:'face',dataUrl}).body.artId;
const mask=post('upload',{kind:'mask',dataUrl}).body.artId;
const layers=[
 {id:'layer-front-123456',name:'Front shimmer',type:'holographic',side:'front',maskArtId:mask,
  colors:['#e99fff','#a9edff'],opacity:.7},
 {id:'layer-back-123456',name:'Back message highlight',type:'iridescent',side:'back',maskArtId:mask,
  colors:['#aacc22','#ddee55'],opacity:.75},
 {id:'layer-legacy-123456',name:'Legacy foil',type:'glitter',maskArtId:null,
  colors:['#ffffaa','#ffeeaa']}
];
const saved=post('save',{title:'Two-sided test',member:'Arielle',team:'NYC50',subgroup:'NYC50',
 isTest:true,status:'published',cards:[{title:'Secret letter',rarity:'SSR',border:'none',artId:face,materialLayers:layers}]});
assert.equal(saved.status,200,JSON.stringify(saved.body));
const id=saved.body.pack.id;
const result=appStudio.publicCardsByPack()[id][0].materialLayers;
assert.equal(result.length,3);
assert.equal(result[0].side,'front');
assert.equal(result[1].side,'back');
assert.equal(result[1].maskUrl,'/api/card-studio/art/'+mask);
assert.equal(result[2].side,'front','older foil layers must remain on front by default');
const changed=post('save',{...saved.body.pack,cards:[{...saved.body.pack.cards[0],
 materialLayers:saved.body.pack.cards[0].materialLayers.map(l=>({...l,side:'back'}))}]});
assert.equal(changed.status,200,JSON.stringify(changed.body));
assert.ok(changed.body.pack.cards[0].materialLayers.every(l=>l.side==='back'));
fs.rmSync(tmp,{recursive:true,force:true});
console.log('Rounded Three.js and two-sided Foil Lab tests passed, including legacy layer compatibility.');
