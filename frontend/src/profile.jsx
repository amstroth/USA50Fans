import React,{useEffect,useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,Empty,Heading,Icon,VerifiedStar} from './ui';
import {dateLabel,number} from './api';
function resizeAvatar(file){
 return new Promise((resolve,reject)=>{
  if(!file?.size)return resolve(null);
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8_000_000)return reject(Error('Choose a JPG, PNG or WebP under 8 MB.'));
  const url=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{
   try{
    const canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;
    const ctx=canvas.getContext('2d'),edge=Math.min(image.width,image.height);
    ctx.drawImage(image,(image.width-edge)/2,(image.height-edge)/2,edge,edge,0,0,224,224);
    URL.revokeObjectURL(url);
    const output=canvas.toDataURL('image/jpeg',.72);
    if(output.length>205000)return reject(Error('Avatar is too detailed; please use a simpler picture.'));
    resolve(output);
   }catch(err){URL.revokeObjectURL(url);reject(err);}
  };
  image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not open image.'));};
  image.src=url;
 });
}
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
 const [photo,setPhoto]=useState(null),[busy,setBusy]=useState(false);
 const members=data?.members||[];
 function toggleOshi(id){setOshi(arr=>arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]);}
 async function save(e){
  e.preventDefault();setBusy(true);
  try{
   const body={bio};
   if(!isIdol){body.handle=handle;body.oshiIds=oshi;}
   if(isIdol)body.idolBorderColor=color;
   if(!isIdol&&!staff)body.ring=ring;
   if(photo){const avatarUrl=await resizeAvatar(photo);if(avatarUrl)body.avatarUrl=avatarUrl;}
   await run('/api/social/profile',body);
   message('Profile updated ♡');close();
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <div className="react-modal-cover" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&close()}>
  <div className="react-modal" role="dialog" aria-modal="true" aria-label="Edit your profile">
   <header><h2>Edit profile</h2><button aria-label="Close" onClick={close}><Icon name="x"/></button></header>
   <form className="react-form" onSubmit={save}>
    <label>Profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
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
 </div>;
}
export function ProfilePage(){
 const {data,selectedProfile,setSelectedProfile,navigate,signOut,run,message}=useApp();
 const [editing,setEditing]=useState(false),[tab,setTab]=useState('posts');
 const me=data?.me;
 if(!me)return <AccountAccess/>;
 const profile=selectedProfile?data?.social?.profiles?.[selectedProfile]:data?.social?.myProfile;
 if(!profile)return <Empty title="Profile unavailable" action={<button className="action secondary" onClick={()=>setSelectedProfile(null)}>My profile</button>}/>;
 const own=me.id===profile.id,isIdol=profile.verifiedIdol;
 const posts=data?.social?.posts||[];
 const items=posts.filter(p=>tab==='posts'?p.authorId===profile.id:tab==='hearted'?p.heartedBy?.some(x=>x.id===profile.id):tab==='hashtag'?((p.caption||'').match(/#[A-Za-z0-9_]+/g)||[]).some(x=>x.toLowerCase()==='#'+profile.handle?.toLowerCase()):(data?.social?.savedPostIds||[]).includes(p.id)).slice().reverse();
 async function follow(){try{await run('/api/social/follow',{userId:profile.id});}catch(err){message(err.message);}}
 return <main className="view profile-view">
  {!own&&<button className="text-link profile-back" onClick={()=>setSelectedProfile(null)}><Icon name="back" size={16}/> My profile</button>}
  <div className="profile-head">
   <div className="profile-name"><h1>@{profile.handle}</h1><VerifiedStar profile={profile}/></div>
   {own&&<button className="icon-round" aria-label="Edit settings" onClick={()=>setEditing(true)}><Icon name="settings"/></button>}
  </div>
  <div className="profile-top"><Avatar profile={profile} size="xl" withAward/>
   <div className={'profile-stats'+(isIdol?' idol-stats':'')}>
    {isIdol?<div><strong>{number(profile.oshiCount||0)}</strong><small>Oshi fans ♡</small></div>:<><div><strong>{profile.postsCount||0}</strong><small>Posts</small></div><div><strong>{number(profile.followers||0)}</strong><small>Followers</small></div><div><strong>{number(profile.following||0)}</strong><small>Following</small></div></>}
   </div>
  </div>
  <div className="profile-bio"><strong>{profile.displayName}</strong><p>{profile.bio||'Part of the USA50 universe ♡'}</p>
   {!isIdol&&<div className="profile-badges"><Badge tone="pink">✦ VIP {profile.vipLevel||'Starter'}</Badge><button type="button" className="rank-badge-link" onClick={()=>navigate('rankings')} title="View the top 100 fan rankings"><Badge>♛ {profile.rank?'Rank #'+profile.rank:'Unranked'} <Icon name="chevron" size={12}/></Badge></button><Badge>{number(profile.fanXP)} Fan XP</Badge>{(profile.oshiIds||[]).map(id=><Badge key={id} tone="pink">♡ {data?.members?.find(m=>m.id===id)?.name||id} Oshi</Badge>)}</div>}
  </div>
  <div className="row-actions profile-buttons">{own?<><button className="action secondary" onClick={()=>setEditing(true)}>Edit profile / Oshi settings</button><button className="action soft" onClick={signOut}>Sign out</button></>:<button className="action primary" onClick={follow}>{profile.isFollowing?'Following':'Follow +'}</button>}</div>
  <div className="segmented-tabs">{(isIdol?[['hashtag','Hashtag'],['hearted','Hearted'],['posts','Posts']]:[['posts','Posts'],['saved','Saved']]).map(([key,name])=><button key={key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>{name}</button>)}</div>
  {items.length?<div className="profile-post-grid">{items.map(post=><button key={post.id} onClick={()=>navigate('community')}><span>{post.thumbnailUrl?<img src={post.thumbnailUrl} alt="Post thumbnail" loading="lazy"/>:post.platform==='TikTok'?'♪':'◎'}</span><small>{post.caption?.slice(0,64)}</small></button>)}</div>:<Empty title="No posts in this section" detail={isIdol&&tab==='hashtag'?'Posts with #'+profile.handle+' will appear here.':'This section is empty.'}/>}
  {editing&&own&&<EditProfile profile={profile} close={()=>setEditing(false)}/>}
 </main>;
}
