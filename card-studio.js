'use strict';
/* USA50 Card Studio — server-only catalogue, draft publishing and scoped artwork.
 * Development persistence uses the existing Railway /data volume.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FACE={width:660,height:1020,printWidthMm:55,printHeightMm:85};
const RARITIES=['R','SR','SSR','MR','UR'];
const BORDERS=['none',...RARITIES];
const STATES=['draft','scheduled','published','preview'];
const MAX_CARDS=50,MAX_IMAGE_BYTES=1700000;
module.exports=function createCardStudio({db,save,id,now,bodyText,json,fail,userFrom,dataDir,baseCards,baseAlbums,rarityWeights,packCost,hardPity,baseAlbumId}){
  const artworkDir=path.join(dataDir,'card-studio-art');
  fs.mkdirSync(artworkDir,{recursive:true});
  const studio=db.cardStudio||(db.cardStudio={packs:[],media:{},audit:[]});
  studio.packs||=[];studio.media||={};studio.audit||=[];
  if(!studio.packs.length){
    studio.packs.push({
      id:baseAlbumId,title:'True Love',member:'Arielle',team:'NYC50',subgroup:'NYC50',
      description:'Arielle · Sweet & Sour collector cards',releaseAt:null,status:'published',
      isTest:false,createdAt:now(),updatedAt:now(),
      cards:baseCards.map(c=>({...c,border:c.rarity,artId:null,legacy:true}))
    });
    for(const p of baseAlbums.filter(a=>a.id!==baseAlbumId)){
      studio.packs.push({id:p.id,title:p.title,member:p.member,team:p.team,subgroup:p.team,
        description:'Planned USA50 collection',releaseAt:null,status:'preview',isTest:true,
        createdAt:now(),updatedAt:now(),cards:[]});
    }
    save();
  }
  function effective(pack,at=Date.now()){
    if(pack.status==='published')return true;
    return pack.status==='scheduled' && Number.isFinite(Date.parse(pack.releaseAt||'')) && Date.parse(pack.releaseAt)<=at && ready(pack);
  }
  function validCard(c,allowLegacy=false){
    return !!c && !!String(c.title||'').trim() && RARITIES.includes(c.rarity) &&
      BORDERS.includes(c.border) && (!!studio.media[c.artId] || (allowLegacy&&c.legacy===true));
  }
  function ready(p){return Array.isArray(p.cards)&&p.cards.length>0&&p.cards.every(c=>validCard(c,p.id===baseAlbumId));}
  function cardPublic(c,p,i){
    return {id:c.id,albumId:p.id,rarity:c.rarity,border:c.border||c.rarity,
      title:c.title,index:i+1,member:p.member,team:p.team,
      artUrl:c.artId?'/api/card-studio/art/'+c.artId:null};
  }
  function rarityOdds(pack){
    const choices=RARITIES.filter(r=>pack.cards.some(c=>c.rarity===r));
    const total=choices.reduce((acc,r)=>acc+(rarityWeights[r]||0),0)||1;
    return Object.fromEntries(RARITIES.map(r=>[r,choices.includes(r)?Math.round(rarityWeights[r]*10000/total)/100:0]));
  }
  function publicAlbums(){
    return studio.packs.filter(p=>p.status!=='draft').map(p=>({
      id:p.id,title:p.title,member:p.member,team:p.team,subgroup:p.subgroup,
      count:p.cards.length,available:effective(p),odds:rarityOdds(p),releaseAt:p.releaseAt||null,
      isTest:Boolean(p.isTest)
    }));
  }
  function publicCardsByPack(){
    const result={};
    for(const p of studio.packs.filter(effective))result[p.id]=p.cards.map((c,i)=>cardPublic(c,p,i));
    return result;
  }
  function syncBaseCards(){
    const p=studio.packs.find(p=>p.id===baseAlbumId);
    if(!p||!effective(p))return;
    baseCards.splice(0,baseCards.length,...p.cards.map((c,i)=>cardPublic(c,p,i)));
  }
  syncBaseCards();
  function statusOverview(){
    return studio.packs.map(p=>({...p,cards:p.cards.map(c=>({...c,artUrl:c.artId?'/api/card-studio/art/'+c.artId:null})),
      effectiveStatus:effective(p)?'published':p.status,ready:ready(p),cardCount:p.cards.length}));
  }
  function isAdmin(req){const u=userFrom(req);return !!(u?.role==='admin'&&!u.mustChangePassword);}
  function deny(res){return fail(res,403,'Management account required. Change your temporary password before using Card Studio.');}
  function log(action,packId,uid){studio.audit.push({at:now(),action,packId,by:uid});studio.audit=studio.audit.slice(-250);}
  function upload(data,req,res){
    const match=/^data:image\/(webp|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(data.dataUrl||''));
    if(!match)return fail(res,400,'Export the image from Card Studio as WebP or PNG.');
    const buf=Buffer.from(match[2],'base64');
    if(!buf.length||buf.length>MAX_IMAGE_BYTES)return fail(res,413,'Processed artwork must be under 1.7 MB.');
    let width=0,height=0;
    if(match[1]==='webp'){
      if(buf.length<30||buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WEBP')return fail(res,400,'Invalid WebP image.');
      const type=buf.toString('ascii',12,16);
      if(type==='VP8X'){width=1+buf.readUIntLE(24,3);height=1+buf.readUIntLE(27,3);}
      else if(type==='VP8 ' && buf.length>=30 && buf[23]===0x9d && buf[24]===0x01 && buf[25]===0x2a){width=buf.readUInt16LE(26)&0x3fff;height=buf.readUInt16LE(28)&0x3fff;}
      else if(type==='VP8L'&&buf[20]===0x2f){const bits=buf.readUInt32LE(21);width=1+(bits&0x3fff);height=1+((bits>>>14)&0x3fff);}
      else return fail(res,400,'Unsupported WebP encoding.');
    } else {
      if(buf.length<24||buf.toString('hex',0,8)!=='89504e470d0a1a0a'||buf.toString('ascii',12,16)!=='IHDR')return fail(res,400,'Invalid PNG image.');
      width=buf.readUInt32BE(16);height=buf.readUInt32BE(20);
    }
    if(width!==FACE.width||height!==FACE.height)return fail(res,400,'Artwork must be exactly 660 × 1020 px. Crop and export using Card Studio.');
    const artId=id(),ext=match[1];
    const filename=artId+'.'+ext;
    fs.writeFileSync(path.join(artworkDir,filename),buf,{flag:'wx'});
    studio.media[artId]={id:artId,filename,mime:'image/'+ext,bytes:buf.length,createdAt:now(),by:userFrom(req).id};
    save();return json(res,201,{artId,url:'/api/card-studio/art/'+artId,face:FACE});
  }
  function savePack(data,req,res){
    const uid=userFrom(req).id;
    const existing=data.id?studio.packs.find(p=>p.id===data.id):null;
    if(data.id && !existing)return fail(res,404,'Pack not found.');
    const title=bodyText(data.title,80),member=bodyText(data.member,60),
      team=bodyText(data.team,40),subgroup=bodyText(data.subgroup,50)||team,
      description=bodyText(data.description,240);
    if(!title||!member||!team)return fail(res,400,'Pack name, member and subgroup/team are required.');
    const status=String(data.status||'draft');
    if(!['draft','scheduled','published'].includes(status))return fail(res,400,'Choose Draft, Scheduled or Published.');
    const releaseAt=data.releaseAt?String(data.releaseAt):null;
    if(releaseAt&&(!Number.isFinite(Date.parse(releaseAt)) || !/^\d{4}-\d\d-\d\dT/.test(releaseAt)))return fail(res,400,'Invalid release date.');
    if(status==='scheduled' && (!releaseAt || Date.parse(releaseAt)<=Date.now()))return fail(res,400,'Scheduled packs need a future release date.');
    const incoming=data.cards;
    if(!Array.isArray(incoming)||incoming.length>MAX_CARDS)return fail(res,400,'A pack supports up to 50 cards.');
    const previous=new Map(existing?.cards.map(c=>[c.id,c])||[]);
    const seen=new Set(),cards=[];
    for(let i=0;i<incoming.length;i++){
      const draft=incoming[i]||{},previousCard=previous.get(draft.id);
      const title=bodyText(draft.title,80);
      if(!title)return fail(res,400,'Every card needs a title (card '+(i+1)+').');
      if(!RARITIES.includes(draft.rarity))return fail(res,400,'Select a valid card rarity.');
      const border=String(draft.border||'none');
      if(!BORDERS.includes(border))return fail(res,400,'Unknown border selection.');
      const artId=String(draft.artId||'');
      if(artId && !studio.media[artId])return fail(res,400,'One of the uploaded card images is missing.');
      const cardId=previousCard?.id||id();
      if(seen.has(cardId))return fail(res,400,'Duplicate card ID.');seen.add(cardId);
      cards.push({id:cardId,rarity:draft.rarity,border,title,artId:artId||null,
        legacy:Boolean(previousCard?.legacy && !artId && existing?.id===baseAlbumId)});
    }
    const p={
      id:existing?.id||id(),title,member,team,subgroup,description,status,releaseAt,
      isTest:existing?Boolean(existing.isTest):Boolean(data.isTest),
      createdAt:existing?.createdAt||now(),updatedAt:now(),cards
    };
    if(status!=='draft' && !ready(p))return fail(res,400,'To schedule or publish, every card needs artwork, a title, rarity and border selection.');
    if(existing)Object.assign(existing,p);else studio.packs.push(p);
    log(existing?'edit':'create',p.id,uid);save();syncBaseCards();
    return json(res,200,{ok:true,pack:{...p,effectiveStatus:effective(p)?'published':p.status,ready:ready(p)}});
  }
  function removePack(data,req,res){
    const p=studio.packs.find(p=>p.id===String(data.id||''));
    if(!p)return fail(res,404,'Pack not found.');
    if(!p.isTest)return fail(res,403,'Only test packs may be deleted. Official packs can be moved to Draft.');
    if(data.confirm!=='DELETE')return fail(res,400,'Type DELETE to confirm deleting the entire test pack.');
    const cardIds=new Set(p.cards.map(c=>c.id));
    // This is the development environment: remove obsolete demo inventory and listings.
    for(const user of Object.values(db.users))if(user.state?.owned)for(const key of cardIds)delete user.state.owned[key];
    db.tradeListings=(db.tradeListings||[]).filter(t=>!cardIds.has(t.cardId));
    studio.packs=studio.packs.filter(pack=>pack.id!==p.id);
    log('delete-test',p.id,userFrom(req).id);save();syncBaseCards();
    return json(res,200,{ok:true,deleted:p.id});
  }
  function readArt(req,res,artId){
    if(!/^[0-9a-f-]{36}$/i.test(artId))return fail(res,404,'Artwork not found.');
    const meta=studio.media[artId];
    if(!meta)return fail(res,404,'Artwork not found.');
    const published=studio.packs.some(p=>effective(p)&&p.cards.some(c=>c.artId===artId));
    if(!isAdmin(req)&&!published)return fail(res,403,'Artwork is not published.');
    const full=path.join(artworkDir,meta.filename);
    return fs.readFile(full,(err,buf)=>{
      if(err)return fail(res,404,'Artwork unavailable.');
      res.writeHead(200,{'Content-Type':meta.mime,'Content-Length':buf.length,
        'Cache-Control':published?'public,max-age=600':'private,no-store','X-Content-Type-Options':'nosniff'});
      res.end(buf);
    });
  }
  function draw(cards){
    const available=RARITIES.filter(r=>cards.some(c=>c.rarity===r));
    const total=available.reduce((n,r)=>n+(rarityWeights[r]||0),0);
    let roll=crypto.randomInt(total||1),rarity=available[0];
    for(const r of available){roll-=rarityWeights[r]||0;if(roll<0){rarity=r;break;}}
    const pool=cards.filter(c=>c.rarity===rarity);
    return pool[crypto.randomInt(pool.length)];
  }
  function customPull(req,res,endpoint,data,u){
    if(!['/api/cards/pull','/api/cards/pull-points','/api/cards/pull10'].includes(endpoint))return false;
    const packId=String(data.albumId||baseAlbumId);
    if(packId===baseAlbumId){
      const base=studio.packs.find(x=>x.id===baseAlbumId);
      if(!base||!effective(base))return fail(res,403,'This pack is currently unpublished.'),true;
      return false;
    }
    const p=studio.packs.find(x=>x.id===packId);
    if(!p||!effective(p)||!ready(p))return fail(res,400,'This collection is not released for pulling.'),true;
    if(u.role==='admin'||u.role==='idol')return fail(res,403,'Only fan accounts can pull packs.'),true;
    const count=endpoint==='/api/cards/pull10'?10:1;
    const free=endpoint==='/api/cards/pull-points';
    const cost=count*packCost;
    if(free?(u.state.pullPoints||0)<cost:(u.state.stars||0)<cost)return fail(res,400,'Insufficient demo '+(free?'Pull Points':'STARS')+'.'),true;
    if(free)u.state.pullPoints-=cost;else u.state.stars-=cost;
    const progress=u.state.packProgress||(u.state.packProgress={});
    const counter=progress[packId]||(progress[packId]={paidPulls:0,pityAchieved:false});
    const pulled=[],guaranteed=[];
    const publicCards=p.cards.map((c,i)=>cardPublic(c,p,i));
    for(let i=0;i<count;i++){
      const card=draw(publicCards);pulled.push(card);
      u.state.owned[card.id]=(u.state.owned[card.id]||0)+1;
      if(!free){
        counter.paidPulls++;
        if(counter.paidPulls>=hardPity&&!counter.pityAchieved){
          for(const missing of publicCards)if(!u.state.owned[missing.id]){u.state.owned[missing.id]=1;guaranteed.push(missing.id);}
          counter.pityAchieved=true;
        }
      }
    }
    u.state.fancallTickets=(u.state.fancallTickets||0)+2*count;
    u.state.pullPoints=(u.state.pullPoints||0)+100*count;
    save();
    const complete=publicCards.every(c=>u.state.owned[c.id]>0);
    return json(res,200,{card:pulled[0],cards:pulled,guaranteed,
      stars:u.state.stars,pullPoints:u.state.pullPoints,fancallTickets:u.state.fancallTickets,
      fancallTicketsAwarded:2*count,pullPointsAwarded:100*count,paidPulls:counter.paidPulls,
      albumComplete:complete,pityAchieved:counter.pityAchieved,albumId:packId}),true;
  }
  function handlePost(req,res,endpoint,data){
    if(!endpoint.startsWith('/api/card-studio/'))return false;
    if(!isAdmin(req))return deny(res),true;
    if(endpoint==='/api/card-studio/upload')return upload(data,req,res),true;
    if(endpoint==='/api/card-studio/save')return savePack(data,req,res),true;
    if(endpoint==='/api/card-studio/delete')return removePack(data,req,res),true;
    return fail(res,404,'Unknown Card Studio action.'),true;
  }
  function handleGet(req,res,pathname){
    if(pathname==='/api/card-studio'){
      if(!isAdmin(req))return deny(res);
      return json(res,200,{face:FACE,rarities:RARITIES,borders:BORDERS,
        packs:statusOverview(),audit:studio.audit.slice(-40).reverse()});
    }
    if(pathname.startsWith('/api/card-studio/art/'))return readArt(req,res,pathname.slice('/api/card-studio/art/'.length));
    return fail(res,404,'Unknown Card Studio route.');
  }
  return {handlePost,handleGet,customPull,publicAlbums,publicCardsByPack,syncBaseCards,ready,studio};
};
