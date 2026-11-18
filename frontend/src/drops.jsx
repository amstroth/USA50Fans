import React,{useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useApp} from './state';
import {CardPreview,Empty,Heading,Icon} from './ui';
import {number} from './api';
import {CollectorViewer} from './collector';

function RewardCard({reward,index,onCard}){
 if(reward.type==='card'&&reward.card)return <button className={'pull-result-card rarity-'+String(reward.card.rarity||'R').toLowerCase()} type="button" onClick={()=>onCard(reward.card)}>
  <div className="pull-result-art"><img src={reward.card.artUrl||'/assets/portraits/arielle_real.webp'} alt={reward.card.title||'Collected photocard'}/>
   {reward.card.borderUrl&&<img className="pull-result-border" src={reward.card.borderUrl} alt=""/>}</div>
  <strong>{reward.card.title||'Photocard'}</strong><span>{reward.card.rarity} · {reward.card.member||'USA50'}</span>
  {reward.guaranteed&&<small className="pull-guarantee">Guaranteed card</small>}
 </button>;
 const icons={pullPoints:'✦',idolTicket:'🎟️',merchCoupon:'🎀'},labels={
  pullPoints:number(reward.amount)+' Pull Points',idolTicket:(reward.idolName||'Idol')+' Ticket',
  merchCoupon:(reward.discountPercent||10)+'% Merch Coupon'};
 return <div className="pull-result-card pull-result-other" aria-label={labels[reward.type]||'Reward'}>
  <span className="pull-result-symbol">{icons[reward.type]||'✧'}</span>
  <strong>{labels[reward.type]||'Bonus Reward'}</strong><span>Demo collectible</span>
 </div>;
}
function FullscreenPull({results,onClose}){
 const [phase,setPhase]=useState('opening'),[focused,setFocused]=useState(null);
 const rewards=Array.isArray(results?.rewards)?results.rewards:results?.card?[{type:'card',card:results.card}]:[];
 useEffect(()=>{
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const escape=e=>{if(e.key==='Escape'&&phase==='results')onClose();};
  window.addEventListener('keydown',escape);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);};
 },[phase,onClose]);
 useEffect(()=>{
  if(phase!=='opening')return;
  const timer=window.setTimeout(()=>setPhase('results'),2050);
  return()=>window.clearTimeout(timer);
 },[phase]);
 const single=rewards.length===1;
 return createPortal(<div className={'pull-fullscreen '+(phase==='opening'?'pull-opening':'pull-revealed')} role="dialog" aria-modal="true" aria-label="USA50 full screen card pull result">
  <div className="pull-aura a"/><div className="pull-aura b"/><div className="pull-aura c"/>
  {phase==='opening'?<div className="pull-animation-scene">
   <span className="pull-fullscreen-brand">USA50 · CARD UNIVERSE</span>
   <div className="pull-pack-wrap"><div className="pull-pack-visual">
    <span className="pull-pack-glint">✦</span><strong>USA50</strong><small>closer to your stars</small>
    <span className="pull-pack-seal">✧</span></div><div className="pull-pack-light"/></div>
   <h1>Your stars are coming closer…</h1><p>Unwrapping {rewards.length===10?'10 surprises':'your surprise'} ✦</p>
   <button className="pull-skip" type="button" onClick={()=>setPhase('results')}>Skip animation</button>
  </div>:<div className="pull-result-screen">
    <header className="pull-result-head"><div><span className="eyebrow">USA50 · ✦ YOUR REVEAL</span><h1>{single?'A new surprise!':'Your 10-pull results'}</h1><p>{rewards.length} reward{rewards.length===1?'':'s'} · Each draw awards one item</p></div>
     <button className="pull-close" onClick={onClose} aria-label="Close pull results"><Icon name="x" size={25}/></button>
    </header>
    <div className={'pull-results-grid '+(single?'single':'batch')}>
     {rewards.map((reward,index)=><div key={index} className="pull-reward-reveal" style={{'--reward-delay':Math.min(index,9)*70+'ms'}}><RewardCard reward={reward} index={index} onCard={setFocused}/></div>)}
    </div>
    {Boolean(results?.guaranteed?.length||results?.ringsUnlocked?.length)&&<div className="pull-extra-prizes">
     {results.guaranteed?.length>0&&<span>✧ Pity milestone: {results.guaranteed.length} additional album card(s) unlocked</span>}
     {results.ringsUnlocked?.length>0&&<span>✦ New avatar borders: {results.ringsUnlocked.join(', ')}</span>}
    </div>}
    <footer className="pull-results-bottom"><button type="button" className="action primary" onClick={onClose}>Return to Card Drops</button><span>Keep collecting ♡</span></footer>
   </div>}
   {focused&&<CollectorViewer card={focused} owned={1} onClose={()=>setFocused(null)}/>}
 </div>,document.body);
}
export function DropsPage(){
 const {data,navigate,run,message}=useApp(),albums=(data?.albums||[]).filter(x=>x.available);
 const [selectedId,setSelectedId]=useState(null),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const chosen=albums.find(a=>a.id===selectedId)||albums[0]||null;
 const catalogue=chosen?(data?.packCards?.[chosen.id]||[]):[];
 const isAuthenticated=Boolean(data?.me&&!data.me.mustChangePassword);
 const single=Number(data?.economy?.singlePullStars||data?.packCost||300);
 const ten=Number(data?.economy?.tenPullStars||2700),pointsCost=Number(data?.economy?.freePullPoints||300);
 const stars=Number(data?.me?.state?.stars||0),points=Number(data?.me?.state?.pullPoints||0);
 const owned=data?.me?.state?.owned||{};
 async function pull(mode){
  if(!chosen){message('No released collection is available yet.');return;}
  if(!isAuthenticated){navigate('profile');message('Sign in to open a pack.');return;}
  setBusy(true);
  try{
   const endpoint=mode==='ten'?'/api/cards/pull10':mode==='points'?'/api/cards/pull-points':'/api/cards/pull';
   const next=await run(endpoint,{albumId:chosen.id});
   setResult({...next,albumTitle:chosen.title});
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 const odds=chosen?.odds||data?.rarities||{};
 const rewardOdds=data?.gacha?.paidOdds||{};
 return <main className="view drops-page">
  <Heading eyebrow="USA50 PHOTOCARD UNIVERSE" title="Card Drops ✦" subtitle="Choose a collection, unwrap a pack and discover your reward. All draws are demo-only." action={<button className="action secondary" onClick={()=>navigate('collection')}>My Collection <Icon name="chevron" size={16}/></button>}/>
  {albums.length?<><div className="drops-section-label"><h2>Choose a collection</h2><span>{albums.length} available</span></div>
   <div className="drops-pack-slider" role="group" aria-label="Available photocard packs">{albums.map(pack=><button key={pack.id} type="button" className={'drops-pack-item '+(pack.id===chosen?.id?'selected':'')} onClick={()=>setSelectedId(pack.id)} aria-pressed={pack.id===chosen?.id}>
    <div className="drops-pack-poster"><span className="drops-pack-glyph">✦</span><small>{pack.team||'USA50'}</small><strong>{pack.title}</strong><span>{pack.member||'USA50'}</span></div>
    <div className="drops-pack-description"><strong>{pack.title}</strong><small>{pack.count||catalogue.length} cards · {pack.member}</small></div>
   </button>)}</div>
   <section className="drops-chosen">
    <div className="drops-hero">
     <div className="drops-hero-visual"><span>✧</span><strong>{chosen?.title}</strong><small>{chosen?.team} · OFFICIAL PHOTOCARD PACK</small></div>
     <div className="drops-hero-content"><span className="eyebrow">NOW UNLOCKING</span><h2>{chosen?.title}</h2><p>Try a single pull or open 10 rewards together. The reveal fills your entire screen with the pack animation.</p>
      <div className="drops-balance-row"><span>✦ {number(stars)} STARS</span><span>✧ {number(points)} Pull Points</span></div>
      <div className="drops-pull-actions">
       <button className="action primary" disabled={busy||!isAuthenticated||stars<single} onClick={()=>pull('single')}>{busy?'Opening…':'Pull ×1 · '+number(single)+' STARS'}</button>
       <button className="action primary" disabled={busy||!isAuthenticated||stars<ten} onClick={()=>pull('ten')}>{busy?'Opening…':'Pull ×10 · '+number(ten)+' STARS'}</button>
       <button className="action secondary" disabled={busy||!isAuthenticated||points<pointsCost} onClick={()=>pull('points')}>Use {number(pointsCost)} Pull Points</button>
      </div>
      {!isAuthenticated&&<button className="text-link" onClick={()=>navigate('profile')}>Sign in to open packs →</button>}
      {isAuthenticated&&stars<single&&<p className="fineprint">Not enough demo STARS. Check your wallet in the STAR Shop.</p>}
      <p className="fineprint">Ten pulls guarantee at least one photocard. Additional rewards can include Pull Points, idol tickets or nonredeemable demo coupons. Free fancall lotteries are not affected.</p>
     </div>
    </div>
   </section>
   <section className="react-section"><div className="drops-section-label"><h2>Inside this collection</h2><span>{catalogue.length} published cards</span></div>
    <div className="drops-preview-grid">{catalogue.slice(0,12).map(card=><CardPreview key={card.id} card={card} owned={Number(owned[card.id]||0)} locked={!owned[card.id]} onClick={()=>navigate('collection')}/>)}</div>
   </section>
   <section className="react-section drops-odds"><h2>Published odds</h2><p>Each draw first determines a reward type. If the reward is a card, its rarity is drawn using the pack's rarity distribution.</p>
    <div className="drops-odds-columns"><div><strong>Reward type (STARS)</strong>{Object.entries(rewardOdds).map(([key,value])=><div key={key}><span>{({card:'Photocard',pullPoints:'Pull Points',idolTicket:'Idol Ticket',merchCoupon:'Merch Coupon'})[key]||key}</span><b>{value}%</b></div>)}</div>
     <div><strong>Rarity when a card drops</strong>{Object.entries(odds).map(([key,value])=><div key={key}><span>{key}</span><b>{value}%</b></div>)}</div>
    </div>
   </section>
  </>:<Empty title="No card drops available" detail="Published photocard sets will appear here once they are released."/>}
  {result&&<FullscreenPull results={result} onClose={()=>setResult(null)}/>}
 </main>;
}
