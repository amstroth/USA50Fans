import React,{useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,CardPreview,Empty,Heading,Icon,SectionTitle,StarBundleArt} from './ui';
import {dateLabel,number} from './api';

export function HomePage(){
 const {data,navigate}=useApp(),people=data?.members||[],announcement=data?.announcements?.[0];
 return <main className="view">
  <section className="react-hero"><div className="react-hero-content"><span className="eyebrow">WELCOME TO YOUR FAN UNIVERSE</span><h1>Closer to your <em>stars.</em></h1><p>Collect. Connect. Celebrate every chapter of USA50 together.</p><div className="row-actions"><button className="action primary" onClick={()=>navigate('collection')}>Explore Collection <Icon name="chevron" size={16}/></button><button className="action light" onClick={()=>navigate('community')}>Fan community</button></div></div><div className="hero-photo"><img src="/assets/portraits/arielle_real.webp" alt="Arielle featured collectible campaign"/></div></section>
  <section className="react-section"><SectionTitle title="Explore your universe"/><div className="quick-grid">{[['collection','✦','Photocards'],['drops','🎴','Card Drops'],['messages','💌','Messages'],['events','🎫','Events & Fancalls'],['live','📹','Livestreams'],['shop','🛍️','STAR Shop']].map(([page,symbol,name])=><button className="quick-tile" key={page} onClick={()=>navigate(page)}><span>{symbol}</span><strong>{name}</strong><Icon name="chevron" size={15}/></button>)}</div></section>
  <section className="react-section"><SectionTitle title="Meet the idols"/><div className="member-row">{people.map(member=>{const profile=Object.values(data?.social?.profiles||{}).find(p=>p?.verifiedIdol&&p.displayName?.toLowerCase()===member.name?.toLowerCase());return <button className="member-card" key={member.id} onClick={()=>navigate('community')}><Avatar member={member} profile={profile} size="lg"/><strong>{member.name}</strong><small>{member.team}</small></button>;})}</div></section>
  {announcement&&<section className="info-banner"><Icon name="mail" size={22}/><div><span className="eyebrow">LATEST ANNOUNCEMENT</span><h3>{announcement.title}</h3><p>{announcement.body}</p><small>{dateLabel(announcement.createdAt)}</small></div></section>}
  <div className="react-note"><strong>{data?.me?'Welcome back, '+data.me.displayName+' ♡':'New to USA50?'}</strong><p>USA50 is a development preview. Digital currency, tickets, and checkout remain demo-only unless officially enabled.</p></div>
 </main>;
}
export function CollectionPage(){
 const {data,navigate,message}=useApp(),[tab,setTab]=useState('albums'),[rarity,setRarity]=useState('All');
 const owned=data?.me?.state?.owned||{},albums=data?.albums||[],members=data?.members||[],tickets=data?.me?.state?.idolTickets||{},coupons=data?.me?.state?.merchCoupons||[];
 const cards=[...(data?.cards||[]),...Object.values(data?.packCards||{}).flat()];
 const unique=[...new Map(cards.filter(x=>x?.id).map(x=>[x.id,x])).values()];
 const displayed=unique.filter(c=>rarity==='All'||c.rarity===rarity);
 const ticketCount=Object.values(tickets).reduce((sum,n)=>sum+Number(n||0),0);
 return <main className="view"><Heading title="Your Collection" subtitle="Photocard albums, idol tickets, and collection rewards." action={<button className="action primary" onClick={()=>navigate('drops')}>✧ Card Drops</button>}/>
  <div className="segmented-tabs"><button className={tab==='albums'?'selected':''} onClick={()=>setTab('albums')}>Albums & Cards</button><button className={tab==='inventory'?'selected':''} onClick={()=>setTab('inventory')}>🎫 Inventory ({ticketCount})</button></div>
  {tab==='albums'?<><div className="album-strip">{albums.map(a=><button key={a.id} className={'album-card '+(a.available?'':'soon')} onClick={()=>a.available?navigate('drops'):message('This album has not released yet.')}><div className="album-color"><span className="eyebrow">{a.team} · {a.member}</span><h3>{a.title}</h3><span className="album-sparkle">✧</span></div><div className="album-bottom"><strong>{a.member} Album</strong><small>{a.available?unique.filter(c=>c.albumId===a.id&&owned[c.id]).length+' / '+(a.count||12)+' collected':'Coming soon'}</small></div></button>)}</div>
   <SectionTitle title="Photocards" action={<small>{unique.filter(c=>Number(owned[c.id])>1).length} duplicates</small>}/>
   <div className="rarity-filter">{['All','R','SR','SSR','MR','UR'].map(r=><button key={r} className={rarity===r?'on':''} onClick={()=>setRarity(r)}>{r}</button>)}</div>
   <div className="photocard-grid">{displayed.map(card=><CardPreview key={card.id} card={card} owned={Number(owned[card.id]||0)} locked={!owned[card.id]} onClick={()=>navigate('drops')}/>)}</div>
   <div className="react-note"><strong>Collector rules</strong><p>Your last unique card is protected. The advanced card viewer, album completion and duplicate recycling remain available in the full Collector feature.</p><button className="text-link" onClick={()=>navigate('recycle')}>Recycle duplicates →</button></div>
  </>:<><div className="summary-grid"><div><strong>{number(ticketCount)}</strong><small>Idol tickets</small></div><div><strong>{number(coupons.length)}</strong><small>Merch coupons</small></div></div>
   <SectionTitle title="Idol tickets"/>{members.filter(x=>tickets[x.id]>0).length?members.filter(x=>tickets[x.id]>0).map(m=><div className="inventory-row" key={m.id}><span className="ticket-icon">🎫</span><div><strong>{m.name} Ticket</strong><small>{m.team} · Demo collectible</small></div><strong>×{number(tickets[m.id])}</strong></div>):<Empty icon="🎫" title="No tickets yet" detail="Collect idol tickets from eligible card packs." action={<button className="action secondary" onClick={()=>navigate('drops')}>Open packs</button>}/>}
   <SectionTitle title="Merch coupons"/>{coupons.length?coupons.map((c,i)=><div key={c.id||i} className="inventory-row"><span className="ticket-icon">🏷️</span><div><strong>{c.discountPercent||0}% Merch Coupon</strong><small>Not yet redeemable</small></div></div>):<p className="muted">No coupons collected yet.</p>}
   <p className="fineprint">Idol tickets are demo collectibles. They do not guarantee fancalls or improve free lottery odds.</p>
  </>}</main>;
}
export function ShopPage(){
 const {data,navigate,run,message}=useApp(),[busy,setBusy]=useState('');
 const bundles=data?.economy?.bundles||[];
 async function grant(sku){setBusy(sku);try{const response=await run('/api/economy/demo-purchase',{sku});message('Developer demo grant: +'+number(response.creditedDemoStars)+' STARS');}catch(err){message(err.message);}finally{setBusy('');}}
 return <main className="view"><Heading eyebrow="USA50 STAR SHOP" title="Fill your sky with STARS ✦" subtitle="Browse STAR bundles for the photocard universe." action={<button className="action secondary" onClick={()=>navigate('drops')}>Open Card Drops</button>}/>
  <div className="balance-banner"><span className="balance-sparkle">✦</span><div><span>Current balance</span><strong>{number(data?.me?.state?.stars||0)} STARS</strong></div><Badge tone="pink">Preview</Badge></div>
  <div className="shop-grid">{bundles.map(b=><article className="shop-bundle" key={b.sku}><StarBundleArt sku={b.sku}/><h3>{b.name}</h3><strong>{number(b.stars)} STARS</strong>{b.monthlyBonus>0&&<span className="bonus-tag">+{number(b.monthlyBonus)} bonus</span>}<span className="shop-price">{'$'+(b.usdCents/100).toFixed(2)}</span>{data?.me?.role==='admin'?<button className="action primary full" disabled={Boolean(busy)} onClick={()=>grant(b.sku)}>{busy===b.sku?'Loading…':'Grant demo STARS'}</button>:<button className="action soft full" disabled>Checkout not enabled</button>}</article>)}</div>
  <div className="react-note"><strong>STAR Shop is a development preview.</strong><p>No payment is collected here. Developer demo grants are restricted to management accounts that are authorized as admins.</p></div></main>;
}
export function LegacyPage({route}){
 const titles={drops:'Card Drops',messages:'Messages',live:'Livestream Studio',fansites:'Fansites',recycle:'Recycle Duplicates',studio:'Creator Studio',admin:'Management',diary:'Diary Entries'};
 const target=route==='studio'?'messages':route==='live'?'events':route==='diary'?'community':route,src='/index.html?embed=1&screen='+encodeURIComponent(target);
 return <section className="legacy-view"><div className="legacy-view-head"><div><span className="eyebrow">USA50 · COMPATIBILITY FEATURE</span><h1>{titles[route]||'USA50'}</h1></div><a className="action secondary" href={'/index.html?screen='+encodeURIComponent(target)} target="_blank" rel="noopener noreferrer">Full view <Icon name="external" size={16}/></a></div><iframe key={route} className="legacy-frame" src={src} title={titles[route]||'USA50'} allow="camera; microphone; fullscreen; clipboard-read; clipboard-write" loading="eager"/></section>;
}
