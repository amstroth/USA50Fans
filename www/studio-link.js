/* Management-only Card Studio entry point. The workspace itself requires a role-checked server session. */
(function(){
 'use strict';
 const previousShowAdmin=showAdmin;
 showAdmin=async function(){
   await previousShowAdmin();
   const target=document.querySelector('#admin-content');
   if(target && store?.me?.role==='admin' && !target.querySelector('.management-card-studio-entry')){
     target.insertAdjacentHTML('afterbegin','<section class="glass panel management-card-studio-entry" style="margin-bottom:16px"><div><span class="eyebrow">USA50 MANAGEMENT · NEW</span><h2 style="font:italic 27px Georgia,serif;margin:8px 0">Card Studio ✧</h2><p class="lead">Create and edit photocard packs, crop artwork to 660 × 1020 px, choose rarity borders, schedule releases, and manage drafts or test collections.</p></div><a class="btn management-open-studio" href="/studio.html" target="_blank" rel="noopener noreferrer">Open Desktop Card Studio ↗</a><p class="studio-desktop-note lead">This creative workspace is available on desktop browsers only.</p></section>');
   }
 };
})();
