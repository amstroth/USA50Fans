'use strict';
/**
 * Public Meet the Idols member profiles. Editors: the matching idol or USA50
 * management (admin role). The full data is public, so leave unapproved
 * personal facts blank until an editor explicitly publishes them.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ZODIAC=new Set(['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']);
const IMAGE_TYPES={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
const IMAGE_MAX=1500000;
const FIELDS=['birthday','mbti','height','bornCity','bornState','quote','yearGoal','idolGoal'];
function textField(value,limit){
 if(value===undefined||value===null)return '';
 return String(value).trim().slice(0,limit);
}
function validBirthday(value){
 if(!value)return true;
 const match=/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
 if(!match)return false;
 const month=Number(match[1]),day=Number(match[2]);
 return day<=new Date(Date.UTC(2024,month,0)).getUTCDate(); // allow Feb 29; no birth year stored
}
module.exports=function makeIdolProfiles({db,save,now,users,members,dataDir,userFrom,json,fail}){
 db.idolProfiles||={};
 const dir=path.join(dataDir,'idol-portraits');fs.mkdirSync(dir,{recursive:true});
 const byId=new Map(members.map(m=>[m.id,m]));
 function publicProfile(member){
  const stored=db.idolProfiles[member.id]||{};
  const z=stored.zodiac||{},colors=Array.isArray(stored.favoriteColors)?stored.favoriteColors:[];
  return {idolId:member.id,name:member.name,team:member.team,
   birthday:stored.birthday||'',zodiac:{sun:z.sun||'',moon:z.moon||'',rising:z.rising||''},
   mbti:stored.mbti||'',height:stored.height||'',bornCity:stored.bornCity||'',bornState:stored.bornState||'',
   favoriteColors:colors.map(c=>({name:c.name,color:c.color})),
   quote:stored.quote||'',yearGoal:stored.yearGoal||'',idolGoal:stored.idolGoal||'',
   photoUrl:stored.photoFile?'/api/idol-profiles/photo/'+member.id+'?v='+encodeURIComponent(stored.photoUpdatedAt||'1'):null,
   updatedAt:stored.updatedAt||null};
 }
 function info(){return Object.fromEntries(members.map(m=>[m.id,publicProfile(m)]));}
 function authorize(user,idolId){
  return Boolean(user&&!user.mustChangePassword&&
    (user.role==='admin'||(user.role==='idol'&&user.idolId===idolId)));
 }
 function validImage(buf,mime){
  if(!Buffer.isBuffer(buf)||buf.length<8||buf.length>IMAGE_MAX||!IMAGE_TYPES[mime])return false;
  if(mime==='image/jpeg')return buf.subarray(0,3).toString('hex')==='ffd8ff';
  if(mime==='image/png')return buf.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
  return buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';
 }
 function servePhoto(req,res,id){
  const member=byId.get(String(id||'')),item=member&&db.idolProfiles[member.id];
  if(!item?.photoFile||!IMAGE_TYPES[item.photoMime]||item.photoFile!==member.id+IMAGE_TYPES[item.photoMime])
   return fail(res,404,'Idol photo unavailable.');
  fs.readFile(path.join(dir,item.photoFile),(err,buf)=>{
   if(err)return fail(res,404,'Idol photo unavailable.');
   res.writeHead(200,{'Content-Type':item.photoMime,'Content-Length':buf.length,
    'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD')return res.end();
   res.end(buf);
  });
 }
 function update(req,res,data){
  const target=String(data?.idolId||'').toLowerCase(),member=byId.get(target),user=userFrom(req);
  if(!member)return fail(res,404,'Unknown idol profile.');
  if(!user)return fail(res,401,'Sign in to edit member profiles.');
  if(!authorize(user,target))return fail(res,403,'Only this idol or management can edit this profile.');
  if(!data||typeof data!=='object'||Array.isArray(data))return fail(res,400,'Invalid profile.');
  const input={},bounds={birthday:10,mbti:8,height:26,bornCity:70,bornState:70,quote:300,yearGoal:500,idolGoal:500};
  for(const field of FIELDS){
   const val=data[field]===undefined?'':data[field];
   if(typeof val!=='string'||val.length>bounds[field])return fail(res,400,field+' is too long or invalid.');
   input[field]=textField(val,bounds[field]);
  }
  if(!validBirthday(input.birthday))return fail(res,400,'Use a valid birthday in MM-DD format.');
  if(input.mbti&&!/^[EI][NS][FT][JP](?:-[AT])?$/.test(input.mbti.toUpperCase()))
   return fail(res,400,'Enter a valid MBTI type.');
  input.mbti=input.mbti.toUpperCase();
  const zodiac=data.zodiac||{};
  if(typeof zodiac!=='object'||Array.isArray(zodiac))return fail(res,400,'Invalid zodiac signs.');
  input.zodiac={};
  for(const key of ['sun','moon','rising']){
   const value=zodiac[key]===undefined?'':zodiac[key];
   if(typeof value!=='string'||(value&&!ZODIAC.has(value)))return fail(res,400,'Select a recognized zodiac sign.');
   input.zodiac[key]=value;
  }
  const colors=data.favoriteColors||[];
  if(!Array.isArray(colors)||colors.length>2)return fail(res,400,'Select at most two favorite colors.');
  input.favoriteColors=[];
  for(const color of colors){
   if(!color||typeof color!=='object'||typeof color.name!=='string'||color.name.length>35||
      !/^#[0-9a-fA-F]{6}$/.test(String(color.color||'')))return fail(res,400,'Each favorite color needs a name and a hex code.');
   input.favoriteColors.push({name:color.name.trim().slice(0,35)||'Favorite color',color:color.color.toUpperCase()});
  }
  let media=null;
  if(Object.hasOwn(data,'photoDataUrl')){
   const raw=data.photoDataUrl;
   if(typeof raw!=='string'||raw.length>Math.ceil(IMAGE_MAX*4/3)+100)return fail(res,413,'Photo exceeds the 1.5 MB upload limit.');
   const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw);
   if(!m)return fail(res,400,'Choose a JPG, PNG or WebP portrait.');
   const bytes=Buffer.from(m[2],'base64');
   if(!validImage(bytes,m[1]))return fail(res,400,'Portrait image is invalid or exceeds 1.5 MB.');
   media={mime:m[1],bytes,filename:member.id+IMAGE_TYPES[m[1]]};
  }
  const previous=db.idolProfiles[target]||{};
  if(media){
   try{fs.writeFileSync(path.join(dir,media.filename),media.bytes,{mode:0o600});}
   catch{return fail(res,500,'Could not save the portrait.');}
   if(previous.photoFile&&previous.photoFile!==media.filename){
    try{fs.unlinkSync(path.join(dir,previous.photoFile));}catch{}
   }
  }
  db.idolProfiles[target]={...previous,...input,...(media?{
   photoFile:media.filename,photoMime:media.mime,photoUpdatedAt:now()}:{}),
   updatedAt:now(),updatedBy:user.id};
  save();
  return json(res,200,{ok:true,profile:publicProfile(member)});
 }
 return {info,update,servePhoto};
};
