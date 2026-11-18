/* Immersive card views cover both the app and the device's safe-area/status
 * strip. Nested card reveals and 3D previews share one reference-counted mode.
 * All original theme/status settings are restored on the final close. */
let openViews=0;
let restoreTheme=null;
export function activateImmersiveBackground(){
 let closed=false;
 if(openViews++===0){
  const root=document.documentElement,body=document.body;
  const previousOverflow=body.style.overflow;
  const theme=document.querySelector('meta[name="theme-color"]');
  const oldTheme=theme?.getAttribute('content')||null;
  let status=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  const created=!status;
  if(!status){status=document.createElement('meta');status.setAttribute('name','apple-mobile-web-app-status-bar-style');document.head.appendChild(status);}
  const oldStatus=status.getAttribute('content');
  root.classList.add('usa50-immersive');
  body.style.overflow='hidden';
  theme?.setAttribute('content','#000000');
  status.setAttribute('content','black-translucent');
  restoreTheme=()=>{
   root.classList.remove('usa50-immersive');
   body.style.overflow=previousOverflow;
   if(theme&&oldTheme!==null)theme.setAttribute('content',oldTheme);
   if(created)status.remove();
   else if(oldStatus===null)status.removeAttribute('content');
   else status.setAttribute('content',oldStatus);
  };
 }
 return()=>{
  if(closed)return;
  closed=true;
  openViews=Math.max(0,openViews-1);
  if(openViews===0){restoreTheme?.();restoreTheme=null;}
 };
}
