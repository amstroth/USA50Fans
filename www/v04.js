(function installV04(){
  "use strict";
  const oldBottomNav=bottomNav;
  bottomNav=function(){
    const tabs=[["home","Home","home"],["collection","Collection","layers"],["messages","Messages","message"],["community","Social","users"],["profile","My Page","user"]];
    return `<nav class="bottom-nav">${tabs.map(([key,name,ic])=>`<button class="bottom-link ${view===key?'active':''} ${key==='messages'?'messages-center':''}" data-go="${key}" aria-label="${name}">${icon(ic)}<span>${name}</span></button>`).join("")}</nav>`;
  };
  const oldDrops=dropsScreen;
  dropsScreen=function(){
    let page=oldDrops();
    const button=`<button class="btn ${store.me?.state?.stars>=3000?'':'disabled-state'}" data-action="pull10" ${store.me?.state?.stars>=3000?'':'disabled'}>✦ 3,000 STARS · Open ×10</button>`;
    page=page.replace(/(<button class="btn secondary" data-action="pull-free"[^>]*>.*?<\/button>)/,`$1${button}`);
    return page.replace("Rarity probabilities","Rarity probabilities · Single or 10-pull");
  };
  let pendingRewards=null;
  dreamReveal=function(result){
    const modal=document.querySelector("#modal-root .modal");
    if(!modal)return;
    pendingRewards=result;
    const cards=Array.isArray(result.cards)&&result.cards.length?result.cards:[result.card];
    modal.classList.toggle("batch-reveal",cards.length>1);
    modal.innerHTML=`<div class="modal-head"><h2>${cards.length>1?'Your 10 Cards ✦':'Your Photocard ✦'}</h2><button class="icon-btn" data-action="close-modal" aria-label="Close dialog">${icon("close")}</button></div>
    <div class="reveal-wrap dream-result">
    <div class="${cards.length>1?'pull-ten-grid':'pull-single'}" aria-label="Your new photocards">
    ${cards.map((card,i)=>`<div class="pull-result-item"><div class="pull-card-scene" style="animation-delay:${i*55}ms">${cardElement(card)}</div><small>${e(card.rarity)} · ${e(card.title)}</small></div>`).join("")}
    </div>${result.guaranteed?.length?`<div class="cooldown"><strong>Collector Guarantee reached ✧</strong><p class="lead">${result.guaranteed.length} missing album cards were granted.</p></div>`:""}
    <button class="btn full" data-action="next-rewards" style="margin-top:15px">Continue to tickets & points ${icon("arrow",15)}</button></div>`;
  };
  function showBonusRewards(){
    const result=pendingRewards,modal=document.querySelector("#modal-root .modal");
    if(!result||!modal)return;
    const isBatch=Array.isArray(result.cards)&&result.cards.length>1;
    modal.classList.remove("batch-reveal");
    modal.innerHTML=`<div class="modal-head"><h2>Bonus Rewards ✦</h2><button class="icon-btn" data-action="close-modal" aria-label="Close dialog">${icon("close")}</button></div>
    <div class="reveal-wrap dream-result"><div class="reward-second"><h3>You've also earned ✧</h3><div class="reward-trio">
    <div class="reward-pill"><strong>+${result.fancallTicketsAwarded}</strong><small>Fancall Tickets</small></div>
    <div class="reward-pill"><strong>+${result.pullPointsAwarded}</strong><small>Pull Points</small></div>
    </div></div>
    <p class="lead">Paid-style pulls: ${result.paidPulls} / 30 · ✦ ${cash(result.stars)} STARS remaining</p>
    <div class="modal-actions"><button class="btn" data-action="${isBatch?'pull10':'pull-from-modal'}">Open ${isBatch?'×10':'another'}</button><button class="btn secondary" data-go="collection">View album</button></div></div>`;
  }
  const originalAct=act;
  act=async function(name,node){
    if(name==="next-rewards")return showBonusRewards();
    if(name==="pull10"){
      if(!store.me)return go("profile");
      const result=await request("/api/cards/pull10",{method:"POST",body:"{}"});
      await refresh();
      showPackOpening(result,false);
      return;
    }
    if(name==="load-management")return showAdmin();
    if(name==="ban-messaging"){
      if(!confirm(`${node.dataset.banned==='true'?'Suspend':'Restore'} this fan's messaging privileges?`))return;
      await request("/api/admin/messaging-ban",{method:"POST",body:JSON.stringify({userId:node.dataset.userid,banned:node.dataset.banned==="true",reason:"Management moderation"})});
      return showAdmin();
    }
    if(name==="resolve-message-report"){
      await request("/api/admin/messaging-resolve",{method:"POST",body:JSON.stringify({reportId:node.dataset.value})});
      return showAdmin();
    }
    if(name==="respond-fan"){
      const reply=(store.messaging?.replies||[]).find(r=>r.id===node.dataset.value);
      if(!reply)return toast("Reply is unavailable.");
      return showModal(`Reply privately to ${reply.fanName}`,`<p class="lead">Only this fan and the idol can see the reply.</p><form id="idol-response-form" class="form-grid"><input type="hidden" name="replyId" value="${e(reply.id)}"><div class="form-field"><label>Personal response</label><textarea name="text" required maxlength="600" placeholder="Write your response…"></textarea></div><button class="btn" type="submit">Send private reply</button></form>`);
    }
    if(name==="message-report"){
      const id=node.dataset.value;
      const isReply=node.dataset.kind==="reply";
      await request("/api/messages/report",{method:"POST",body:JSON.stringify(isReply?{replyId:id,reason:"Fan-reported reply"}:{postId:id,reason:"Fan-reported idol message"})});
      return toast("Report submitted to management.");
    }
    return originalAct(name,node);
  };
  const originalSubmit=submitForm;
  submitForm=async function(form){
    const data=Object.fromEntries(new FormData(form));
    const id=form.id;
    if(id==="idol-post-form"){
      await request("/api/idol/post",{method:"POST",body:JSON.stringify(data)});
      await refresh();return toast("Your message is live for USA50 fans.");
    }
    if(id==="fan-reply-form"){
      await request("/api/messages/fan-reply",{method:"POST",body:JSON.stringify(data)});
      await refresh();return toast("Private fan reply sent to Arielle.");
    }
    if(id==="idol-response-form"){
      await request("/api/idol/reply",{method:"POST",body:JSON.stringify(data)});
      hideModal();await refresh();return toast("Private response sent.");
    }
    if(id==="password-update-form"){
      await request("/api/account/change-password",{method:"POST",body:JSON.stringify(data)});
      authToken="";localStorage.removeItem("usa50_dev_token");
      await refresh();go("profile");return toast("Password updated. Sign in again using your new password.");
    }
    return originalSubmit(form);
  };
  function privateReplyHtml(r){
    return `<div class="private-reply"><strong>${e(r.fanName||"You")}</strong><p>${e(r.text)}</p><small>Private · ${labelDate(r.createdAt)}</small>${r.idolResponse?`<div class="idol-private-answer"><strong>Arielle replied privately ♡</strong><p>${e(r.idolResponse.text)}</p></div>`:""}</div>`;
  }
  messagesScreen=function(){
    const me=store.me; const role=me?.role||"fan",inbox=store.messaging||{posts:[],replies:[],banned:false};
    if(!me)return `${screenTop("Messages","Read idol updates for free; fan replies require a subscription.")}${guestForms()}`;
    if(role==="admin")return `${screenTop("Messages","Management controls for USA50 communication.")}<div class="glass panel"><h3>Management moderation</h3><p class="lead">Review message reports and suspend abusive fan replies through the management dashboard.</p><button class="btn" data-action="load-management">Open management dashboard</button></div>`;
    if(role==="idol"){
      const posts=inbox.posts.filter(p=>p.idolId===me.idolId);
      const replies=inbox.replies||[];
      return `${screenTop("Arielle Studio","Publish idol updates and privately answer individual fan replies.")}
      ${me.mustChangePassword?`<div class="cooldown"><strong>Change your temporary password in My Page to publish messages.</strong></div>`:""}
      <div class="grid grid-2 messages-layout"><div class="glass panel"><div class="eyebrow">IDOL ONLY</div><h3>Send an update ♡</h3><p class="lead">Your posts are readable by fans for free. Fan replies are never public.</p><form id="idol-post-form" class="form-grid"><div class="form-field"><label>Message</label><textarea name="body" maxlength="1200" minlength="2" required placeholder="Hi USA50! ♡"></textarea></div><button type="submit" class="btn" ${me.mustChangePassword?'disabled':''}>Publish to fans</button></form><div class="divider"></div><h3>Your recent posts</h3>${posts.slice().reverse().map(p=>`<div class="idol-update"><p>${e(p.body)}</p><small>${labelDate(p.createdAt)}</small></div>`).join("")||'<p class="lead">No updates yet.</p>'}</div>
      <div class="glass panel"><div class="eyebrow">PRIVATE INBOX</div><h3>Fan replies (${replies.length})</h3><p class="lead">Responses are visible only to the selected fan and you.</p>${replies.slice().reverse().map(r=>`<div class="fan-inbox-row">${privateReplyHtml(r)}<button class="btn tiny" data-action="respond-fan" data-value="${e(r.id)}" ${me.mustChangePassword?'disabled':''}>${r.idolResponse?'Update response':'Reply privately'}</button></div>`).join("")||'<p class="lead">Fan replies will appear here.</p>'}</div></div>`;
    }
    const member=store.members.find(m=>m.id===activeChat)||store.members[0];
    const posts=inbox.posts.filter(p=>p.idolId===activeChat).slice().reverse();
    return `${screenTop("Messages","Idol updates are free to read. Replying requires a subscription.")}
    ${inbox.banned?'<div class="cooldown"><strong>Messaging temporarily suspended.</strong><p class="lead">You can still read member messages. Management can review your restriction.</p></div>':''}
    <div class="messages-layout grid grid-2"><div class="glass panel"><h3>Member inbox</h3><div class="message-members">${store.members.map(m=>`<button class="message-row ${m.id===activeChat?'selected':''}" data-action="chat" data-value="${e(m.id)}" style="width:100%;text-align:left">${avatar(m)}<span><strong>${e(m.name)}</strong><small style="display:block">${e(m.team)}</small></span></button>`).join("")}</div></div>
    <div class="glass panel"><div class="row">${avatar(member)}<div><strong>${e(member.name)} ♡</strong><p class="lead">Official idol feed · fan replies are private</p></div></div><div class="divider"></div>
    ${posts.length?posts.map(p=>`<article class="idol-update"><p>${e(p.body)}</p><small>${labelDate(p.createdAt)}</small><div class="private-threads">${inbox.replies.filter(r=>r.postId===p.id).map(privateReplyHtml).join("")}</div>
    ${store.me.state?.subscriberPreview&&!inbox.banned?`<form id="fan-reply-form" class="chat-compose"><input type="hidden" name="postId" value="${e(p.id)}"><input name="text" maxlength="500" required placeholder="Reply privately to ${e(member.name)}…"><button class="btn tiny" type="submit">Send</button></form>`:`<p class="lead">${inbox.banned?'Replies are currently disabled.':'Subscribe to reply — the demo subscriber preview is in My Page.'}</p>`}
    <button class="text-btn" data-action="message-report" data-value="${e(p.id)}">Report message</button></article>`).join(""):'<p class="lead">No messages from this idol yet.</p>'}</div></div>`;
  };
  const originalProfile=profileScreen;
  profileScreen=function(){
    let base=originalProfile();
    const me=store.me;
    if(!me)return base;
    const area=`<section class="glass panel" style="margin-top:18px"><div class="eyebrow">ACCOUNT SETTINGS</div><h3>Password & roles</h3><p class="lead">Signed in as <strong>${e(me.email)}</strong> · ${e(me.role||"fan")}${me.mustChangePassword?' · Password change required':''}</p><form id="password-update-form" class="form-grid" style="margin-top:12px"><div class="form-field"><label>Current password</label><input name="currentPassword" type="password" autocomplete="current-password" required></div><div class="form-field"><label>New password (12+ chars, upper/lowercase and a number)</label><input name="newPassword" type="password" autocomplete="new-password" required minlength="12"></div><button class="btn secondary" type="submit">Change password</button></form>${me.role==="admin"?'<button class="btn" data-action="load-management" style="margin-top:14px">Open Management Dashboard</button>':''}</section>`;
    const studioAccess=['admin','idol'].includes(me.role);
    const studioLink=studioAccess?'<section class="glass panel creator-studio-link" style="margin-top:18px"><div><div class="eyebrow">USA50 · CREATOR TOOLS</div><h3>Card Studio ✧</h3><p class="lead">Create collectible faces, custom backs, and holographic foil layers on desktop. '+(me.role==='idol'?'Idol accounts can edit their own collections without access to moderation.':'Management may edit all collections.')+'</p></div><a class="btn" href="/studio.html" target="_blank" rel="noopener noreferrer">Open Card Studio ↗</a></section>':'';
    return base+studioLink+area;
  };
  const originalAdmin=adminScreen;
  adminScreen=function(){
    if(store.me?.role==="admin")return `${screenTop("USA50 Management","Review fansites, reports, messaging safety and fan accounts.")}<div id="admin-content"><div class="glass panel"><p class="lead">Management account authenticated.</p><button class="btn" data-action="load-management">Load moderation dashboard</button></div></div>`;
    return originalAdmin();
  };
  const originalShowAdmin=showAdmin;
  showAdmin=async function(){
    await originalShowAdmin();
    if(store.me?.role!=="admin")return;
    const m=await request("/api/admin/messaging-overview",{method:"POST",body:"{}"});
    const el=document.querySelector("#admin-content");
    if(!el)return;
    const accounts=m.accounts.filter(u=>u.role==="fan");
    el.insertAdjacentHTML("beforeend",`<div class="glass panel" style="margin-top:18px"><div class="eyebrow">COMMUNICATION MODERATION</div><h3>Message abuse & reports</h3><div class="stack" style="margin-top:14px">${m.reports.length?m.reports.map(r=>`<div class="row wrap"><div><strong>${e(r.status)}</strong><p class="lead">${e(r.reason)} · ${labelDate(r.createdAt)}</p></div><button class="btn secondary tiny" data-action="resolve-message-report" data-value="${e(r.id)}" ${r.status==='resolved'?'disabled':''}>Resolve</button></div>`).join(""):'<p class="lead">No messaging reports.</p>'}</div><div class="divider"></div><h3>Fan messaging restrictions</h3><p class="lead">Suspend or restore reply privileges while keeping read access available.</p><div class="stack" style="margin-top:12px">${accounts.map(u=>{const banned=!!m.bans[u.id];return `<div class="row wrap"><div><strong>${e(u.displayName)}</strong><small style="display:block">${e(u.email)}</small></div><button class="btn tiny ${banned?'secondary':''}" data-action="ban-messaging" data-userid="${e(u.id)}" data-banned="${banned?'false':'true'}">${banned?'Restore':'Suspend replies'}</button></div>`;}).join("")||'<p class="lead">No fan accounts yet.</p>'}</div></div>`);
  };
})();
