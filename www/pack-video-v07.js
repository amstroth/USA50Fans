/* USA50 card-opening video with CSS fallback; reward data remains server-authoritative. */
(function installRunwayPackOpening(){
'use strict';
const previousOpening=showPackOpening;
let currentFinish=null;
showPackOpening=function(result,freePull=false){
  const pack=window.USA50_SelectedPack?.();
  const name=pack?.title||'True Love';
  // A real file shipped with the app is important: the signed Runway URL expires.
  const videoUrl='/assets/video/pack-opening-v07.mp4';
  const content='<div class="runway-opening">'+
     '<div class="runway-opening-frame">'+
     '<video class="runway-opening-video" id="runway-opening-video" src="'+videoUrl+'" muted playsinline autoplay preload="auto" aria-label="Iridescent photocard pack spinning and opening"></video>'+
     '<div class="runway-opening-overlay"><span>USA50 · '+e(name)+'</span><strong>Unwrapping your stars ✦</strong></div></div>'+
     '<button type="button" class="opening-skip" data-pack-video-skip="1">Skip animation</button></div>';
  showModal('Opening '+name+' ✦',content);
  const video=document.getElementById('runway-opening-video');
  let completed=false;
  let watchdog;
  const done=()=>{
    if(completed)return;completed=true;
    clearTimeout(watchdog);
    if(video){video.pause();video.onended=null;video.onerror=null;}
    currentFinish=null;
    // The existing card-first reveal is retained (currencies on second screen).
    dreamReveal(result);
  };
  currentFinish=done;
  if(!video)return previousOpening(result,freePull);
  video.onended=done;
  video.onerror=()=>{if(completed)return;completed=true;clearTimeout(watchdog);currentFinish=null;previousOpening(result,freePull);};
  watchdog=setTimeout(done,8500);
  const p=video.play();if(p&&p.catch)p.catch(()=>{if(!completed){completed=true;clearTimeout(watchdog);currentFinish=null;previousOpening(result,freePull);}});
};
document.addEventListener('click',event=>{
  if(event.target.closest('[data-pack-video-skip]')){
    event.preventDefault();event.stopImmediatePropagation();
    currentFinish?.();
  }
},true);
})();