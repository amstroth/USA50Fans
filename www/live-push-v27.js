/* Permission-based browser push subscriptions for USA50 live announcements. */
(function(){
'use strict';
let initiated=false,pushState=null,initialOpen=false;
function supports(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function decode(base64){
 const padding='='.repeat((4-base64.length%4)%4);
 const binary=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function update(){
 if(view!=='events')return;
 let holder=document.querySelector('.usa50-live-push-pref');
 if(!holder){
  const head=document.querySelector('.usa50-events-extended .usa50-heading-mini');
  if(!head)return;
  head.insertAdjacentHTML('afterend','<section class="usa50-live-push-pref"><div><strong>Get notified when your idols go live ♡</strong><small>Opt in to browser push alerts. In-app mail notifications always work.</small></div><button type="button" class="btn tiny secondary" data-action="usa50-live-push">'+(pushState==='subscribed'?'Disable live alerts':'Enable live alerts')+'</button></section>');
  holder=document.querySelector('.usa50-live-push-pref');
 }
 const button=holder.querySelector('button');
 if(button)button.textContent=pushState==='subscribed'?'Disable live alerts':'Enable live alerts';
}
async function subscription(){
 const registration=await navigator.serviceWorker.register('/live-sw.js',{scope:'/'});
 await navigator.serviceWorker.ready;
 return {registration,existing:await registration.pushManager.getSubscription()};
}
const oldAct=act;
act=async function(name,node){
 if(name!=='usa50-live-push')return oldAct(name,node);
 if(!store?.me)return toast('Sign in to enable live alerts.');
 if(!supports())return toast('This browser does not support Web Push. On iPhone, install USA50 to the Home Screen first.');
 if(pushState==='subscribed'){
  const {existing}=await subscription();
  if(existing){
   await request('/api/push/unsubscribe',{method:'POST',body:JSON.stringify({endpoint:existing.endpoint})});
   await existing.unsubscribe();pushState='off';update();toast('Live push alerts disabled.');return;
  }
 }
 // Browser permission must be requested immediately within the user's tap.
 const allowed=Notification.permission==='granted'?'granted':await Notification.requestPermission();
 if(allowed!=='granted')return toast('Notification permission was not granted. Change it in your device settings.');
 const cfg=await request('/api/push/config');
 if(!cfg.configured)return toast('Live alerts are not configured yet. In-app mail will still notify you.');
 const {registration,existing}=await subscription();
 if(existing){pushState='subscribed';update();toast('Live alerts are already enabled.');return;}
 const sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(cfg.publicKey)});
 await request('/api/push/subscribe',{method:'POST',body:JSON.stringify({subscription:sub.toJSON()})});
 pushState='subscribed';update();toast('You will get an alert when USA50 goes live!');return;
};
const oldRender=render;
render=function(){
 oldRender();update();
 if(!initialOpen&&new URLSearchParams(location.search).get('open')==='events'&&store?.me){
  initialOpen=true;
  history.replaceState(null,'',location.pathname);
  if(view!=='events')queueMicrotask(()=>go('events'));
 }
 if(view==='events'&&supports()&&!initiated){
  initiated=true;subscription().then(({existing})=>{pushState=existing?'subscribed':'off';update()}).catch(()=>{pushState='off'});
 }
};
})();