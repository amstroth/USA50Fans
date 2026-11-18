import React,{useMemo,useState} from 'react';
import {useApp} from './state';
import {Avatar,Badge,Empty,Heading,Icon,SectionTitle} from './ui';
import {number} from './api';

const award=rank=>rank===1?'🏆':rank===2?'🥈':rank===3?'🥉':rank<=10?'✦':'♡';
const descriptor=rank=>rank<=3?'UltraFan':rank<=10?'SuperFan':rank<=50?'BigFan':'Fan';

export function RankingsPage(){
 const {data,navigate,setSelectedProfile}=useApp();
 const [query,setQuery]=useState(''),[range,setRange]=useState('all');
 const ranking=data?.social?.rankings||[],profiles=data?.social?.profiles||{};
 const myId=data?.me?.id;
 const current=ranking.find(p=>p.id===myId);
 const top=ranking.slice(0,3);
 const filtered=useMemo(()=>ranking.filter(entry=>{
  if(range==='top10'&&entry.rank>10)return false;
  if(range==='11to50'&&(entry.rank<11||entry.rank>50))return false;
  if(range==='51to100'&&(entry.rank<51||entry.rank>100))return false;
  if(!query)return true;
  const profile=profiles[entry.id]||{};
  return [profile.handle,profile.displayName,String(entry.rank)].some(x=>String(x||'').toLowerCase().includes(query.trim().toLowerCase()));
 }),[ranking,profiles,query,range]);
 function visit(id){setSelectedProfile(id);navigate('profile');setSelectedProfile(id);}
 function renderEntry(person,large=false){
  const profile=profiles[person.id]||{},self=person.id===myId;
  return <button type="button" className={'ranking-entry '+(self?'mine ':'')+(large?'podium-entry ':'')+'rank-'+person.rank} key={person.id} onClick={()=>visit(person.id)} aria-label={'View @'+(profile.handle||'fan')+', rank '+person.rank}>
   <span className="ranking-number">{large?award(person.rank):'#'+person.rank}</span>
   <Avatar profile={profile} size={large?'lg':'md'} withAward/>
   <span className="ranking-person"><strong>@{profile.handle||'fan'}{self?' · You':''}</strong><small>{descriptor(person.rank)} · {person.posts} posts</small></span>
   <span className="ranking-points"><strong>{number(person.xp)} XP</strong><small>{person.netVotes>0?'+':''}{person.netVotes||0} net votes</small></span>
   <Icon name="chevron" size={17}/>
  </button>;
 }
 return <main className="view rankings-view">
  <Heading eyebrow="USA50 FAN COMMUNITY" title="The Fan Rankings" subtitle="The top 100 creators and supporters, ranked by Fan XP. Tap anyone to visit their profile."/>
  <section className="ranking-hero"><div className="eyebrow">THE TOP THREE</div><h2>Fans who shine brightest ✦</h2>
   {top.length?<div className="ranking-podium">{[top[1],top[0],top[2]].filter(Boolean).map(x=><div className={'ranking-podium-card place-'+x.rank} key={x.id}>{renderEntry(x,true)}<div className="ranking-podium-base">#{x.rank} · {descriptor(x.rank)}</div></div>)}</div>:
    <Empty icon="✦" title="Rankings start with the first post" detail="Fans enter the leaderboard by sharing posts and earning Fan XP."/>}
  </section>
  {myId&&<div className="rank-current"><span>YOUR FAN RANK</span>{current?<button onClick={()=>visit(myId)}><strong>#{current.rank}</strong><span>{number(current.xp)} XP</span><Icon name="chevron" size={17}/></button>:<strong>Unranked · Publish your first post</strong>}</div>}
  <SectionTitle title="Top 100 leaderboard" action={<small>{ranking.length} ranked fans</small>}/>
  <div className="rank-search"><Icon name="community" size={19}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a username or rank" aria-label="Search rankings"/></div>
  <div className="segmented-tabs ranking-filters">{[['all','All'],['top10','Top 10'],['11to50','11–50'],['51to100','51–100']].map(([key,label])=><button key={key} className={range===key?'selected':''} onClick={()=>setRange(key)}>{label}</button>)}</div>
  <div className="ranking-list">{filtered.map(x=>renderEntry(x))}</div>
  {!filtered.length&&<Empty icon="✧" title="No matching fans" detail="Try another username or ranking range."/>}
  <div className="react-note"><strong>How do rankings work?</strong><p>Fans earn XP for posting and receiving engagement, including 150 bonus Fan XP when a verified idol hearts a post. Ranking updates reflect the backend’s XP ordering and are limited to the top 100; rewards remain proposals until officially launched.</p></div>
 </main>;
}
