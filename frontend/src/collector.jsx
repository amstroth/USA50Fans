import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CardPreview,Icon} from './ui';
import {number} from './api';

// The React viewer reuses the exact authenticated physical-card Three.js
// renderer, foil masks and card-back logic from the legacy collector.
const loadedScripts=new Map();
function loadLocalScript(src,globalName){
 if(window[globalName])return Promise.resolve(window[globalName]);
 if(!loadedScripts.has(src)){
  loadedScripts.set(src,new Promise((resolve,reject)=>{
   const tag=document.createElement('script');tag.src=src;tag.async=true;
   tag.onload=()=>window[globalName]?resolve(window[globalName]):reject(Error('Card viewer module was not initialized.'));
   tag.onerror=()=>reject(Error('Could not load the card viewer module.'));
   document.head.appendChild(tag);
  }).catch(err=>{loadedScripts.delete(src);throw err;}));
 }
 return loadedScripts.get(src);
}
async function getThreeViewer(){
 await loadLocalScript('/card-face-text.js?v=10','USA50CardFace');
 return loadLocalScript('/collector-three-v12.js?v=15','USA50ThreeCard');
}
export function CollectorViewer({card,owned,onClose}){
 const target=useRef(null),engine=useRef(null),[side,setSide]=useState('FRONT');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState('');
 useEffect(()=>{
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const key=e=>{if(e.key==='Escape')onClose();};
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);};
 },[onClose]);
 useEffect(()=>{
  let alive=true;
  async function mount(){
   if(!target.current)return;
   setError('');setLoading(true);setWarning('');
   try{
    const render=await getThreeViewer();
    if(!alive||!target.current?.isConnected)return;
    const instance=await render.create({container:target.current,card,layers:card.materialLayers||[],
     onSide:value=>{if(alive)setSide(value);},
     onWarning:value=>{if(alive)setWarning(value);}});
    if(!alive){instance.destroy();return;}
    engine.current=instance;setLoading(false);
   }catch(err){if(alive){setError(err.message||'3D preview unavailable');setLoading(false);}}
  }
  mount();
  return()=>{alive=false;const previous=engine.current;engine.current=null;previous?.destroy();};
 },[card.id]);
 const fallback=card.artUrl||'/assets/portraits/arielle_real.webp';
 return createPortal(<div className="react-collector-fullscreen" role="dialog" aria-modal="true" aria-label={card.title+' full screen 3D photocard viewer'}>
  <div className="react-collector-glow one"/><div className="react-collector-glow two"/>
  <header className="react-collector-header"><div><span className="eyebrow">USA50 · YOUR COLLECTION</span><h2>{card.title||'Collector Card'}</h2><p>{card.member||'USA50'} · {card.rarity||'R'} · Owned ×{number(owned)}</p></div>
   <button className="react-collector-close" type="button" onClick={onClose} aria-label="Close full screen card viewer"><Icon name="x" size={25}/></button>
  </header>
  <div className="react-collector-main">
   {loading&&<div className="react-collector-loading" role="status"><span>✦</span> Creating your 3D photocard…</div>}
   <div className="react-collector-canvas" ref={target} aria-label="Drag to rotate the card and reveal its back"/>
   {error&&<div className="react-collector-fallback"><img src={fallback} alt={card.title+' front illustration'}/>
    <p>Interactive 3D is unavailable: {error}</p><small>Try another browser or enable WebGL hardware acceleration.</small></div>}
  </div>
  <footer className="react-collector-footer"><div><strong>{side}</strong><span>Drag to rotate · turn the card over to view its reverse</span>{warning&&<small role="status">{warning}</small>}</div>
   <div className="react-collector-buttons"><button className="action primary" disabled={loading||!!error} onClick={()=>engine.current?.flip()}>↻ Flip card</button>
    <button className="action secondary" disabled={loading||!!error} onClick={()=>engine.current?.reset()}>Reset view</button>
    <button className="action soft" onClick={onClose}>Done</button></div>
  </footer>
 </div>,document.body);
}
