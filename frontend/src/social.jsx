import React,{useMemo,useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,Empty,Heading,Icon,SectionTitle,VerifiedStar} from './ui';
import {api,dateLabel,safeUrl} from './api';
function OfficialAndDiary(){
 const {data,navigate}=useApp();
 const diary=data?.officialDiary?.diaries||[],official=data?.officialDiary?.officialPosts||[];
 const groups=[...new Map(diary.map(item=>[item.authorId,item.author])).entries()];
 if(!diary.length&&!official.length&&!data?.officialDiary?.canPost)return null;
 return <div className="react-social-features">
  <section className="react-section diary-entry-teasers">
   <SectionTitle title="Diary Entries ♡" action={<button className="text-link" onClick={()=>navigate('diary')}>Explore diaries →</button>}/>
   <div className="diary-story-row">
    {data?.officialDiary?.canPost&&<button onClick={()=>navigate('diary')} className="diary-story"><span className="diary-story-ring create"><span>＋</span></span><small>Create entry</small></button>}
    {groups.map(([id,name])=><button className="diary-story" key={id} onClick={()=>navigate('diary')}><span className="diary-story-ring">{(diary.find(item=>item.authorId===id)?.photos||[])[0]?.url?<img loading="lazy" src={diary.find(item=>item.authorId===id).photos[0].url} alt={name+' diary'}/>:<span>✧</span>}</span><small>{name}</small></button>)}
   </div>
  </section>
  <section className="react-section official-links">
   <SectionTitle title="Official Channels" action={<button className="text-link" onClick={()=>navigate('diary')}>View full feed →</button>}/>
   <div className="official-post-strip">{official.slice(0,12).map(post=><a key={post.id} className="official-post-teaser" href={safeUrl(post.url)||'#'} target="_blank" rel="noopener noreferrer"><div>{post.thumbnailUrl?<img src={post.thumbnailUrl} loading="lazy" alt={post.title||'Official USA50 video thumbnail'}/>:<span>{post.platform==='YouTube'?'▶':post.platform==='TikTok'?'♪':'◎'}</span>}</div><strong>{post.title||'USA50 Official'}</strong><small>{post.platform||'Official'}</small></a>)}</div>
   {!official.length&&<p className="muted">Official posts from connected USA50 channels will appear here.</p>}
  </section>
 </div>;
}
function Media({post}){
 const link=safeUrl(post.url);
 if(post.embedKind==='tiktok'&&/^\d{12,25}$/.test(post.embedId||''))return <div className="post-media tiktok"><iframe src={'https://www.tiktok.com/player/v1/'+post.embedId+'?controls=1'} title="TikTok shared video" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture"/></div>;
 if(['p','reel','tv'].includes(post.embedKind)&&/^[a-zA-Z0-9_-]{5,32}$/.test(post.embedId||''))return <div className="post-media instagram"><iframe src={'https://www.instagram.com/'+post.embedKind+'/'+post.embedId+'/embed/'} title="Instagram shared content" loading="lazy"/></div>;
 return link?<a href={link} target="_blank" rel="noopener noreferrer" className="post-link-preview"><span>{post.platform==='TikTok'?'♪':'◎'}</span><div><strong>Open shared {post.platform} post</strong><small>View original content</small></div><Icon name="external" size={18}/></a>:null;
}
function PostCard({post,author}){
 const {data,run,message,navigate,setSelectedProfile}=useApp();
 const [busy,setBusy]=useState('');
 const me=data?.me,own=me?.id===post.authorId,saved=(data?.social?.savedPostIds||[]).includes(post.id);
 const canHeart=me?.role==='idol'&&!own;
 async function interact(action,endpoint,payload){
  if(!me){navigate('profile');message('Sign in to interact with posts.');return;}
  setBusy(action);
  try{
   const result=await run(endpoint,payload);
   if(action==='heart')message(result.alreadyHearted?'You already hearted this post.':'Idol heart sent! +150 Fan XP awarded.');
  }catch(err){message(err.message);}finally{setBusy('');}
 }
 const name=author?.displayName||'USA50 fan';
 return <article className="social-entry">
  <header className="post-author">
   <Avatar profile={author} size="sm"/>
   <div><button className="user-handle" onClick={()=>{setSelectedProfile(post.authorId);navigate('profile');setSelectedProfile(post.authorId);}}>@{author?.handle||'fan'} <VerifiedStar profile={author}/></button>
    <small>{dateLabel(post.createdAt)}{author?.fansite?' · Approved fansite':''}</small></div>
   {author?.rank&&author.rank<=3&&<Badge tone="pink">#{author.rank} Fan</Badge>}
  </header>
  {post.repostOf&&<div className="repost-line">↻ Reposted from @{post.repostAuthor}</div>}
  <Media post={post}/><p className="post-caption">{post.caption}</p>
  <footer className="post-footer">
   <div className="post-actions">
    <button disabled={Boolean(busy)} className={post.myVote===1?'selected':''} onClick={()=>interact('up','/api/social/vote',{postId:post.id,vote:1})}>▲ {post.upvotes||0}</button>
    <button disabled={Boolean(busy)} className={post.myVote===-1?'selected':''} onClick={()=>interact('down','/api/social/vote',{postId:post.id,vote:-1})}>▼ {post.downvotes||0}</button>
    {canHeart&&<button className={'heart-button '+(post.myHeart?'hearted':'')} disabled={Boolean(busy)||post.myHeart} onClick={()=>interact('heart','/api/social/heart',{postId:post.id})} aria-label="Give official idol heart">♥</button>}
    <button onClick={()=>interact('save','/api/social/save',{postId:post.id})} disabled={Boolean(busy)}>{saved?'🔖 Saved':'▯ Save'}</button>
    {!own&&<button onClick={()=>interact('repost','/api/social/repost',{postId:post.id})} disabled={Boolean(busy)}>↻ Repost</button>}
   </div>
   {post.heartedBy?.length>0&&<p className="hearted-label">♥ Hearted by {post.heartedBy.map(x=>x.name).join(post.heartedBy.length===2?' and ':', ')}</p>}
   <div className="post-links">
    {safeUrl(post.url)&&<a href={safeUrl(post.url)} target="_blank" rel="noopener noreferrer">Open original <Icon name="external" size={13}/></a>}
    {!own&&<button className="quiet-button" onClick={()=>{const reason=window.prompt('Reason for reporting this post (optional):');if(reason===null)return;interact('report','/api/social/report',{postId:post.id,reason});}}>Report</button>}
   </div>
  </footer>
 </article>;
}
function Compose({close}){
 const {run,message}=useApp(),[caption,setCaption]=useState(''),[url,setUrl]=useState(''),[category,setCategory]=useState('fan'),[busy,setBusy]=useState(false);
 async function publish(e){e.preventDefault();setBusy(true);try{const result=await run('/api/social/post',{caption,url,category});message('Post published. +'+result.fanXPAwarded+' Fan XP');close();}catch(err){message(err.message);}finally{setBusy(false);}}
 return <div className="react-modal-cover" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div role="dialog" aria-modal="true" aria-label="Share social post" className="react-modal">
  <header><h2>Share a USA50 edit ♡</h2><button aria-label="Close" onClick={close}><Icon name="x"/></button></header>
  <form className="react-form" onSubmit={publish}><label>Caption<textarea value={caption} minLength={6} maxLength={650} required placeholder="What did you love about this moment? #Arielle #NYC50" onChange={e=>setCaption(e.target.value)}/></label>
   <label>Instagram or TikTok post link<input type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..."/></label>
   <label>Publish to<select value={category} onChange={e=>setCategory(e.target.value)}><option value="fan">Fan community</option><option value="fansite">Fansites (approved only)</option></select></label>
   <p className="fineprint">Share your own public post. Links stay on the original platform. Demo XP and Pull Points may apply.</p><button className="action primary full" disabled={busy}>{busy?'Publishing…':'Publish post'}</button>
  </form></div></div>;
}
export function SocialPage(){
 const {data,navigate}=useApp(),[tab,setTab]=useState('recent'),[query,setQuery]=useState(''),[compose,setCompose]=useState(false);
 const social=data?.social||{},profiles=social.profiles||{},following=social.following||[];
 const allPosts=social.posts||[];
 const posts=useMemo(()=>{
  let arr=allPosts.slice();
  if(tab==='following')arr=arr.filter(p=>following.includes(p.authorId));
  if(tab==='fansites')arr=arr.filter(p=>p.category==='fansite');
  if(query.trim()){const q=query.toLowerCase().trim();arr=arr.filter(p=>(p.caption||'').toLowerCase().includes(q)||(profiles[p.authorId]?.handle||'').toLowerCase().includes(q.replace(/^@/,'')));}
  if(tab==='top')arr.sort((a,b)=>(b.score||0)-(a.score||0)||(b.upvotes||0)-(a.upvotes||0));
  else arr.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return arr.slice(0,30);
 },[allPosts,tab,query,profiles,following]);
 return <main className="view social-page">
  <Heading eyebrow="USA50 FAN COMMUNITY" title="The Social Feed" subtitle="See your fandom, share your edits, and collect hearts from idols." action={<button className="action primary" onClick={()=>data?.me?setCompose(true):navigate('profile')}><Icon name="plus" size={17}/> New Post</button>}/>
  <OfficialAndDiary/>
  <div className="social-search"><Icon name="community"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search hashtags or usernames" aria-label="Search Social posts"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><Icon name="x" size={16}/></button>}</div>
  <div className="tag-strip"><small>Top hashtags</small>{(social.topHashtags?.length?social.topHashtags.slice(0,8):[{tag:'#truelove'},{tag:'#arielle'},{tag:'#nyc50'}]).map(h=><button key={h.tag} onClick={()=>setQuery(h.tag)}>{({'#truelove':'#TrueLove','#arielle':'#Arielle','#nyc50':'#NYC50'})[h.tag]||h.tag}</button>)}</div>
  <div className="segmented-tabs social-tabs">{[['recent','Recent'],['top','Top'],['following','Following'],['fansites','Fansites']].map(([key,label])=><button key={key} className={tab===key?'selected':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
  {tab==='fansites'&&<div className="react-note"><strong>Fansites Program</strong><p>Approved fansites can share photography and performance media. Management approval is required.</p><button className="text-link" onClick={()=>navigate('fansites')}>Apply or view fansites →</button></div>}
  <div className="social-column">{posts.length?posts.map(p=><PostCard key={p.id} post={p} author={profiles[p.authorId]}/>):<Empty title="No matching posts yet" detail="Try a different hashtag or share the first edit." action={<button className="action secondary" onClick={()=>setQuery('')}>Clear filters</button>}/>}</div>
  {compose&&<Compose close={()=>setCompose(false)}/>}
 </main>;
}
