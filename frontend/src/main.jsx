import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppProvider,NAV,useApp} from './state';
import {Icon} from './ui';
import {HomePage,CollectionPage,ShopPage,LegacyPage} from './core-pages';
import {SocialPage} from './social';
import {ProfilePage} from './profile';
import {EventsPage} from './events';
import {RankingsPage} from './rankings';
import {LivePage} from './live';
import {dateTime,number} from './api';
import './app.css';
function Mailbox(){
 const {data,markMail,setMailOpen,navigate,message}=useApp();
 const items=data?.mailbox?.items||[];
 async function openItem(item){
  try{await markMail(item.id);setMailOpen(false);
   if(item.type?.startsWith('fancall'))navigate('events');
   else if(item.type==='idol-heart')navigate('community');
   else if(item.type==='idol-reply')navigate('messages');
   else navigate('profile');
  }catch(err){message(err.message);}
 }
 async function readAll(){try{await markMail();}catch(err){message(err.message);}}
 return <div className="react-modal-cover mail-cover" onMouseDown={e=>e.target===e.currentTarget&&setMailOpen(false)} role="presentation"><div role="dialog" aria-modal="true" aria-label="USA50 Mail" className="react-modal mail-dialog">
  <header><div><span className="eyebrow">YOUR USA50 UNIVERSE</span><h2>Mail & notifications ✉</h2></div><button onClick={()=>setMailOpen(false)} aria-label="Close"><Icon name="x"/></button></header>
  <div className="mail-controls"><small>{data?.mailbox?.unread||0} unread</small>{data?.mailbox?.unread>0&&<button className="text-link" onClick={readAll}>Mark all read</button>}</div>
  <div className="mail-list">{items.length?items.map(item=><button className={'mail-item '+(item.read?'read':'unread')} key={item.id} onClick={()=>openItem(item)}><span className="mail-symbol">{({'idol-heart':'♥','idol-reply':'💌','fancall-won':'🎫','fancall-lost':'✉','fan-rank':'🏆','vip-tier':'✦'})[item.type]||'✧'}</span><span><strong>{item.text}</strong><small>{dateTime(item.createdAt)}</small></span>{!item.read&&<i className="unread-circle"/>}</button>):<div className="empty-mail">Your inbox is empty. Idol hearts, fancall results, replies and VIP milestones will appear here.</div>}</div>
 </div></div>;
}
const BOTTOM=['home','collection','messages','community','shop','profile'];
function AppShell(){
 const {data,route,navigate,mailOpen,setMailOpen,loading,error,refresh}=useApp(),[menuOpen,setMenuOpen]=useState(false);
 const me=data?.me,mailCount=data?.mailbox?.unread||0,eventCount=data?.liveEvents?.newCount||0;
 const titles=Object.fromEntries(NAV.map(x=>[x.id,x.name]));
 useEffect(()=>{document.title='USA50 · '+(titles[route]||'Fan Club');},[route]);
 useEffect(()=>{
  function handle(event){if(event.origin!==window.location.origin||event.data?.type!=='usa50:legacy-navigate')return;
   const target=event.data.route;
   if(NAV.some(x=>x.id===target)&&target!==route)navigate(target);
  }
  window.addEventListener('message',handle);return()=>window.removeEventListener('message',handle);
 },[route,navigate]);
 if(loading)return <div className="react-loading"><div>✦</div><strong>USA50</strong><p>Opening your fan universe…</p></div>;
 if(error&&!data)return <div className="react-loading"><div>✧</div><h2>Could not load USA50</h2><p>{error}</p><button className="action primary" onClick={()=>refresh().catch(()=>{})}>Try again</button><a href="/index.html">Open classic app</a></div>;
 function switchTo(page){setMenuOpen(false);navigate(page);}
 const navLink=(entry,className='')=><button key={entry.id} className={'nav-link '+className+(route===entry.id?' active':'')} onClick={()=>switchTo(entry.id)} aria-current={route===entry.id?'page':undefined}><Icon name={entry.icon} size={20}/><span>{entry.name}</span>{entry.id==='events'&&eventCount>0&&<i className="nav-dot" aria-label={eventCount+' new Events'}/>}</button>;
 return <div className="react-app">
  <aside className={'react-sidebar '+(menuOpen?'menu-open':'')}>
   <button className="sidebar-logo" onClick={()=>switchTo('home')}><span>USA50</span><small>FAN CLUB</small></button>
   <div className="sidebar-links">{NAV.slice(0,9).map(x=>navLink(x))}<div className="sidebar-divider"/>{NAV.slice(9).filter(x=>x.id!=='admin'||me?.role==='admin').map(x=>navLink(x))}</div>
   <div className="sidebar-foot"><span className="eyebrow">DEVELOPMENT PREVIEW</span><p>Closer to your stars ♡</p><a href="/index.html" className="classic-link">Use original interface <Icon name="external" size={13}/></a></div>
  </aside>
  <div className="react-main">
   <header className="react-topbar">
    <button className="react-menu-toggle" onClick={()=>setMenuOpen(x=>!x)} aria-label="Toggle menu"><Icon name={menuOpen?'x':'menu'}/></button>
    <div className="react-brand"><strong>USA50</strong><small>FAN CLUB</small></div>
    <span className="breadcrumb">✧ Fan Universe / {titles[route]}</span>
    <div className="react-top-actions">
     <button className="star-balance" onClick={()=>switchTo('shop')} title="Open STAR Shop"><span>✦</span><strong>{number(me?.state?.stars||0)}</strong><small>STARS</small></button>
     <button className="round-icon events-button" onClick={()=>switchTo('events')} aria-label="Events and fancall lotteries"><Icon name="events" size={20}/>{eventCount>0&&<span className="top-dot" title={eventCount+' new events'}/>}</button>
     <button className="round-icon mail-button" onClick={()=>setMailOpen(true)} aria-label={'Open mail, '+mailCount+' unread'}><Icon name="mail" size={20}/>{mailCount>0&&<span className="mail-number">{mailCount>99?'99+':mailCount}</span>}</button>
    </div>
   </header>
   <div className={'react-content '+(route==='community'?'social-content ':'')+(['drops','messages','fansites','recycle','studio','admin'].includes(route)?'compat-content':'')}>
    {route==='home'?<HomePage/>:route==='collection'?<CollectionPage/>:route==='shop'?<ShopPage/>:route==='community'?<SocialPage/>:route==='rankings'?<RankingsPage/>:route==='events'?<EventsPage/>:route==='live'?<LivePage/>:route==='profile'?<ProfilePage/>:<LegacyPage route={route}/>}
   </div>
  </div>
  <nav className="react-bottom-nav" aria-label="Bottom navigation">{BOTTOM.map(id=>{const entry=NAV.find(x=>x.id===id);return <button key={id} className={route===id?'active':''} onClick={()=>switchTo(id)} aria-current={route===id?'page':undefined}><Icon name={entry.icon} size={21}/><small>{entry.name==='Collection'?'Collection':entry.name==='My Page'?'My Page':entry.name}</small></button>;})}</nav>
  {menuOpen&&<div className="menu-scrim" onClick={()=>setMenuOpen(false)} role="presentation"/>}
  {mailOpen&&<Mailbox/>}
 </div>;
}
class ErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null};}
 static getDerivedStateFromError(err){return {error:err};}
 componentDidCatch(error,info){console.error('USA50 React render error',error,info);}
 render(){return this.state.error?<div className="react-loading"><div>✧</div><h2>Something went wrong</h2><p>{this.state.error.message}</p><button className="action primary" onClick={()=>{this.setState({error:null});window.location.reload();}}>Reload USA50</button><a href="/index.html">Open original app</a></div>:this.props.children;}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><AppProvider><AppShell/></AppProvider></ErrorBoundary>);
