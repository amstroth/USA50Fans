export const API_BASE=(window.USA50_CONFIG?.apiBase||'').replace(/\/$/,'');
export async function api(path,{method='GET',body,...other}={}){
 const token=localStorage.getItem('usa50_dev_token');
 const headers={...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...other.headers};
 let response;
 try{response=await fetch(API_BASE+path,{method,body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body),credentials:'include',...other,headers});}
 catch {throw new Error('Cannot reach the USA50 server. Check your connection and try again.');}
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(payload?.error||'The request could not be completed.');
 return payload;
}
export const number=n=>Number(n||0).toLocaleString('en-US');
export const dateLabel=v=>{const t=new Date(v);return Number.isFinite(t.getTime())?t.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'TBA'};
export const dateTime=v=>{const t=new Date(v);return Number.isFinite(t.getTime())?t.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'TBA'};
export const safeUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch{return null;}};
