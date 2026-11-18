import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const main=read('frontend/src/main.jsx'),state=read('frontend/src/state.jsx');
const drops=read('frontend/src/drops.jsx'),diary=read('frontend/src/diary.jsx');
const collector=read('frontend/src/collector.jsx'),live=read('frontend/src/live.jsx'),css=read('frontend/src/experience.css');
assert.match(main,/route==='drops'\?<DropsPage\/>/,'Card Drops must use React rather than legacy iframe');
assert.match(main,/route==='diary'\?<DiaryPage\/>/,'Diary route must use React rather than legacy iframe');
assert.match(state,/\{id:'drops',name:'Card Drops',icon:'drops'\}/);
assert.match(state,/\{id:'diary',name:'Diary Entries',icon:'collection'\}/);
assert.match(live,/setFeed\(null\);setGiftForm\(false\);load\(\);/);
assert.doesNotMatch(live,/feedRef\./,'Livestream must not access an undefined feed ref');
for(const term of ['pull-fullscreen','pull-animation-scene','pull-results-grid','/api/cards/pull10','/api/cards/pull-points','/api/cards/pull','data?.gacha?.paidOdds','data?.economy?.tenPullStars']){
 assert.ok(drops.includes(term),'Missing React draw feature: '+term);
}
assert.ok(drops.includes('createPortal('),'Draw animation must use a full-screen portal');
for(const term of ['/api/diary/publish','placedItems:items.map','onPointerDown','setPointerCapture','data-resize','onPointerMove','onPointerCancel','photos:photos.map','scale:','rotation:']){
 assert.ok(diary.includes(term),'Missing native diary editor feature: '+term);
}
for(const term of ['createPortal(','/collector-three-v12.js','/card-face-text.js','USA50ThreeCard','instance.destroy()','onSide','onWarning']){
 assert.ok(collector.includes(term),'Missing 3D collector lifecycle feature: '+term);
}
assert.match(read('frontend/src/core-pages.jsx'),/setViewerCard\(card\)/,'Owned card should open 3D viewer');
assert.match(css,/\.pull-fullscreen\{position:fixed;inset:0;z-index:10000/);
assert.match(css,/\.react-collector-fullscreen\{position:fixed;inset:0;z-index:11000/);
assert.match(css,/\.react-diary-decoration\{[^}]*touch-action:none/);
// Profile grid post navigation is its own scrollable, author-scoped React feed.
const social=read('frontend/src/social.jsx'),profile=read('frontend/src/profile.jsx'),appCSS=read('frontend/src/app.css');
assert.doesNotMatch(state,/name:'Recycle'/,'Recycle must be removed from React navigation');
assert.doesNotMatch(state,/name:'Creator Studio'/,'Creator Studio must be removed from React navigation');
assert.doesNotMatch(read('frontend/src/core-pages.jsx'),/navigate\('recycle'\)/,'Collection should not navigate to removed page');
assert.match(social,/export function PostCard\(/,'Profile feed should reuse existing Social post renderer');
assert.match(social,/export function Compose\(/,'Post composer must support create and edit');
assert.match(social,/\/api\/social\/post-edit/,'Edit existing post endpoint should be wired up');
assert.match(social,/thumbnailDataUrl:cover/,'Optional grid cover should be submitted');
assert.match(social,/Use original embed preview/,'User can revert to source embed');
assert.match(profile,/function ProfilePostFeed\(/,'Profile should support continuous post scrolling');
assert.match(profile,/selectedPostId/,'The tapped profile post should be selected');
assert.match(profile,/onOpen=\{setFeedStart\}/,'Grid taps should open profile feed');
assert.match(profile,/profile-feed-overlay social-page/,'Use Social feed presentation inside profile viewer');
assert.match(profile,/function ProfileEmbedPreview\(/,'Grid defaults to the original embed when no cover exists');
assert.match(appCSS,/\.profile-feed-overlay\.social-page/);
assert.match(appCSS,/\.social-compose-cover-overlay\.react-modal-cover\{z-index:9500\}/);

console.log('React immersive experience checks passed: native routes, live crash fix, full-screen card pull, 3D viewer lifecycle and diary pointer editing.');
