/* USA50 Three.js renderer: authenticated front/back, physical card edge and masked foil materials. */
(function(){
'use strict';
const WIDTH=2.2,HEIGHT=3.4,DEPTH=.065;
const KIND={holographic:0,iridescent:1,glitter:2};
const token=()=>localStorage.getItem('usa50_dev_token')||'';
let modulePromise;
function three(){return modulePromise||(modulePromise=import('/vendor/three.module.js?v=121').catch(error=>{modulePromise=null;throw error;}));}
async function image(src,privateAsset=false){
 if(!src)throw Error('Missing artwork');
 let objectUrl=null,url=src;
 if(privateAsset){
  const headers=token()?{Authorization:'Bearer '+token()}:{};
  const res=await fetch(src,{credentials:'include',headers,cache:'no-store'});
  if(!res.ok)throw Error(res.status===403?'You must own the card to view its protected back or foil mask.':'Artwork request failed ('+res.status+').');
  objectUrl=URL.createObjectURL(await res.blob());url=objectUrl;
 }
 try{
  return await new Promise((resolve,reject)=>{
   const img=new Image();img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('The artwork could not be decoded.'));
   img.src=url;
  });
 }finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
function canvas(w=660,h=1020){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function generatedBack(){
 const c=canvas(),g=c.getContext('2d');
 const gradient=g.createLinearGradient(0,0,660,1020);
 gradient.addColorStop(0,'#d3b9f8');gradient.addColorStop(.45,'#f2dafa');gradient.addColorStop(1,'#b7a0e6');
 g.fillStyle=gradient;g.fillRect(0,0,660,1020);
 g.strokeStyle='#ffffffb0';g.lineWidth=11;g.roundRect(25,25,610,970,54);g.stroke();
 g.lineWidth=2;g.roundRect(44,44,572,932,42);g.stroke();
 g.lineWidth=4;g.beginPath();g.ellipse(330,500,286,125,Math.PI/5,0,Math.PI*2);g.stroke();
 g.fillStyle='white';g.textAlign='center';g.font='64px Georgia';g.fillText('✧  ♡  ✧',330,310);
 g.fillStyle='#684783';g.font='italic bold 105px Georgia';g.fillText('USA50',330,520);
 g.font='26px Arial';g.fillText('F A N   C L U B',330,580);
 g.font='italic 30px Georgia';g.fillText('closer to your stars',330,764);
 g.font='52px Georgia';g.fillText('✧',330,850);
 return c;
}
const VERT=[
 'varying vec2 vTex;','varying vec3 vNorm;','varying vec3 vPos;',
 'void main(){','vTex=uv;','vNorm=normalize(mat3(modelMatrix)*normal);',
 'vec4 world=modelMatrix*vec4(position,1.0);','vPos=world.xyz;',
 'gl_Position=projectionMatrix*viewMatrix*world;','}'
].join('\n');
const FRAG=[
 'uniform sampler2D uMask;','uniform vec3 uA;','uniform vec3 uB;',
 'uniform float uTime;','uniform float uOpacity;','uniform float uIntensity;',
 'uniform float uDensity;','uniform float uScale;','uniform float uSpeed;',
 'uniform float uKind;','uniform float uMasked;',
 'varying vec2 vTex;','varying vec3 vNorm;','varying vec3 vPos;',
 'float rand(vec2 x){return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453);}',
 'void main(){',
 'float coverage=1.0;',
 'if(uMasked>.5){vec4 px=texture2D(uMask,vTex);coverage=px.a*max(px.r,max(px.g,px.b));}',
 'if(coverage<.003)discard;',
 'vec3 viewDir=normalize(cameraPosition-vPos);',
 'float facing=clamp(dot(normalize(vNorm),viewDir),0.0,1.0);',
 'float tilt=atan(viewDir.x,viewDir.z);',
 'float wave=sin((vTex.x*1.5+vTex.y*.8)*12.0*uScale+tilt*8.0-uTime*uSpeed*.8);',
 'float shift=.5+.5*sin(tilt*6.0+vTex.x*9.0*uScale+uTime*uSpeed*.35);',
 'vec3 pigment=mix(uA,uB,shift);',
 'float alpha=uOpacity*uIntensity;',
 'if(uKind<.5){',
 ' float band=pow(.5+.5*wave,5.0);',
 ' vec3 spectrum=vec3(.65+.35*sin(wave*4.0),.65+.35*sin(wave*4.0+2.1),.65+.35*sin(wave*4.0+4.2));',
 ' pigment=mix(pigment,spectrum,.3)+vec3(band*.3);',
 ' alpha*=.2+.65*band+.7*pow(1.0-facing,1.5);',
 '}else if(uKind<1.5){',
 ' float shimmer=.5+.5*sin(vTex.y*10.0*uScale+tilt*7.0+uTime*.45*uSpeed);',
 ' pigment=mix(uA,uB,clamp(.55*shift+.45*shimmer,0.0,1.0));',
 ' alpha*=.25+.45*pow(1.0-facing,1.2)+.25*shimmer;',
 '}else{',
 ' vec2 cell=floor(vTex*max(35.0,180.0*uScale));',
 ' float seed=rand(cell);',
 ' float dotMask=step(1.0-uDensity*.14,seed);',
 ' float sparkle=pow(.5+.5*sin(uTime*3.0*uSpeed+seed*32.0+tilt*7.0),8.0);',
 ' pigment=mix(uA,uB,rand(cell+14.0));',
 ' pigment=mix(pigment,vec3(1.0),sparkle*.6);',
 ' alpha*=dotMask*(.12+.88*sparkle)+pow(1.0-facing,2.0)*.03;',
 '}',
 'gl_FragColor=vec4(pigment,clamp(coverage*alpha,0.0,.93));',
 '}'
].join('\n');
async function create({container,card={},layers=[],onWarning=()=>{},onSide=()=>{},initialRotation=12}){
 const THREE=await three();
 if(!container?.isConnected)throw Error('Card preview has closed.');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
 catch(_e){throw Error('Three.js requires WebGL. Try enabling hardware acceleration.');}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const canvasEl=renderer.domElement;canvasEl.className='usa50-three-canvas';
 canvasEl.style.cssText='width:100%;height:100%;display:block;touch-action:none;cursor:grab';
 container.replaceChildren(canvasEl);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.z=7;
 scene.add(new THREE.AmbientLight(0xffffff,1.2));
 const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(3,4,8);scene.add(key);
 const fill=new THREE.DirectionalLight(0xe9d7ff,.6);fill.position.set(-5,-2,3);scene.add(fill);
 const group=new THREE.Group();scene.add(group);
 const resources=[];
 const shellMaterial=new THREE.MeshPhysicalMaterial({color:0xece3f9,metalness:.18,roughness:.24,clearcoat:1,clearcoatRoughness:.16});
 const shellGeometry=new THREE.BoxGeometry(WIDTH,HEIGHT,DEPTH);
 resources.push(shellMaterial,shellGeometry);
 group.add(new THREE.Mesh(shellGeometry,shellMaterial));
 let destroyed=false,animation=0,rx=-7,ry=initialRotation,sideName='FRONT',revision=0;
 const effects=new Map(),maskCache=new Map();
 function materialCanvas(input){const t=new THREE.CanvasTexture(input);t.colorSpace=THREE.SRGBColorSpace;resources.push(t);return t;}
 function addSurface(input,isBack=false){
  const material=new THREE.MeshBasicMaterial({map:materialCanvas(input),transparent:true,side:THREE.FrontSide});
  const geometry=new THREE.PlaneGeometry(WIDTH,HEIGHT);
  const mesh=new THREE.Mesh(geometry,material);
  resources.push(material,geometry);
  if(isBack){mesh.rotation.y=Math.PI;mesh.position.z=-DEPTH/2-.003;}
  else mesh.position.z=DEPTH/2+.003;
  group.add(mesh);
 }
 try{
  const faceSrc=card.artUrl||card.frontArtUrl||'/assets/portraits/arielle_real.webp';
  const overlay=card.overlayText===undefined||card.overlayText===null
   ?(card.border&&card.border!=='none'?{value:card.member||'Arielle',fontFamily:'Georgia',fontSize:40,y:88}:null)
   :card.overlayText;
  const face=await window.USA50CardFace.composite({artUrl:faceSrc,borderUrl:card.borderUrl||null,overlayText:overlay});
  addSurface(face);
 }catch(e){
  onWarning('Front artwork failed to load: '+e.message);
  const fallback=canvas(),ctx=fallback.getContext('2d');ctx.fillStyle='#dfc6f4';ctx.fillRect(0,0,660,1020);
  addSurface(fallback);
 }
 let back=generatedBack();
 if(card.backArtUrl){
  try{
   const img=await image(card.backArtUrl,true);
   back=canvas();back.getContext('2d').drawImage(img,0,0,660,1020);
  }catch(e){onWarning('Custom card back unavailable: '+e.message);}
 }
 addSurface(back,true);
 const blankMask=canvas(2,2);blankMask.getContext('2d').fillStyle='#fff';blankMask.getContext('2d').fillRect(0,0,2,2);
 const whiteTexture=materialCanvas(blankMask);
 const effectGeometry=new THREE.PlaneGeometry(WIDTH,HEIGHT);resources.push(effectGeometry);
 function color(x,fallback){
  return new THREE.Color(/^#[0-9a-f]{6}$/i.test(String(x||''))?x:fallback);
 }
 function updateParams(layer,entry){
  const u=entry.material.uniforms;
  u.uA.value.copy(color(layer.colors?.[0],'#e99fff'));
  u.uB.value.copy(color(layer.colors?.[1],'#a9edff'));
  u.uKind.value=KIND[layer.type]||0;
  u.uOpacity.value=Number(layer.opacity??.72);
  u.uIntensity.value=Number(layer.intensity??.85);
  u.uDensity.value=Number(layer.density??.5);
  u.uScale.value=Number(layer.scale??1);
  u.uSpeed.value=Number(layer.speed??.65);
  entry.mesh.visible=layer.enabled!==false;
 }
 async function getMask(layer){
  if(layer.maskCanvas){const t=new THREE.CanvasTexture(layer.maskCanvas);return {texture:t,owned:true};}
  if(!layer.maskUrl)return {texture:whiteTexture,owned:false,noMask:true};
  if(maskCache.has(layer.maskUrl))return {texture:maskCache.get(layer.maskUrl),owned:false};
  try{
   const img=await image(layer.maskUrl,true);
   const t=materialCanvas(img);maskCache.set(layer.maskUrl,t);
   return {texture:t,owned:false};
  }catch(err){onWarning('Mask unavailable: '+err.message);return {texture:whiteTexture,owned:false,noMask:true};}
 }
 function clearEffects(){
  for(const entry of effects.values()){group.remove(entry.mesh);entry.material.dispose();if(entry.ownMask)entry.ownMask.dispose();}
  effects.clear();
 }
 async function setLayers(next=[]){
  const run=++revision;clearEffects();
  const list=Array.isArray(next)?next.slice(0,8):[];
  for(let i=0;i<list.length;i++){
   const layer=list[i];
   if(!layer||!Object.prototype.hasOwnProperty.call(KIND,layer.type))continue;
   const mask=await getMask(layer);
   if(destroyed||run!==revision){if(mask.owned)mask.texture.dispose();return;}
   const uniforms={
    uMask:{value:mask.texture},uMasked:{value:mask.noMask?0:1},
    uA:{value:color(layer.colors?.[0],'#e99fff')},
    uB:{value:color(layer.colors?.[1],'#a9edff')},
    uKind:{value:KIND[layer.type]},uTime:{value:0},uOpacity:{value:1},uIntensity:{value:1},
    uDensity:{value:.5},uScale:{value:1},uSpeed:{value:1}
   };
   const material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms,transparent:true,
     depthWrite:false,side:THREE.FrontSide,blending:THREE.NormalBlending});
   const mesh=new THREE.Mesh(effectGeometry,material);mesh.position.z=DEPTH/2+.009+i*.0014;mesh.renderOrder=25+i;group.add(mesh);
   const record={mesh,material,ownMask:mask.owned?mask.texture:null};
   effects.set(layer.id||String(i),record);updateParams(layer,record);
  }
 }
 function updateLayer(layer){const entry=effects.get(layer.id);if(entry)updateParams(layer,entry);}
 function updateMask(id,newCanvas){
  const entry=effects.get(id);if(!entry)return;
  if(entry.maskCanvas===newCanvas && entry.ownMask){
   entry.ownMask.needsUpdate=true;return;
  }
  entry.ownMask?.dispose();
  const tex=new THREE.CanvasTexture(newCanvas);entry.ownMask=tex;entry.maskCanvas=newCanvas;
  entry.material.uniforms.uMask.value=tex;entry.material.uniforms.uMasked.value=1;
 }
 function rotation(x,y){
  rx=Math.max(-45,Math.min(45,x));ry=y;group.rotation.set(rx*Math.PI/180,ry*Math.PI/180,0);
  const name=Math.cos(ry*Math.PI/180)<0?'BACK':'FRONT';
  if(name!==sideName){sideName=name;onSide(sideName);}
 }
 rotation(rx,ry);
 function resize(){
  if(destroyed||!container.isConnected)return;
  const w=Math.max(200,container.clientWidth),h=Math.max(200,container.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;
  const fov=THREE.MathUtils.degToRad(camera.fov);
  const distance=Math.max((HEIGHT/2)/Math.tan(fov/2)*1.28,(WIDTH/2)/Math.tan(fov/2)/(w/h)*1.3);
  camera.position.z=Math.max(6.0,distance);camera.updateProjectionMatrix();
 }
 resize();const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;resizeObserver?.observe(container);
 let drag=null;
 const pointerDown=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,rx,ry};
  canvasEl.setPointerCapture(e.pointerId);canvasEl.style.cursor='grabbing';e.preventDefault();
 };
 const pointerMove=e=>{if(drag?.id!==e.pointerId)return;rotation(drag.rx-(e.clientY-drag.y)*.33,drag.ry+(e.clientX-drag.x)*.52);};
 const pointerUp=e=>{if(drag?.id===e.pointerId){drag=null;canvasEl.style.cursor='grab';}};
 canvasEl.addEventListener('pointerdown',pointerDown);
 canvasEl.addEventListener('pointermove',pointerMove);
 canvasEl.addEventListener('pointerup',pointerUp);
 canvasEl.addEventListener('pointercancel',pointerUp);
 const clock=new THREE.Clock();
 function draw(){
  if(destroyed)return;
  if(!container.isConnected){destroy();return;}
  const t=clock.getElapsedTime();
  for(const entry of effects.values())entry.material.uniforms.uTime.value=t;
  renderer.render(scene,camera);animation=requestAnimationFrame(draw);
 }
 animation=requestAnimationFrame(draw);
 function destroy(){
  if(destroyed)return;destroyed=true;revision++;cancelAnimationFrame(animation);resizeObserver?.disconnect();clearEffects();
  for(const obj of resources)try{obj.dispose?.();}catch(_e){}
  renderer.dispose();canvasEl.remove();
 }
 await setLayers(layers||card.materialLayers||[]);
 if(destroyed)throw Error('Preview closed.');
 return {rotation,flip:()=>rotation(rx,ry+180),reset:()=>rotation(-7,initialRotation),setLayers,updateLayer,updateMask,destroy,
  side:()=>sideName,element:canvasEl};
}
window.USA50ThreeCard=Object.freeze({create,three,image,generatedBack});
})();