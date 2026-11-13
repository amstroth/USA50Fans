/* USA50 Official Channels — verified provider polling (no scraping).
 * Instagram requires an authorized Professional account's Graph token.
 * TikTok Display API requires the approved video.list scope; rotated
 * refresh tokens stay on the Railway persistent data volume.
 * Only provider-owned data, never arbitrary profile HTML, is imported.
 */
module.exports=function makeOfficialAutoSync({state,save,addOfficial,fetchThumb,now}){
 const IG_ID=()=>String(process.env.USA50_INSTAGRAM_USER_ID||'').trim();
 const IG_TOKEN=()=>String(process.env.USA50_INSTAGRAM_ACCESS_TOKEN||'').trim();
 const IG_HOST=()=>process.env.USA50_INSTAGRAM_GRAPH_HOST==='graph.instagram.com'?'graph.instagram.com':'graph.facebook.com';
 const TT_KEY=()=>String(process.env.USA50_TIKTOK_CLIENT_KEY||'').trim();
 const TT_SECRET=()=>String(process.env.USA50_TIKTOK_CLIENT_SECRET||'').trim();
 const TT_REFRESH=()=>String(process.env.USA50_TIKTOK_REFRESH_TOKEN||'').trim();
 const TT_ACCESS=()=>String(process.env.USA50_TIKTOK_ACCESS_TOKEN||'').trim();
 state.syncStatus||={instagram:{},tiktok:{}};
 state.tiktokAuth||={}; // server-side only; never return this object in info() or bootstrap.
 function configured(platform){
  return platform==='instagram'?Boolean(IG_ID()&&IG_TOKEN()):Boolean(
    TT_ACCESS()||(TT_KEY()&&TT_SECRET()&&(state.tiktokAuth.refreshToken||TT_REFRESH())));
 }
 function publicStatus(){
  const result={};
  for(const platform of ['instagram','tiktok']){
   const x=state.syncStatus[platform]||{};
   result[platform]={configured:configured(platform),lastSuccess:x.lastSuccess||null,
     lastChecked:x.lastChecked||null,lastError:x.lastError||null,
     lastImported:Number(x.lastImported||0)};
  }
  return result;
 }
 function status(platform,success,count,error){
  const record=state.syncStatus[platform]||(state.syncStatus[platform]={});
  record.lastChecked=now();
  record.lastImported=count;
  if(success){record.lastSuccess=record.lastChecked;record.lastError=null;}
  else record.lastError=String(error||'Provider request failed').slice(0,180);
  save();
 }
 async function jsonRequest(url,init={}){
  const response=await fetch(url,{...init,redirect:'error',
    signal:AbortSignal.timeout(14000)});
  // Provider error details can contain tokens or URLs; only expose the status.
  if(!response.ok)throw Error('Official provider returned HTTP '+response.status);
  const result=await response.json();
  if(!result||typeof result!=='object')throw Error('Provider returned invalid JSON');
  return result;
 }
 async function cacheCover(post,url){
  if(!post||!url)return;
  try{await fetchThumb(post,url);}catch(e){console.warn('USA50 verified cover fetch:',e.message);}
 }
 async function pollInstagram(){
  if(!configured('instagram'))return {configured:false,imported:0};
  let imported=0;
  try{
   if(!/^\d{5,30}$/.test(IG_ID()))throw Error('Instagram user ID must be numeric');
   const base='https://'+IG_HOST()+'/v27.0/'+IG_ID()+'/media';
   const fields='id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
   const url=base+'?fields='+encodeURIComponent(fields)+'&limit=25';
   const data=await jsonRequest(url,{headers:{Authorization:'Bearer '+IG_TOKEN(),Accept:'application/json'}});
   if(!Array.isArray(data.data))throw Error('Instagram media list was not returned; verify permissions and account ID');
   for(const media of data.data.slice(0,25).reverse()){
    const url=typeof media.permalink==='string'?media.permalink:'';
    if(!url||typeof media.id!=='string')continue;
    const caption=String(media.caption||'').trim();
    const title=caption.slice(0,170)||'USA50 Instagram '+(media.media_type==='VIDEO'?'video':'post');
    const post=addOfficial({url,title,caption:caption.slice(0,500),
      publishedAt:media.timestamp},false);
    if(!post)continue;
    imported++;
    await cacheCover(post,media.thumbnail_url||media.media_url);
   }
   status('instagram',true,imported);
   return {configured:true,imported};
  }catch(e){
   status('instagram',false,imported,e.message);
   console.warn('USA50 Instagram auto-sync:',e.message);
   return {configured:true,imported,error:e.message};
  }
 }
 async function refreshTikTok(){
  const prior=state.tiktokAuth||{};
  const refreshToken=prior.refreshToken||TT_REFRESH();
  if(!TT_KEY()||!TT_SECRET()||!refreshToken)throw Error('TikTok refresh requires an approved app client key, secret, and refresh token');
  const body=new URLSearchParams({client_key:TT_KEY(),client_secret:TT_SECRET(),
    grant_type:'refresh_token',refresh_token:refreshToken});
  const data=await jsonRequest('https://open.tiktokapis.com/v2/oauth/token/',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
  if(!data.access_token||!data.refresh_token)throw Error('TikTok could not refresh its authorized account');
  state.tiktokAuth={accessToken:data.access_token,refreshToken:data.refresh_token,
    expiresAt:Date.now()+Math.max(60,Number(data.expires_in||3600))*1000,
    openId:data.open_id||prior.openId||null};
  save();return data.access_token;
 }
 function tikTokToken(){
  const previous=state.tiktokAuth||{};
  const valid=previous.accessToken&&Number(previous.expiresAt)>Date.now()+15*60*1000;
  return valid?previous.accessToken:TT_ACCESS()||previous.accessToken||null;
 }
 async function pollTikTok(){
  if(!configured('tiktok'))return {configured:false,imported:0};
  let imported=0;
  try{
   let access=tikTokToken();
   if(!access||!TT_ACCESS()&&Number(state.tiktokAuth.expiresAt||0)<=Date.now()+15*60*1000)
     access=await refreshTikTok();
   const endpoint='https://open.tiktokapis.com/v2/video/list/?fields='+
     encodeURIComponent('id,title,video_description,create_time,cover_image_url,share_url');
   const request=()=>jsonRequest(endpoint,{method:'POST',headers:{Authorization:'Bearer '+access,
     'Content-Type':'application/json'},body:JSON.stringify({max_count:20})});
   let response;
   try{response=await request();}
   catch(e){
    if(!TT_KEY()||!TT_SECRET()||!(state.tiktokAuth.refreshToken||TT_REFRESH()))throw e;
    access=await refreshTikTok();response=await request();
   }
   if(response.error?.code&&response.error.code!=='ok')throw Error('TikTok video.list error: '+String(response.error.code).slice(0,65));
   if(!Array.isArray(response.data?.videos))throw Error('TikTok video.list did not return videos; verify the video.list scope');
   const user=String(process.env.USA50_TIKTOK_USERNAME||state.sources.tiktokUsername||'usa50')
     .replace(/^@/,'').toLowerCase();
   if(!/^[a-z0-9_.]{1,40}$/.test(user))throw Error('Set a valid official TikTok username');
   for(const v of response.data.videos.slice(0,20).reverse()){
    if(!/^\d{10,25}$/.test(String(v.id||'')))continue;
    // A link derived from a verified owned-video API response.
    const url='https://www.tiktok.com/@'+user+'/video/'+v.id;
    const title=String(v.title||v.video_description||'USA50 TikTok update').slice(0,170);
    const post=addOfficial({url,title,caption:String(v.video_description||'').slice(0,500),
      publishedAt:v.create_time?new Date(Number(v.create_time)*1000).toISOString():now()},false);
    if(!post)continue;
    imported++;await cacheCover(post,v.cover_image_url);
   }
   status('tiktok',true,imported);
   return {configured:true,imported};
  }catch(e){
   status('tiktok',false,imported,e.message);
   console.warn('USA50 TikTok auto-sync:',e.message);
   return {configured:true,imported,error:e.message};
  }
 }
 let busy=null;
 async function sync(){
  if(busy)return busy;
  busy=(async()=>{
   const [instagram,tiktok]=await Promise.all([pollInstagram(),pollTikTok()]);
   return {instagram,tiktok,sourceStatus:publicStatus()};
  })();
  try{return await busy;}finally{busy=null;}
 }
 return {sync,pollInstagram,pollTikTok,publicStatus};
};
