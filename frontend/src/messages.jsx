import React,{useEffect,useRef,useState} from 'react';
import {useApp} from './state';
import {Avatar,Icon} from './ui';
import {dateTime} from './api';

const stamp=value=>Date.parse(value||'')||0;
function ChatLog({entries,empty='No messages yet ♡'}){
 const log=useRef(null);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[entries.length,entries[entries.length-1]?.at]);
 return <div className="react-msg-log" role="log" aria-label="Conversation" ref={log}>
  {entries.length?entries.map((entry,i)=><div key={entry.id||i} className={'react-msg-row '+(entry.mine?'out':'in')}>
   <div className={'react-msg-bubble '+(entry.mine?'mine':entry.private?'private':entry.public?'public':'')}>
    {entry.sender&&<strong className="react-msg-sender">{entry.sender}</strong>}
    <p>{entry.body}</p><small>{entry.private?'Private reply · ':entry.public?'Public idol reply · ':''}{dateTime(entry.at)}</small>
   </div>
  </div>):<div className="react-msg-empty"><strong>{empty}</strong><p>New updates will appear here when available.</p></div>}
 </div>;
}
function useMessageActions(){
 const {run,message}=useApp(),[busy,setBusy]=useState(false);
 async function send(endpoint,payload,success){
  if(busy)return false;
  setBusy(true);
  try{await run(endpoint,payload);if(success)message(success);return true;}
  catch(err){message(err.message);return false;}
  finally{setBusy(false);}
 }
 return {busy,send};
}
function FanMessages(){
 const {data,navigate}=useApp(),[selected,setSelected]=useState(null),[query,setQuery]=useState(''),[draft,setDraft]=useState('');
 const mail=data?.messaging||{},me=data?.me,members=data?.members||[],pinned=mail.pinnedIds||[],unread=mail.unreadCounts||{};
 const {busy,send}=useMessageActions();
 function items(id){
  const out=[];
  for(const p of mail.posts||[])if(p.idolId===id)out.push({id:'post-'+p.id,body:p.body,at:p.createdAt});
  for(const p of mail.idolReplies||[])if(p.idolId===id)out.push({id:'public-'+p.id,body:p.text,at:p.createdAt,public:true,sender:p.fromName+' · Idol'});
  for(const r of mail.replies||[])if(r.idolId===id){
   out.push({id:'reply-'+r.id,body:r.text,at:r.createdAt,mine:true});
   if(r.idolResponse)out.push({id:'answer-'+r.id,body:r.idolResponse.text,at:r.idolResponse.createdAt,private:true});
  }
  return out.sort((a,b)=>stamp(a.at)-stamp(b.at));
 }
 const conversations=members.map(m=>({...m,items:items(m.id),pinned:pinned.includes(m.id)}))
  .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||stamp(b.items.at(-1)?.at)-stamp(a.items.at(-1)?.at)||a.name.localeCompare(b.name));
 const shown=conversations.filter(m=>(m.name+' '+m.team).toLowerCase().includes(query.toLowerCase().trim()));
 const chosen=conversations.find(m=>m.id===selected),latest=(mail.posts||[]).filter(p=>p.idolId===selected).sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt))[0];
 const isFan=me?.role==='fan',subscribed=Boolean(me?.state?.subscriberPreview);
 const canReply=Boolean(isFan&&subscribed&&!me?.mustChangePassword&&!mail.banned&&latest);
 async function toggleSubscription(){
  if(!me)return navigate('profile');
  if(!isFan||me.mustChangePassword)return;
  const next=!subscribed;
  await send('/api/demo/subscriber-preview',{enabled:next},next?'Messaging subscription enabled (demo) ♡':'Messaging subscription paused (demo)');
 }
 async function open(id){
  setSelected(id);setDraft('');
  if(me?.role==='fan'&&!me?.mustChangePassword&&Number(unread[id])>0)await send('/api/messages/mark-read',{idolId:id});
 }
 async function togglePin(id){if(!me)return navigate('profile');await send('/api/messages/pin',{idolId:id});}
 async function submit(e){e.preventDefault();if(!canReply||!draft.trim())return;const ok=await send('/api/messages/fan-reply',{postId:latest.id,text:draft.trim()},'Private reply sent ♡');if(ok)setDraft('');}
 return <div className={'react-msg-shell'+(chosen?' thread-open':'')}>
  <aside className="react-msg-inbox">
   <header className="react-msg-inbox-head"><span className="eyebrow">USA50 FAN CLUB</span><h1>Messages ✦</h1><p>Official updates from your favorite idols</p></header>
   <label className="react-msg-search"><Icon name="community" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search idols" aria-label="Search idol conversations"/></label>
   <div className="react-msg-inbox-list">
    {shown.map((m,i)=><React.Fragment key={m.id}>
     {(i===0||shown[i-1].pinned!==m.pinned)&&<div className="react-msg-group-label">{m.pinned?'Pinned':'All Idols'}</div>}
     <div className={'react-msg-listing'+(selected===m.id?' selected':'')}>
      <button className="react-msg-open" onClick={()=>open(m.id)} aria-label={'Open messages with '+m.name}><Avatar member={m} size="sm"/>
       <span className="react-msg-list-text"><strong>{m.name}</strong><small>{m.team} · {m.items.at(-1)?.body||'No messages yet'}</small></span>
       {unread[m.id]>0&&<span className="react-msg-unread">{unread[m.id]}</span>}
      </button>
      {me&&<button className={'react-msg-pin'+(m.pinned?' active':'')} title={m.pinned?'Unpin':'Pin'} aria-label={m.pinned?'Unpin '+m.name:'Pin '+m.name} onClick={()=>togglePin(m.id)}>{m.pinned?'★':'☆'}</button>}
     </div>
    </React.Fragment>)}
    {!shown.length&&<p className="muted">No matching idols.</p>}
   </div>
   <p className="react-msg-privacy">Fan replies are private. Replies between idols are visible to everyone.</p>
  </aside>
  <section className="react-msg-thread">
   {chosen?<><header className="react-msg-thread-head"><button type="button" className="react-msg-back" onClick={()=>setSelected(null)} aria-label="Back to inbox"><Icon name="back"/></button>
    <Avatar member={chosen} size="sm"/><div><strong>{chosen.name}</strong><small>{chosen.team} · Official idol messages</small></div>
    <button className="react-msg-profile-link" onClick={()=>navigate('community')} title="Community"><Icon name="community" size={19}/></button>
   </header>
   <ChatLog entries={chosen.items} empty={'No messages from '+chosen.name+' yet ♡'}/>
   <footer className="react-msg-compose"><p>Your replies are private to the idol. Demo subscription: no payment required.</p>
    <form onSubmit={submit} className="react-msg-fan-bar">
     {isFan&&!me?.mustChangePassword&&<button type="button" className={'react-msg-subscribe'+(subscribed?' subscribed':'')} disabled={busy} onClick={toggleSubscription} aria-pressed={subscribed} title={subscribed?'Turn off demo subscriber messaging':'Enable demo subscriber messaging'}>
      {subscribed?'✓ Subscribed':'✦ Subscribe'}
     </button>}
     <input aria-label={'Reply to '+chosen.name} maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)}
      disabled={!canReply||busy} placeholder={!me?'Sign in to reply':me?.mustChangePassword?'Change your temporary password first':mail.banned?'Messaging suspended':!subscribed?'Subscribe to reply…':!latest?'Waiting for an idol message…':'Reply privately to '+chosen.name+'…'}/>
     <button type="submit" className="react-msg-send" disabled={!canReply||busy||!draft.trim()} aria-label="Send message">↑</button>
    </form>
    {!isFan&&<div className="react-msg-lock">{!me?'Sign in to reply privately':'Only fan accounts can subscribe to messages'}
     {!me&&<button className="text-link" onClick={()=>navigate('profile')}>Sign in</button>}</div>}
    {isFan&&mail.banned&&<div className="react-msg-lock">Messaging privileges suspended</div>}
    {isFan&&me?.mustChangePassword&&<div className="react-msg-lock">Change your temporary password in My Page to subscribe.</div>}
   </footer></>:<div className="react-msg-placeholder"><span>💌</span><h2>Select an idol conversation</h2><p>Choose someone on the left to read updates and private replies.</p></div>}
  </section>
 </div>;
}
function StudioMessages(){
 const {data,navigate}=useApp(),me=data?.me,mail=data?.messaging||{},members=data?.members||[];
 const idolId=me?.idolId,amIdol=me?.role==='idol';
 const [tab,setTab]=useState('broadcast'),[selectedId,setSelectedId]=useState(idolId||members[0]?.id||'arielle'),[draft,setDraft]=useState(''),[answer,setAnswer]=useState({}),[publicDraft,setPublicDraft]=useState({});
 const {busy,send}=useMessageActions();
 const chosen=members.find(m=>m.id===selectedId);
 const posts=(mail.posts||[]).filter(p=>p.idolId===selectedId).sort((a,b)=>stamp(a.createdAt)-stamp(b.createdAt));
 const publicReplies=(mail.idolReplies||[]).filter(r=>r.idolId===selectedId);
 const rows=[...posts.map(p=>({id:p.id,body:p.body,at:p.createdAt,mine:amIdol&&selectedId===idolId})),
  ...publicReplies.map(r=>({id:r.id,body:r.text,at:r.createdAt,public:true,sender:r.fromName+' · Idol'}))].sort((a,b)=>stamp(a.at)-stamp(b.at));
 async function postBroadcast(e){e.preventDefault();if(!draft.trim())return;const ok=await send('/api/idol/post',{body:draft.trim()},'Idol message published ♡');if(ok)setDraft('');}
 async function postPublicReply(postId){
  const text=publicDraft[postId]?.trim();if(!text)return;
  const ok=await send('/api/idol/public-reply',{postId,text},'Public idol reply published');
  if(ok)setPublicDraft(prev=>({...prev,[postId]:''}));
 }
 async function privateAnswer(replyId){const text=answer[replyId]?.trim();if(!text)return;const ok=await send('/api/idol/reply',{replyId,text},'Private reply sent');if(ok)setAnswer(prev=>({...prev,[replyId]:''}));}
 return <div className="react-msg-shell react-msg-studio">
  <aside className="react-msg-inbox">
   <header className="react-msg-inbox-head"><span className="eyebrow">USA50 · {amIdol?'IDOL STUDIO':'MANAGEMENT'}</span><h1>Messages ✦</h1><p>{amIdol?'Send official updates and answer your fans':'Browse public idol messages'}</p></header>
   {amIdol&&<div className="segmented-tabs react-msg-studio-tabs"><button className={tab==='broadcast'?'selected':''} onClick={()=>setTab('broadcast')}>Idol chats</button><button className={tab==='replies'?'selected':''} onClick={()=>setTab('replies')}>Fan replies ({mail.replies?.length||0})</button></div>}
   <div className="react-msg-inbox-list">{members.map(m=><button key={m.id} className={'react-msg-studio-idol'+(selectedId===m.id?' selected':'')} onClick={()=>{setSelectedId(m.id);setTab('broadcast');}}><Avatar member={m} size="sm"/><span><strong>{m.name}</strong><small>{m.team}</small></span><Icon name="chevron" size={15}/></button>)}</div>
  </aside>
  <section className="react-msg-thread">
   {tab==='replies'&&amIdol?<><header className="react-msg-thread-head"><strong>Your fan replies</strong></header><div className="react-msg-studio-scroll">
    {(mail.replies||[]).length?(mail.replies||[]).slice().sort((a,b)=>stamp(b.createdAt)-stamp(a.createdAt)).map(reply=><article key={reply.id} className="react-msg-reply-card"><span className="eyebrow">{reply.fanName||'Fan'} · {dateTime(reply.createdAt)}</span><p>{reply.text}</p>{reply.idolResponse?<div className="react-msg-own-response"><strong>Your reply</strong><p>{reply.idolResponse.text}</p></div>:<form onSubmit={e=>{e.preventDefault();privateAnswer(reply.id);}}><input maxLength={600} value={answer[reply.id]||''} onChange={e=>setAnswer(x=>({...x,[reply.id]:e.target.value}))} placeholder="Reply privately to this fan"/><button disabled={busy||!answer[reply.id]?.trim()} type="submit">Reply</button></form>}</article>):<div className="react-msg-empty">No fan replies yet.</div>}
   </div></>:<><header className="react-msg-thread-head">{chosen&&<Avatar member={chosen} size="sm"/>}<div><strong>{chosen?.name||'Idol'} Official Chat</strong><small>{chosen?.team||'USA50'} · Everyone can read public idol messages</small></div></header>
    <ChatLog entries={rows}/>
    <footer className="react-msg-compose">
     {amIdol&&selectedId===idolId?<><p>Publish an update to all your followers</p><form onSubmit={postBroadcast}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1200} placeholder="Write an idol message…"/><button disabled={busy||draft.trim().length<2} type="submit" aria-label="Publish update">↑</button></form></>:
     amIdol?<div className="react-msg-public-replies"><p>Reply publicly to a message from {chosen?.name}</p>{posts.slice(-4).reverse().map(post=><form key={post.id} onSubmit={e=>{e.preventDefault();postPublicReply(post.id);}}><label>{post.body.slice(0,85)}</label><input value={publicDraft[post.id]||''} maxLength={600} onChange={e=>setPublicDraft(x=>({...x,[post.id]:e.target.value}))} placeholder="Public idol reply…"/><button disabled={busy||!publicDraft[post.id]?.trim()} type="submit">Reply</button></form>)}</div>:
     <p>Management view · Only idol accounts can publish public idol messages.</p>}
    </footer>
   </>}
  </section>
 </div>;
}
export function MessagesPage(){
 const {data,refresh}=useApp();
 useEffect(()=>{const task=window.setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},25000);return()=>window.clearInterval(task);},[refresh]);
 return data?.me?.role==='idol'||data?.me?.role==='admin'?<StudioMessages/>:<FanMessages/>;
}
