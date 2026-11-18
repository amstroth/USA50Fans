import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
/* Crop control shared by idol circle portraits and all fan/management avatars.
   Drag the image to position the face and zoom before saving the square crop. */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export async function preparePhoto(file,{maxSide=1500,maxChars=1850000}={}){
 if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15_000_000)
  throw Error('Choose a JPEG, PNG or WebP photo under 15 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await new Promise((yes,no)=>{img.onload=yes;img.onerror=()=>no(Error('Unable to open image.'));});
  let limit=maxSide,quality=.85;
  for(let i=0;i<9;i++){
   const scale=Math.min(1,limit/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<maxChars)return data;
   if(i%2===0)quality=Math.max(.48,quality-.12);else limit=Math.max(450,Math.round(limit*.83));
  }
  throw Error('This image is too large to upload. Select a smaller photo.');
 }finally{URL.revokeObjectURL(url);}
}
export function CropPhoto({source,onSave,onCancel,title='Crop your profile picture',outputSize=512,maxChars=1850000}){
 const [dim,setDim]=useState(null),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pointer=useRef(null);const imgRef=useRef(null);
 useEffect(()=>{setDim(null);setZoom(1);setPan({x:0,y:0});setError('');},[source]);
 const previewSize=272;
 const metrics=dim?(()=>{
  const factor=Math.max(previewSize/dim.w,previewSize/dim.h)*zoom;
  const w=dim.w*factor,h=dim.h*factor;
  return {w,h,left:(previewSize-w)/2+(w-previewSize)*pan.x/2,top:(previewSize-h)/2+(h-previewSize)*pan.y/2,
    excessX:Math.max(0,w-previewSize),excessY:Math.max(0,h-previewSize)};
 })():null;
 function onMove(e){
  if(!pointer.current||pointer.current.id!==e.pointerId||!metrics)return;
  const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;
  const {start,excessX,excessY}=pointer.current;
  setPan({x:excessX>0?clamp(start.x+dx*2/excessX,-1,1):0,
    y:excessY>0?clamp(start.y+dy*2/excessY,-1,1):0});
 }
 async function apply(){
  if(!dim||!imgRef.current||busy)return;
  setBusy(true);setError('');
  try{
   const image=imgRef.current;
   const canvas=document.createElement('canvas');canvas.width=outputSize;canvas.height=outputSize;
   const scale=Math.max(outputSize/image.naturalWidth,outputSize/image.naturalHeight)*zoom;
   const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
   const left=(outputSize-w)/2+(w-outputSize)*pan.x/2,top=(outputSize-h)/2+(h-outputSize)*pan.y/2;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,outputSize,outputSize);
   ctx.drawImage(image,left,top,w,h);
   let result=null;
   for(const quality of [.87,.75,.63,.5]){
    result=canvas.toDataURL('image/jpeg',quality);
    if(result.length<maxChars)break;
   }
   if(result.length>=maxChars)throw Error('Crop still too large; choose another photo.');
   await onSave(result);
  }catch(err){setError(err.message||'Unable to save the crop.');}
  finally{setBusy(false);}
 }
 const dialog=<div className="react-modal-cover crop-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel();}}>
  <section className="react-modal crop-editor" role="dialog" aria-modal="true" aria-label={title}>
   <header><h2>{title}</h2><button type="button" onClick={onCancel} aria-label="Cancel crop">✕</button></header>
   <p>Drag to center the face, then adjust the zoom. The area inside the circle will be saved.</p>
   <div className="crop-stage" role="img" aria-label="Draggable image crop preview" onPointerDown={e=>{
     if(!metrics)return;e.currentTarget.setPointerCapture(e.pointerId);
     pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...pan},excessX:metrics.excessX,excessY:metrics.excessY};
    }} onPointerMove={onMove} onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}>
    <img ref={imgRef} src={source} alt="" draggable="false" onLoad={e=>setDim({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})}
      style={metrics?{position:'absolute',left:metrics.left,top:metrics.top,width:metrics.w,height:metrics.h,maxWidth:'none',userSelect:'none',pointerEvents:'none'}:{visibility:'hidden'}}/>
    <div className="crop-outline" aria-hidden="true"/>
   </div>
   <label className="crop-zoom">Zoom <input type="range" min="1" max="3" step=".02" value={zoom} onChange={e=>setZoom(Number(e.target.value))} /><strong>{zoom.toFixed(1)}×</strong></label>
   <div className="crop-actions"><button className="action soft" type="button" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Reset</button>
    <button className="action primary" type="button" disabled={!dim||busy} onClick={apply}>{busy?'Saving…':'Use this crop'}</button></div>
   {error&&<p role="alert" className="fineprint">{error}</p>}
  </section>
 </div>;
 return createPortal(dialog,document.body);
}
