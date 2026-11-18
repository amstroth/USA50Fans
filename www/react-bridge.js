/* Compatibility bridge for specialized vanilla-JS features during React migration. */
(function(){
 'use strict';
 const params=new URLSearchParams(window.location.search);
 const embedded=params.get('embed')==='1';
 const target=params.get('screen')||'';
 let initialNavigation=true;
 if(!embedded&&!target)return;
 if(embedded){
  document.documentElement.classList.add('usa50-react-embedded');
  document.body.classList.add('usa50-react-embedded');
 }
 const allowed=['home','collection','drops','community','messages','shop','events','fansites','recycle','profile','admin','scan','live'];
 function routeTo(screen){
  if(typeof go!=='function'||!allowed.includes(screen))return;
  try{go(screen);}catch(err){console.warn('Could not open feature',err);}
 }
 if(typeof go==='function'&&embedded){
  const original=go;
  go=function(screen){
   const result=original(screen);
   if(!initialNavigation&&allowed.includes(screen)&&window.parent!==window){
    window.parent.postMessage({type:'usa50:legacy-navigate',route:screen},window.location.origin);
   }
   return result;
  };
 }
 function launch(){
  if(target&&allowed.includes(target))routeTo(target);
  initialNavigation=false;
  const room=params.get('room');
  if(room&&target==='events'){
   let attempts=0;
   const timer=window.setInterval(()=>{
    attempts+=1;
    const found=typeof store!=='undefined'&&store?.fancalls?.sessions?.some(s=>s.id===room);
    if(found&&typeof act==='function'){
     window.clearInterval(timer);
     Promise.resolve(act('usa50-room-open',{dataset:{value:room}})).catch(console.error);
    }else if(attempts>=55){window.clearInterval(timer);}
   },180);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
