import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const createStudio=require('../card-studio.js');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-card-backs-'));
let sequence=0;
const admin={id:'admin',role:'admin',mustChangePassword:false};
const fanA={id:'fan-a',role:'fan',state:{owned:{}}};
const fanB={id:'fan-b',role:'fan',state:{owned:{}}};
const studio=createStudio({
 db:{users:{admin,[fanA.id]:fanA,[fanB.id]:fanB},tradeListings:[]},
 baseCards:[{id:'tl-01',title:'First Light',rarity:'R',legacy:true}],
 baseAlbums:[{id:'arielle-true-love',title:'True Love',member:'Arielle',team:'NYC50'}],
 dataDir:tmp,save:()=>{},id:()=>('00000000-0000-4000-8000-'+String(++sequence).padStart(12,'0')),
 now:()=>new Date().toISOString(),bodyText:(v,n)=>String(v||'').trim().slice(0,n),
 rarityWeights:{R:55,SR:27,SSR:12,MR:5,UR:1},packCost:300,hardPity:30,baseAlbumId:'arielle-true-love',
 userFrom:req=>req.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}
});
function call(action,body,user=admin){const res={};studio.handlePost({user},res,'/api/card-studio/'+action,body);return res;}
function sampleWebp(){
 const buf=Buffer.alloc(30);buf.write('RIFF');buf.writeUInt32LE(22,4);buf.write('WEBP',8);buf.write('VP8X',12);
 buf.writeUInt32LE(10,16);buf.writeUIntLE(659,24,3);buf.writeUIntLE(1019,27,3);
 return 'data:image/webp;base64,'+buf.toString('base64');
}
const raw=sampleWebp();
const face=call('upload',{kind:'face',dataUrl:raw}).body.artId;
const defaultBack=call('upload',{kind:'back',dataUrl:raw}).body.artId;
const rareBack=call('upload',{kind:'back',dataUrl:raw}).body.artId;
assert.equal(studio.studio.media[defaultBack].kind,'back');
assert.equal(call('upload',{kind:'back',dataUrl:raw},fanA).status,403);
const baseCard={title:'First Light',rarity:'R',border:'R',artId:face};
const rareCard={title:'Personal Letter',rarity:'SSR',border:'SSR',artId:face,backArtId:rareBack};
const draft=call('save',{title:'Back design test',member:'Arielle',team:'NYC50',status:'draft',isTest:true,
 defaultBackArtId:defaultBack,cards:[baseCard,rareCard]});
assert.equal(draft.status,200);
const packId=draft.body.pack.id;
const [idR,idSSR]=draft.body.pack.cards.map(c=>c.id);
fanA.state.owned[idR]=1;
fanB.state.owned[idSSR]=1;
assert.ok(!studio.publicCardsByPack()[packId],'draft back designs never appear in catalog');
function privateRead(user,artId){
 const res={};studio.handleGet({user},res,'/api/card-studio/art/'+artId);return res;
}
assert.equal(privateRead(fanA,defaultBack).status,403,'draft backs remain private even to owners');
assert.equal(call('save',{id:packId,title:'Back design test',member:'Arielle',team:'NYC50',
 status:'published',defaultBackArtId:face,cards:draft.body.pack.cards}).status,400,'front images cannot be used as back art');
assert.equal(call('save',{id:packId,title:'Back design test',member:'Arielle',team:'NYC50',
 status:'published',defaultBackArtId:defaultBack,cards:[{...baseCard,id:idR,backArtId:face},rareCard]}).status,400,'invalid per-card back type rejected');
const published=call('save',{id:packId,title:'Back design test',member:'Arielle',team:'NYC50',
 status:'published',defaultBackArtId:defaultBack,cards:draft.body.pack.cards});
assert.equal(published.status,200);
const cards=studio.publicCardsByPack()[packId];
assert.equal(cards[0].backArtUrl,'/api/card-studio/art/'+defaultBack);
assert.equal(cards[0].backSource,'set');
assert.equal(cards[1].backArtUrl,'/api/card-studio/art/'+rareBack);
assert.equal(cards[1].backSource,'card');
assert.equal(privateRead(fanA,rareBack).status,403,'low-rarity owner cannot read rare card back');
assert.equal(privateRead(fanB,defaultBack).status,403,'owning rare override does not reveal default art');
async function allowedRead(user,artId){
 return await new Promise((resolve,reject)=>{
   const res={writeHead(status,headers){this.status=status;this.headers=headers;},
     end(buffer){resolve({status:this.status,headers:this.headers,buffer});}};
   try{studio.handleGet({user},res,'/api/card-studio/art/'+artId);}catch(e){reject(e);}
 });
}
assert.equal((await allowedRead(fanA,defaultBack)).status,200);
const rare=await allowedRead(fanB,rareBack);
assert.equal(rare.status,200);
assert.equal(rare.headers['Cache-Control'],'private,no-store');
assert.equal((await allowedRead(admin,rareBack)).status,200);
const inherited=call('save',{id:packId,title:'Back design test',member:'Arielle',team:'NYC50',
 status:'published',defaultBackArtId:defaultBack,cards:published.body.pack.cards.map(c=>({...c,backArtId:null}))});
assert.equal(inherited.status,200);
assert.equal(studio.publicCardsByPack()[packId][1].backArtUrl,'/api/card-studio/art/'+defaultBack);
assert.equal(studio.publicCardsByPack()[packId][1].backSource,'set');
const generated=call('save',{id:packId,title:'Back design test',member:'Arielle',team:'NYC50',
 status:'published',defaultBackArtId:null,cards:inherited.body.pack.cards});
assert.equal(generated.status,200);
assert.equal(studio.publicCardsByPack()[packId][0].backArtUrl,null);
assert.equal(studio.publicCardsByPack()[packId][0].backSource,'generated');
assert.equal(call('delete',{id:packId,confirm:'DELETE'}).status,200);
assert.equal(studio.studio.media[rareBack],undefined);
assert.equal(studio.studio.media[defaultBack],undefined);
fs.rmSync(tmp,{recursive:true,force:true});
console.log('Card backs tests passed: set default, individual override, inheritance, private ownership and deletion');
