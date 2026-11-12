/**
 * USA50 Fan Club v0.1 — web-first Railway development server.
 * Node.js standard library only. JSON-file persistence is deliberately DEVELOPMENT-ONLY.
 * Set DATA_DIR to a Railway persistent volume mount; move to PostgreSQL before production.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'www');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.local-data');
const FILE = path.join(DATA_DIR, 'usa50-dev.json');
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const IS_PROD = process.env.NODE_ENV === 'production';
const RARITY_WEIGHTS = { R: 55, SR: 27, SSR: 12, MR: 5, UR: 1 };
const PACK_COST = 300;
const HARD_PITY = 30;
const PHYSICAL_COOLDOWN = 90 * 24 * 60 * 60 * 1000;
const ALBUM_ID = 'arielle-true-love';
const members = [
  { id: 'arielle', name: 'Arielle', team: 'NYC50', emoji: '🐰', color: '#b88ad7' },
  { id: 'jaylene', name: 'Jaylene', team: 'NYC50', emoji: '🦄', color: '#f0a5cc' },
  { id: 'kellie', name: 'Kellie', team: 'NYC50', emoji: '🍀', color: '#a2bfbd' },
  { id: 'z', name: 'Z', team: 'NYC50', emoji: '🪼', color: '#b5a0dc' },
  { id: 'michelle', name: 'Michelle', team: 'LA50', emoji: '✦', color: '#e0abaf' },
  { id: 'zoe', name: 'Zoe', team: 'LA50', emoji: '♡', color: '#afbee7' },
  { id: 'miu', name: 'Miu', team: 'LA50', emoji: '☆', color: '#b5b7d8' },
];
const cards = [
  ['tl-01','R','First Light'],['tl-02','R','Heart Check'],['tl-03','R','Studio Diary'],['tl-04','R','Blue Hour'],
  ['tl-05','R','Afterglow'],['tl-06','SR','Silver Ribbon'],['tl-07','SR','Secret Note'],['tl-08','SR','Side Stage'],
  ['tl-09','SSR','Sweetheart'],['tl-10','SSR','Mirror Kiss'],['tl-11','MR','Starlit'],['tl-12','UR','Eternity']
].map(([id,rarity,title],index)=>({id,rarity,title,index:index+1,member:'Arielle',albumId:ALBUM_ID}));
const albums = [{id:ALBUM_ID,title:'True Love',member:'Arielle',team:'NYC50',count:12,available:true},
 {id:'nyc50-debut',title:'NYC50 Debut',member:'NYC50',team:'NYC50',count:20,available:false},
 {id:'la50-debut',title:'LA50 Debut',member:'LA50',team:'LA50',count:15,available:false}];

fs.mkdirSync(DATA_DIR,{recursive:true});
function initialDb(){return {version:1,users:{},posts:[{id:'official-welcome',authorId:null,authorName:'USA50 Official',text:'Welcome to the USA50 Fan Club development preview! Explore the collection, discover upcoming features, and share your fan edits through Instagram or TikTok.',url:null,createdAt:new Date().toISOString(),likedBy:[],official:true}],fansites:[],fansiteVotes:{},tradeListings:[],reports:[],announcements:[{id:'welcome',title:'Welcome to USA50',body:'This is a development preview. Photos, events, STARS, and orders are demonstration content — no real purchases or bookings.',createdAt:new Date().toISOString()}],events:[{id:'demo-event-1',title:'USA50 Digital Fan Welcome',category:'Online',date:'TBA',location:'Online · Concept event',description:'Demonstration event listing for the first build.'},{id:'demo-event-2',title:'Fancall Experiences',category:'Fancall',date:'TBA',location:'Online · Coming later',description:'An application experience will be added after compliance review.'}]};}
let db;
try { db=JSON.parse(fs.readFileSync(FILE,'utf8')); } catch { db=initialDb(); save(); }
function save(){let temp=FILE+'.tmp';fs.writeFileSync(temp,JSON.stringify(db,null,2));fs.renameSync(temp,FILE);}
function id(){return crypto.randomUUID();}
function hashPass(password,salt=crypto.randomBytes(16).toString('hex')){return salt+':'+crypto.scryptSync(password,salt,64).toString('hex');}
function checkPass(password,hash){let [salt,digest]=String(hash||'').split(':');if(!salt||!digest)return false;let a=Buffer.from(digest,'hex'),b=crypto.scryptSync(password,salt,64);return a.length===b.length && crypto.timingSafeEqual(a,b);}
function sign(payload){const b=Buffer.from(JSON.stringify(payload)).toString('base64url');return b+'.'+crypto.createHmac('sha256',SECRET).update(b).digest('base64url');}
function verify(token){if(!token||typeof token!=='string')return null;let [b,s]=token.split('.');if(!b||!s)return null;let expect=crypto.createHmac('sha256',SECRET).update(b).digest('base64url');if(s.length!==expect.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expect)))return null;try{let obj=JSON.parse(Buffer.from(b,'base64url').toString());return obj.exp>Date.now()?obj:null;}catch{return null;}}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split('=')).filter(p=>p.length===2));}
function userFrom(req){const auth=String(req.headers.authorization||'');let token=auth.startsWith('Bearer ')?auth.slice(7):cookies(req).usa50_session;let payload=verify(token);const u=payload?.uid&&db.users[payload.uid];return u && (payload.sv||0)===(u.sessionVersion||0)?u:null;}
function adminFrom(req){let token=cookies(req).usa50_admin;return verify(token)?.admin===true;}
function cookie(name,value,req,maxAge=2592000){let secure=String(req.headers['x-forwarded-proto']||'').includes('https')||!!req.socket.encrypted;return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`+(secure?'; Secure':'');}
function cleanUser(user){const {passwordHash,...rest}=user;return rest;}
function bodyText(str,max=500){return String(str||'').trim().slice(0,max);}
function validSocialUrl(input){if(!input)return null;try{let u=new URL(input);if(u.protocol!=='https:')return null;let host=u.hostname.toLowerCase();if(['instagram.com','www.instagram.com','tiktok.com','www.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(host))return u.toString();}catch{}return null;}
function json(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj));}
function fail(res,status,message){return json(res,status,{error:message});}
function auth(req,res){let u=userFrom(req);if(!u){fail(res,401,'Please sign in to continue.');return null;}return u;}
function ownCard(u,cardId){return Number(u.state.owned[cardId]||0);}
function complete(u){return cards.every(c=>ownCard(u,c.id)>0);}
function availableToList(u,cardId){let reserved=db.tradeListings.filter(t=>t.ownerId===u.id&&t.cardId===cardId).length;return Math.max(0,ownCard(u,cardId)-1-reserved);}
function cardForRarity(r){let pool=cards.filter(c=>c.rarity===r);return pool[crypto.randomInt(pool.length)];}
function drawRarity(){let n=crypto.randomInt(100),total=0;for(let [r,p] of Object.entries(RARITY_WEIGHTS)){total+=p;if(n<total)return r;}return 'R';}
function now(){return new Date().toISOString();}
function getProfileState(){return {stars:9000,pullPoints:300,fancallTickets:0,paidPulls:0,pityAchieved:false,owned:{'tl-01':2,'tl-02':1,'tl-06':1},physicalOrders:[],freePhysicalUsed:false,subscriberPreview:false,likedPosts:[],favoriteMembers:['arielle'],fansiteApplicationId:null,demoClaimCode:'USA50-DEMO-'+crypto.randomBytes(4).toString('hex').toUpperCase(),demoClaimed:false,dailyClaimed:{}};}
function resolveUser(id){let u=db.users[id];return u?u.displayName:'Fan';}
function publicState(u){return {me:u?cleanUser(u):null,members,cards,albums:cardStudio.publicAlbums(),packCards:cardStudio.publicCardsByPack(),rarities:RARITY_WEIGHTS,packCost:PACK_COST,hardPity:HARD_PITY,cooldownDays:90,posts:db.posts.slice().reverse().map(p=>({...p,likedCount:p.likedBy.length,likedBy:undefined,liked:u? p.likedBy.includes(u.id):false})),fansites:db.fansites.filter(f=>f.status==='approved').map(f=>({id:f.id,name:f.name,portfolioUrl:f.portfolioUrl,instagram:f.instagram,tiktok:f.tiktok,description:f.description,votes:Object.values(db.fansiteVotes).filter(id=>id===f.id).length})).sort((a,b)=>b.votes-a.votes),tradeListings:db.tradeListings.map(t=>({...t,ownerName:resolveUser(t.ownerId)})),announcements:db.announcements.slice().reverse(),events:db.events};}
const roleFeatures=require('./role-features.js')({db,save,id,hashPass,checkPass,userFrom,adminFrom,bodyText,now,json,fail});
const socialHub=require('./social-hub.js')({db,save,id,bodyText,now,json,fail,userFrom});
const cardStudio=require('./card-studio.js')({db,save,id,now,bodyText,json,fail,userFrom,dataDir:DATA_DIR,baseCards:cards,baseAlbums:albums,rarityWeights:RARITY_WEIGHTS,packCost:PACK_COST,hardPity:HARD_PITY,baseAlbumId:ALBUM_ID});
const hits=new Map();function rateLimit(req){let key=req.socket.remoteAddress+':auth',e=hits.get(key)||{at:Date.now(),n:0};if(Date.now()-e.at>60000)e={at:Date.now(),n:0};e.n++;hits.set(key,e);return e.n>12;}

async function api(req,res,url){
 const method=req.method;
 if(method==='GET'&&url.pathname.startsWith('/api/card-studio'))return cardStudio.handleGet(req,res,url.pathname);
 if(method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,service:'USA50 web-first development preview',persistence:process.env.DATA_DIR?'configured volume/local directory':'local directory (Railway ephemeral unless DATA_DIR points at volume)'});
 if(method==='GET'&&url.pathname==='/api/bootstrap'){const u=userFrom(req);return json(res,200,{...publicState(u),messaging:roleFeatures.info(u),social:socialHub.info(u)});}
 if(method==='GET'&&url.pathname==='/api/social/resolve'){const id=url.searchParams.get('postId')||'';if(id.length>128)return fail(res,400,'Invalid post ID.');const result=await socialHub.resolveEmbed(id);return result?json(res,200,result):fail(res,404,'Post not found.');}
 if(method==='GET'&&url.pathname==='/api/me')return json(res,200,{me:userFrom(req)?cleanUser(userFrom(req)):null});
 if(method==='GET'&&url.pathname==='/api/admin/overview'){
   const u=userFrom(req);
   if(!adminFrom(req)&&u?.role!=='admin')return fail(res,403,'Management login required.');
   if(u?.mustChangePassword)return fail(res,403,'Change your temporary password before using management tools.');
   return json(res,200,{fansiteApplications:db.fansites,posts:db.posts,reports:db.reports,users:Object.keys(db.users).length});
 }

 if(method!=='POST')return fail(res,404,'Unknown API endpoint');
 if(url.pathname==='/api/card-studio/upload' && (userFrom(req)?.role!=='admin'||userFrom(req)?.mustChangePassword))return fail(res,403,'Management login required.');
 const maxPostBytes=url.pathname==='/api/card-studio/upload'?7200000:50000;
 let raw='';try{for await (const chunk of req){raw+=chunk;if(raw.length>maxPostBytes)return fail(res,413,'Request is too large.');}}catch{return fail(res,400,'Unreadable request.');}
 let data;try{data=raw?JSON.parse(raw):{};}catch{return fail(res,400,'Invalid JSON.');}
 const ep=url.pathname;
 if(cardStudio.handlePost(req,res,ep,data))return;
 if(await roleFeatures.handle(req,res,ep,data))return;
 if(socialHub.handlePost(req,res,ep,data))return;
 if(ep==='/api/auth/register'){
   if(rateLimit(req))return fail(res,429,'Please try again shortly.');
   let email=bodyText(data.email,160).toLowerCase(),displayName=bodyText(data.displayName,36),password=String(data.password||'');
   if(!/^\S+@\S+\.\S+$/.test(email)||displayName.length<2||password.length<8||password.length>128)return fail(res,400,'Enter a valid email, display name (2+ letters), and password (8+ characters).');
   if(['amstrotherusa50@gmail.com','arielstrotherb@gmail.com'].includes(email))return fail(res,403,'This email is reserved for an authorized USA50 account.');
   if(Object.values(db.users).some(u=>u.email===email))return fail(res,409,'Email already registered.');
   let u={id:id(),email,displayName,passwordHash:hashPass(password),createdAt:now(),state:getProfileState()};db.users[u.id]=u;save();
   let token=sign({uid:u.id,sv:u.sessionVersion||0,exp:Date.now()+30*86400000});return json(res,201,{me:cleanUser(u),token}, {'Set-Cookie':cookie('usa50_session',token,req)});
 }
 if(ep==='/api/auth/login'){
   if(rateLimit(req))return fail(res,429,'Please try again shortly.');
   let u=Object.values(db.users).find(u=>u.email===bodyText(data.email,160).toLowerCase());if(!u||!checkPass(String(data.password||''),u.passwordHash))return fail(res,401,'Invalid email or password.');
   let token=sign({uid:u.id,sv:u.sessionVersion||0,exp:Date.now()+30*86400000});return json(res,200,{me:cleanUser(u),token},{'Set-Cookie':cookie('usa50_session',token,req)});
 }
 if(ep==='/api/auth/logout')return json(res,200,{ok:true},{'Set-Cookie':cookie('usa50_session','',req,0)});
 if(ep==='/api/admin/login'){
   if(rateLimit(req))return fail(res,429,'Try again in a minute.');
   if(!ADMIN_PASSWORD)return fail(res,503,'Set ADMIN_PASSWORD in Railway to enable the admin dashboard.');
   let a=Buffer.from(String(data.password||'')),b=Buffer.from(ADMIN_PASSWORD);
   if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return fail(res,403,'Incorrect admin password.');
   return json(res,200,{ok:true},{'Set-Cookie':cookie('usa50_admin',sign({admin:true,exp:Date.now()+7*86400000}),req,604800)});
 }
 if(ep.startsWith('/api/admin/')){
   if(!adminFrom(req)&&userFrom(req)?.role!=='admin')return fail(res,403,'Admin login required.');
   if(userFrom(req)?.mustChangePassword)return fail(res,403,'Change your temporary password before using management tools.');
   if(ep==='/api/admin/overview')return json(res,200,{fansiteApplications:db.fansites,posts:db.posts,reports:db.reports,users:Object.keys(db.users).length});
   if(ep==='/api/admin/fansite-review'){
     let f=db.fansites.find(f=>f.id===data.id);if(!f)return fail(res,404,'Application not found.');
     if(!['approved','rejected'].includes(data.status))return fail(res,400,'Invalid status.');f.status=data.status;f.reviewedAt=now();save();return json(res,200,{ok:true});
   }
   if(ep==='/api/admin/announcement'){
     let title=bodyText(data.title,90),body=bodyText(data.body,600);if(!title||!body)return fail(res,400,'Title and message required.');
     db.announcements.push({id:id(),title,body,createdAt:now()});save();return json(res,200,{ok:true});
   }
   if(ep==='/api/admin/post-remove'){
     db.posts=db.posts.filter(p=>p.id!==data.postId||p.official);save();return json(res,200,{ok:true});
   }
   return fail(res,404,'Unknown admin endpoint');
 }
 let u=auth(req,res);if(!u)return;
 if(cardStudio.customPull(req,res,ep,data,u))return;
 if(ep==='/api/demo/refill'){
   u.state.stars=9000;save();return json(res,200,{ok:true,stars:u.state.stars});
 }
 if(ep==='/api/demo/subscriber-preview'){
   u.state.subscriberPreview=!!data.enabled;save();return json(res,200,{ok:true});
 }
 function grantPullRewards(u, source='stars'){ if(source==='stars'){ if(u.state.stars<PACK_COST)return {error:'Not enough demo STARS. Refill your test balance in My Page.'}; u.state.stars-=PACK_COST; u.state.paidPulls++; } else { if((u.state.pullPoints||0)<PACK_COST)return {error:'Not enough Pull Points for a free pull.'}; u.state.pullPoints-=PACK_COST; } let rarity=drawRarity(),c=cardForRarity(rarity); u.state.owned[c.id]=(u.state.owned[c.id]||0)+1; u.state.fancallTickets=(u.state.fancallTickets||0)+2; u.state.pullPoints=(u.state.pullPoints||0)+100; let guaranteed=[]; if(source==='stars' && u.state.paidPulls===HARD_PITY && !u.state.pityAchieved){ for(let x of cards)if(!ownCard(u,x.id)){u.state.owned[x.id]=1;guaranteed.push(x.id);} u.state.pityAchieved=true; } save(); return {card:c,guaranteed,stars:u.state.stars,pullPoints:u.state.pullPoints,fancallTickets:u.state.fancallTickets,fancallTicketsAwarded:2,pullPointsAwarded:100,paidPulls:u.state.paidPulls,albumComplete:complete(u),pityAchieved:u.state.pityAchieved}; }
 if(ep==='/api/cards/pull10'){
   if(u.state.stars<PACK_COST*10)return fail(res,400,'You need 3,000 demo STARS for ten pulls.');
   const pulled=[];let guaranteed=[];
   for(let i=0;i<10;i++){
     u.state.stars-=PACK_COST;u.state.paidPulls++;
     const card=cardForRarity(drawRarity());u.state.owned[card.id]=(u.state.owned[card.id]||0)+1;pulled.push(card);
     if(u.state.paidPulls===HARD_PITY&&!u.state.pityAchieved){for(const missing of cards){if(!ownCard(u,missing.id)){u.state.owned[missing.id]=1;guaranteed.push(missing.id);}}u.state.pityAchieved=true;}
   }
   u.state.fancallTickets=(u.state.fancallTickets||0)+20;
   u.state.pullPoints=(u.state.pullPoints||0)+1000;
   save();return json(res,200,{card:pulled[0],cards:pulled,guaranteed,stars:u.state.stars,paidPulls:u.state.paidPulls,fancallTickets:u.state.fancallTickets,pullPoints:u.state.pullPoints,fancallTicketsAwarded:20,pullPointsAwarded:1000,albumComplete:complete(u),pityAchieved:u.state.pityAchieved});
 }
 if(ep==='/api/cards/pull'){ const result=grantPullRewards(u,'stars'); if(result.error)return fail(res,400,result.error); return json(res,200,result); }
 if(ep==='/api/cards/pull-points'){ const result=grantPullRewards(u,'points'); if(result.error)return fail(res,400,result.error); return json(res,200,result); }
 if(ep==='/api/daily/claim'){ let task=bodyText(data.task,40)||'task'; if(!['checkin','share','message'].includes(task))return fail(res,400,'Invalid daily task.'); let today=new Date().toISOString().slice(0,10); if(!u.state.dailyClaimed)u.state.dailyClaimed={}; if(u.state.dailyClaimed[task]===today)return fail(res,400,'Task already claimed today.'); u.state.dailyClaimed[task]=today; u.state.pullPoints=(u.state.pullPoints||0)+100; save(); return json(res,200,{ok:true,pullPoints:u.state.pullPoints,pullPointsAwarded:100}); }
 if(ep==='/api/cards/redeem'){
   if(u.state.demoClaimed||bodyText(data.code,40)!==u.state.demoClaimCode)return fail(res,400,'Code is invalid or has already been redeemed.');
   u.state.demoClaimed=true;for(let c of ['tl-07','tl-09'])u.state.owned[c]=(u.state.owned[c]||0)+1;
   save();return json(res,200,{ok:true,awarded:['tl-07','tl-09']});
 }
 if(ep==='/api/cards/physical-order-preview'){
   if(!complete(u))return fail(res,400,'Complete all unique cards before ordering the physical set.');
   const last=u.state.physicalOrders.at(-1);
   if(last&&Date.now()-Date.parse(last.date)<PHYSICAL_COOLDOWN)return fail(res,400,'Reorders are locked for 90 days after the previous order.');
   const free=u.state.pityAchieved&&!u.state.freePhysicalUsed;
   u.state.physicalOrders.push({id:id(),date:now(),kind:free?'free-reward-preview':'paid-order-preview',status:'demo-only'});
   if(free)u.state.freePhysicalUsed=true;save();return json(res,200,{ok:true,free,preview:true});
 }
 if(ep==='/api/trades/create'){
   let c=cards.find(c=>c.id===data.cardId);if(!c)return fail(res,400,'Unknown card.');
   if(availableToList(u,c.id)<1)return fail(res,400,'You may only list extra duplicate copies. Your last copy stays protected.');
   let listing={id:id(),ownerId:u.id,cardId:c.id,createdAt:now()};db.tradeListings.push(listing);save();return json(res,200,{listing});
 }
 if(ep==='/api/trades/cancel'){
   let n=db.tradeListings.length;db.tradeListings=db.tradeListings.filter(t=>!(t.id===data.id&&t.ownerId===u.id));if(db.tradeListings.length===n)return fail(res,404,'Listing not found.');save();return json(res,200,{ok:true});
 }
 if(ep==='/api/trades/accept'){
   let t=db.tradeListings.find(t=>t.id===data.id),offer=cards.find(c=>c.id===data.offerCardId);
   if(!t||!offer)return fail(res,400,'Listing or offer card not found.');
   if(t.ownerId===u.id)return fail(res,400,'Cannot trade with yourself.');
   let other=db.users[t.ownerId];if(!other||ownCard(other,t.cardId)<2||ownCard(u,offer.id)<2)return fail(res,400,'Both fans must retain at least one copy of their offered cards.');
   // Guard against a card being committed to another live listing.
   if(availableToList(u,offer.id)<1)return fail(res,400,'You do not have a free duplicate available to offer.');
   other.state.owned[t.cardId]--;u.state.owned[t.cardId]=(u.state.owned[t.cardId]||0)+1;
   u.state.owned[offer.id]--;other.state.owned[offer.id]=(other.state.owned[offer.id]||0)+1;
   db.tradeListings=db.tradeListings.filter(x=>x.id!==t.id);
   // Cancel other listings that became invalid after the transfer.
   for(let usr of [u,other]){
     for(let c of cards){let listings=db.tradeListings.filter(x=>x.ownerId===usr.id&&x.cardId===c.id);while(listings.length>Math.max(0,ownCard(usr,c.id)-1)){let doomed=listings.pop();db.tradeListings=db.tradeListings.filter(x=>x.id!==doomed.id);}}
   }
   save();return json(res,200,{ok:true,received:t.cardId,sent:offer.id});
 }
 if(ep==='/api/posts/create'){
   let text=bodyText(data.text,650),link=validSocialUrl(data.url);
   if(!text)return fail(res,400,'Write something about your fan content.');
   if(data.url&&!link)return fail(res,400,'Only HTTPS Instagram or TikTok links are supported in this first build.');
   let p={id:id(),authorId:u.id,authorName:u.displayName,text,url:link,createdAt:now(),likedBy:[],official:false};db.posts.push(p);save();return json(res,201,{ok:true,post:p});
 }
 if(ep==='/api/posts/like'){
   let p=db.posts.find(x=>x.id===data.id);if(!p)return fail(res,404,'Post not found.');
   p.likedBy=p.likedBy.filter(id=>id!==u.id);if(data.liked)p.likedBy.push(u.id);save();return json(res,200,{ok:true});
 }
 if(ep==='/api/posts/report'){
   if(!db.posts.some(p=>p.id===data.id))return fail(res,404,'Post not found.');
   if(!db.reports.some(x=>x.postId===data.id&&x.by===u.id))db.reports.push({id:id(),postId:data.id,by:u.id,reason:bodyText(data.reason,140)||'Reported',createdAt:now()});save();return json(res,200,{ok:true});
 }
 if(ep==='/api/fansites/apply'){
   if(db.fansites.some(x=>x.userId===u.id))return fail(res,409,'An application already exists for this account.');
   let name=bodyText(data.name,64),camera=bodyText(data.camera,170),portfolioUrl=validSocialUrl(data.portfolioUrl),instagram=validSocialUrl(data.instagram),tiktok=validSocialUrl(data.tiktok),description=bodyText(data.description,650);
   if(name.length<3||camera.length<8||!portfolioUrl||description.length<30)return fail(res,400,'Provide a fansite name, your camera/lens equipment, an Instagram/TikTok portfolio, and a description (30+ characters).');
   let f={id:id(),userId:u.id,name,camera,portfolioUrl,instagram,tiktok,description,status:'pending',createdAt:now()};db.fansites.push(f);u.state.fansiteApplicationId=f.id;save();return json(res,201,{ok:true,status:'pending'});
 }
 if(ep==='/api/fansites/vote'){
   let f=db.fansites.find(x=>x.id===data.id&&x.status==='approved');if(!f)return fail(res,404,'Approved fansite not found.');
   db.fansiteVotes[u.id]=f.id;save();return json(res,200,{ok:true});
 }
 return fail(res,404,'Unknown API endpoint');
}

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.ico':'image/x-icon','.json':'application/json','.webmanifest':'application/manifest+json'};
function serve(req,res,url){
 let requestPath;try{requestPath=decodeURIComponent(url.pathname);}catch{return fail(res,400,'Invalid request path');}
 if(requestPath==='/'||!path.extname(requestPath))requestPath='/index.html';
 const full=path.resolve(ROOT,'.'+requestPath);
 if(!full.startsWith(ROOT+path.sep))return fail(res,403,'Forbidden');
 if(path.extname(full)==='.mp4'){
    fs.stat(full,(err,stat)=>{
      if(err||!stat.isFile())return fail(res,404,'Video not found');
      const size=stat.size;
      const range=String(req.headers.range||'');
      let start=0,end=size-1,status=200;
      if(range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!m)return res.writeHead(416,{'Content-Range':'bytes */'+size}).end();
        start=m[1]?Number(m[1]):0;
        end=m[2]?Number(m[2]):size-1;
        if(!m[1]&&m[2]){start=Math.max(0,size-Number(m[2]));end=size-1;}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return res.writeHead(416,{'Content-Range':'bytes */'+size}).end();
        end=Math.min(end,size-1);status=206;
      }
      const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'};
      if(status===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
      res.writeHead(status,headers);
      if(req.method==='HEAD')return res.end();
      fs.createReadStream(full,{start,end}).pipe(res);
    });return;
  }

 fs.readFile(full,(err,bytes)=>{if(err)return fail(res,404,'Not found');res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':full.endsWith('index.html')?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' https://www.instagram.com; frame-src https://www.tiktok.com https://www.instagram.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(bytes);});
}
const server=http.createServer((req,res)=>{
 const origin=req.headers.origin;
 const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(origin&&(allowed.includes(origin)||['capacitor://localhost','http://localhost'].includes(origin))){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Vary','Origin');}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 let url;try{url=new URL(req.url,'http://localhost');}catch{return fail(res,400,'Invalid URL');}
 if(url.pathname.startsWith('/api/'))api(req,res,url).catch(err=>{console.error('API error',err);if(!res.headersSent)fail(res,500,'Server error');});
 else if(req.method==='GET'||req.method==='HEAD')serve(req,res,url);
 else fail(res,405,'Method not allowed');
});
server.listen(PORT,'0.0.0.0',()=>console.log(`USA50 Fan Club dev listening on http://0.0.0.0:${PORT}`));
