/* Authenticated OBS overlay: token grants approved-TTS-only read access. */
(function(){
'use strict';
const args=new URLSearchParams(location.search);
const streamId=args.get('streamId'),token=args.get('token');
const status=document.querySelector('#tts-status');
const enable=document.querySelector('#tts-enable'),button=document.querySelector('#tts-start');
const bubble=document.querySelector('#tts-bubble'),name=document.querySelector('#tts-name'),message=document.querySelector('#tts-text');
let enabled=false,ready=false,seen=new Set(),queue=[],speaking=false,locked=false;
const supported='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
function speakNext(){
 if(!enabled||speaking||!queue.length||!supported)return;
 speaking=true;const item=queue.shift();
 name.textContent='@'+item.username+' sent a live gift';
 message.textContent=item.text;bubble.hidden=false;
 const utterance=new SpeechSynthesisUtterance(item.text);
 utterance.rate=.92;utterance.pitch=1.05;utterance.volume=1;
 const finished=()=>{
  speaking=false;bubble.hidden=true;speakNext();
 };
 utterance.onend=finished;utterance.onerror=finished;
 speechSynthesis.speak(utterance);
}
button.addEventListener('click',()=>{
 if(!supported){status.textContent='TTS is unavailable in this browser source.';return;}
 enabled=true;enable.hidden=true;status.textContent='USA50 TTS listening for approved gifts';
 speechSynthesis.resume();speakNext();
});
async function poll(){
 if(!streamId||!token||locked)return;
 locked=true;
 try{
  const result=await fetch('/api/livestreams/overlay?streamId='+encodeURIComponent(streamId)+'&token='+encodeURIComponent(token),{cache:'no-store'});
  if(!result.ok){status.textContent='Access denied: generate a new OBS overlay URL.';return;}
  const data=await result.json();
  if(!ready){for(const n of data.items||[])seen.add(n.id);ready=true;}
  else for(const n of data.items||[]){
   if(!seen.has(n.id)){seen.add(n.id);if(seen.size>100){seen=new Set([...seen].slice(-70));}queue.push(n);}
  }
  if(enabled)speakNext();
  if(data.status==='ended'){status.textContent='Stream ended';}
 }catch{status.textContent='Connecting to USA50 live…'}
 finally{locked=false}
}
poll();setInterval(poll,2400);
window.addEventListener('pagehide',()=>{if(supported)speechSynthesis.cancel()});
})();