import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const factory=require('../card-studio.js');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-foil-lab-'));
let seq=0;
const admin={id:'admin',role:'admin',mustChangePassword:false};
const fan={id:'fan',role:'fan',state:{owned:{}}};
const outsider={id:'outsider',role:'fan',state:{owned:{}}};
const db={users:{admin,fan,outsider},tradeListings:[]};
const app=factory({
 db,dataDir:root,save:()=>{},id:()=>('00000000-0000-4000-8000-'+String(++seq).padStart(12,'0')),
 now:()=>new Date().toISOString(),bodyText:(v,n)=>String(v||'').trim().slice(0,n),
 userFrom:req=>req.user||null,
 json:(res,status,data)=>{res.status=status;res.body=data;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;},
 baseCards:[{id:'tl-01',title:'First Light',rarity:'R',member:'Arielle'}],
 baseAlbums:[{id:'arielle-true-love',title:'True Love',member:'Arielle',team:'NYC50'}],
 rarityWeights:{R:55,SR:27,SSR:12,MR:5,UR:1},packCost:300,hardPity:30,baseAlbumId:'arielle-true-love'
});
function makeWebp(){
 const b=Buffer.alloc(30);b.write('RIFF');b.writeUInt32LE(22,4);b.write('WEBP',8);b.write('VP8X',12);
 b.writeUIntLE(659,24,3);b.writeUIntLE(1019,27,3);
 return 'data:image/webp;base64,'+b.toString('base64');
}
function post(action,data,user=admin){const res={};app.handlePost({user},res,'/api/card-studio/'+action,data);return res;}
function read(artId,user){return new Promise((resolve,reject)=>{
 const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){resolve({status:this.status,headers:this.headers,body});}};
 try{app.handleGet({user},res,'/api/card-studio/art/'+artId);if(res.status&&!res.headers)resolve({status:res.status,body:res.body});}catch(e){reject(e);}
});}
const face=post('upload',{kind:'face',dataUrl:makeWebp()}).body.artId;
const mask=post('upload',{kind:'mask',dataUrl:makeWebp()}).body.artId;
assert.equal(app.studio.media[mask].kind,'mask');
assert.equal(post('upload',{kind:'mask',dataUrl:makeWebp()},fan).status,403);
const layer={id:'layer-aaaa-bbbb-cccc',name:'Border glitter',type:'glitter',maskArtId:mask,
 colors:['#a0d7a0','#f3ef60'],opacity:.7,intensity:1.2,density:.6,scale:2,speed:.4,enabled:true};
const iridescent={id:'layer-dddd-eeee-ffff',name:'Star glow',type:'iridescent',
 maskArtId:null,colors:['#76dc64','#f2e772'],opacity:.65,intensity:.8,density:.5,scale:1,speed:.8};
const common={title:'Foil Test',member:'Arielle',team:'NYC50',isTest:true,status:'draft'};
const card={title:'Foil Star',rarity:'SSR',border:'none',artId:face,materialLayers:[layer,iridescent]};
const draft=post('save',{...common,cards:[card]});assert.equal(draft.status,200);
const packId=draft.body.pack.id,cardId=draft.body.pack.cards[0].id;
assert.equal(app.publicCardsByPack()[packId],undefined);
assert.equal((await read(mask,fan)).status,403,'draft masks must not leak');
const malformed=post('save',{...common,id:packId,cards:[{...card,materialLayers:[{...layer,type:'unknown'}]}]});
assert.equal(malformed.status,400);
const wrongImage=post('save',{...common,id:packId,cards:[{...card,materialLayers:[{...layer,maskArtId:face}]}]});
assert.equal(wrongImage.status,400);
const tooMany=post('save',{...common,id:packId,cards:[{...card,materialLayers:Array(9).fill(layer)}]});
assert.equal(tooMany.status,400);
const published=post('save',{...common,id:packId,status:'published',cards:draft.body.pack.cards});
assert.equal(published.status,200);
const publicCard=app.publicCardsByPack()[packId][0];
assert.equal(publicCard.materialLayers.length,2);
assert.equal(publicCard.materialLayers[0].maskUrl,'/api/card-studio/art/'+mask);
assert.deepEqual(publicCard.materialLayers[1].colors,['#76dc64','#f2e772']);
assert.equal((await read(mask,fan)).status,403,'unowned cards may not expose masks');
fan.state.owned[cardId]=1;
const allowed=await read(mask,fan);
assert.equal(allowed.status,200);
assert.equal(allowed.headers['Cache-Control'],'private,no-store');
assert.equal((await read(mask,outsider)).status,403);
assert.equal((await read(mask,admin)).status,200);
const edited=post('save',{...common,id:packId,status:'published',cards:[{...published.body.pack.cards[0],materialLayers:[{
 ...layer,opacity:99,intensity:9,colors:['red','#dcf068'],density:0
}]}]});
assert.equal(edited.status,200,JSON.stringify(edited.body));
assert.equal(edited.body.pack.cards[0].materialLayers[0].opacity,1);
assert.equal(edited.body.pack.cards[0].materialLayers[0].intensity,2);
assert.equal(edited.body.pack.cards[0].materialLayers[0].colors[0],'#e99fff');
assert.equal(edited.body.pack.cards[0].materialLayers[0].density,.05);
const noMask=post('save',{...common,id:packId,status:'published',cards:[{...edited.body.pack.cards[0],materialLayers:[]}]});
assert.equal(noMask.status,200);
assert.equal(app.studio.media[mask],undefined,'unreferenced mask should be deleted');
fs.rmSync(root,{recursive:true,force:true});
console.log('Foil Lab tests passed: masked layers, citrus palette, authorization, bounds and cleanup');
