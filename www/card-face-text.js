/* USA50 shared live photocard text + finished-card compositing.
 * Same 660x1020 coordinate system in the desktop editor and public card views.
 * The text overlay is editable metadata, not a destructive image edit.
 */
(function(root){
'use strict';
const W=660,H=1020;
const fonts=['Georgia','Great Vibes','Arial','Times New Roman','Trebuchet MS','Verdana','Courier New'];
const weights=['400','500','600','700'];
const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))&&n!==null&&n!==''?Math.min(max,Math.max(min,Number(n))):fallback;
function normalize(t,fallback=''){
 t=t&&typeof t==='object'&&!Array.isArray(t)?t:{};
 const value=typeof t.value==='string'?t.value.slice(0,60):String(fallback||'').slice(0,60);
 return {value,fontFamily:fonts.includes(t.fontFamily)?t.fontFamily:'Georgia',
   fontSize:clamp(t.fontSize,14,160,58),x:clamp(t.x,0,100,50),y:clamp(t.y,0,100,88),
   color:/^#[0-9a-fA-F]{6}$/.test(String(t.color||''))?t.color:'#68577D',
   align:['left','center','right'].includes(t.align)?t.align:'center',
   weight:weights.includes(String(t.weight))?String(t.weight):'400',italic:t.italic===true};
}
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function style(input){
 const t=normalize(input),shift=t.align==='left'?'0':t.align==='right'?'-100%':'-50%';
 return 'left:'+t.x+'%;top:'+t.y+'%;color:'+t.color+
   ";font-family:'"+t.fontFamily+"';font-weight:"+t.weight+
   ';font-style:'+(t.italic?'italic':'normal')+
   ';font-size:'+((t.fontSize/W)*100).toFixed(4)+'cqw;'+
   'text-align:'+t.align+';transform:translate('+shift+',-50%)';
}
function markup(input){
 if(input===null||input===undefined)return '';
 const t=normalize(input);
 return t.value?'<span class="card-face-lettering" data-card-text="1" style="'+escapeHTML(style(t))+'">'+escapeHTML(t.value)+'</span>':'';
}
function drawText(ctx,input){
 if(input===null||input===undefined)return;
 const t=normalize(input);if(!t.value)return;
 ctx.save();
 ctx.fillStyle=t.color;
 ctx.font=(t.italic?'italic ':'')+t.weight+' '+t.fontSize+"px '"+t.fontFamily+"'";
 ctx.textBaseline='middle';ctx.textAlign=t.align;
 ctx.fillText(t.value,W*t.x/100,H*t.y/100,W*.9);
 ctx.restore();
}
function loadImage(src){
 if(!src)return Promise.reject(new Error('Upload the card face artwork before downloading.'));
 return new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(new Error('Could not load one of the card images. Refresh and try again.'));
   img.src=src;
 });
}
function cover(ctx,img){
 const scale=Math.max(W/img.naturalWidth,H/img.naturalHeight);
 const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
 ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);
}
async function composite({artUrl,borderUrl,overlayText}){
 if(normalize(overlayText).fontFamily==='Great Vibes'&&document.fonts?.load)await document.fonts.load('58px "Great Vibes"');
 const [art,frame]=await Promise.all([loadImage(artUrl),borderUrl?loadImage(borderUrl):Promise.resolve(null)]);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas export is unavailable in this browser.');
 ctx.clearRect(0,0,W,H);cover(ctx,art);
 if(frame)ctx.drawImage(frame,0,0,W,H);
 drawText(ctx,overlayText);
 return canvas;
}
async function download({artUrl,borderUrl,overlayText,filename}){
 const canvas=await composite({artUrl,borderUrl,overlayText});
 const file=String(filename||'USA50_Finished_Card.png').replace(/[^a-z0-9._-]+/gi,'_').slice(0,160);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not export PNG.')),'image/png'));
 const url=URL.createObjectURL(blob);
 try{
   const anchor=document.createElement('a');
   anchor.href=url;anchor.download=file.toLowerCase().endsWith('.png')?file:file+'.png';
   document.body.appendChild(anchor);anchor.click();anchor.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
 return {width:W,height:H};
}
root.USA50CardFace=Object.freeze({W,H,fonts,weights,normalize,style,markup,drawText,composite,download});
})(window);
