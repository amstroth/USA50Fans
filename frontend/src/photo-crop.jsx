import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
/* Crop control shared by idol circle portraits and all fan/management avatars.
   Drag the image to position the face and zoom before saving the square crop. */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const PROFILE_IMAGE_ACCEPT='image/*,.heic,.heif,.hif,.avif,.tif,.tiff';
const MOBILE_IMAGE_EXTENSIONS=/\.(?:jpe?g|jfif|png|webp|gif|bmp|avif|heic|heif|hif|tiff?)$/i;
function isHeif(file){
 return /(?:image\/(?:heic|heif|heic-sequence|heif-sequence))$/i.test(file?.type||'')||/\.(?:heic|heif|hif)$/i.test(file?.name||'');
}
function validatePhoto(file){
 if(!file||typeof file.size!=='number'||file.size===0)throw Error('Choose a photo saved on your device.');
 // Images are converted before uploading; the old 15 MB file-size restriction
 // excluded many otherwise valid high-resolution mobile/HEIC photos.
 if(file.size>120_000_000)throw Error('This photo is over 120 MB and is too large to process safely on a phone.');
 if(file.type==='image/svg+xml')throw Error('Please choose a photo instead of an SVG illustration.');
 if(!file.type?.startsWith('image/')&&!MOBILE_IMAGE_EXTENSIONS.test(file.name||''))
  throw Error('Choose a photo (including iPhone HEIC/HEIF, JPEG, PNG, GIF, AVIF or WebP).');
}
function loadLocalImage(blob){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(blob),img=new Image();
  let finished=false;
  const finish=(error)=>{
   if(finished)return;
   finished=true;clearTimeout(timeout);
   if(error){URL.revokeObjectURL(url);reject(error);}
   else resolve({img,release:()=>URL.revokeObjectURL(url)});
  };
  const timeout=setTimeout(()=>finish(Error('Photo decoding timed out on this device.')),30000);
  img.onload=()=>{
   if(!img.naturalWidth||!img.naturalHeight)return finish(Error('This photo has no usable pixels.'));
   finish();
  };
  img.onerror=()=>finish(Error('Your browser could not decode this photo.'));
  img.src=url;
 });
}
async function openPhoto(file){
 try{
  return await loadLocalImage(file);
 }catch(originalError){
  if(!isHeif(file))throw Error('This photo format could not be read by your browser. Try a JPEG, PNG, WebP or HEIC photo.');
  // HEIC/HEIF is the default on many iPhones. Load the codec only if the
  // device's native browser decoder cannot open this particular image.
  try{
   const {heicTo}=await import('heic-to/csp');
   const jpeg=await heicTo({blob:file,type:'image/jpeg',quality:.87});
   return await loadLocalImage(jpeg);
  }catch(error){
   throw Error('Could not convert this HEIC/HEIF photo. Try saving it as JPEG or choose another photo.');
  }
 }
}
export async function preparePhoto(file,{maxSide=1500,maxChars=1850000}={}){
 validatePhoto(file);
 const {img,release}=await openPhoto(file);
 try{
  const maxPixels=Math.max(img.naturalWidth,img.naturalHeight);
  let limit=Math.min(maxSide,maxPixels),quality=.85;
  for(let i=0;i<16;i++){
   const scale=Math.min(1,limit/maxPixels);
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('This device could not create an image preview.');
   // Flatten transparent PNG/WebP/GIF onto white, because the server stores
   // a consistent JPEG for every profile picture.
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',quality);
   canvas.width=0;canvas.height=0;
   if(data.startsWith('data:image/jpeg;base64,')&&data.length<maxChars)return data;
   if(i%2===0)quality=Math.max(.37,quality-.12);
   else limit=Math.max(220,Math.floor(limit*.76));
  }
  throw Error('This photo could not be compressed enough. Try another picture.');
 }catch(error){
  if(error?.message?.includes('photo')||error?.message?.includes('image'))throw error;
  throw Error('The photo could not be processed on this phone. Try a smaller image.');
 }finally{release();}
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
   let result=null,current=canvas;
   for(let attempt=0;attempt<5;attempt++){
    for(const quality of [.86,.72,.57,.44,.34]){
     result=current.toDataURL('image/jpeg',quality);
     if(result.length<maxChars)break;
    }
    if(result.length<maxChars)break;
    const smaller=document.createElement('canvas');
    smaller.width=Math.max(120,Math.round(current.width*.82));
    smaller.height=smaller.width;
    const shrink=smaller.getContext('2d');
    if(!shrink)break;
    shrink.drawImage(current,0,0,smaller.width,smaller.height);
    if(current!==canvas){current.width=0;current.height=0;}
    current=smaller;
   }
   if(!result||result.length>=maxChars)throw Error('This crop could not be compressed to the profile photo limit.');
   await onSave(result);
   if(current!==canvas){current.width=0;current.height=0;}
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
