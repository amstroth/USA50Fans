'use strict';
/* Gallery + independently ordered circle portraits for USA50 idols.
   Images are stored in DATA_DIR (the persistent Railway volume), never in the
   deployed static bundle. First circle portrait is the member's primary avatar. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MIME={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
const MAX_BYTES=1500000;
const MAX={gallery:12,circle:8};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function decode(data,forceJpeg=false){
 const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(data||''));
 if(!m||m[2].length>Math.ceil(MAX_BYTES*4/3)+10)return null;
 if(forceJpeg&&m[1]!=='image/jpeg')return null;
 const b=Buffer.from(m[2],'base64'),mime=m[1];
 if(b.length<8||b.length>MAX_BYTES)return null;
 const valid=mime==='image/jpeg'?b.subarray(0,3).toString('hex')==='ffd8ff':
  mime==='image/png'?b.subarray(0,8).toString('hex')==='89504e470d0a1a0a':
  b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
 return valid?{mime,buffer:b}:null;
}
module.exports=function makeIdolGallery({db,save,now,members,dataDir,userFrom,json,fail}){
 db.idolMedia||={};
 const dir=path.join(dataDir,'idol-gallery');
 fs.mkdirSync(dir,{recursive:true});
 const allowed=new Map(members.map(m=>[m.id,m]));
 const record=id=>db.idolMedia[id]||(db.idolMedia[id]={gallery:[],circle:[],legacyMigrated:false});
 const filename=(idol,kind,id,mime,variant='original')=>idol+'-'+kind+'-'+id+'-'+variant+(variant==='crop'?'.jpg':MIME[mime]);
 const disk=(idol,kind,entry,variant='original')=>path.join(dir,filename(idol,kind,entry.id,entry.mime,variant));
 const url=(idol,kind,entry,variant='display')=>'/api/idol-gallery/'+idol+'/'+kind+'/'+entry.id+
   (variant==='original'?'/original':'')+'?v='+encodeURIComponent(entry.updatedAt||'1');
 for(const member of members){
  const item=record(member.id),legacy=db.idolProfiles?.[member.id];
  if(item.legacyMigrated)continue;
  item.legacyMigrated=true;
  if(legacy?.photoFile&&!item.gallery.length&&MIME[legacy.photoMime]){
   try{
    const bytes=fs.readFileSync(path.join(dataDir,'idol-portraits',legacy.photoFile));
    if(bytes.length<=MAX_BYTES){
     const entry={id:crypto.randomUUID(),mime:legacy.photoMime,updatedAt:now()};
     fs.writeFileSync(disk(member.id,'gallery',entry),bytes,{mode:0o600});
     item.gallery.push(entry);
    }
   }catch(err){console.warn('USA50 idol portrait migration:',err.message);}
  }
  save();
 }
 function one(id){
  const member=allowed.get(id);if(!member)return null;
  const item=record(id);
  const mapped=kind=>(item[kind]||[]).map((entry,index)=>({
   id:entry.id,url:url(id,kind,entry),originalUrl:url(id,kind,entry,'original'),
   order:index,updatedAt:entry.updatedAt
  }));
  const gallery=mapped('gallery'),circleGallery=mapped('circle');
  return {gallery,circleGallery,circlePhotoUrl:circleGallery[0]?.url||null,
   mainPhotoUrl:gallery[0]?.url||null};
 }
 function info(){return Object.fromEntries(members.map(m=>[m.id,one(m.id)]));}
 function authorize(req,res,id){
  const user=userFrom(req);
  if(!user){fail(res,401,'Sign in to edit gallery photos.');return false;}
  if(user.mustChangePassword||!(user.role==='admin'||user.role==='idol'&&user.idolId===id)){
   fail(res,403,'Only this idol or management may edit their photos.');return false;
  }
  return true;
 }
 function serve(req,res,id,kind,itemId,variant){
  const member=allowed.get(id),validKind=Object.hasOwn(MAX,kind),validId=UUID.test(itemId||'');
  if(!member||!validKind||!validId)return fail(res,404,'Photo not found.');
  const entry=record(id)[kind].find(x=>x.id===itemId);
  if(!entry)return fail(res,404,'Photo not found.');
  const orig=kind==='gallery'||variant==='original';
  const file=disk(id,kind,entry,orig?'original':'crop');
  fs.readFile(file,(err,buf)=>{
   if(err)return fail(res,404,'Photo unavailable.');
   res.writeHead(200,{'Content-Type':orig?entry.mime:'image/jpeg','Content-Length':buf.length,
    'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD')return res.end();
   res.end(buf);
  });
 }
 function update(req,res,data){
  const idolId=String(data?.idolId||''),kind=String(data?.kind||'');
  if(!allowed.has(idolId)||!Object.hasOwn(MAX,kind))return fail(res,404,'Unknown member or photo gallery.');
  if(!authorize(req,res,idolId))return;
  const state=record(idolId),items=state[kind],action=data.action;
  if(action==='reorder'){
   const ids=data.ids;
   if(!Array.isArray(ids)||ids.length!==items.length||new Set(ids).size!==ids.length||
    ids.some(x=>!items.some(entry=>entry.id===x)))return fail(res,400,'Provide the complete, unique photo order.');
   state[kind]=ids.map(id=>items.find(entry=>entry.id===id));
   save();return json(res,200,{ok:true,profile:one(idolId)});
  }
  const entry=items.find(e=>e.id===data.id);
  if(action==='delete'){
   if(!entry)return fail(res,404,'Photo not found.');
   state[kind]=items.filter(e=>e.id!==entry.id);
   for(const variant of kind==='circle'?['original','crop']:['original']){
    try{fs.unlinkSync(disk(idolId,kind,entry,variant));}catch{}
   }
   save();return json(res,200,{ok:true,profile:one(idolId)});
  }
  if(action==='crop'){
   if(kind!=='circle'||!entry)return fail(res,404,'Circle photo not found.');
   const crop=decode(data.cropDataUrl,true);
   if(!crop)return fail(res,400,'The cropped circle photo must be a valid JPEG under 1.5 MB.');
   try{fs.writeFileSync(disk(idolId,kind,entry,'crop'),crop.buffer,{mode:0o600});}
   catch{return fail(res,500,'Unable to save circle crop.');}
   entry.updatedAt=now();save();
   return json(res,200,{ok:true,profile:one(idolId)});
  }
  if(action!=='upload'&&action!=='replace')return fail(res,400,'Unsupported photo action.');
  if(action==='replace'&&!entry)return fail(res,404,'Photo to replace not found.');
  if(action==='upload'&&items.length>=MAX[kind])return fail(res,400,'Maximum '+MAX[kind]+' photos in this gallery.');
  const original=decode(data.originalDataUrl),crop=kind==='circle'?decode(data.cropDataUrl,true):null;
  if(!original||(kind==='circle'&&!crop))return fail(res,400,'Upload a valid original photo and (for circles) its cropped JPEG.');
  const next=entry||{id:crypto.randomUUID(),mime:original.mime,updatedAt:now()};
  const previousMime=entry?.mime;
  const newEntry={...next,mime:original.mime,updatedAt:now()};
  try{
   fs.writeFileSync(disk(idolId,kind,newEntry),original.buffer,{mode:0o600});
   if(kind==='circle')fs.writeFileSync(disk(idolId,kind,newEntry,'crop'),crop.buffer,{mode:0o600});
  }catch{return fail(res,500,'Unable to store photo.');}
  if(previousMime&&previousMime!==newEntry.mime){
   try{fs.unlinkSync(disk(idolId,kind,{...newEntry,mime:previousMime}));}catch{}
  }
  if(entry)Object.assign(entry,newEntry);else items.push(newEntry);
  save();return json(res,200,{ok:true,profile:one(idolId)});
 }
 return {info,one,update,serve};
};