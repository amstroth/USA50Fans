import React,{useMemo,useState} from 'react';
import {useApp} from './state';
import {Badge,Empty,Heading,Icon,SectionTitle} from './ui';
import {dateTime,safeUrl} from './api';
function RoomOverlay({session,close}){
 return <div className="react-modal-cover room-cover" role="presentation"><div className="react-room-dialog" role="dialog" aria-modal="true" aria-label="USA50 fancall room"><header><div><span className="eyebrow">PRIVATE FANCALL ROOM</span><h2>{session.title}</h2></div><button className="icon-round" onClick={close} aria-label="Close call room"><Icon name="x"/></button></header><iframe src={'/index.html?embed=1&screen=events&room='+encodeURIComponent(session.id)} title="USA50 moderated fancall waiting room" allow="camera; microphone; fullscreen"/></div></div>;
}
function EventCard({event,admin,onStatus}){
 const url=safeUrl(event.admissionUrl);
 return <article className="event-card"><div className="event-card-content"><span className="eyebrow">{event.status==='on-sale'?'ADMISSION AVAILABLE':'USA50 EVENT'}</span><h3>{event.title}</h3><p>{event.description}</p><small>{dateTime(event.startsAt)} · {event.venue||'TBA'}</small></div><div className="event-card-actions">{event.priceLabel&&<Badge tone="pink">{event.priceLabel}</Badge>}
  {event.status==='on-sale'&&url?<a href={url} target="_blank" rel="noopener noreferrer" className="action primary">Official admission page <Icon name="external" size={14}/></a>:<Badge>{event.status||'Announced'}</Badge>}
  {admin&&url&&<button className="action soft" onClick={()=>onStatus(event.id,event.status==='on-sale'?'sold-out':'on-sale')}>{event.status==='on-sale'?'Mark sold out':'Open admission'}</button>}
 </div></article>;
}
function FancallLottery({draw,onChange,onRoom,admin}){
 const {data}=useApp(),[busy,setBusy]=useState(false);
 const now=Date.now(),closed=Date.parse(draw.closesAt)<now;
 const sessions=data?.fancalls?.sessions||[],room=sessions.find(x=>x.drawId===draw.id);
 const role=data?.me?.role;
 async function send(action){setBusy(true);try{await onChange(action,draw.id);}finally{setBusy(false);}}
 return <article className="lottery-card"><div className="lottery-top"><div><span className="eyebrow">FREE FANCALL LOTTERY · DEMO</span><h3>{draw.title}</h3></div><Badge tone={draw.status==='open'?'pink':'neutral'}>{draw.status}</Badge></div>
  <p>{draw.description||'Join this free-entry fancall drawing.'}</p>
  <div className="lottery-numbers"><div><strong>{draw.winnerCount}</strong><small>Winners</small></div><div><strong>{draw.entryCount}</strong><small>Entries</small></div><div><strong>{draw.currentEstimatedChance===null?'—':Number(draw.currentEstimatedChance).toFixed(1)+'%'}</strong><small>Estimated odds</small></div></div>
  <p className="fineprint">Closes {dateTime(draw.closesAt)}. Odds change as people enter. Free entry, one per account; digital card tickets do not affect drawing odds.</p>
  <div className="row-actions">
   {draw.status==='open'&&!closed&&(draw.joined?<button disabled={busy} className="action secondary" onClick={()=>send('withdraw')}>Withdraw entry</button>:<button disabled={busy} className="action primary" onClick={()=>send('join')}>Enter free lottery</button>)}
   {admin&&draw.status==='open'&&<button disabled={busy||!closed} className="action soft" onClick={()=>send('draw')}>Finalize drawing</button>}
   {draw.myWinner&&<Badge tone="pink">✦ You were selected!</Badge>}
   {room&&<button className="action primary" onClick={()=>onRoom(room)}>Open waiting room</button>}
  </div>
 </article>;
}
function AdminCreate({type,onSubmit}){
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[when,setWhen]=useState(''),[url,setUrl]=useState(''),[venue,setVenue]=useState(''),[price,setPrice]=useState(''),[count,setCount]=useState(5),[idolId,setIdolId]=useState(''),[busy,setBusy]=useState(false);
 const {data,message}=useApp();
 const idols=Object.values(data?.social?.profiles||{}).filter(p=>p.verifiedIdol);
 async function submit(e){
  e.preventDefault();setBusy(true);
  try{
   const date=new Date(when).toISOString();
   const payload=type==='lottery'?{title,description,closesAt:date,winnerCount:Number(count),idolId}:
    type==='stream'?{title,description,startsAt:date,playerUrl:url}:
    {title,description,startsAt:date,admissionUrl:url,venue,priceLabel:price};
   await onSubmit(type,payload);
   setTitle('');setDescription('');setUrl('');setVenue('');setPrice('');message('Published successfully.');
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <form className="react-form admin-create" onSubmit={submit}>
  <label>{type==='lottery'?'Lottery title':type==='stream'?'Livestream title':'Event title'}<input value={title} required minLength={3} maxLength={90} onChange={e=>setTitle(e.target.value)}/></label>
  <label>{type==='lottery'?'Entry closing date':'Start date'}<input type="datetime-local" value={when} required onChange={e=>setWhen(e.target.value)}/></label>
  <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={600}/></label>
  {type==='lottery'?<><label>Winner count<input type="number" min={1} max={100} value={count} onChange={e=>setCount(e.target.value)} required/></label><label>Assigned idol<select value={idolId} onChange={e=>setIdolId(e.target.value)}><option value="">Any available idol</option>{idols.map(i=><option value={i.id} key={i.id}>{i.displayName}</option>)}</select></label></>:type==='event'?<>
    <label>Location / venue<input value={venue} maxLength={100} onChange={e=>setVenue(e.target.value)}/></label>
    <label>Official ticket page (HTTPS)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://ticket-provider.example/..." /></label>
    <label>Price label<input value={price} maxLength={48} onChange={e=>setPrice(e.target.value)} placeholder="From $20"/></label>
   </>:<label>Approved provider player URL (optional until ready)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://iframe.videodelivery.net/..."/></label>}
  <button className="action primary full" disabled={busy}>{busy?'Publishing…':type==='lottery'?'Create lottery':type==='event'?'Publish event':'Schedule livestream'}</button>
 </form>;
}
export function EventsPage(){
 const {data,run,message,navigate,refresh}=useApp(),[adminTab,setAdminTab]=useState('lottery'),[room,setRoom]=useState(null);
 const events=data?.liveEvents?.events||[],streams=data?.liveEvents?.streams||[],draws=data?.fancalls?.draws||[],sessions=data?.fancalls?.sessions||[];
 const staff=['admin','management'].includes(data?.me?.role);
 async function change(action,id){try{await run('/api/fancalls/'+action,{drawId:id});message(action==='join'?'Free lottery entry received.':action==='withdraw'?'Entry withdrawn.':'Lottery finalized.');}catch(err){message(err.message);}}
 async function status(id,next){try{await run('/api/events-v2/status',{eventId:id,status:next});}catch(err){message(err.message);}}
 async function submit(type,body){const url=type==='lottery'?'/api/fancalls/create':type==='stream'?'/api/livestreams/create':'/api/events-v2/create';await run(url,body);}
 async function streamStatus(id,status){try{await run('/api/livestreams/status',{streamId:id,status});}catch(err){message(err.message);}}
 return <main className="view events-page">
  <Heading eyebrow="USA50 EVENTS" title="Events & Fancalls" subtitle="Find upcoming experiences, live broadcasts, and free-entry fancall drawings."/>
  <SectionTitle title="Admission and events"/>{events.length?events.map(e=><EventCard event={e} key={e.id} admin={staff} onStatus={status}/>):<Empty icon="🎫" title="No admissions announced yet" detail="Upcoming events and official ticket listings will appear here."/>}
  <SectionTitle title="Free fancall lotteries"/>{draws.length?draws.map(d=><FancallLottery key={d.id} draw={d} onChange={change} onRoom={setRoom} admin={staff}/>):<Empty icon="💌" title="No lotteries open yet" detail="Management can publish a free-entry fancall lottery."/>}
  {sessions.filter(s=>s.status!=='complete'&&!room).length>0&&<div className="room-queue-list"><SectionTitle title="Your call waiting rooms"/>{sessions.filter(s=>s.status!=='complete').map(s=><button className="inventory-row room-shortcut" key={s.id} onClick={()=>setRoom(s)}><span className="ticket-icon">📹</span><div><strong>{s.title}</strong><small>{s.status} · {s.queue.length} winners</small></div><Icon name="chevron"/></button>)}</div>}
  <SectionTitle title="Livestreams"/>{streams.length?streams.map(s=><article className="stream-card" key={s.id}><div className="lottery-top"><h3>{s.title}</h3><Badge tone={s.status==='live'?'pink':'neutral'}>{s.status}</Badge></div><p>{s.description}</p>{s.status==='live'&&safeUrl(s.playerUrl)?<div className="stream-player"><iframe title={s.title} src={s.playerUrl} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/></div>:<div className="stream-placeholder"><span>✦</span><p>{s.status==='ended'?'Broadcast has ended':'Stream will appear here when live'}</p></div>}
     {staff&&<div className="row-actions"><button className="action soft" onClick={()=>streamStatus(s.id,'live')}>Go live</button><button className="action soft" onClick={()=>streamStatus(s.id,'ended')}>End stream</button></div>}
    </article>):<Empty icon="📹" title="No livestreams scheduled" detail="Future streams will be available here."/>}
  {staff&&<section className="management-panel"><span className="eyebrow">USA50 MANAGEMENT</span><h2>Publish and manage experiences</h2><div className="segmented-tabs">{[['lottery','Lottery'],['event','Admission'],['stream','Livestream']].map(([key,label])=><button key={key} className={adminTab===key?'selected':''} onClick={()=>setAdminTab(key)}>{label}</button>)}</div><AdminCreate key={adminTab} type={adminTab} onSubmit={submit}/><button className="text-link" onClick={()=>navigate('live')}>Open the full OBS broadcasting controls →</button></section>}
  {room&&<RoomOverlay session={room} close={()=>{setRoom(null);refresh().catch(()=>{});}}/>}
 </main>;
}
