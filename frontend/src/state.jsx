import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {api} from './api';
const Ctx=createContext(null);
export const NAV=[
 {id:'home',name:'Home',icon:'home'},
 {id:'collection',name:'Collection',icon:'collection'},
 {id:'drops',name:'Card Drops',icon:'drops',legacy:true},
 {id:'community',name:'Social',icon:'community'},
 {id:'rankings',name:'Fan Rankings',icon:'trophy'},
 {id:'idols',name:'Meet the Idols',icon:'profile'},
 {id:'messages',name:'Messages',icon:'messages',legacy:true},
 {id:'shop',name:'Shop',icon:'shop'},
 {id:'vip',name:'VIP Rewards',icon:'trophy'},
 {id:'events',name:'Events',icon:'events'},
 {id:'live',name:'Livestreams',icon:'live'},
 {id:'profile',name:'My Page',icon:'profile'},
 {id:'diary',name:'Diary Entries',icon:'collection',legacy:true},
 {id:'fansites',name:'Fansites',icon:'camera',legacy:true},
 {id:'recycle',name:'Recycle',icon:'collection',legacy:true},
 {id:'studio',name:'Creator Studio',icon:'camera',legacy:true},
 {id:'admin',name:'Management',icon:'settings',legacy:true}
];
const routeFromHash=()=>{
 const route=decodeURIComponent(window.location.hash.slice(1).replace(/^\/+/,'').split('/')[0]||'home');
 return NAV.some(x=>x.id===route)?route:'home';
};
export function AppProvider({children}){
 const [data,setData]=useState(null),[route,setRoute]=useState(routeFromHash);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [toast,setToast]=useState(''),[mailOpen,setMailOpen]=useState(false);
 const [selectedProfile,setSelectedProfile]=useState(null);
 const [selectedIdolId,setSelectedIdolId]=useState('arielle');
 const [selectedStreamId,setSelectedStreamId]=useState(null);
 const lastToast=useRef(null),mounted=useRef(true);
 const message=useCallback(text=>{setToast(String(text));window.clearTimeout(lastToast.current);lastToast.current=window.setTimeout(()=>setToast(''),4000);},[]);
 const refresh=useCallback(async()=>{
  const next=await api('/api/bootstrap');if(mounted.current){setData(next);setError('');}
  return next;
 },[]);
 useEffect(()=>{mounted.current=true;refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));
  return()=>{mounted.current=false;window.clearTimeout(lastToast.current);};
 },[refresh]);
 useEffect(()=>{const listener=()=>{setRoute(routeFromHash());setMailOpen(false);};
  window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener);
 },[]);
 const navigate=useCallback((id)=>{if(!NAV.some(x=>x.id===id))return;setRoute(id);setMailOpen(false);if(id!=='profile')setSelectedProfile(null);window.location.hash='/'+id;window.scrollTo({top:0,behavior:'instant'});},[]);
 const run=useCallback(async(path,body,verb='POST')=>{
  const result=await api(path,{method:verb,body});
  await refresh();
  return result;
 },[refresh]);
 const signIn=useCallback(async(endpoint,payload)=>{
  const result=await api('/api/auth/'+endpoint,{method:'POST',body:payload});
  if(result?.token)localStorage.setItem('usa50_dev_token',result.token);
  await refresh();message(endpoint==='login'?'Welcome back!':'Welcome to USA50!');
 },[refresh,message]);
 const signOut=useCallback(async()=>{
  await api('/api/auth/logout',{method:'POST',body:{}}).catch(()=>{});
  localStorage.removeItem('usa50_dev_token');setSelectedProfile(null);await refresh();
  navigate('home');message('Signed out.');
 },[refresh,navigate,message]);
 const markMail=useCallback(async(id)=>{
  await api('/api/notifications/read',{method:'POST',body:id?{id}:{}});
  const next=await api('/api/notifications/list');
  setData(prev=>prev?{...prev,mailbox:next}:prev);
 },[]);
 useEffect(()=>{if(route!=='events'||!data?.me||!data?.liveEvents?.newCount)return;
  api('/api/events-v2/seen',{method:'POST',body:{}}).then(()=>setData(prev=>prev?{...prev,liveEvents:{...prev.liveEvents,newCount:0}}:prev)).catch(()=>{});
 },[route,data?.me?.id,data?.liveEvents?.newCount]);
 useEffect(()=>{
  const timer=window.setInterval(async()=>{
   if(!document.hidden||document.visibilityState==='visible'){
    try{
     const [mail,events]=await Promise.all([api('/api/notifications/list'),api('/api/events-v2/info')]);
     if(mounted.current)setData(prev=>prev?{...prev,mailbox:mail,liveEvents:events}:prev);
    }catch(_){}
   }
  },30000);
  return()=>window.clearInterval(timer);
 },[]);
 const value=useMemo(()=>({data,route,navigate,refresh,run,message,signIn,signOut,markMail,mailOpen,setMailOpen,
  selectedProfile,setSelectedProfile,selectedIdolId,setSelectedIdolId,selectedStreamId,setSelectedStreamId,loading,error,setError}),[data,route,navigate,refresh,run,message,signIn,signOut,markMail,mailOpen,selectedProfile,selectedIdolId,selectedStreamId,loading,error]);
 return <Ctx.Provider value={value}>{children}{toast&&<div className="react-toast" role="status">{toast}</div>}</Ctx.Provider>;
}
export function useApp(){const context=useContext(Ctx);if(!context)throw Error('USA50 AppProvider missing');return context;}
