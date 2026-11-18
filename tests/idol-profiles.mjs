import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const createProfiles=require('../idol-profiles.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'usa50-idol-profiles-'));
const members=[{id:'arielle',name:'Arielle',team:'NYC50'},{id:'jaylene',name:'Jaylene',team:'NYC50'},{id:'zoe',name:'Zoe',team:'LA50'}];
const users={
 idol:{id:'idol',role:'idol',idolId:'arielle',mustChangePassword:false},
 other:{id:'other',role:'idol',idolId:'jaylene',mustChangePassword:false},
 manager:{id:'manager',role:'admin',mustChangePassword:false},
 fan:{id:'fan',role:'fan',mustChangePassword:false},
 reset:{id:'reset',role:'idol',idolId:'arielle',mustChangePassword:true}
};
const db={},image=Buffer.from('ffd8ff00112233445566','hex');
let saves=0;
const service=createProfiles({db,save:()=>saves++,now:()=>new Date().toISOString(),members,dataDir:dir,
 userFrom:req=>users[req.identity]||null,
 json:(res,status,value)=>{res.status=status;res.body=value;return true},
 fail:(res,status,error)=>{res.status=status;res.body={error};return true}});
const send=(identity,body)=>{const res={};service.update({identity},res,body);return res;};
const basics={idolId:'arielle',birthday:'01-09',mbti:'INFP-T',height:'5 ft 3 in',
 bornCity:'Fairfax',bornState:'Virginia',zodiac:{sun:'Capricorn',moon:'',rising:''},
 favoriteColors:[{name:'Navy blue',color:'#1a2b4c'},{name:'Blush',color:'#ffaabb'}],
 quote:'A quote',yearGoal:'One big goal',idolGoal:'Be a better performer'};
function fetchPhoto(id,method='GET'){return new Promise(resolve=>{
 const res={writeHead(status,headers){this.status=status;this.headers=headers;return this;},
 end(bytes){this.bytes=bytes;resolve(this);}};
 service.servePhoto({method},res,id);
 if(res.status&&!res.headers)resolve(res);
});}
try{
 const start=service.info();
 assert.ok(Object.keys(start).includes('zoe'));
 assert.deepEqual(start.arielle.favoriteColors,[]);
 assert.equal(start.arielle.photoUrl,null);
 assert.equal(send('fan',basics).status,403);
 assert.equal(send('other',basics).status,403);
 assert.equal(send('reset',basics).status,403);
 assert.equal(send('idol',{...basics,birthday:'02-30'}).status,400);
 assert.equal(send('idol',{...basics,zodiac:{sun:'Capricorn',moon:'Neptune',rising:''}}).status,400);
 assert.equal(send('idol',{...basics,favoriteColors:[...basics.favoriteColors,{name:'third',color:'#ffffff'}]}).status,400);
 const accepted=send('idol',basics);
 assert.equal(accepted.status,200);
 assert.equal(service.info().arielle.birthday,'01-09');
 assert.equal(service.info().arielle.zodiac.sun,'Capricorn');
 assert.equal(service.info().arielle.zodiac.rising,'');
 assert.equal(service.info().arielle.favoriteColors[0].name,'Navy blue');
 assert.equal(service.info().arielle.favoriteColors[0].color,'#1A2B4C');
 assert.equal(send('idol',{...basics,idolId:'zoe'}).status,403);
 const upload=send('manager',{...basics,idolId:'zoe',photoDataUrl:'data:image/jpeg;base64,'+image.toString('base64')});
 assert.equal(upload.status,200);
 assert.ok(service.info().zoe.photoUrl.startsWith('/api/idol-profiles/photo/zoe?v='));
 assert.equal(service.info().zoe.birthday,'01-09');
 const photo=await fetchPhoto('zoe');
 assert.equal(photo.status,200);
 assert.deepEqual(photo.bytes,image);
 assert.equal(photo.headers['Content-Type'],'image/jpeg');
 const bad=send('manager',{...basics,idolId:'zoe',photoDataUrl:'data:image/png;base64,'+image.toString('base64')});
 assert.equal(bad.status,400);
 assert.deepEqual((await fetchPhoto('zoe')).bytes,image);
 assert.ok(saves>=2);
 console.log('Meet the Idols tests passed: public profiles, individual editor permissions, zodiac/color validation, photo upload and persistence.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
