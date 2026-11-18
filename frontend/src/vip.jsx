import React from 'react';
import {useApp} from './state';
import {Heading,Icon,VipBadge} from './ui';
import {number} from './api';

const money=cents=>'$'+(Number(cents||0)/100).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
export function VIPPage(){
 const {data,navigate}=useApp(),vip=data?.vipProgram||{};
 const spent=Number(vip.spentCents||0),level=Number(vip.level||0),tiers=vip.tiers||[];
 const next=tiers[level+1]||null,previous=tiers[level]||tiers[0]||{thresholdCents:0};
 const progress=next?Math.max(0,Math.min(100,Math.round(spent/next.thresholdCents*100))):100;
 return <main className="view vip-page">
  <Heading eyebrow="USA50 VIP PROGRAM" title="Your VIP Journey ✦" subtitle="One VIP XP for every $1 of qualifying spending. Your VIP level and profile badge are the same status." action={<button className="action secondary" onClick={()=>navigate('shop')}>Explore STAR Shop <Icon name="chevron" size={15}/></button>}/>
  <section className="vip-overview">
   <span className="eyebrow">YOUR LIFETIME VIP STATUS</span>
   <div className="vip-overview-row"><div><h2>{vip.label||'VIP 0'}</h2><p>{level>0?'Your current profile badge':'No VIP badge until VIP 1'}</p></div><div>{level>0?<VipBadge level={level} size="large"/>:<span className="vip-unranked">VIP 0</span>}</div></div>
   <div className="vip-amounts"><div><small>Qualifying spending / VIP XP</small><strong>{money(spent)} <span>· {number(vip.vipXP||0)} XP</span></strong></div><div><small>{next?'Next level: '+next.name:'Top level achieved'}</small><strong>{next?money(next.thresholdCents):money(spent)}</strong></div></div>
   <div className="vip-progress-track" role="progressbar" aria-label="VIP progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{width:progress+'%'}}/></div>
   <div className="vip-progress-labels"><span>{money(previous.thresholdCents)} · {previous.name||'VIP 0'}</span><strong>{progress}% complete</strong><span>{next?money(next.thresholdCents)+' · '+next.name:'MAX LEVEL'}</span></div>
   {next&&<p className="vip-next-note">Spend {money(vip.remainingCents??next.thresholdCents-spent)} more in qualifying purchases to reach {next.name} once real checkout and VIP fulfillment are enabled.</p>}
  </section>
  <section className="vip-example"><strong>How progress works</strong><p>For example, a fan who has spent $30 has <b>30 VIP XP</b> and is VIP 2. With VIP 3 beginning at $100, that fan is <b>30% complete</b> toward the next tier.</p></section>
  <section className="react-section"><h2>All VIP Levels & Planned Benefits</h2><div className="vip-tier-list">
   {tiers.map(t=><article className={'vip-tier-row '+(level===t.level?'current':'')} key={t.level}>
    <div className="vip-tier-icon">{t.level?<VipBadge level={t.level}/>:<span className="vip-tier-none">VIP 0</span>}</div>
    <div className="vip-tier-copy"><strong>{t.name} {t.level===level?'· Your level':''}</strong><p>{t.benefit}</p></div>
    <span className="vip-tier-threshold">{money(t.thresholdCents)}</span>
   </article>)}
  </div></section>
  <div className="react-note"><strong>Program status: preview</strong><p>{vip.terms||'Rewards are proposed only. No real-money checkout or VIP rewards redemption is enabled yet.'}</p><p>Fan rankings remain based on social participation, not spending. VIP status does not improve free fancall lottery odds.</p></div>
 </main>;
}
