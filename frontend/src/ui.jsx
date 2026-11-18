import React from 'react';
import {dateLabel,number} from './api';
const paths={
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
 collection:<><rect x="4" y="6" width="13" height="14" rx="2"/><rect x="8" y="3" width="13" height="14" rx="2"/></>,
 drops:<><path d="M12 2 14.7 9.3 22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z"/></>,
 community:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
 messages:<><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4.1-1L3 21l1.5-4.8A8.5 8.5 0 1 1 21 11.5z"/></>,
 shop:<><path d="M4 7h16l-1 14H5L4 7z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
 events:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
 live:<><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 10a5 5 0 0 1 0 4m8-4a5 5 0 0 1 0 4M12 11v2"/></>,
 profile:<><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
 mail:<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></>,
 chevron:<><path d="m9 18 6-6-6-6"/></>,
 menu:<><path d="M3 6h18M3 12h18M3 18h18"/></>,
 x:<><path d="M5 5 19 19M19 5 5 19"/></>,
 plus:<><path d="M12 5v14M5 12h14"/></>,
 heart:<><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></>,
 external:<><path d="M13 5h6v6m0-6-9 9M19 14v5H5V5h5"/></>,
 back:<><path d="M19 12H5m6-6-6 6 6 6"/></>,
 check:<><path d="m4 12 5 5L20 6"/></>,
 ticket:<><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z"/><path d="M12 5v14" strokeDasharray="2 2"/></>,
 camera:<><path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/></>,
 trophy:<><path d="M7 3h10v7a5 5 0 0 1-10 0zm0 2H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 15v4m-5 2h10"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M3 10v4l2 1 1 3 3 1 3 2 3-2 3-1 1-3 2-1v-4l-2-1-1-3-3-1-3-2-3 2-3 1-1 3z"/></>
};
export function Icon({name,size=20,className=''}){return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.drops}</svg>;}
export function VerifiedStar({profile,avatar=false}){
 if(!profile?.verifiedIdol&&!profile?.verifiedStaff)return null;
 return <span className={'verified-star '+(profile.verifiedStaff?'staff':'idol')+(avatar?' avatar-star':'')} title={profile.verifiedStaff?'Verified USA50 staff':'Verified USA50 idol'} aria-label={profile.verifiedStaff?'Verified USA50 staff':'Verified USA50 idol'}>
  <svg viewBox="0 0 64 64" width={avatar?38:21} height={avatar?38:21} aria-hidden="true"><path fill="currentColor" d="M32 3L40.7 23.1L62.5 24.8L45.7 39.4L50.8 61L32 49.7L13.2 61L18.3 39.4L1.5 24.8L23.3 23.1Z"/><path d="M20.2 34.5L28.7 43.2L44.9 25.6" fill="none" stroke="white" strokeWidth="6.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
 </span>;
}
export function Avatar({member,profile,size='md',withAward=false}){
 const src=profile?.avatarUrl||(member?.id==='arielle'?'/assets/portraits/arielle_real.webp':null);
 const color=profile?.verifiedIdol?profile?.idolBorderColor||'#E63A84':profile?.verifiedStaff?'#004AAD':member?.color||'#b88ad7';
 const letter=member?.emoji||profile?.displayName?.slice(0,1).toUpperCase()||'♡';
 const rank=profile?.rankBorder&&['classic','rank-auto'].includes(profile?.ring)?profile.rankBorder:null;
 return <span className={'member-pic '+size+(profile?.verifiedIdol?' idol':'')+(profile?.verifiedStaff?' staff':'')+(rank?' rank-'+rank:'')} style={{'--avatar-color':color}}>
  {src?<img src={src} alt={profile?.displayName||member?.name||'Profile picture'} loading="lazy"/>:<span aria-hidden="true">{letter}</span>}
  {withAward&&(profile?.verifiedIdol||profile?.verifiedStaff)?<VerifiedStar profile={profile} avatar/>:withAward&&rank?<span className="avatar-rank-mark">{rank==='diamond'?'💎':rank==='gold'?'🥇':rank==='rose-gold'?'🌹':rank==='silver'?'🥈':rank==='top50'?'✦':'♡'}</span>:null}
 </span>;
}
export function Heading({eyebrow='USA50 FAN UNIVERSE',title,subtitle,action}){return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action&&<div className="heading-action">{action}</div>}</div>;}
export function Empty({icon='✧',title='Nothing here yet',detail,action}){return <div className="empty-state"><span>{icon}</span><strong>{title}</strong>{detail&&<p>{detail}</p>}{action}</div>;}
// The rank badge uses a distinct award tier, independent of any selected avatar ring.
export function rankTone(rank){
 const n=Number(rank);
 if(!Number.isInteger(n)||n<1||n>100)return 'unranked';
 if(n===1)return 'diamond';
 if(n===2)return 'gold';
 if(n===3)return 'rose-gold';
 if(n<=10)return 'silver';
 return n<=50?'top50':'top100';
}
export function Badge({children,tone='neutral'}){return <span className={'mini-badge '+tone}>{children}</span>;}
export function VipBadge({level,size='normal'}){
 const rank=Math.max(0,Math.min(10,Number(level)||0));
 if(!rank)return null;
 return <span className={'vip-badge vip-rank-'+rank+(size==='large'?' large':'')} title={'VIP '+rank} aria-label={'VIP '+rank}>✦ VIP {rank}</span>;
}
const FACE_FONTS=['Georgia','Great Vibes','Arial','Times New Roman','Trebuchet MS','Verdana','Courier New'];
function clampFace(value,min,max,fallback){return value!==null&&value!==''&&Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;}
export function CardFaceText({overlayText}){
 if(!overlayText||typeof overlayText!=='object'||Array.isArray(overlayText))return null;
 const value=typeof overlayText.value==='string'?overlayText.value.slice(0,60):'';
 if(!value)return null;
 const fontFamily=FACE_FONTS.includes(overlayText.fontFamily)?overlayText.fontFamily:'Georgia';
 const align=['left','center','right'].includes(overlayText.align)?overlayText.align:'center';
 const shift=align==='left'?'0':align==='right'?'-100%':'-50%';
 const color=/^#[0-9a-fA-F]{6}$/.test(String(overlayText.color||''))?overlayText.color:'#68577D';
 const weight=['400','500','600','700'].includes(String(overlayText.weight))?String(overlayText.weight):'400';
 return <span className="react-card-face-lettering" data-card-text="1" style={{
  left:clampFace(overlayText.x,0,100,50)+'%',top:clampFace(overlayText.y,0,100,88)+'%',
  fontFamily:fontFamily==='Great Vibes'?'"Great Vibes", cursive':fontFamily,
  fontSize:(clampFace(overlayText.fontSize,14,160,58)/660*100).toFixed(4)+'cqw',
  color,fontWeight:weight,fontStyle:overlayText.italic===true?'italic':'normal',
  textAlign:align,transform:'translate('+shift+', -50%)'}}>{value}</span>;
}
export function CardPreview({card,owned=0,onClick,locked=false}){
 const hasArt=Boolean(card.artUrl),art=card.artUrl||'/assets/portraits/arielle_real.webp';
 return <button className={'card-collectible rarity-'+(card.rarity||'R').toLowerCase()+(locked?' locked':'')} type="button" onClick={onClick}>
  <div className="card-collectible-art"><img src={art} loading="lazy" alt={card.title||'USA50 photocard'}/>{card.borderUrl&&<img className="card-overlay" src={card.borderUrl} alt=""/>}<CardFaceText overlayText={card.overlayText}/>{card.overlayText==null&&card.borderUrl&&<span className="react-card-name-fallback">{card.member||'Arielle'}</span>}{locked&&<span className="card-lock">✧</span>}</div>
  <span className="card-collectible-label">{card.title||'Photocard'}</span><span className="card-collectible-meta">{card.rarity||'R'} · {owned?'Owned ×'+number(owned):'Uncollected'}</span>
 </button>;
}
export function StarBundleArt({sku}){
 const star=(x,y,r)=>{const points=[];for(let i=0;i<10;i++){const a=(i*Math.PI/5-Math.PI/2),d=i%2?r*.45:r;points.push((x+Math.cos(a)*d)+','+(y+Math.sin(a)*d));}return <polygon points={points.join(' ')} fill="url(#g)" stroke="#fff7dc" strokeWidth="2"/>};
 return <svg className="star-bundle-art" viewBox="0 0 160 145" role="img" aria-label={sku+' stars illustration'}><defs><linearGradient id="g" x2="1" y2="1"><stop stopColor="#fff8bd"/><stop offset=".6" stopColor="#ffd36e"/><stop offset="1" stopColor="#ef9bc3"/></linearGradient></defs>
 <ellipse cx="80" cy="127" rx="55" ry="8" fill="#b686c4" opacity=".15"/>
 {sku==='spark'?star(80,70,37):sku==='glow'?<>{star(48,90,24)}{star(79,65,28)}{star(111,88,23)}{star(82,34,16)}</>:sku==='shimmer'?<><path d="M35 55 80 32 128 55 80 82z" fill="#f5bbec"/><path d="M35 55 80 82v40L35 99z" fill="#bd94e2"/><path d="M80 82 128 55v44l-48 23z" fill="#9878cf"/>{star(78,30,22)}{star(113,25,11)}</>:sku==='starlight'?<><path d="M43 49 117 49 126 118Q79 128 34 118z" fill="#c9a0e9" stroke="white" strokeWidth="3"/><path d="M61 52V36Q61 10 80 10Q99 10 99 36V52" fill="none" stroke="#fff5ff" strokeWidth="8"/>{star(80,82,24)}</>:<><path d="M15 70h88v47H15z" fill="#a988d6" stroke="white" strokeWidth="3"/><path d="M103 90h25l17 15v12h-42z" fill="#e1b4ef" stroke="white" strokeWidth="3"/><rect x="115" y="97" width="17" height="12" rx="3" fill="#e7f6ff"/><circle cx="40" cy="118" r="12" fill="#695183" stroke="#fff" strokeWidth="3"/><circle cx="123" cy="118" r="12" fill="#695183" stroke="#fff" strokeWidth="3"/>{star(35,50,18)}{star(61,47,23)}{star(88,55,18)}{star(108,62,12)}</>}
 </svg>;
}
export function SectionTitle({title,action}){return <div className="section-title"><h2>{title}</h2>{action}</div>;}
export {dateLabel};
