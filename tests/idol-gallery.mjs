import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const createGallery=require('../idol-gallery.js');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-idol-gallery-'));
const jpg=Buffer.from('ffd8ff11223344aabbccdd','hex'),different=Buffer.from('ffd8ff9988776655443322','hex');
const data=bytes=>'data:image/jpeg;base64,'+bytes.toString('base64');
const users={owner:{id:'owner',role:'idol',idolId:'arielle'},other:{id:'other',role:'idol',idolId:'jaylene'},
 admin:{id:'admin',role:'admin'},fan:{id:'fan',role:'fan'},locked:{id:'locked',role:'idol',idolId:'arielle',mustChangePassword:true}};
const members=[{id:'arielle',name:'Arielle',team:'NYC50'},{id:'jaylene',name:'Jaylene',team:'NYC50'}],db={};
let count=0;const service=createGallery({db,save:()=>count++,now:()=>new Date().toISOString(),
 members,dataDir,userFrom:req=>users[req.who],
 json:(res,status,body)=>{res.status=status;res.body=body;return true;},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true;}});
const post=(who,body)=>{const res={};service.update({who},res,{idolId:'arielle',...body});return res;};
function read(id,kind,itemId,variant){return new Promise(resolve=>{
 const res={writeHead(status,headers){this.status=status;this.headers=headers;return this;},
  end(bytes){this.bytes=bytes;resolve(this);}};
 service.serve({method:'GET'},res,id,kind,itemId,variant);
 if(res.status&&!res.headers)resolve(res);
});}
try{
 assert.equal(service.info().arielle.gallery.length,0);
 assert.equal(post('fan',{kind:'gallery',action:'upload',originalDataUrl:data(jpg)}).status,403);
 assert.equal(post('other',{kind:'gallery',action:'upload',originalDataUrl:data(jpg)}).status,403);
 assert.equal(post('locked',{kind:'gallery',action:'upload',originalDataUrl:data(jpg)}).status,403);
 assert.equal(post('owner',{kind:'circle',action:'upload',originalDataUrl:data(jpg)}).status,400);
 const upload1=post('owner',{kind:'gallery',action:'upload',originalDataUrl:data(jpg)});
 const upload2=post('owner',{kind:'gallery',action:'upload',originalDataUrl:data(different)});
 assert.equal(upload1.status,200);assert.equal(upload2.status,200);
 let photos=service.info().arielle.gallery;
 assert.equal(photos.length,2);
 assert.ok(photos[0].url.includes('/api/idol-gallery/arielle/gallery/'));
 assert.deepEqual((await read('arielle','gallery',photos[0].id)).bytes,jpg);
 const order=photos.map(p=>p.id).reverse();
 assert.equal(post('owner',{kind:'gallery',action:'reorder',ids:order}).status,200);
 assert.deepEqual(service.info().arielle.gallery.map(x=>x.id),order);
 assert.equal(post('owner',{kind:'gallery',action:'reorder',ids:[order[0],order[0]]}).status,400);
 const circle=post('admin',{kind:'circle',action:'upload',originalDataUrl:data(jpg),cropDataUrl:data(different)});
 assert.equal(circle.status,200);
 let head=service.info().arielle.circleGallery[0];
 assert.equal(service.info().arielle.circlePhotoUrl,head.url);
 assert.deepEqual((await read('arielle','circle',head.id)).bytes,different);
 assert.deepEqual((await read('arielle','circle',head.id,'original')).bytes,jpg);
 assert.equal(post('owner',{kind:'circle',action:'crop',id:head.id,cropDataUrl:data(jpg)}).status,200);
 assert.deepEqual((await read('arielle','circle',head.id)).bytes,jpg);
 assert.deepEqual((await read('arielle','circle',head.id,'original')).bytes,jpg);
 assert.equal(post('owner',{kind:'circle',action:'replace',id:head.id,originalDataUrl:data(different),cropDataUrl:data(jpg)}).status,200);
 assert.deepEqual((await read('arielle','circle',head.id,'original')).bytes,different);
 assert.deepEqual((await read('arielle','circle',head.id)).bytes,jpg);
 assert.equal(post('owner',{kind:'gallery',action:'delete',id:order[0]}).status,200);
 assert.equal(service.info().arielle.gallery.length,1);
 assert.equal((await read('arielle','gallery',order[0])).status,404);
 assert.equal(post('admin',{kind:'circle',action:'delete',id:head.id}).status,200);
 assert.equal(service.info().arielle.circlePhotoUrl,null);
 assert.ok(count>=7);
 console.log('Idol gallery tests passed: permissions, upload, circle crop, replacement, reordering, deletion, avatar selection and disk reads.');
}finally{fs.rmSync(dataDir,{recursive:true,force:true});}
