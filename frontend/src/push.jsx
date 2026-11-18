import React,{useEffect,useState} from 'react';
import {useApp} from './state';
import {api} from './api';
function supported(){return typeof navigator!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function decodeKey(key){
 const pad='='.repeat((4-key.length%4)%4);
 const raw=atob((key+pad).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function subscription(){
 const registration=await navigator.serviceWorker.register('/live-sw.js',{scope:'/'});
 await navigator.serviceWorker.ready;
 return {registration,existing:await registration.pushManager.getSubscription()};
}
export function LivePushSettings(){
 const {data,message}=useApp(),[status,setStatus]=useState('checking'),[busy,setBusy]=useState(false);
 const available=supported();
 useEffect(()=>{
  if(!data?.me||!available){setStatus('unavailable');return;}
  let active=true;
  subscription().then(({existing})=>{if(active)setStatus(existing?'subscribed':'off');}).catch(()=>{if(active)setStatus('unavailable');});
  return()=>{active=false;};
 },[data?.me?.id,available]);
 if(!data?.me)return null;
 async function toggle(){
  if(!available){message('Web Push is unsupported here. On iPhone, install USA50 to the Home Screen first.');return;}
  setBusy(true);
  try{
   if(status==='subscribed'){
    const {existing}=await subscription();
    if(existing){await api('/api/push/unsubscribe',{method:'POST',body:{endpoint:existing.endpoint}});await existing.unsubscribe();}
    setStatus('off');message('Live notifications disabled.');return;
   }
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){message('Notifications were not allowed. You can change permission in browser settings.');return;}
   const config=await api('/api/push/config');
   if(!config.configured){message('Live push has not been configured by management. In-app mail still works.');return;}
   const {registration,existing}=await subscription();
   if(!existing){
    const sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
    await api('/api/push/subscribe',{method:'POST',body:{subscription:sub.toJSON()}});
   }
   setStatus('subscribed');message('You will be alerted when USA50 goes live!');
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <section className="push-settings"><div><strong>Get notified when your idols go live ♡</strong><small>Browser push is optional. Your in-app mail continues to work.</small></div><button type="button" disabled={busy||status==='checking'||status==='unavailable'} className="action secondary" onClick={toggle}>{status==='subscribed'?'Disable live alerts':status==='checking'?'Checking…':status==='unavailable'?'Browser alerts unavailable':'Enable live alerts'}</button></section>;
}
