/* USA50 moderated fancall WebRTC client prototype.
 * Winner is routed into the room when their turn begins.
 * Camera & microphone activate only after explicit consent. */
(function(){
'use strict';
let joined=null,localStream=null,sequence=0,ticker=null,activeId=null,rtcConfig=null;
const peers=new Map(),remoteStreams=new Map();
const esc=v=>e(String(v||''));
function roomData(id){return (store?.fancalls?.sessions||[]).find(s=>s.id===id);}
function mediaRole(){
 const role=store?.me?.role;
 return ['management','admin'].includes(role)?'observer':role==='idol'?'host':'fan';
}
function canJoin(room){
 if(room.status!=='live')return false;
 if(mediaRole()==='fan')return !!room.isMyTurn;
 if(mediaRole()==='host')return !room.idolId||room.idolId===store?.me?.id;
 return room.canManage;
}
function message(s){const node=document.querySelector('#usa50-rtc-status');if(node)node.textContent=s;}
function closePeers(){
 for(const record of peers.values())try{record.pc.close();}catch(_){}
 peers.clear();remoteStreams.clear();
 if(localStream){localStream.getTracks().forEach(track=>track.stop());localStream=null;}
 if(ticker){clearInterval(ticker);ticker=null;}
 const old=activeId;activeId=null;joined=null;sequence=0;
 if(old)request('/api/fancalls/rtc/leave',{method:'POST',body:JSON.stringify({sessionId:old})}).catch(()=>{});
}
function addLocal(){
 const local=document.querySelector('#usa50-rtc-local');
 if(local){local.srcObject=localStream||null;local.muted=true;}
}
function attachRemote(){
 const host=document.querySelector('#usa50-rtc-peer-videos');
 if(!host)return;
 const entries=[...remoteStreams];
 if(entries.length)host.querySelector(':scope > p')?.remove();
 for(const node of [...host.querySelectorAll('[data-peer-id]')])if(!remoteStreams.has(node.dataset.peerId))node.remove();
 for(const [id,stream] of entries){
  let container=[...host.children].find(n=>n.dataset.peerId===id);
  if(!container){
   container=document.createElement('div');container.className='usa50-rtc-peer';container.dataset.peerId=id;
   container.innerHTML='<video autoplay playsinline></video><small>Remote participant</small>';
   host.append(container);
  }
  const video=container.querySelector('video');if(video.srcObject!==stream)video.srcObject=stream;
  const peer=peers.get(id);
  container.querySelector('small').textContent=peer?.role==='observer'?'Management supervising':peer?.role==='host'?'USA50 idol':'Fancall winner';
 }
}
async function send(to,signal){
 if(!activeId)return;
 try{
  await request('/api/fancalls/rtc/signal',{method:'POST',body:JSON.stringify({sessionId:activeId,to,signal})});
 }catch(err){message('Connection signaling error: '+err.message);}
}
function makePC(person){
 if(peers.has(person.id))return peers.get(person.id);
 const pc=new RTCPeerConnection(rtcConfig);
 const record={pc,role:person.role,pendingCandidates:[],startedOffer:false};
 peers.set(person.id,record);
 if(localStream)for(const track of localStream.getTracks())pc.addTrack(track,localStream);
 pc.ontrack=evt=>{
  let stream=evt.streams?.[0];
  if(!stream){stream=remoteStreams.get(person.id)||new MediaStream();stream.addTrack(evt.track);}
  remoteStreams.set(person.id,stream);attachRemote();
 };
 pc.onicecandidate=evt=>{
  if(evt.candidate)send(person.id,{type:'candidate',candidate:evt.candidate.candidate,sdpMid:evt.candidate.sdpMid,sdpMLineIndex:evt.candidate.sdpMLineIndex});
 };
 pc.onconnectionstatechange=()=>{
  message(pc.connectionState==='connected'?'Connected securely through WebRTC':pc.connectionState==='failed'?'Connection failed: TURN server may be needed':'Connection: '+pc.connectionState);
 };
 return record;
}
async function offer(person){
 const record=makePC(person),pc=record.pc;
 if(record.startedOffer||pc.signalingState!=='stable')return;
 record.startedOffer=true;
 try{
  await pc.setLocalDescription(await pc.createOffer());
  await send(person.id,{type:'offer',sdp:pc.localDescription.sdp});
 }catch(err){record.startedOffer=false;message(err.message);}
}
async function handleSignal(msg){
 const peer={id:msg.from,role:peers.get(msg.from)?.role||'fan'};
 const record=makePC(peer),pc=record.pc;
 try{
  if(msg.signal.type==='offer'){
   await pc.setRemoteDescription({type:'offer',sdp:msg.signal.sdp});
   for(const ice of record.pendingCandidates.splice(0))await pc.addIceCandidate(ice);
   await pc.setLocalDescription(await pc.createAnswer());
   await send(msg.from,{type:'answer',sdp:pc.localDescription.sdp});
  }else if(msg.signal.type==='answer'){
   await pc.setRemoteDescription({type:'answer',sdp:msg.signal.sdp});
   for(const ice of record.pendingCandidates.splice(0))await pc.addIceCandidate(ice);
  }else if(msg.signal.type==='candidate'){
   const ice=new RTCIceCandidate({candidate:msg.signal.candidate,sdpMid:msg.signal.sdpMid||null,sdpMLineIndex:msg.signal.sdpMLineIndex??null});
   if(pc.remoteDescription)await pc.addIceCandidate(ice);else record.pendingCandidates.push(ice);
  }
 }catch(err){message('WebRTC negotiation: '+err.message);}
}
let polling=false;
async function poll(){
 if(!joined||polling)return;polling=true;
 try{
  const result=await request('/api/fancalls/rtc/poll?sessionId='+encodeURIComponent(activeId)+'&after='+sequence);
  if(result.epoch!==joined.epoch||result.sessionStatus!=='live'){message('Host has paused or advanced the queue.');closePeers();return;}
  for(const person of result.peers||[]){
   const fresh=!peers.has(person.id);
   makePC(person);
   if(fresh&&String(joined.selfId)<String(person.id))await offer(person);
  }
  for(const msg of result.signals||[])await handleSignal(msg);
  sequence=Number(result.nextSeq||sequence);
  addLocal();attachRemote();
 }catch(err){message(err.message);}finally{polling=false;}
}
function compose(room){
 const allowed=canJoin(room);
 const content=room.status==='live'&&!allowed?'Wait for your turn. You will be invited automatically when the host advances the queue.':
 room.status==='break'?'An idol break is in progress. The room will unlock when the host resumes.':
 room.status==='waiting'?'Waiting for the host to begin the call queue.':
 room.status==='complete'?'Your fancall session is complete.':'The call is live. Participants may enter.';
 return '<section class="usa50-rtc-panel"><div class="row wrap"><div><span class="eyebrow">PRIVATE VIDEO ROOM · WEBRTC</span><h3>'+(mediaRole()==='observer'?'Management supervision':mediaRole()==='host'?'Idol Call Studio':'Your fancall room')+'</h3></div><span class="badge">'+esc(room.status)+'</span></div>'+
 '<p class="usa50-fineprint">'+esc(content)+'</p>'+
 '<div class="usa50-rtc-video-layout"><div class="usa50-rtc-remote" id="usa50-rtc-peer-videos"><p>Waiting for the other participant…</p></div><div class="usa50-rtc-self"><video id="usa50-rtc-local" autoplay playsinline muted></video><small>'+(mediaRole()==='observer'?'Supervisor · camera disabled':'Your camera')+'</small></div></div>'+
 '<div class="row wrap usa50-rtc-controls">'+
 (allowed&&!joined?'<button class="btn" data-action="usa50-rtc-connect">'+(mediaRole()==='observer'?'Join as supervisor':'Connect camera & microphone')+'</button>':'')+
 (joined?'<button class="btn secondary" data-action="usa50-rtc-disconnect">Disconnect</button>':'')+
 (joined&&mediaRole()!=='observer'?'<button class="btn tiny secondary" data-action="usa50-rtc-mute">Mute microphone</button><button class="btn tiny secondary" data-action="usa50-rtc-video-toggle">Turn off camera</button>':'')+
 '</div><p class="usa50-rtc-status" id="usa50-rtc-status">'+(joined?'Connected to signaling. Waiting for media peers.':allowed?'Management may supervise calls. By connecting, you agree to share your camera/microphone with the active idol, fan and authorized supervisors.':'Room is currently locked.')+'</p>'+
 '<p class="usa50-fineprint">Video/audio use peer-to-peer WebRTC when networks allow. TURN relay credentials and moderation rules must be configured before public launch. Calls are not recorded by this demo.</p></section>';
}
function mount(){
 const root=document.querySelector('.usa50-room');
 if(!root){if(activeId)closePeers();return;}
 const id=root.dataset.roomId,room=roomData(id);
 if(!room)return;
 if(activeId&&(activeId!==id||room.status!=='live'||!canJoin(room)))closePeers();
 // Replace the previous fake call preview with the actual gated video controls.
 const old=root.querySelector('.usa50-room-video');if(old)old.hidden=true;
 const queue=root.querySelector('.usa50-room-queue');
 if(queue)queue.insertAdjacentHTML('beforebegin',compose(room));
 if(joined){addLocal();attachRemote();}
}
async function connect(){
 if(!window.RTCPeerConnection)return toast('WebRTC requires a supported HTTPS browser.');
 const root=document.querySelector('.usa50-room'),id=root?.dataset.roomId,room=roomData(id);
 if(!id||!room||!canJoin(room))return toast('The call is not available yet.');
 if(!window.confirm('This fancall may be supervised by authorized USA50 management. Continue and share your '+(mediaRole()==='observer'?'view of the session':'camera and microphone')+'?'))return;
 try{
  if(mediaRole()!=='observer'){
   if(!navigator.mediaDevices?.getUserMedia)throw Error('A secure camera-enabled browser is required.');
   localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true},video:{facingMode:'user'}});
  }
  const response=await request('/api/fancalls/rtc/join',{method:'POST',body:JSON.stringify({sessionId:id})});
  activeId=id;joined=response;rtcConfig=response.rtcConfiguration;sequence=0;
  render();message(response.turnConfigured?'Connected. TURN relay configured.':'Connection ready (TURN relay not configured; some networks may fail).');
  for(const person of response.peers||[]){
   makePC(person);
   if(String(joined.selfId)<String(person.id))await offer(person);
  }
  ticker=setInterval(poll,1700);await poll();
 }catch(err){
  closePeers();toast('Unable to join: '+err.message);render();
 }
}
const previousRender=render;
render=function(){previousRender();mount();};
const previousAct=act;
act=async function(name,node){
 if(name==='usa50-rtc-connect')return connect();
 if(name==='usa50-rtc-disconnect'){closePeers();render();return;}
 if(name==='usa50-rtc-mute'){
  for(const track of localStream?.getAudioTracks()||[])track.enabled=!track.enabled;
  node.textContent=(localStream?.getAudioTracks()?.[0]?.enabled)?'Mute microphone':'Unmute microphone';return;
 }
 if(name==='usa50-rtc-video-toggle'){
  for(const track of localStream?.getVideoTracks()||[])track.enabled=!track.enabled;
  node.textContent=(localStream?.getVideoTracks()?.[0]?.enabled)?'Turn off camera':'Turn on camera';return;
 }
 if(name==='usa50-room-close'){closePeers();}
 if(name==='usa50-session-action'&&['break','next','end-early'].includes(node.dataset.session))closePeers();
 return previousAct(name,node);
};
const previousGo=go;
go=function(next){if(next!=='events')closePeers();return previousGo(next);};
window.addEventListener('pagehide',closePeers);
})();