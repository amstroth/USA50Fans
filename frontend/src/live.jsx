import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,Empty,Heading,Icon,SectionTitle,VerifiedStar} from './ui';
import {api,dateTime,number,safeUrl} from './api';

function VideoPlayer({stream}){
 if(stream.status!=='live'||!safeUrl(stream.playerUrl))
  return <div className="stream-placeholder"><span>✦</span><p>{stream.status==='ended'?'This broadcast has ended.':'Broadcast video will appear when the host goes live.'}</p></div>;
 return <div className="stream-player"><iframe key={stream.id+stream.playerUrl} loading="lazy" title={stream.title+' · USA50 livestream'} src={stream.playerUrl} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>;
}
function LiveChat({stream}){
 const {data,refresh,message,navigate}=useApp();
 const [feed,setFeed]=useState(null),[text,setText]=useState(''),[sending,setSending]=useState(false);
 const [giftForm,setGiftForm]=useState(false),[giftId,setGiftId]=useState('spark'),[giftText,setGiftText]=useState(''),[tts,setTts]=useState(false);
 const [giftBusy,setGiftBusy]=useState(false),[busyReview,setBusyReview]=useState(null),[loadError,setLoadError]=useState('');
 const bottomRef=useRef(null),id=stream.id,me=data?.me,canHost=stream.canEdit;
 const isLive=stream.status==='live';
 const feedRef=useRef(null);
 const load=useCallback(async()=>{
  if(!me||!isLive)return;
  try{
   const current=await api('/api/livestreams/chat?streamId='+encodeURIComponent(id));
   setFeed(current);setLoadError('');
  }catch(err){setLoadError(err.message);}
 },[id,me?.id,isLive]);
 useEffect(()=>{setFeed(null);feedRef.current=null;setGiftForm(false);load();
  if(!me||!isLive)return;
  const timer=window.setInterval(()=>{if(!document.hidden)load();},3500);
  return()=>window.clearInterval(timer);
 },[load,isLive,me?.id,id]);
 useEffect(()=>{if(feed?.messages?.length)bottomRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[feed?.messages?.length]);
 async function send(e){
  e.preventDefault();if(!text.trim()||sending)return;setSending(true);
  try{await api('/api/livestreams/chat',{method:'POST',body:{streamId:id,message:text.trim()}});setText('');await load();}
  catch(err){message(err.message);}finally{setSending(false);}
 }
 async function gift(e){
  e.preventDefault();if(giftBusy)return;
  const token=window.crypto?.randomUUID?.();
  if(!token){message('A secure HTTPS browser is required for gifts.');return;}
  setGiftBusy(true);
  try{
   const reply=await api('/api/livestreams/gift',{method:'POST',body:{streamId:id,giftId,message:giftText,tts,requestId:token}});
   setGiftForm(false);setGiftText('');setTts(false);await refresh();await load();
   message(reply.status==='pending'?'Your TTS request was sent to the host for approval.':'Demo gift sent! ✦');
  }catch(err){message(err.message);}finally{setGiftBusy(false);}
 }
 async function moderateGift(entry,action){
  setBusyReview(entry.id);
  try{await api('/api/livestreams/gift-review',{method:'POST',body:{streamId:id,giftId:entry.id,action}});await load();message(action==='approve'?'TTS approved and credited.':'Request declined and refunded.');}
  catch(err){message(err.message);}finally{setBusyReview(null);}
 }
 async function hidePost(item){
  if(!window.confirm('Hide this message for all live viewers?'))return;
  try{await api('/api/livestreams/chat-hide',{method:'POST',body:{streamId:id,messageId:item.id}});await load();}
  catch(err){message(err.message);}
 }
 if(!isLive)return null;
 if(!me)return <section className="live-chat-panel"><h3>Fan live chat ♡</h3><p>Sign in to send supportive messages and demo gifts.</p><button className="action secondary" onClick={()=>navigate('profile')}>Sign in</button></section>;
 const gifts=feed?.gifts||[],chosen=gifts.find(g=>g.id===giftId);
 return <section className="live-chat-panel">
  <header><div><span className="eyebrow">USA50 LIVE · MODERATED CHAT</span><h3>Chat with your idols ♡</h3></div><Badge tone="pink">LIVE</Badge></header>
  <div className="live-chat-messages" role="log" aria-label="Livestream chat messages" aria-live="off">
   {feed?.messages?.length?feed.messages.map(item=><div className={'live-chat-line '+(item.kind==='gift'?'gift':'')} key={item.id}>
    <span className="live-chat-avatar">{item.hasAvatar?<img src={'/api/livestreams/avatar/'+encodeURIComponent(item.authorId)} alt="" loading="lazy"/>:<span>{String(item.username||'?').slice(0,1).toUpperCase()}</span>}</span>
    <div className="live-chat-body"><span className="live-chat-username">@{item.username}{item.verified&&<VerifiedStar profile={{verifiedIdol:item.verified==='idol',verifiedStaff:item.verified==='staff'}}/>}</span>
     <span>{item.kind==='gift'&&<strong>{item.gift?.emoji||'🎁'} {item.gift?.name||'Gift'} · </strong>}{item.text}</span>
    </div>{canHost&&<button className="quiet-button" title="Hide message" onClick={()=>hidePost(item)} aria-label="Hide this message">×</button>}
   </div>):<div className="live-chat-quiet">The chat is quiet. Send the first message ♡</div>}
   <span ref={bottomRef}/>
  </div>
  {loadError&&<p className="inline-error">{loadError}</p>}
  <form className="live-compose" onSubmit={send}><input aria-label="Message live chat" value={text} maxLength={200} required onChange={e=>setText(e.target.value)} placeholder="Say something nice…"/><button className="action primary" disabled={sending||!text.trim()}>Send</button><button type="button" className="action soft gift-toggle" title="Send a virtual gift" onClick={()=>setGiftForm(v=>!v)}>🎁</button></form>
  {giftForm&&<form className="live-gift-form" onSubmit={gift}>
   <div className="live-gift-options">{gifts.map(g=><label className={'live-gift-choice '+(giftId===g.id?'selected':'')} key={g.id}><input type="radio" name="gift" value={g.id} checked={giftId===g.id} onChange={()=>{setGiftId(g.id);if(!g.tts)setTts(false);}}/><span>{g.emoji}</span><strong>{g.name}</strong><small>✦ {number(g.stars)}</small></label>)}</div>
   <input maxLength={120} aria-label="Gift message" placeholder="Message with your gift (optional)" value={giftText} onChange={e=>setGiftText(e.target.value)}/>
   <label className="gift-tts-label"><input type="checkbox" checked={tts} disabled={!chosen?.tts} onChange={e=>setTts(e.target.checked)}/> Request host-approved Text-to-Speech</label>
   <p className="fineprint">Uses demo STARS only. TTS requests are reviewed by the idol or management and refunded if declined or expired. Cash payouts are not enabled.</p>
   <button type="submit" className="action primary full" disabled={giftBusy||!chosen||Number(data?.me?.state?.stars||0)<chosen.stars}>{giftBusy?'Sending…':'Send '+chosen?.name+' · ✦ '+number(chosen?.stars||0)}</button>
  </form>}
  {canHost&&Boolean(feed?.ttsPending?.length)&&<section className="live-moderation"><strong>Pending TTS requests ({feed.ttsPending.length})</strong>{feed.ttsPending.map(item=><div key={item.id} className="live-review-row"><p><b>@{item.username}</b> requested ✦ {number(item.stars)}<br/>{item.text}</p><div className="row-actions"><button className="action primary" disabled={!!busyReview} onClick={()=>moderateGift(item,'approve')}>Approve</button><button className="action soft" disabled={!!busyReview} onClick={()=>moderateGift(item,'reject')}>Reject & refund</button></div></div>)}</section>}
  <p className="fineprint">Community chat and demo STAR gifts are moderated. Gift distribution is virtual only (70% creator allocation / 30% operations); real financial settlements are not active.</p>
 </section>;
}
function Studio({stream,onUpdate}){
 const {data,message}=useApp(),[edit,setEdit]=useState(false),[url,setUrl]=useState(stream.editPlayerUrl||'');
 const [hosts,setHosts]=useState(stream.hosts||[]),[busy,setBusy]=useState(false);
 const [showOBS,setShowOBS]=useState(false),[obs,setObs]=useState(null),[overlay,setOverlay]=useState(null),[ledger,setLedger]=useState(null);
 const [linkedEvent,setLinkedEvent]=useState(stream.eventId||'');
 const managers=['admin','management'].includes(data?.me?.role),hostOptions=data?.liveEvents?.hostOptions||[];
 useEffect(()=>{setUrl(stream.editPlayerUrl||'');setHosts(stream.hosts||[]);setLinkedEvent(stream.eventId||'');},[stream.id,stream.editPlayerUrl,stream.hosts?.join(','),stream.eventId]);
 async function update(payload,path='/api/livestreams/update'){
  setBusy(true);try{await onUpdate(path,payload);setEdit(false);}finally{setBusy(false);}
 }
 async function readOBS(){
  if(showOBS){setShowOBS(false);setObs(null);return;}
  setShowOBS(true);
  try{setObs(await api('/api/livestreams/host-config'));}catch(err){message(err.message);setShowOBS(false);}
 }
 async function makeOverlay(){
  try{const result=await api('/api/livestreams/overlay-token',{method:'POST',body:{streamId:stream.id}});setOverlay(window.location.origin+result.path);message('Private OBS overlay generated. Never publish this URL.');}
  catch(err){message(err.message);}
 }
 async function getLedger(){
  try{setLedger(await api('/api/livestreams/earnings'));}catch(err){message(err.message);}
 }
 return <section className="live-studio-controls">
  <div className="row-actions"><button className="action secondary" onClick={()=>setEdit(x=>!x)}><Icon name="settings" size={17}/> Stream settings</button>
   {managers&&<button className="action secondary" onClick={readOBS}>OBS stream key</button>}
   <button className="action soft" onClick={getLedger}>Creator ledger</button>
  </div>
  {edit&&<form className="react-form live-studio-form" onSubmit={e=>{e.preventDefault();update({streamId:stream.id,playerUrl:url,...(managers?{hosts,eventId:linkedEvent}:{} )});}}>
    <label>Approved HTTPS playback URL<input value={url} type="url" placeholder="https://iframe.videodelivery.net/..." onChange={e=>setUrl(e.target.value)}/></label>
    {managers&&<><fieldset className="oshi-fieldset"><legend>Who is going live?</legend><div className="live-host-grid">{hostOptions.map(h=><label key={h.id}><input type="checkbox" checked={hosts.includes(h.id)} onChange={()=>setHosts(list=>list.includes(h.id)?list.filter(x=>x!==h.id):[...list,h.id])}/>{h.name}{h.kind==='group'?' · Group':''}</label>)}</div></fieldset>
     <label>Linked event<select value={linkedEvent} onChange={e=>setLinkedEvent(e.target.value)}><option value="">No event</option>{(data?.liveEvents?.events||[]).map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label></>}
    <p className="fineprint">An approved playback URL and assigned stream participants are required before going live. The RTMPS ingest key must never be entered here.</p>
    <button className="action primary full" disabled={busy}>Save stream settings</button>
   </form>}
  <div className="row-actions live-status-actions">
   {stream.status!=='ended'&&<><button className="action primary" disabled={busy||stream.status==='live'||!stream.hasPlayer||!stream.recipientIds?.length} onClick={()=>update({streamId:stream.id,status:'live'},'/api/livestreams/status')}>🔴 Go Live</button><button className="action soft" disabled={busy||stream.status==='ended'} onClick={()=>window.confirm('End this livestream? Pending TTS gifts will be refunded.')&&update({streamId:stream.id,status:'ended'},'/api/livestreams/status')}>End livestream</button></>}
   {stream.status==='live'&&<button className="action secondary" onClick={makeOverlay}>Generate OBS TTS overlay</button>}
  </div>
  {showOBS&&<div className="live-secret-box">{obs?<><strong>OBS → Settings → Stream → Custom</strong><p>RTMPS server</p><code>{obs.server||'Not configured'}</code><p>Stream key — keep private</p><code>{obs.streamKey||'Not configured'}</code><p className="fineprint">The stream key is shown only to authenticated management. Rotate it after sharing or suspected exposure.</p></>:<p>Loading broadcaster configuration…</p>}</div>}
  {overlay&&<div className="live-secret-box"><strong>Private OBS Browser Source URL</strong><p><code>{overlay}</code></p><button className="action secondary" onClick={()=>navigator.clipboard?.writeText(overlay).then(()=>message('Overlay URL copied.')).catch(()=>message('Copy the URL manually.'))}>Copy overlay URL</button><p className="fineprint">Keep this token private. Generating a new URL revokes the previous one.</p></div>}
  {ledger&&<div className="live-secret-box"><strong>Demo creator ledger · no real payouts</strong><p>Creator allocation: {ledger.creatorSharePercent}%</p><p>{Object.entries(ledger.pendingMilliStars||{}).map(([key,x])=>key+': '+(Number(x)/1000).toFixed(3)+' STARS').join(' · ')||'No pending balance'}</p><p className="fineprint">{ledger.disclaimer}</p></div>}
 </section>;
}
function NewStream({done}){
 const {data,run,message}=useApp(),me=data?.me;
 const manager=['admin','management'].includes(me?.role),options=data?.liveEvents?.hostOptions||[];
 const [title,setTitle]=useState(''),[date,setDate]=useState(''),[description,setDescription]=useState(''),[url,setUrl]=useState(''),[hosts,setHosts]=useState(me?.role==='idol'&&me?.idolId?[me.idolId]:[]);
 const [busy,setBusy]=useState(false);
 async function submit(e){
  e.preventDefault();setBusy(true);
  try{
   await run('/api/livestreams/create',{title,description,startsAt:new Date(date).toISOString(),playerUrl:url,...(manager?{hosts}:{})});
   message('Livestream scheduled! Add an approved playback URL before going live.');done();
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <form className="react-form live-create-form" onSubmit={submit}>
  <label>Stream title<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={3} maxLength={90}/></label>
  <label>Start time<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required/></label>
  <label>About this broadcast<textarea maxLength={600} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <label>Player URL (add later if needed)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://iframe.videodelivery.net/..."/></label>
  {manager&&<fieldset className="oshi-fieldset"><legend>Stream hosts (choose one or more)</legend><div className="live-host-grid">{options.map(o=><label key={o.id}><input type="checkbox" checked={hosts.includes(o.id)} onChange={()=>setHosts(list=>list.includes(o.id)?list.filter(id=>id!==o.id):[...list,o.id])}/>{o.name}</label>)}</div></fieldset>}
  <button className="action primary full" disabled={busy||manager&&!hosts.length}>{busy?'Scheduling…':'Schedule stream'}</button>
 </form>;
}
export function LivePage(){
 const {data,refresh,navigate,message}=useApp(),[streams,setStreams]=useState(data?.liveEvents?.streams||[]);
 const [selected,setSelected]=useState(null),[creating,setCreating]=useState(false);
 const me=data?.me,canCreate=['idol','admin','management'].includes(me?.role);
 useEffect(()=>{setStreams(data?.liveEvents?.streams||[]);},[data?.liveEvents?.streams]);
 useEffect(()=>{
  const timer=setInterval(async()=>{
   if(document.hidden)return;
   try{const info=await api('/api/events-v2/info');setStreams(info.streams||[]);}catch(_){}
  },6000);
  return()=>clearInterval(timer);
 },[]);
 const live=streams.filter(x=>x.status==='live'),upcoming=streams.filter(x=>x.status==='scheduled'),past=streams.filter(x=>x.status==='ended');
 const active=streams.find(x=>x.id===selected?.id)||live[0]||upcoming[0]||past[0]||null;
 async function changed(path,payload){try{await api(path,{method:'POST',body:payload});await refresh();const info=await api('/api/events-v2/info');setStreams(info.streams||[]);message('Livestream settings saved.');}catch(err){message(err.message);throw err;}}
 return <main className="view live-page">
  <Heading eyebrow="USA50 LIVE" title="Your idols, live ♡" subtitle="Watch official broadcasts, join the moderated live chat, and send demo STAR gifts." action={canCreate?<button className="action primary" onClick={()=>setCreating(x=>!x)}><Icon name="plus" size={17}/> {creating?'Close scheduler':'Schedule stream'}</button>:null}/>
  {creating&&<section className="management-panel"><h2>New USA50 broadcast</h2><NewStream done={()=>setCreating(false)}/></section>}
  <div className="live-feature-layout"><div className="live-feature-main">
   {active?<><section className="live-feature-heading"><div><Badge tone={active.status==='live'?'pink':'neutral'}>{active.status==='live'?'● LIVE':active.status.toUpperCase()}</Badge><h2>{active.title}</h2><p>{active.description||'An official USA50 livestream.'}</p><small>{dateTime(active.startsAt)} · {active.hostNames?.join(' + ')||'USA50'}</small></div></section>
    <VideoPlayer stream={active}/>
    {active.canEdit&&<Studio key={active.id} stream={active} onUpdate={changed}/>}

   </>:<Empty icon="📹" title="No broadcasts scheduled yet" detail="When USA50 schedules a new livestream it will appear here."/>}
  </div>
  <aside className="live-side"><div className="live-desktop-chat">{active&&<LiveChat key={active.id} stream={active}/>}</div>
   <SectionTitle title={live.length?'Live now':'Broadcast lineup'}/>
   {streams.length?<div className="live-stream-list">{[...live,...upcoming,...past].map(s=><button type="button" key={s.id} className={'live-stream-choice '+(active?.id===s.id?'active':'')} onClick={()=>setSelected(s)}><span className="live-stream-thumb">{s.status==='live'?'🔴':'✧'}</span><span><strong>{s.title}</strong><small>{s.hostNames?.join(', ')||'USA50'} · {s.status}</small><small>{dateTime(s.startsAt)}</small></span><Icon name="chevron" size={14}/></button>)}</div>:null}
   {canCreate&&<div className="react-note"><strong>Broadcast framework</strong><p>OBS sends video to an external RTMPS provider. USA50 displays the approved HTTPS player and hosts live chat, gifts, moderation, and a demo creator ledger. Real video ingest and payments require a configured provider.</p></div>}
  </aside>
  </div>
  {active&&<div className="react-note"><strong>USA50 livestream safety</strong><p>Live chat and Text-to-Speech requests are moderated. Host audio/video is sent through the configured streaming provider, not through this Railway server. Gift STARS and revenue split are demonstrations, not real cash payouts.</p></div>}
 </main>;
}
