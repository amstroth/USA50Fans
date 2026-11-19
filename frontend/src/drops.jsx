import React,{useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useApp} from './state';
import {CardPreview,Empty,Heading,Icon} from './ui';
import {number} from './api';
import {CollectorViewer} from './collector';
import {activateImmersiveBackground} from './immersive-theme';
import {arrangePullRewards,buildPullRevealSteps,isShowcaseReward} from './pull-sequence';

const REWARD_ICONS={pullPoints:'✦',idolTicket:'🎟️',merchCoupon:'🎀'};
function rewardLabel(reward){
 if(reward.type==='pullPoints')return number(reward.amount)+' Pull Points';
 if(reward.type==='idolTicket')return (reward.idolName||'Idol')+' Fancall Ticket';
 if(reward.type==='merchCoupon')return (reward.discountPercent||10)+'% Merch Coupon';
 return 'Bonus reward';
}
function CardArtwork({card}){
 return <div className="pull-result-art">
  <img src={card.artUrl||'/assets/portraits/arielle_real.webp'} alt={card.title||'Collected photocard'}/>
  {card.borderUrl&&<img className="pull-result-border" src={card.borderUrl} alt=""/>}
 </div>;
}
function RewardCard({reward,onCard}){
 if(reward.type==='card'&&reward.card){
  const rarity=String(reward.card.rarity||'R').toUpperCase();
  return <button className={'pull-result-card rarity-'+rarity.toLowerCase()+(isShowcaseReward(reward)?' pull-result-rare':'')} type="button" onClick={()=>onCard(reward.card)}>
   {isShowcaseReward(reward)&&<span className="pull-rare-badge">✦ {rarity} ✦</span>}
   <CardArtwork card={reward.card}/>
   <strong>{reward.card.title||'Photocard'}</strong><span>{rarity} · {reward.card.member||'USA50'}</span>
   {reward.guaranteed&&<small className="pull-guarantee">Guaranteed card</small>}
  </button>;
 }
 return <div className="pull-result-card pull-result-other" aria-label={rewardLabel(reward)}>
  <span className="pull-result-symbol" aria-hidden="true">{REWARD_ICONS[reward.type]||'✧'}</span>
  <strong>{rewardLabel(reward)}</strong><span>Demo collectible</span>
 </div>;
}
function ShowcaseFlip({card}){
 const rarity=String(card.rarity||'SSR').toUpperCase();
 return <div className={'pull-showcase-scene rarity-'+rarity.toLowerCase()} aria-label={rarity+' photocard rotating to reveal its front and back'}>
  <div className="pull-showcase-aura"/>
  <div className="pull-showcase-rotator">
   <div className="pull-showcase-face pull-showcase-front"><CardArtwork card={card}/></div>
   <div className="pull-showcase-face pull-showcase-back">
    {card.backArtUrl?<img src={card.backArtUrl} alt="Photocard back"/>:<div className="pull-showcase-default-back"><span>✦</span><strong>USA50</strong><small>Closer to your stars</small><span>✧</span></div>}
   </div>
  </div>
 </div>;
}
function RevealStep({step,progress,total,onFastForward,onCard}){
 const featured=step.items[0]?.reward;
 const isRare=step.type==='showcase';
 const isCommon=step.type==='common';
 return <div className={'pull-reveal-sequence '+(isRare?'showcase':isCommon?'common':'collectible')} key={progress}>
  <div className="pull-sequence-overline">USA50 · REWARD REVEAL</div>
  <div className="pull-sequence-progress">{progress} / {total}</div>
  {isRare?<div className="pull-sequence-spotlight">
   <div className="pull-sequence-shine" aria-hidden="true">✦</div>
   <p className="pull-showcase-rarity">✦ {featured.card.rarity} PHOTOCARD ✦</p>
   <ShowcaseFlip card={featured.card}/>
   <h2>{featured.card.title||'A rare photocard!'}</h2>
   <p>Front and back reveal · {featured.card.member||'USA50'}</p>
  </div>:isCommon?<div className="pull-sequence-common">
   <h2>More photocards!</h2><p>SR & R cards · All revealed together</p>
   <div className="pull-reveal-common-grid">
    {step.items.map(({reward,drawIndex})=><div key={drawIndex} className="pull-common-tile"><RewardCard reward={reward} onCard={onCard}/></div>)}
   </div>
  </div>:<div className="pull-sequence-item">
   <span className="pull-sequence-symbol" aria-hidden="true">{REWARD_ICONS[featured.type]||'✧'}</span>
   <h2>{rewardLabel(featured)}</h2>
   <p>Added to your collection ♡</p>
  </div>}
  <button className="pull-skip" type="button" onClick={onFastForward}>Show all results</button>
 </div>;
}
function FullscreenPull({results,onClose,onRepeat,repeating=false,canRepeat=true,repeatHint='' }){
 const [phase,setPhase]=useState('opening'),[stepIndex,setStepIndex]=useState(0),[focused,setFocused]=useState(null);
 const drawn=useMemo(()=>Array.isArray(results?.rewards)?results.rewards:results?.card?[{type:'card',card:results.card}]:[],[results]);
 const ordered=useMemo(()=>arrangePullRewards(drawn),[drawn]);
 const steps=useMemo(()=>buildPullRevealSteps(ordered),[ordered]);
 const mode=results.mode||'single',single=drawn.length===1;
 useEffect(()=>activateImmersiveBackground(),[]);
 useEffect(()=>{
  const escape=e=>{if(e.key==='Escape'&&phase==='results'&&!focused)onClose();};
  window.addEventListener('keydown',escape);
  return()=>window.removeEventListener('keydown',escape);
 },[phase,focused,onClose]);
 useEffect(()=>{
  if(phase!=='opening')return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const timer=window.setTimeout(()=>setPhase(reduced?'results':'reveal'),reduced?300:1500);
  return()=>window.clearTimeout(timer);
 },[phase]);
 useEffect(()=>{
  if(phase!=='reveal')return;
  if(stepIndex>=steps.length){setPhase('results');return;}
  const timer=window.setTimeout(()=>setStepIndex(index=>index+1),steps[stepIndex].duration);
  return()=>window.clearTimeout(timer);
 },[phase,stepIndex,steps]);
 const revealAll=()=>setPhase('results');
 const repeatLabel=mode==='ten'?'Pull again x10':'Pull again';
 return createPortal(<div className={'pull-fullscreen '+(phase==='opening'?'pull-opening':phase==='reveal'?'pull-sequencing':'pull-revealed')} role="dialog" aria-modal="true" aria-label="USA50 full screen card pull">
  <div className="pull-aura a"/><div className="pull-aura b"/><div className="pull-aura c"/>
  {phase==='opening'?<div className="pull-animation-scene">
   <span className="pull-fullscreen-brand">USA50 · CARD UNIVERSE</span>
   <div className="pull-pack-wrap"><div className="pull-pack-visual">
    <span className="pull-pack-glint">✦</span><strong>USA50</strong><small>closer to your stars</small>
    <span className="pull-pack-seal">✧</span></div><div className="pull-pack-light"/></div>
   <h1>Your stars are coming closer…</h1><p>Unwrapping {mode==='ten'?'10 surprises':'your surprise'} ✦</p>
   <button className="pull-skip" type="button" onClick={revealAll}>Skip animation</button>
  </div>:phase==='reveal'&&stepIndex<steps.length?
   <RevealStep step={steps[stepIndex]} progress={stepIndex+1} total={steps.length} onFastForward={revealAll} onCard={setFocused}/>
  :<div className="pull-result-screen">
    <header className="pull-result-head"><div><span className="eyebrow">USA50 · ✦ YOUR REVEAL</span><h1>{single?'A new surprise!':mode==='ten'?'Your 10-pull results':'Your pull results'}</h1>
     <p>{drawn.length} reward{drawn.length===1?'':'s'} · Sorted: rarest cards, collectibles, then common cards</p></div>
     <button className="pull-close" onClick={onClose} aria-label="Close pull results"><Icon name="x" size={25}/></button>
    </header>
    <div className={'pull-results-grid '+(single?'single':'batch')}>
     {ordered.map(({reward,drawIndex})=><div key={drawIndex} className={'pull-reward-reveal '+(isShowcaseReward(reward)?'rare':'')}><RewardCard reward={reward} onCard={setFocused}/></div>)}
    </div>
    {Boolean(results?.guaranteed?.length||results?.ringsUnlocked?.length||results?.ticketsAwarded>0)&&<div className="pull-extra-prizes">
     {results.ticketsAwarded>0&&<span>🎟️ +{results.ticketsAwarded} idol Fancall Ticket{results.ticketsAwarded===1?'':'s'} added to Collection → Inventory</span>}
     {results.guaranteed?.length>0&&<span>✧ Pity milestone: {results.guaranteed.length} additional album card(s) unlocked</span>}
     {results.ringsUnlocked?.length>0&&<span>✦ New avatar borders: {results.ringsUnlocked.join(', ')}</span>}
    </div>}
    <footer className="pull-results-bottom">
     <button type="button" className="action primary pull-again-button" disabled={repeating||!canRepeat} onClick={onRepeat}>
      {repeating?'Pulling…':repeatLabel}
     </button>
     <button type="button" className="action secondary" disabled={repeating} onClick={onClose}>Return to Card Drops</button>
     {!canRepeat&&<small className="pull-repeat-hint">{repeatHint||'Not enough demo currency for another pull.'}</small>}
    </footer>
   </div>}
   {focused&&<CollectorViewer card={focused} owned={1} onClose={()=>setFocused(null)}/>}
 </div>,document.body);
}
export function DropsPage(){
 const {data,navigate,run,message}=useApp(),albums=(data?.albums||[]).filter(x=>x.available);
 const [selectedId,setSelectedId]=useState(null),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[pullRound,setPullRound]=useState(0);
 const chosen=albums.find(a=>a.id===selectedId)||albums[0]||null;
 const catalogue=chosen?(data?.packCards?.[chosen.id]||[]):[];
 const isAuthenticated=Boolean(data?.me&&!data.me.mustChangePassword);
 const single=Number(data?.economy?.singlePullStars||data?.packCost||300);
 const ten=Number(data?.economy?.tenPullStars||2700),pointsCost=Number(data?.economy?.freePullPoints||300);
 const stars=Number(data?.me?.state?.stars||0),points=Number(data?.me?.state?.pullPoints||0);
 const owned=data?.me?.state?.owned||{};
 async function pull(mode,packId=chosen?.id){
  if(busy)return;
  const pack=albums.find(a=>a.id===packId&&a.available);
  if(!pack){message('That collection is no longer available.');return;}
  if(!isAuthenticated){navigate('profile');message('Sign in to open a pack.');return;}
  setBusy(true);
  try{
   const endpoint=mode==='ten'?'/api/cards/pull10':mode==='points'?'/api/cards/pull-points':'/api/cards/pull';
   const next=await run(endpoint,{albumId:pack.id});
   // An entirely new reveal plays on every repeated draw, using this same
   // collection and pull currency rather than switching to another bundle.
   setResult({...next,albumId:pack.id,albumTitle:pack.title,mode});
   setPullRound(n=>n+1);
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 const canRepeat=result?.mode==='ten'?stars>=ten:result?.mode==='points'?points>=pointsCost:stars>=single;
 const repeatHint=result?.mode==='points'?'Not enough Pull Points for another draw.':'Not enough STARS. Visit the STAR Shop to collect more.';
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
      <p className="fineprint">Ten pulls guarantee at least one photocard. Paid STARS draws have a {Number(rewardOdds.idolTicket||0)}% chance per draw of an idol Fancall Ticket (demo collectible). They are random, not guaranteed, and do not count as entries in free fancall lotteries.</p>
     </div>
    </div>
   </section>
   <section className="react-section"><div className="drops-section-label"><h2>Inside this collection</h2><span>{catalogue.length} published cards</span></div>
    <div className="drops-preview-grid">{catalogue.slice(0,12).map(card=><CardPreview key={card.id} card={card} owned={Number(owned[card.id]||0)} locked={!owned[card.id]} onClick={()=>navigate('collection')}/>)}</div>
   </section>
   <section className="react-section drops-odds"><h2>Published odds</h2><p>Each draw first determines a reward type. If the reward is a card, its rarity is drawn using the pack's rarity distribution.</p>
    <div className="drops-odds-columns"><div><strong>Reward type (STARS)</strong>{Object.entries(rewardOdds).map(([key,value])=><div key={key}><span>{({card:'Photocard',pullPoints:'Pull Points',idolTicket:'Fancall Ticket',merchCoupon:'Merch Coupon'})[key]||key}</span><b>{value}%</b></div>)}</div>
     <div><strong>Rarity when a card drops</strong>{Object.entries(odds).map(([key,value])=><div key={key}><span>{key}</span><b>{value}%</b></div>)}</div>
    </div>
   </section>
  </>:<Empty title="No card drops available" detail="Published photocard sets will appear here once they are released."/>}
  {result&&<FullscreenPull key={pullRound} results={result} onClose={()=>setResult(null)}
    onRepeat={()=>pull(result.mode,result.albumId)} repeating={busy} canRepeat={canRepeat} repeatHint={repeatHint}/>}
 </main>;
}
