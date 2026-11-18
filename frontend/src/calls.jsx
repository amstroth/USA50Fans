import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useApp} from './state';
import {Badge,Heading,Icon} from './ui';
import {api,dateTime} from './api';

function VideoTile({stream,label,muted=false,mirror=false}){
 const element=useRef(null);
 useEffect(()=>{if(element.current)element.current.srcObject=stream||null;return()=>{if(element.current)element.current.srcObject=null;};},[stream]);
 return <div className={'call-video-tile '+(mirror?'mirrored':'')}><video ref={element} autoPlay playsInline muted={muted}/><span>{label}</span>{!stream&&<div className="call-camera-placeholder">✧<small>Waiting for video</small></div>}</div>;
}
function useFancallMedia(sessionId){
 const {message}=useApp();
 const [connected,setConnected]=useState(false),[status,setStatus]=useState('Not connected'),[local,setLocal]=useState(null),[remote,setRemote]=useState([]);
 const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[turnReady,setTurnReady]=useState(false);
 const ref=useRef({active:false,id:sessionId,member:null,peers:new Map(),media:null,after:0,timer:null,turn:null,polling:false});
 const send=useCallback(async(to,signal)=>{
  if(!ref.current.active)return;
  try{await api('/api/fancalls/rtc/signal',{method:'POST',body:{sessionId:ref.current.id,to,signal}});}
  catch(err){setStatus('Signaling: '+err.message);}
 },[]);
 const updateRemotes=useCallback(()=>{
  setRemote([...ref.current.peers.entries()].map(([id,item])=>({id,role:item.role,stream:item.stream,connection:item.pc.connectionState})));
 },[]);
 const stop=useCallback(()=>{
  const r=ref.current;
  const wasActive=r.active;
  r.active=false;
  if(r.timer){clearInterval(r.timer);r.timer=null;}
  for(const item of r.peers.values()){try{item.pc.onicecandidate=null;item.pc.ontrack=null;item.pc.close();}catch(_){}}
  r.peers.clear();if(r.media){for(const track of r.media.getTracks())track.stop();r.media=null;}
  if(wasActive)api('/api/fancalls/rtc/leave',{method:'POST',body:{sessionId:r.id}}).catch(()=>{});
  r.member=null;r.after=0;r.polling=false;r.turn=null;
  setConnected(false);setLocal(null);setRemote([]);setMuted(false);setCameraOff(false);setStatus('Disconnected');
 },[]);
 const peer=useCallback((person)=>{
  const r=ref.current;
  if(r.peers.has(person.id))return r.peers.get(person.id);
  const pc=new RTCPeerConnection(r.member.rtcConfiguration);
  const record={pc,role:person.role||'peer',stream:null,pending:[],makingOffer:false};
  r.peers.set(person.id,record);
  if(r.media){r.media.getTracks().forEach(track=>pc.addTrack(track,r.media));}
  else if(r.member.role==='observer'){pc.addTransceiver('audio',{direction:'recvonly'});pc.addTransceiver('video',{direction:'recvonly'});}
  pc.ontrack=event=>{
   const source=event.streams?.[0];
   if(source)record.stream=source;
   else{record.stream ||= new MediaStream();if(!record.stream.getTracks().includes(event.track))record.stream.addTrack(event.track);}
   updateRemotes();
  };
  pc.onicecandidate=event=>{
   if(event.candidate){
    send(person.id,{type:'candidate',candidate:event.candidate.candidate,sdpMid:event.candidate.sdpMid,sdpMLineIndex:event.candidate.sdpMLineIndex});
   }
  };
  pc.onconnectionstatechange=()=>{
   if(pc.connectionState==='failed')setStatus('Connection failed. The call may require a TURN relay on this network.');
   if(pc.connectionState==='connected')setStatus('Connected securely through WebRTC');
   updateRemotes();
  };
  updateRemotes();
  return record;
 },[send,updateRemotes]);
 const offer=useCallback(async(person)=>{
  const r=ref.current;const item=peer(person),pc=item.pc;
  if(item.makingOffer||pc.signalingState!=='stable')return;
  item.makingOffer=true;
  try{await pc.setLocalDescription(await pc.createOffer());await send(person.id,{type:'offer',sdp:pc.localDescription.sdp});}
  catch(err){item.makingOffer=false;setStatus('Offer failed: '+err.message);}
 },[peer,send]);
 const consume=useCallback(async(signal)=>{
  const r=ref.current;
  const item=peer({id:signal.from,role:r.peers.get(signal.from)?.role||'peer'});
  const pc=item.pc;
  try{
   if(signal.signal.type==='offer'){
    // Resolve rare offer collisions by preserving a single deterministic initiator.
    if(pc.signalingState==='have-local-offer'){
     if(String(r.member.selfId)<String(signal.from))return;
     await pc.setLocalDescription({type:'rollback'});
    }
    await pc.setRemoteDescription({type:'offer',sdp:signal.signal.sdp});
    for(const ice of item.pending.splice(0))await pc.addIceCandidate(ice);
    await pc.setLocalDescription(await pc.createAnswer());
    await send(signal.from,{type:'answer',sdp:pc.localDescription.sdp});
   }else if(signal.signal.type==='answer'){
    if(pc.signalingState!=='have-local-offer')return;
    await pc.setRemoteDescription({type:'answer',sdp:signal.signal.sdp});
    for(const ice of item.pending.splice(0))await pc.addIceCandidate(ice);
   }else if(signal.signal.type==='candidate'){
    const ice=new RTCIceCandidate({candidate:signal.signal.candidate,sdpMid:signal.signal.sdpMid||null,sdpMLineIndex:signal.signal.sdpMLineIndex??null});
    if(pc.remoteDescription)await pc.addIceCandidate(ice);else item.pending.push(ice);
   }
  }catch(err){setStatus('Connection negotiation: '+err.message);}
 },[peer,send]);
 const poll=useCallback(async()=>{
  const r=ref.current;if(!r.active||r.polling)return;r.polling=true;
  try{
   const data=await api('/api/fancalls/rtc/poll?sessionId='+encodeURIComponent(r.id)+'&after='+r.after);
   if(!r.active)return;
   if(data.epoch!==r.member?.epoch||data.sessionStatus!=='live'||(r.member.role==='fan'&&data.activeFanId!==r.member.selfId)){
    setStatus('The session advanced or was paused. Your camera and microphone were disconnected.');stop();return;
   }
   const current=new Set((data.peers||[]).map(p=>p.id));
   for(const [id,item] of r.peers)if(!current.has(id)){
    item.pc.close();r.peers.delete(id);
   }
   for(const p of data.peers||[]){
    const fresh=!r.peers.has(p.id);
    const connection=peer(p);
    if(connection.role==='peer')connection.role=p.role;
    if(fresh&&String(r.member.selfId)<String(p.id))await offer(p);
   }
   for(const signal of data.signals||[])await consume(signal);
   r.after=Number(data.nextSeq||r.after);
   updateRemotes();
  }catch(err){if(r.active)setStatus('Waiting to reconnect: '+err.message);}
  finally{r.polling=false;}
 },[peer,offer,consume,stop,updateRemotes]);
 const connect=useCallback(async(role)=>{
  if(ref.current.active)return;
  if(!window.RTCPeerConnection)return message('This browser does not support WebRTC.');
  const label=role==='observer'?'You will join as a management supervisor. Other participants are notified that supervision is possible.':'Allow USA50 to share your camera and microphone with the active call participant and authorized management supervisors?';
  if(!window.confirm(label))return;
  setStatus('Joining secure waiting room…');
  let entered=false;
  try{
   const joined=await api('/api/fancalls/rtc/join',{method:'POST',body:{sessionId}});
   entered=true;
   let media=null;
   if(joined.role!=='observer'){
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera and microphone require an HTTPS-supported browser.');
    media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{facingMode:'user'}});
   }
   const r=ref.current;r.active=true;r.id=sessionId;r.member=joined;r.media=media;r.peers=new Map();r.after=0;r.polling=false;
   setLocal(media);setConnected(true);setTurnReady(Boolean(joined.turnConfigured));
   setStatus(joined.turnConfigured?'Ready. TURN relay is configured.':'Ready. STUN only: some mobile/carrier networks will need a TURN relay.');
   for(const p of joined.peers||[]){
    peer(p);
    if(String(joined.selfId)<String(p.id))await offer(p);
   }
   r.timer=setInterval(poll,1600);await poll();
  }catch(err){
   if(entered)api('/api/fancalls/rtc/leave',{method:'POST',body:{sessionId}}).catch(()=>{});
   stop();setStatus('Unable to join: '+err.message);message(err.message);
  }
 },[sessionId,peer,offer,poll,stop,message]);
 const toggleMic=useCallback(()=>{const tracks=ref.current.media?.getAudioTracks()||[];if(!tracks.length)return;const on=!tracks[0].enabled;tracks.forEach(t=>t.enabled=on);setMuted(!on);},[]);
 const toggleCamera=useCallback(()=>{const tracks=ref.current.media?.getVideoTracks()||[];if(!tracks.length)return;const on=!tracks[0].enabled;tracks.forEach(t=>t.enabled=on);setCameraOff(!on);},[]);
 useEffect(()=>()=>{const r=ref.current;r.active=false;if(r.timer)clearInterval(r.timer);for(const record of r.peers.values())record.pc.close();r.media?.getTracks().forEach(t=>t.stop());if(r.member)api('/api/fancalls/rtc/leave',{method:'POST',body:{sessionId:r.id}}).catch(()=>{});},[]);
 return {connect,stop,connected,status,local,remote,muted,cameraOff,turnReady,toggleMic,toggleCamera};
}
function Queue({room}){return <section className="call-queue"><h3>Fancall queue ♡</h3><div className="call-queue-list">{(room.queue||[]).map(person=><div key={person.position} className={'call-queue-line '+(person.active?'active':'')+(person.done?' done':'')}><span className="queue-index">{person.done?'✓':person.position}</span><span><strong>{person.isMe?'You · '+person.displayName:person.displayName}</strong><small>{person.done?'Completed':room.status==='live'&&person.active?'Now talking':person.active?'Up next':'Waiting'}</small></span>{person.active&&<Badge tone="pink">{room.status==='live'?'In call':'Next'}</Badge>}</div>)}</div></section>}
export function CallRoom({sessionId,onClose}){
 const {data,refresh,message}=useApp();
 const [room,setRoom]=useState(()=>data?.fancalls?.sessions?.find(s=>s.id===sessionId)||null);
 const [busy,setBusy]=useState(false),[statusError,setStatusError]=useState('');
 const {connect,stop,connected,status,local,remote,muted,cameraOff,turnReady,toggleMic,toggleCamera}=useFancallMedia(sessionId);
 const role=data?.me?.role||'fan',observer=['admin','management'].includes(role);
 const host=role==='idol',isCurrent=room?.isMyTurn;
 const allowed=room?.status==='live'&&(observer||host&&room?.canHost||isCurrent);
 const roomRef=useRef(room);roomRef.current=room;
 const refreshRoom=useCallback(async()=>{
  try{
   const response=await api('/api/fancalls/session-state?sessionId='+encodeURIComponent(sessionId));
   setRoom(response.session);setStatusError('');
  }catch(err){setStatusError(err.message);}
 },[sessionId]);
 useEffect(()=>{
  refreshRoom();
  const timer=setInterval(()=>{if(!document.hidden)refreshRoom();},3000);
  return()=>clearInterval(timer);
 },[refreshRoom]);
 useEffect(()=>{
  if(connected&&(!allowed||room?.status!=='live'))stop();
 },[connected,allowed,room?.status,room?.cursor,stop]);
 async function action(which){
  if(!room||busy)return;
  if(['next','end-early'].includes(which)&&!window.confirm('Finish the current participant’s call and move to the next fan?'))return;
  if(which==='break'&&!window.confirm('Pause this fancall? Active cameras will disconnect.'))return;
  setBusy(true);
  try{
   if(which!=='start'&&which!=='resume')stop();
   await api('/api/fancalls/session',{method:'POST',body:{sessionId,action:which}});
   await refreshRoom();await refresh();
   message(which==='next'?'Next fan queued.':which==='end-early'?'Call ended and queue advanced.':which==='break'?'Fancall paused.':'Fancall is live.');
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 function close(){stop();onClose();}
 return <div className="react-modal-cover native-call-cover" role="presentation">
  <div className="native-call-dialog" role="dialog" aria-label={room?.title||'USA50 fancall room'} aria-modal="true">
   <header className="native-call-header"><div><span className="eyebrow">USA50 · PRIVATE FANCALL</span><h2>{room?.title||'Loading fancall…'}</h2><p>{room?.idolName||'USA50 Idol'} · {observer?'Management supervision':host?'Idol host studio':'Winner waiting room'}</p></div><button className="icon-round" aria-label="Leave room" onClick={close}><Icon name="x"/></button></header>
   <div className="native-call-body">
    <div className="native-call-main">
     <div className="native-call-status"><Badge tone={room?.status==='live'?'pink':'neutral'}>{room?.status==='live'?'● LIVE':String(room?.status||'waiting').toUpperCase()}</Badge>
      <span>{room?.status==='complete'?'All calls completed':room?.status==='break'?'Idol break · next fan waiting':room?.status==='live'?'Now talking with '+(room.activeName||'the winner'):'The host will start when ready'}</span>
     </div>
     <div className="native-call-videos">
      <div className="native-call-peer-grid">{remote.length?remote.map(item=><VideoTile key={item.id} stream={item.stream} label={item.role==='host'?'USA50 idol':item.role==='observer'?'Authorized management':'Fancall winner'}/>):<div className="call-empty-peer"><span>✧</span><strong>Private call lounge</strong><p>{allowed?'Waiting for the other participant…':room?.status==='live'?'Not your turn yet. Stay in the queue.':'Waiting for the host.'}</p></div>}</div>
      {connected&&<div className="call-self-camera"><VideoTile stream={local} muted mirror label={observer?'Supervisor · audio off':'You'}/></div>}
     </div>
     <div className="call-connect-toolbar">
      {!connected&&allowed&&<button className="action primary" onClick={()=>connect(observer?'observer':host?'host':'fan')}><Icon name="camera" size={18}/>{observer?'Join as supervisor':'Connect camera & microphone'}</button>}
      {connected&&<><button className="action soft" onClick={toggleMic} disabled={observer}>{muted?'Unmute mic':'Mute mic'}</button><button className="action soft" onClick={toggleCamera} disabled={observer}>{cameraOff?'Enable camera':'Turn off camera'}</button><button className="action secondary" onClick={stop}>Disconnect</button></>}
     </div>
     <p className="call-status-message" role="status">{statusError||status}</p>
     <p className="fineprint">Video/audio uses WebRTC and requires explicit camera/microphone permission. Authorized management may supervise. Calls are not recorded by this framework. Reliable mobile connectivity needs a configured TURN provider.</p>
    </div>
    <aside className="native-call-sidebar">
     <Queue room={room||{queue:[]}}/>
     {(room?.canHost||room?.canManage)&&<section className="call-host-controls"><strong>Host queue controls</strong><p className="fineprint">Advancing or pausing disconnects everyone from the previous call. The next winner joins only when the host resumes.</p>
      <div className="call-host-buttons">
       {room?.status==='waiting'&&<button disabled={busy} className="action primary" onClick={()=>action('start')}>Start fancalls</button>}
       {room?.status==='break'&&<button disabled={busy} className="action primary" onClick={()=>action('resume')}>Resume · next fan</button>}
       {room?.status==='live'&&<><button disabled={busy} className="action secondary" onClick={()=>action('break')}>Take a break</button><button disabled={busy} className="action primary" onClick={()=>action('next')}>Finish & next fan</button><button disabled={busy} className="action soft" onClick={()=>action('end-early')}>End this call early</button></>}
      </div>
     </section>}
     {room?.isMyWinner&&!isCurrent&&room.status!=='complete'&&<div className="call-winner-note"><strong>You're on the list ♡</strong><p>Your call button activates when the idol reaches your place in the queue.</p></div>}
    </aside>
   </div>
  </div>
 </div>;
}
