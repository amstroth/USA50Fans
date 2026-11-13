import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../www/card-face-text.js',import.meta.url),'utf8');
const operations=[],downloads=[];
const canvasContext={
 clearRect:()=>operations.push('clear'),
 drawImage:(...args)=>operations.push(['image',args[0]?.source,args.length]),
 save:()=>operations.push('save'),restore:()=>operations.push('restore'),
 fillText:(value,x,y,maxWidth)=>operations.push(['text',value,x,y,maxWidth]),
 set fillStyle(v){operations.push(['color',v]);},
 set font(v){operations.push(['font',v]);},
 set textAlign(v){operations.push(['align',v]);},
 set textBaseline(v){operations.push(['baseline',v]);}
};
class FakeImage{
 constructor(){this.naturalWidth=660;this.naturalHeight=1020;}
 set src(value){this.source=value;queueMicrotask(()=>this.onload());}
}
const document={
 createElement(type){
   if(type==='canvas')return {width:0,height:0,getContext:()=>canvasContext,toBlob:cb=>cb({size:500,type:'image/png'})};
   if(type==='a')return {click(){downloads.push({href:this.href,filename:this.download});},remove(){}};
   throw new Error(type);
 },
 body:{appendChild(){}}
};
const sandbox={window:{},Image:FakeImage,document,URL:{createObjectURL:()=>('blob:test-card'),revokeObjectURL:()=>{}},setTimeout:()=>{},queueMicrotask};
vm.runInNewContext(source,sandbox);
const face=sandbox.window.USA50CardFace;
assert.equal(face.W,660);assert.equal(face.H,1020);
const normalized=face.normalize({value:'Arielle',fontFamily:'Random',fontSize:900,x:999,y:-10,color:'red; background:black',weight:'999',align:'banana'});
assert.equal(normalized.fontFamily,'Georgia');
assert.equal(normalized.fontSize,160);
assert.equal(normalized.x,100);
assert.equal(normalized.y,0);
assert.equal(normalized.color,'#68577D');
assert.equal(normalized.weight,'400');
assert.equal(normalized.align,'center');
const lettering=face.normalize({value:'Arielle',fontFamily:'Georgia',fontSize:60,x:50,y:87,color:'#74568a',weight:'700',italic:true});
assert.ok(face.style(lettering).includes('left:50%;top:87%;'));
assert.ok(face.style(lettering).includes('cqw'));
assert.ok(face.markup({value:'<script>alert(1)</script>'}).includes('&lt;script&gt;'));
assert.ok(!face.markup({value:'<script>alert(1)</script>'}).includes('<script>'));
await face.download({artUrl:'/face.webp',borderUrl:'/frame.webp',overlayText:lettering,filename:'USA50_Arielle.png'});
assert.equal(downloads.length,1);
assert.equal(downloads[0].filename,'USA50_Arielle.png');
const indices=operations.filter(x=>Array.isArray(x)&&['image','text'].includes(x[0])).map(x=>x[0]+':'+x[1]);
assert.deepEqual(indices,['image:/face.webp','image:/frame.webp','text:Arielle']);
const draw=operations.find(x=>Array.isArray(x)&&x[0]==='text');
assert.equal(draw[2],330);assert.equal(draw[3],887.4);
assert.equal(draw[4],594);
console.log('Card-face lettering and 660x1020 PNG composition tests passed.');
