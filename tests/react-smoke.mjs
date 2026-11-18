import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const port=34217;
const dataDir=mkdtempSync(join(tmpdir(),'usa50-react-smoke-'));
const child=spawn(process.execPath,['server.js'],{
 env:{...process.env,PORT:String(port),DATA_DIR:dataDir,SESSION_SECRET:'react-smoke-test-not-real',NODE_ENV:'production'},
 stdio:['ignore','pipe','pipe']
});
let stderr='';
child.stderr.on('data',chunk=>{stderr+=String(chunk);});
const base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 let ready=false;
 for(let i=0;i<45;i++){
  if(child.exitCode!==null)throw Error('Backend exited before ready: '+stderr);
  try{const res=await fetch(base+'/api/health');if(res.ok){ready=true;break;}}catch(_){}
  await sleep(180);
 }
 assert.ok(ready,'Backend must be ready');
 const root=await fetch(base+'/',{redirect:'manual'});
 assert.equal(root.status,302,'Root redirects into React');
 assert.equal(root.headers.get('location'),'/react/');
 const react=await fetch(base+'/react/');
 assert.equal(react.status,200,'Built React page is served');
 assert.match(react.headers.get('content-type')||'',/text\/html/);
 const html=await react.text();
 assert.match(html,/\/react\/assets\/[^"]+\.js/,'Vite React entrypoint must be present');
 const jsPath=html.match(/\/react\/assets\/[^"]+\.js/)?.[0];
 const bundle=await fetch(base+jsPath);
 assert.equal(bundle.status,200,'Bundled React JS must be served');
 assert.match(bundle.headers.get('content-type')||'',/javascript/);
 const legacy=await fetch(base+'/index.html');
 assert.equal(legacy.status,200,'Classic standalone page remains usable');
 assert.equal(legacy.headers.get('x-frame-options'),'DENY','Classic page is not normally embeddable');
 const embedded=await fetch(base+'/index.html?embed=1&screen=drops');
 assert.equal(embedded.status,200,'Classic feature embed exists');
 assert.equal(embedded.headers.get('x-frame-options'),'SAMEORIGIN','Only same-origin compatibility embeds may frame');
 assert.match(embedded.headers.get('content-security-policy')||'',/frame-ancestors 'self'/);
 const bridge=await fetch(base+'/react-bridge.js');
 assert.equal(bridge.status,200,'Compatibility navigation bridge exists');
 const bootstrap=await fetch(base+'/api/bootstrap');
 assert.equal(bootstrap.status,200,'Existing API remains online');
 const body=await bootstrap.json();
 assert.ok(body.social&&body.liveEvents&&body.fancalls,'API includes existing feature data');
 console.log('USA50 React smoke tests passed: redirect, bundle, legacy, CSP, bridge and API.');
}catch(err){
 console.error(err);
 if(stderr)console.error(stderr.slice(-3000));
 process.exitCode=1;
}finally{
 child.kill('SIGTERM');
 await sleep(250);
 try{rmSync(dataDir,{recursive:true,force:true});}catch(_){}
}
