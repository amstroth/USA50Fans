import React,{useEffect,useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,Empty,Heading,Icon,VerifiedStar,rankTone,VipBadge} from './ui';
import {api,dateLabel,number} from './api';
import {CropPhoto,preparePhoto} from './photo-crop';
function AccountAccess(){
 const {signIn,message}=useApp();
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[displayName,setDisplayName]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setBusy(true);try{await signIn(mode,{email,password,...(mode==='register'?{displayName}:{})});}catch(err){message(err.message);}finally{setBusy(false);}}
 return <main className="view auth-view"><div className="auth-panel">
  <span className="auth-star">✦</span><span className="eyebrow">THE USA50 UNIVERSE</span><h1>{mode==='login'?'Welcome back ♡':'Join the fandom ✦'}</h1>
  <p>Sign in to collect photocards, save your oshi, follow other fans, and enter free fancall lotteries.</p>
  <div className="segmented-tabs"><button className={mode==='login'?'selected':''} onClick={()=>setMode('login')}>Log in</button><button className={mode==='register'?'selected':''} onClick={()=>setMode('register')}>Create account</button></div>
  <form className="react-form" onSubmit={submit}>
   {mode==='register'&&<label>Display name<input required minLength={2} maxLength={36} value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name"/></label>}
   <label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" required minLength={mode==='register'?8:1} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="action primary full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create fan account'}</button>
  </form><small>Existing USA50 accounts work in the React app. No data migration is needed.</small>
 </div></main>;
}
function EditProfile({profile,close}){
 const {data,run,message}=useApp();
 const isIdol=profile.verifiedIdol,staff=profile.verifiedStaff;
 const [handle,setHandle]=useState(profile.handle||''),[bio,setBio]=useState(profile.bio||''),[oshi,setOshi]=useState(profile.oshiIds||[]);
 const [ring,setRing]=useState(profile.ring||'classic'),[color,setColor]=useState(profile.idolBorderColor||'#E63A84');
 const [avatarUrl,setAvatarUrl]=useState(null),[cropSource,setCropSource]=useState(null),[busy,setBusy]=useState(false);
 const members=data?.members||[];
 function toggleOshi(id){setOshi(arr=>arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]);}
 async function save(e){
  e.preventDefault();setBusy(true);
  try{
   const body={bio};
   if(!isIdol){body.handle=handle;body.oshiIds=oshi;}
   if(isIdol)body.idolBorderColor=color;
   if(!isIdol&&!staff)body.ring=ring;
   if(avatarUrl)body.avatarUrl=avatarUrl;
   await run('/api/social/profile',body);
   message('Profile updated ♡');close();
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <div className="react-modal-cover" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&close()}>
  <div className="react-modal" role="dialog" aria-modal="true" aria-label="Edit your profile">
   <header><h2>Edit profile</h2><button aria-label="Close" onClick={close}><Icon name="x"/></button></header>
   <form className="react-form" onSubmit={save}>
    <label>Profile picture (drag and zoom to crop into a circle)
     <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      try{setCropSource(await preparePhoto(file,{maxChars:950000}));}catch(err){message(err.message);}
     }}/>
    </label>
    {(avatarUrl||profile.avatarUrl)&&<div className="profile-avatar-preview"><img src={avatarUrl||profile.avatarUrl} alt="Profile photo preview"/></div>}
    {isIdol?<><p className="fineprint">Official verified username: @{profile.handle}</p><label>Idol border color<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label></>:
     <label>Username<input value={handle} minLength={3} maxLength={22} pattern="[A-Za-z][A-Za-z0-9_]{2,21}" onChange={e=>setHandle(e.target.value)} required/><small>Unique, 3–22 letters, numbers or underscores.</small></label>}
    <label>Bio<textarea value={bio} maxLength={180} rows={3} onChange={e=>setBio(e.target.value)} placeholder="Tell USA50 fans about yourself…"/></label>
    {!isIdol&&<fieldset className="oshi-fieldset"><legend>Your Oshi / Bias (choose multiple)</legend><div className="oshi-options">{members.map(m=><label key={m.id} className={oshi.includes(m.id)?'on':''}><input type="checkbox" checked={oshi.includes(m.id)} onChange={()=>toggleOshi(m.id)}/><Avatar member={m} size="xs"/><span>{m.name}</span></label>)}</div><small>Your selected oshis appear as badges next to your VIP and rank.</small></fieldset>}
    {!isIdol&&!staff&&<label>Profile picture border<select value={ring} onChange={e=>setRing(e.target.value)}>
     <option value="classic">Classic</option><option value="rank-auto">Automatic fan-rank award</option>{(profile.unlockedRings||[]).filter(x=>x!=='classic').map(r=><option key={r} value={r}>{r.replaceAll('-',' ')}</option>)}
    </select></label>}
    <button disabled={busy} className="action primary full">{busy?'Saving…':'Save profile'}</button>
   </form>
  </div>
  {cropSource&&<CropPhoto source={cropSource} title="Crop your profile picture" outputSize={300} maxChars={182000}
    onCancel={()=>setCropSource(null)} onSave={image=>{setAvatarUrl(image);setCropSource(null);}}/>}
 </div>;
}
function PostThumbnail({post}){
 const [thumbnail,setThumbnail]=useState(post.thumbnailUrl||null);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  setThumbnail(post.thumbnailUrl||null);
  setRetry(0);
  // The profile grid uses the exact saved thumbnail for the same Social post.
  // Older posts without a saved cover are resolved through their source URL.
  if(!String(post.thumbnailUrl||'').startsWith('/api/social/thumbnail/')){
   api('/api/social/resolve?postId='+encodeURIComponent(post.id))
    .then(result=>{if(active&&result?.thumbnailUrl)setThumbnail(result.thumbnailUrl);})
    .catch(()=>{});
  }
  return ()=>{active=false;};
 },[post.id,post.thumbnailUrl]);
 async function retryThumbnail(){
  if(retry>0){setThumbnail(null);return;}
  setRetry(1);
  try{
   const fresh=await api('/api/social/resolve?postId='+encodeURIComponent(post.id));
   setThumbnail(fresh?.thumbnailUrl&&fresh.thumbnailUrl!==thumbnail?fresh.thumbnailUrl:null);
  }catch{setThumbnail(null);}
 }
 return <span className="profile-post-image">
  {thumbnail?<img src={thumbnail} alt={post.caption?'Thumbnail for '+post.caption.slice(0,80):'Post thumbnail'} loading="lazy" onError={retryThumbnail}/>:
   <span className="profile-post-fallback" aria-hidden="true">{post.platform==='TikTok'?'♪':'◎'}</span>}
 </span>;
}
function profileCoverData(file){
 return new Promise((resolve,reject)=>{
  if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>12_000_000)return reject(Error('Select a JPG, PNG or WebP photo under 12 MB.'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Cannot open the photo.'));};
  img.onload=()=>{
   try{
    const scale=Math.min(1,1200/img.width,1200/img.height);
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);
    const result=canvas.toDataURL('image/jpeg',.76);
    if(result.length>1550000)return reject(Error('Photo is too large after compression.'));
    resolve(result);
   }catch(err){URL.revokeObjectURL(url);reject(err);}
  };
  img.src=url;
 });
}
function ProfilePostTile({post,canEdit}){
 const {run,navigate,message}=useApp(),[busy,setBusy]=useState(false);
 async function setCover(e){
  const file=e.target.files?.[0];if(!file)return;setBusy(true);
  try{await run('/api/social/thumbnail',{postId:post.id,thumbnailDataUrl:await profileCoverData(file)});
   message('Profile grid thumbnail updated ♡');
  }catch(err){message(err.message);}
  finally{e.target.value='';setBusy(false);}
 }
 return <div className="profile-post-tile">
  <button type="button" className="profile-post-open" onClick={()=>navigate('community')} aria-label={'Open post '+(post.caption||'')}><PostThumbnail post={post}/><small>{post.caption?.slice(0,64)}</small></button>
  {canEdit&&<label className="profile-cover-edit" title="Set the same image as this post's thumbnail"><Icon name="camera" size={13}/><span>{busy?'Saving…':'Cover'}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={setCover}/></label>}
 </div>;
}

export function ProfilePage(){
 const {data,selectedProfile,setSelectedProfile,navigate,signOut,run,message}=useApp();
 const [editing,setEditing]=useState(false),[tab,setTab]=useState('posts');
 const me=data?.me;
 if(!me)return <AccountAccess/>;
 const idolMember=selectedProfile?.startsWith('idol:')?data?.members?.find(x=>x.id===selectedProfile.slice(5)):null;
 const virtualIdol=idolMember?{id:selectedProfile,verifiedIdol:true,displayName:idolMember.name,handle:idolMember.name.replace(/[^a-z0-9]/gi,''),idolId:idolMember.id,oshiCount:0,bio:'Official '+idolMember.team+' idol'}:null;
 const profile=selectedProfile?(data?.social?.profiles?.[selectedProfile]||virtualIdol):data?.social?.myProfile;
 if(!profile)return <Empty title="Profile unavailable" action={<button className="action secondary" onClick={()=>setSelectedProfile(null)}>My profile</button>}/>;
 const own=me.id===profile.id,isIdol=profile.verifiedIdol;
 const posts=data?.social?.posts||[];
 const items=posts.filter(p=>tab==='posts'?p.authorId===profile.id:tab==='hearted'?p.heartedBy?.some(x=>x.id===profile.id):tab==='hashtag'?((p.caption||'').match(/#[A-Za-z0-9_]+/g)||[]).some(x=>x.toLowerCase()==='#'+profile.handle?.toLowerCase()):(data?.social?.savedPostIds||[]).includes(p.id)).slice().reverse();
 async function follow(){if(virtualIdol){message('This idol has not activated their profile yet.');return;}try{await run('/api/social/follow',{userId:profile.id});}catch(err){message(err.message);}}
 function openOshi(id){const idol=Object.values(data?.social?.profiles||{}).find(p=>p?.verifiedIdol&&p.idolId===id);
  const target=idol?.id||'idol:'+id;setSelectedProfile(target);navigate('profile');setSelectedProfile(target);
 }
 return <main className="view profile-view">
  {!own&&<button className="text-link profile-back" onClick={()=>setSelectedProfile(null)}><Icon name="back" size={16}/> My profile</button>}
  <div className="profile-head">
   <div className="profile-name"><h1>@{profile.handle}</h1><VerifiedStar profile={profile}/></div>
   {own&&<button className="icon-round" aria-label="Edit settings" onClick={()=>setEditing(true)}><Icon name="settings"/></button>}
  </div>
  <div className="profile-top"><Avatar member={idolMember} profile={profile} size="xl" withAward/>
   <div className={'profile-stats'+(isIdol?' idol-stats':'')}>
    {isIdol?<div><strong>{number(profile.oshiCount||0)}</strong><small>Oshi fans ♡</small></div>:<><div><strong>{profile.postsCount||0}</strong><small>Posts</small></div><div><strong>{number(profile.followers||0)}</strong><small>Followers</small></div><div><strong>{number(profile.following||0)}</strong><small>Following</small></div></>}
   </div>
  </div>
  <div className="profile-bio"><strong>{profile.displayName}</strong><p>{profile.bio||'Part of the USA50 universe ♡'}</p>
   {!isIdol&&<div className="profile-badges">{Number(profile.vipRank)>0&&<button type="button" className="vip-badge-button" onClick={()=>navigate('vip')} title="View VIP benefits and progress"><VipBadge level={profile.vipRank}/></button>}<button type="button" className={'rank-badge-link rank-tone-'+rankTone(profile.rank)} onClick={()=>navigate('rankings')} title="View the top 100 fan rankings"><Badge>♛ {profile.rank?'Rank #'+profile.rank:'Unranked'} <Icon name="chevron" size={12}/></Badge></button><Badge>{number(profile.fanXP)} Fan XP</Badge>{(profile.oshiIds||[]).map(id=><button key={id} className="oshi-profile-link" type="button" onClick={()=>openOshi(id)} title="Open oshi profile"><Badge tone="pink">♡ {data?.members?.find(m=>m.id===id)?.name||id} Oshi <Icon name="chevron" size={12}/></Badge></button>)}</div>}
  </div>
  <div className="row-actions profile-buttons">{own?<><button className="action secondary" onClick={()=>setEditing(true)}>Edit profile / Oshi settings</button><button className="action soft" onClick={signOut}>Sign out</button></>:<button className="action primary" onClick={follow}>{profile.isFollowing?'Following':'Follow +'}</button>}</div>
  <div className="segmented-tabs">{(isIdol?[['hashtag','Hashtag'],['hearted','Hearted'],['posts','Posts']]:[['posts','Posts'],['saved','Saved']]).map(([key,name])=><button key={key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>{name}</button>)}</div>
  {items.length?<div className="profile-post-grid">{items.map(post=><ProfilePostTile key={post.id} post={post} canEdit={Boolean(me&&(post.authorId===me.id||me.role==='admin'))}/>)}</div>:<Empty title="No posts in this section" detail={isIdol&&tab==='hashtag'?'Posts with #'+profile.handle+' will appear here.':'This section is empty.'}/>}
  {editing&&own&&<EditProfile profile={profile} close={()=>setEditing(false)}/>}
 </main>;
}
