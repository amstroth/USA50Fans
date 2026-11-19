import React,{useRef,useState} from 'react';
import {useApp} from './state';
import {Avatar,Empty,Heading} from './ui';
import {dateLabel} from './api';

const EMOJI=['♡','✦','☆','☁️','🌷','🐰','🎀','💌','🫧','🦋','🍒','⭐','🪼','🍀','🦄','✨','💗','🌸'];
const COLORS=[['Cream','#fff9f0'],['Pink','#ffe8f0'],['Lavender','#eee7ff'],['Mint','#e6f7ee'],['Blue','#e5f3ff'],['White','#ffffff']];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
const posItem=i=>({x:25+(i%4)*15,y:45+Math.floor(i/4)*12,scale:1,rotation:0});
const sheetStyle=entry=>{
 const color=entry.lineColor||'#c6b7b0';
 const lines={ruled:'repeating-linear-gradient(to bottom,transparent 0px,transparent 27px,'+color+'55 28px,'+color+'55 29px)',
  grid:'linear-gradient('+color+'55 1px,transparent 1px),linear-gradient(90deg,'+color+'55 1px,transparent 1px)',
  dots:'radial-gradient('+color+'77 1px,transparent 1.4px)'};
 return {backgroundColor:entry.paper||'#fff9f0',color:entry.textColor||'#4c3c53',
  backgroundImage:lines[entry.layout]||'none',
  ...(entry.layout==='grid'?{backgroundSize:'26px 26px'}:entry.layout==='dots'?{backgroundSize:'20px 20px'}:{})};
};
async function compress(file){
 if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>16e6)throw Error('Select a JPG, PNG or WebP under 16 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Unable to read the photo.'));});
  let max=1200,quality=.85;
  for(let i=0;i<10;i++){
   const cv=document.createElement('canvas'),ratio=Math.min(1,max/Math.max(img.width,img.height));
   cv.width=Math.max(1,Math.round(img.width*ratio));cv.height=Math.max(1,Math.round(img.height*ratio));
   cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
   const data=cv.toDataURL('image/jpeg',quality).split(',')[1];
   if(data.length<920000)return {mime:'image/jpeg',data,url:'data:image/jpeg;base64,'+data,caption:file.name.replace(/\.[^.]+$/,'').slice(0,80)};
   if(i%2===0)quality=Math.max(.45,quality-.12);else max=Math.max(420,Math.round(max*.8));
  }
  throw Error('The photo is still too large. Choose a smaller image.');
 }finally{URL.revokeObjectURL(url);}
}
function DiaryAuthorPhoto({entry,size='sm'}){
 const {data}=useApp();
 const author=data?.social?.profiles?.[entry?.authorId]||null;
 const members=data?.members||[];
 const member=members.find(m=>m.id===author?.idolId)||
  members.find(m=>m.name?.trim().toLowerCase()===String(entry?.author||'').trim().toLowerCase());
 return <Avatar member={member} profile={author||{displayName:entry?.author||'USA50 Idol'}} size={size}/>;
}
function Sheet({entry,editing=false,items=[],photos=[],selected=-1,onDown,onMove,onUp,onKey,onSelect}){
 const decorations=editing?items:(entry.placedItems||[]);
 const pictures=editing?photos:(entry.photos||[]);
 return <article className={'react-diary-sheet '+(editing?'editing':'published')} style={sheetStyle(entry)}>
  <header className="react-diary-sheet-head"><div className="react-diary-sheet-person"><DiaryAuthorPhoto entry={entry}/><div><small>USA50 IDOL DIARY · {entry.author||'USA50'}</small><h3>{editing?'Entry preview':'Entry '+String(entry.number).padStart(3,'0')}</h3></div></div><time>{dateLabel(entry.publishedAt||new Date().toISOString())}</time></header>
  <p className="react-diary-sheet-text">{entry.text||'Dear diary…'}</p>
  <div className="react-diary-decors">{decorations.map((item,i)=><div key={item.uid||i}
   className={'react-diary-decoration '+(item.kind==='photo'?'photo':'sticker')+(selected===i&&editing?' selected':'')}
   style={{left:item.x+'%',top:item.y+'%',transform:'translate(-50%,-50%) rotate('+item.rotation+'deg) scale('+item.scale+')'}}
   role={editing?'button':undefined} tabIndex={editing?0:undefined}
   aria-label={editing?'Drag or resize '+(item.kind==='photo'?'polaroid':'sticker '+item.emoji):undefined}
   onPointerDown={editing?e=>onDown(e,i):undefined} onPointerMove={editing?onMove:undefined}
   onPointerUp={editing?onUp:undefined} onPointerCancel={editing?onUp:undefined}
   onKeyDown={editing?e=>onKey(e,i):undefined} onClick={editing?()=>onSelect(i):undefined}>
    {item.kind==='sticker'?<span className="react-diary-emoji">{item.emoji}</span>:
     <figure><img draggable="false" src={pictures[item.photoIndex]?.url||''} alt={pictures[item.photoIndex]?.caption||'Diary polaroid'}/><figcaption>{pictures[item.photoIndex]?.caption||'A little moment'}</figcaption></figure>}
    {editing&&selected===i&&<span className="react-diary-grip" data-resize="true" title="Drag to resize">⤢</span>}
   </div>)}</div>
  {!editing&&!decorations.length&&pictures.length>0&&<div className="react-diary-static-photos">{pictures.map((p,i)=><figure key={p.id||i}><img src={p.url} alt={p.caption||'Diary photo'}/><figcaption>{p.caption}</figcaption></figure>)}</div>}
  {!editing&&!decorations.length&&entry.stickers?.length>0&&<p className="react-diary-legacy-stickers">{entry.stickers.join(' ')}</p>}
 </article>;
}
function Editor({done}){
 const {data,run,message}=useApp();
 const [text,setText]=useState(''),[layout,setLayout]=useState('ruled'),[paper,setPaper]=useState('#fff9f0');
 const [lineColor,setLineColor]=useState('#c6b7b0'),[textColor,setTextColor]=useState('#4c3c53');
 const [items,setItems]=useState([]),[photos,setPhotos]=useState([]),[selected,setSelected]=useState(-1),[busy,setBusy]=useState(false);
 const page=useRef(null),drag=useRef(null);
 const selectedItem=items[selected];
 function edit(index,patch){setItems(old=>old.map((x,i)=>i===index?{...x,...patch}:x));}
 function addEmoji(emoji){
  const n=items.filter(x=>x.kind==='sticker').length;if(n>=18)return message('18 stickers maximum.');
  setItems(prev=>[...prev,{uid:'sticker-'+Date.now()+'-'+prev.length,kind:'sticker',emoji,...posItem(n)}]);setSelected(items.length);
 }
 async function addPhotos(files){
  if(photos.length+files.length>4)return message('Up to four Polaroids per diary.');
  try{
   const added=await Promise.all(files.map(compress)),base=photos.length;
   setPhotos(p=>[...p,...added]);
   setItems(prev=>[...prev,...added.map((p,i)=>({uid:'photo-'+Date.now()+'-'+i,kind:'photo',photoIndex:base+i,x:(base+i)%2?72:27,y:62+Math.floor((base+i)/2)*17,scale:1,rotation:(base+i)%2?6:-6}))]);
   setSelected(items.length+added.length-1);
  }catch(err){message(err.message);}
 }
 function removePhoto(index){
  setPhotos(x=>x.filter((_,i)=>i!==index));
  setItems(x=>x.filter(p=>p.kind!=='photo'||p.photoIndex!==index).map(p=>p.kind==='photo'&&p.photoIndex>index?{...p,photoIndex:p.photoIndex-1}:p));
  setSelected(-1);
 }
 function onDown(e,index){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const item=items[index],rect=page.current?.getBoundingClientRect();if(!item||!rect)return;
  e.stopPropagation();e.preventDefault();setSelected(index);
  drag.current={id:e.pointerId,index,mode:e.target.closest('[data-resize]')?'resize':'move',x:e.clientX,y:e.clientY,
   originalX:item.x,originalY:item.y,scale:item.scale,w:rect.width,h:rect.height};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
 }
 function onMove(e){
  const d=drag.current;if(!d||d.id!==e.pointerId)return;
  e.preventDefault();
  if(d.mode==='resize')edit(d.index,{scale:Math.round(clamp(d.scale+(e.clientX-d.x)/100+(e.clientY-d.y)/120,.45,2.5)*100)/100});
  else edit(d.index,{x:clamp(d.originalX+(e.clientX-d.x)*100/d.w,5,95),y:clamp(d.originalY+(e.clientY-d.y)*100/d.h,4,96)});
 }
 function onUp(e){if(drag.current?.id===e.pointerId)drag.current=null;}
 function onKey(e,index){
  if(!e.key.startsWith('Arrow'))return;e.preventDefault();
  const item=items[index];if(!item)return;setSelected(index);const step=e.shiftKey?5:1;
  edit(index,{x:clamp(item.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),5,95),
   y:clamp(item.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0),4,96)});
 }
 function moveFront(){
  if(selected<0)return;
  setItems(x=>{const next=[...x],item=next.splice(selected,1)[0];next.push(item);return next;});setSelected(items.length-1);
 }
 async function publish(e){
  e.preventDefault();if(busy||!text.trim())return;setBusy(true);
  try{
   const payload={text:text.trim(),layout,paper,lineColor,textColor,stickers:[],
    photos:photos.map(p=>({mime:p.mime,data:p.data,caption:p.caption})),
    placedItems:items.map(x=>({kind:x.kind,x:x.x,y:x.y,scale:x.scale,rotation:x.rotation,...(x.kind==='sticker'?{emoji:x.emoji}:{photoIndex:x.photoIndex})}))};
   const result=await run('/api/diary/publish',payload);
   message('Diary entry published ♡');done(result.entry);
  }catch(err){message(err.message);}finally{setBusy(false);}
 }
 const current={text,author:data?.me?.displayName||'USA50 Idol',layout,paper,lineColor,textColor};
 return <form className="react-diary-composer" onSubmit={publish}>
  <div className="react-diary-tools"><div className="react-diary-tools-header"><h2>Write a diary entry ♡</h2><button type="button" className="action soft" onClick={()=>done(null)}>Close editor</button></div>
   <label>Your entry<textarea rows={7} required maxLength={6000} value={text} onChange={e=>setText(e.target.value)} placeholder="Dear diary…"/></label>
   <div className="react-diary-options"><label>Paper style<select value={layout} onChange={e=>setLayout(e.target.value)}>{['ruled','grid','dots','none'].map(s=><option value={s} key={s}>{s}</option>)}</select></label>
    <label>Paper color<select value={paper} onChange={e=>setPaper(e.target.value)}>{COLORS.map(([name,value])=><option key={value} value={value}>{name}</option>)}</select></label>
    <label>Ink<input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label>
    <label>Line color<input type="color" value={lineColor} onChange={e=>setLineColor(e.target.value)}/></label>
   </div>
   <section className="react-diary-picker"><strong>Sticker collection</strong><p>Tap to add, then drag to position and resize.</p><div>{EMOJI.map(e=><button type="button" key={e} onClick={()=>addEmoji(e)} aria-label={'Add sticker '+e}>{e}</button>)}</div></section>
   <section className="react-diary-photo-chooser"><label className="action secondary">+ Add Polaroids ({photos.length}/4)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const list=Array.from(e.target.files||[]);e.target.value='';addPhotos(list);}}/></label>
    {photos.map((p,i)=><div className="react-diary-upload" key={i}><img src={p.url} alt={'Polaroid '+(i+1)}/><input value={p.caption} maxLength={80} aria-label={'Photo '+(i+1)+' caption'} onChange={e=>setPhotos(arr=>arr.map((x,j)=>i===j?{...x,caption:e.target.value}:x))}/><button type="button" onClick={()=>removePhoto(i)} aria-label="Remove photo">×</button></div>)}</section>
   <section className="react-diary-selection"><h3>Selected decoration</h3>{selectedItem?<><strong>{selectedItem.kind==='photo'?'📸 Polaroid':selectedItem.emoji+' Sticker'}</strong>
    <label>Size {Number(selectedItem.scale).toFixed(2)}×<input type="range" min=".45" max="2.5" step=".05" value={selectedItem.scale} onChange={e=>edit(selected,{scale:Number(e.target.value)})}/></label>
    <label>Rotation {selectedItem.rotation}°<input type="range" min="-45" max="45" step="1" value={selectedItem.rotation} onChange={e=>edit(selected,{rotation:Number(e.target.value)})}/></label>
    <div><button type="button" className="action secondary" onClick={moveFront}>Bring forward</button><button type="button" className="action soft" onClick={()=>{setItems(x=>x.filter((_,i)=>i!==selected));setSelected(-1);}}>Remove</button></div>
   </>:<p>Select a sticker or photo. Drag it to move; drag its corner handle to resize. Use the sliders to fine-tune.</p>}</section>
   <button className="action primary full" type="submit" disabled={busy||!text.trim()}>{busy?'Publishing…':'Publish diary entry ♡'}</button>
   <p className="fineprint">Only idol accounts can publish. Photos and positions are saved with the entry.</p>
  </div>
  <div className="react-diary-preview"><strong>Live diary preview</strong><small>Drag and resize stickers and Polaroids directly on the paper.</small>
   <div ref={page} className="react-diary-preview-page"><Sheet entry={current} editing items={items} photos={photos} selected={selected}
    onDown={onDown} onMove={onMove} onUp={onUp} onKey={onKey} onSelect={setSelected}/></div>
  </div>
 </form>;
}
export function DiaryPage(){
 const {data,run,message}=useApp(),entries=data?.officialDiary?.diaries||[],canPost=data?.officialDiary?.canPost;
 const [creating,setCreating]=useState(false),[selectedId,setSelectedId]=useState(null);
 const me=data?.me,chosen=entries.find(x=>x.id===selectedId)||entries[0];
 async function remove(entry){
  if(!window.confirm('Delete this diary entry permanently?'))return;
  try{await run('/api/diary/delete',{id:entry.id});setSelectedId(null);message('Diary removed.');}
  catch(err){message(err.message);}
 }
 return <main className="view react-diary-page">
  <Heading eyebrow="USA50 IDOL DIARIES" title="Dear diary… ♡" subtitle="Little moments and memories shared by USA50 idols." action={canPost?<button className="action primary" onClick={()=>setCreating(s=>!s)}>{creating?'Close editor':'✦ Write an entry'}</button>:null}/>
  {creating&&canPost?<Editor done={entry=>{setCreating(false);if(entry)setSelectedId(entry.id);}}/>:
   <div className="react-diary-reading"><aside className="react-diary-archive"><h2>Diary archive</h2><p>{entries.length} entries</p><div>{entries.map(e=><button className={chosen?.id===e.id?'selected':''} key={e.id} onClick={()=>setSelectedId(e.id)}>
    <DiaryAuthorPhoto entry={e}/>
    <span className="react-diary-archive-label"><strong>✧ Entry {String(e.number).padStart(3,'0')}</strong><span>{e.author}</span><small>{dateLabel(e.publishedAt)}</small></span></button>)}</div>
    {canPost&&<button className="action secondary" onClick={()=>setCreating(true)}>+ New entry</button>}
   </aside><section className="react-diary-reader">{chosen?<><div className="react-diary-reader-top"><div className="react-diary-reader-author"><DiaryAuthorPhoto entry={chosen}/><strong>{chosen.author}'s diary</strong></div>{(me?.id===chosen.authorId||me?.role==='admin')&&<button className="action soft" onClick={()=>remove(chosen)}>Delete entry</button>}</div><Sheet entry={chosen}/></>:<Empty title="No diary entries yet" detail="Idol diaries will appear here as soon as they're published."/>}</section></div>}
 </main>;
}
