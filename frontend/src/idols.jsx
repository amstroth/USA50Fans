import React,{useEffect,useState} from 'react';
import {useApp} from './state';
import {Icon} from './ui';

const SIGNS=['','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const BLANK={birthday:'',zodiac:{sun:'',moon:'',rising:''},mbti:'',height:'',bornCity:'',bornState:'',
 favoriteColors:[],quote:'',yearGoal:'',idolGoal:''};
function readableBirthday(value){
 const m=/^(\d\d)-(\d\d)$/.exec(value||'');
 if(!m)return '';
 const date=new Date(Date.UTC(2024,Number(m[1])-1,Number(m[2])));
 return date.toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'UTC'});
}
function profileImage(file){
 return new Promise((resolve,reject)=>{
  if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15_000_000)
   return reject(Error('Choose a JPEG, PNG or WebP photo under 15 MB.'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('The selected image could not be opened.'));};
  img.onload=()=>{
   try{
    const scale=Math.min(1,1200/img.width,1600/img.height),canvas=document.createElement('canvas');
    canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    URL.revokeObjectURL(url);
    const image=canvas.toDataURL('image/jpeg',.77);
    if(image.length>1950000)return reject(Error('The portrait is too large after compression. Choose a smaller image.'));
    resolve(image);
   }catch(e){URL.revokeObjectURL(url);reject(e);}
  };
  img.src=url;
 });
}
function IdolEditor({member,profile,close}){
 const {run,message}=useApp();
 const [draft,setDraft]=useState(()=>({...BLANK,...profile,zodiac:{...BLANK.zodiac,...profile.zodiac},
  favoriteColors:(profile.favoriteColors||[]).map(c=>({...c}))}));
 const [newPhoto,setNewPhoto]=useState(null),[busy,setBusy]=useState(false);
 const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
 const zodiac=(key,value)=>setDraft(d=>({...d,zodiac:{...d.zodiac,[key]:value}}));
 const colors=(index,key,value)=>setDraft(d=>({...d,favoriteColors:d.favoriteColors.map((c,i)=>i===index?{...c,[key]:value}:c)}));
 async function save(e){
  e.preventDefault();setBusy(true);
  try{
   await run('/api/idol-profiles/update',{idolId:member.id,
    birthday:draft.birthday,zodiac:draft.zodiac,mbti:draft.mbti,height:draft.height,
    bornCity:draft.bornCity,bornState:draft.bornState,favoriteColors:draft.favoriteColors,
    quote:draft.quote,yearGoal:draft.yearGoal,idolGoal:draft.idolGoal,
    ...(newPhoto?{photoDataUrl:newPhoto}:{})});
   message('Member profile saved ♡');close();
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 return <div className="react-modal-cover" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&close()}>
  <div className="react-modal idol-editor" role="dialog" aria-modal="true" aria-label={'Edit '+member.name+' member profile'}>
   <header><div><span className="eyebrow">{member.team} · MEMBERS</span><h2>Edit {member.name}'s Profile</h2></div><button aria-label="Close editor" onClick={close}><Icon name="x"/></button></header>
   <form className="react-form" onSubmit={save}>
    <label>Official member photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{setNewPhoto(await profileImage(f));}catch(err){message(err.message);}}}/></label>
    {(newPhoto||profile.photoUrl)&&<img src={newPhoto||profile.photoUrl} className="idol-editor-photo" alt="Member portrait preview"/>}
    <div className="idol-form-grid">
     <label>Birthday (month and day)<input type="text" placeholder="MM-DD" pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" maxLength={5} value={draft.birthday} onChange={e=>set('birthday',e.target.value)}/></label>
     <label>MBTI<input maxLength={8} placeholder="INFP-T" value={draft.mbti} onChange={e=>set('mbti',e.target.value.toUpperCase())}/></label>
     <label>Height<input maxLength={26} placeholder="5'3&#34; / 160 cm" value={draft.height} onChange={e=>set('height',e.target.value)}/></label>
     <label>Born in — city<input maxLength={70} placeholder="City" value={draft.bornCity} onChange={e=>set('bornCity',e.target.value)}/></label>
     <label>Born in — state<input maxLength={70} placeholder="State" value={draft.bornState} onChange={e=>set('bornState',e.target.value)}/></label>
    </div>
    <fieldset className="idol-zodiac-fieldset"><legend>Zodiac placements (all optional)</legend><div className="idol-form-grid">
     {['sun','moon','rising'].map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} sign<select value={draft.zodiac[key]||''} onChange={e=>zodiac(key,e.target.value)}>{SIGNS.map(s=><option key={s} value={s}>{s||'Not provided'}</option>)}</select></label>)}
    </div><small>You can show only your Sun sign, only Rising, or any combination.</small></fieldset>
    <fieldset className="idol-zodiac-fieldset"><legend>Favorite colors (maximum 2)</legend>
     {(draft.favoriteColors||[]).map((color,i)=><div className="idol-color-editor" key={i}>
      <input type="color" aria-label={'Favorite color '+(i+1)+' picker'} value={color.color} onChange={e=>colors(i,'color',e.target.value)}/>
      <input aria-label={'Favorite color '+(i+1)+' name'} maxLength={35} placeholder="Custom color name" value={color.name} onChange={e=>colors(i,'name',e.target.value)}/>
      <button type="button" aria-label={'Remove color '+(i+1)} onClick={()=>setDraft(d=>({...d,favoriteColors:d.favoriteColors.filter((_,n)=>n!==i)}))}><Icon name="x" size={16}/></button>
     </div>)}
     {draft.favoriteColors.length<2&&<button type="button" className="action soft" onClick={()=>setDraft(d=>({...d,favoriteColors:[...d.favoriteColors,{name:'',color:'#d9a6da'}]}))}>+ Add favorite color</button>}
    </fieldset>
    <label>Favorite quote<textarea maxLength={300} value={draft.quote} onChange={e=>set('quote',e.target.value)}/></label>
    <label>This year's goal<textarea maxLength={500} value={draft.yearGoal} onChange={e=>set('yearGoal',e.target.value)}/></label>
    <label>Goal as an idol<textarea maxLength={500} value={draft.idolGoal} onChange={e=>set('idolGoal',e.target.value)}/></label>
    <p className="fineprint">These details are public. Only publish information this idol approves sharing.</p>
    <button className="action primary full" type="submit" disabled={busy}>{busy?'Saving profile…':'Save member profile'}</button>
   </form>
  </div>
 </div>;
}
function Fact({label,children}){return children?<div className="idol-fact"><span>{label}</span><strong>{children}</strong></div>:null;}
export function MeetIdolsPage(){
 const {data,selectedIdolId,setSelectedIdolId,message}=useApp();
 const members=data?.members||[],profiles=data?.idolProfiles||{},me=data?.me;
 const [expanded,setExpanded]=useState('NYC50'),[edit,setEdit]=useState(false),[photoFailed,setPhotoFailed]=useState(false);
 const active=members.find(m=>m.id===selectedIdolId)||members[0],index=members.findIndex(m=>m.id===active?.id);
 const profile=active?profiles[active.id]||BLANK:BLANK;
 const canEdit=Boolean(me&&!me.mustChangePassword&&(me.role==='admin'||(me.role==='idol'&&me.idolId===active?.id)));
 useEffect(()=>{if(active&&expanded!==active.team)setExpanded(active.team);setPhotoFailed(false);},[active?.id]);
 const photo=photoFailed?null:profile.photoUrl||(active?.id==='arielle'?'/assets/portraits/arielle_real.webp':null);
 function select(id){setSelectedIdolId(id);setPhotoFailed(false);}
 function move(delta){if(members.length)select(members[(index+delta+members.length)%members.length].id);}
 return <main className="view idol-directory-page">
  <div className="idol-directory-shell">
   <nav className="idol-directory-nav" aria-label="Choose an idol">
    <div className="idol-directory-nav-title"><span>USA50</span><small>MEET THE IDOLS</small></div>
    {['NYC50','LA50'].map(team=><div key={team} className="idol-nav-team">
     <button className={'idol-team-toggle'+(expanded===team?' expanded':'')} onClick={()=>setExpanded(g=>g===team?'':team)} aria-expanded={expanded===team}>
      <strong>{team}</strong><Icon name="chevron" size={18}/>
     </button>
     {expanded===team&&<div className="idol-nav-members">{members.filter(m=>m.team===team).map(member=><button key={member.id} className={member.id===active?.id?'chosen':''} onClick={()=>select(member.id)} aria-current={member.id===active?.id?'true':undefined}>{member.name}</button>)}</div>}
    </div>)}
   </nav>
   <div className="idol-directory-content">
    <div className="idol-directory-intro"><span className="eyebrow">{active?.team||'USA50'} · MEMBER PROFILE</span><h1>Meet {active?.name||'the Idols'}</h1>{canEdit&&<button type="button" className="action secondary" onClick={()=>setEdit(true)}><Icon name="settings" size={15}/> Edit profile</button>}</div>
    {active&&<><div className="idol-profile-stage">
      <button className="idol-stage-arrow" onClick={()=>move(-1)} aria-label="Previous idol"><Icon name="back" size={26}/></button>
      <div className="idol-center-profile">
       <div className="idol-feature-photo">{photo?<img src={photo} alt={active.name+' official member portrait'} onError={()=>setPhotoFailed(true)}/>:<div className="idol-empty-photo"><span>✧</span><strong>{active.name}</strong><small>Official photo coming soon</small></div>}</div>
       <div className="idol-portrait-caption"><h2>{active.name}</h2><span>{active.team} · USA50</span></div>
      </div>
      <button className="idol-stage-arrow" onClick={()=>move(1)} aria-label="Next idol"><Icon name="chevron" size={26}/></button>
     </div>
     <div className="idol-bio-sections">
      <section className="idol-bio-panel"><h3>About {active.name} <span>✧</span></h3>
       <div className="idol-facts-grid">
        <Fact label="Birthday">{readableBirthday(profile.birthday)}</Fact>
        <Fact label="MBTI">{profile.mbti}</Fact>
        <Fact label="Height">{profile.height}</Fact>
        <Fact label="Born in">{[profile.bornCity,profile.bornState].filter(Boolean).join(', ')}</Fact>
        {['sun','moon','rising'].map(key=><Fact key={key} label={key[0].toUpperCase()+key.slice(1)+' sign'}>{profile.zodiac?.[key]}</Fact>)}
        {profile.favoriteColors?.length>0&&<div className="idol-fact idol-favorite-colors"><span>Favorite colors</span><div className="idol-color-chips">{profile.favoriteColors.map((c,i)=><span key={i} className="idol-color-chip"><i style={{background:c.color}}/>{c.name}</span>)}</div></div>}
       </div>
       {!['birthday','mbti','height','bornCity','bornState','quote','yearGoal','idolGoal'].some(k=>profile[k])&&!profile.favoriteColors?.length&&!Object.values(profile.zodiac||{}).some(Boolean)&&<p className="idol-bio-empty">Member details will appear here when the idol or management adds them.</p>}
      </section>
      {profile.quote&&<section className="idol-bio-quote"><span>✧ A WORD FROM {active.name.toUpperCase()}</span><blockquote>“{profile.quote}”</blockquote></section>}
      {(profile.yearGoal||profile.idolGoal)&&<section className="idol-bio-panel"><h3>Dreams & goals</h3>
       {profile.yearGoal&&<div className="idol-goal"><span>THIS YEAR'S GOAL</span><p>{profile.yearGoal}</p></div>}
       {profile.idolGoal&&<div className="idol-goal"><span>MY GOAL AS AN IDOL</span><p>{profile.idolGoal}</p></div>}
      </section>}
     </div>
    </>}
   </div>
  </div>
  {edit&&canEdit&&active&&<IdolEditor key={active.id} member={active} profile={profile} close={()=>setEdit(false)}/>}
 </main>;
}
