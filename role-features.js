module.exports = function makeRoles({db,save,id,hashPass,checkPass,userFrom,adminFrom,bodyText,now,json,fail}){
  db.idolPosts ||= [{id:"arielle-welcome",idolId:"arielle",body:"Hi USA50! ♡ Welcome to my little corner of the fan club. I can't wait to share more with you!",createdAt:now()}];
  db.fanReplies ||= [];
  db.messagingReports ||= [];
  db.messagingBans ||= {};
  const emailRole=[
    ["amstrotherUSA50@gmail.com","idol","Arielle","arielle","USA50_IDOL_BOOTSTRAP_PASSWORD"],
    ["arielstrotherb@gmail.com","admin","Management",null,"USA50_ADMIN_BOOTSTRAP_PASSWORD"]
  ];
  let mutated=false;
  for(const [email,role,displayName,idolId,key] of emailRole){
    if(Object.values(db.users).some(u=>u.email?.toLowerCase()===email))continue;
    const password=process.env[key];
    if(!password || password.length<14)continue;
    const uid=id();
    db.users[uid]={id:uid,email,displayName,role,idolId,passwordHash:hashPass(password),mustChangePassword:true,sessionVersion:0,createdAt:now(),state:{stars:0,pullPoints:0,fancallTickets:0,paidPulls:0,pityAchieved:false,owned:{},physicalOrders:[],freePhysicalUsed:false,subscriberPreview:false,likedPosts:[],favoriteMembers:[idolId||"arielle"],fansiteApplicationId:null,demoClaimCode:"",demoClaimed:false,dailyClaimed:{}}};
    mutated=true;
  }
  if(mutated)save();
  function info(user){
    const role=user?.role||"fan";
    const idolId=user?.idolId||"arielle";
    const posts=db.idolPosts.map(m=>({id:m.id,idolId:m.idolId,body:m.body,createdAt:m.createdAt}));
    let replies=[];
    if(user){
      if(role==="idol")replies=db.fanReplies.filter(r=>r.idolId===idolId);
      else if(role==="fan")replies=db.fanReplies.filter(r=>r.fanId===user.id);
    }
    return {posts,replies:replies.map(r=>({...r})),banned:Boolean(user && db.messagingBans[user.id]),role};
  }
  function isMod(user){return user?.role==="admin";}
  function requiresReset(user,res){
    if(user.mustChangePassword){fail(res,403,"Change your temporary password in My Page before using this feature.");return true;}return false;
  }
  function requireUser(req,res){const user=userFrom(req);if(!user)fail(res,401,"Please sign in.");return user;}
  async function handle(req,res,endpoint,data){
    if(!["/api/account/change-password","/api/idol/post","/api/idol/reply","/api/messages/fan-reply","/api/messages/report","/api/admin/messaging-ban","/api/admin/messaging-resolve","/api/admin/messaging-overview"].includes(endpoint))return false;
    const u=requireUser(req,res);if(!u)return true;
    if(endpoint==="/api/account/change-password"){
      const old=String(data.currentPassword||"");
      const next=String(data.newPassword||"");
      if(!checkPass(old,u.passwordHash))return fail(res,403,"Current password is incorrect."),true;
      if(next.length<12||next.length>128||!/[A-Z]/.test(next)||!/[a-z]/.test(next)||!/[0-9]/.test(next))return fail(res,400,"Use 12+ characters including uppercase, lowercase and a number."),true;
      if(next===old)return fail(res,400,"Choose a different password."),true;
      u.passwordHash=hashPass(next);u.mustChangePassword=false;u.sessionVersion=(u.sessionVersion||0)+1;save();
      return json(res,200,{ok:true,relogin:true}),true;
    }
    if(requiresReset(u,res))return true;
    if(endpoint==="/api/idol/post"){
      if(u.role!=="idol")return fail(res,403,"Idol-only action."),true;
      const body=bodyText(data.body,1200);
      if(body.length<2)return fail(res,400,"Message is too short."),true;
      const post={id:id(),idolId:u.idolId||"arielle",body,createdAt:now()};
      db.idolPosts.push(post);save();return json(res,201,{post}),true;
    }
    if(endpoint==="/api/messages/fan-reply"){
      if(u.role!=="fan")return fail(res,403,"Only fan accounts can reply."),true;
      if(!u.state?.subscriberPreview)return fail(res,403,"Replies require a subscription. Test subscription preview must be enabled for demos."),true;
      if(db.messagingBans[u.id])return fail(res,403,"Messaging privileges are currently suspended."),true;
      const post=db.idolPosts.find(p=>p.id===data.postId);
      if(!post)return fail(res,404,"Idol message not found."),true;
      const text=bodyText(data.text,500);
      if(text.length<1)return fail(res,400,"Reply cannot be empty."),true;
      const reply={id:id(),postId:post.id,idolId:post.idolId,fanId:u.id,fanName:u.displayName,text,createdAt:now(),idolResponse:null};
      db.fanReplies.push(reply);save();return json(res,201,{reply}),true;
    }
    if(endpoint==="/api/idol/reply"){
      if(u.role!=="idol")return fail(res,403,"Idol-only action."),true;
      const reply=db.fanReplies.find(r=>r.id===data.replyId);
      if(!reply||reply.idolId!==(u.idolId||"arielle"))return fail(res,404,"Fan reply not found in your inbox."),true;
      const text=bodyText(data.text,600);
      if(text.length<1)return fail(res,400,"Reply cannot be empty."),true;
      reply.idolResponse={text,createdAt:now()};
      save();return json(res,200,{ok:true,reply}),true;
    }
    if(endpoint==="/api/messages/report"){
      if(u.role!=="fan")return fail(res,403,"Fan account required."),true;
      const post=db.idolPosts.find(p=>p.id===data.postId);
      const ownReply=db.fanReplies.find(r=>r.id===data.replyId&&r.fanId===u.id);
      if(!post&&!ownReply)return fail(res,404,"Message not found."),true;
      db.messagingReports.push({id:id(),reportedBy:u.id,postId:post?.id||ownReply?.postId,replyId:ownReply?.id||null,reason:bodyText(data.reason,250)||"Reported by fan",createdAt:now(),status:"pending"});
      save();return json(res,200,{ok:true}),true;
    }
    if(endpoint.startsWith("/api/admin/messaging")){
      if(!isMod(u))return fail(res,403,"Management account required."),true;
      if(endpoint==="/api/admin/messaging-overview"){
        return json(res,200,{reports:db.messagingReports.slice(-100).reverse(),bans:db.messagingBans,accounts:Object.values(db.users).map(x=>({id:x.id,email:x.email,displayName:x.displayName,role:x.role||"fan"}))}),true;
      }
      if(endpoint==="/api/admin/messaging-ban"){
        const target=db.users[data.userId];
        if(!target||target.role==="admin"||target.role==="idol")return fail(res,400,"Select a fan account to moderate."),true;
        if(data.banned)db.messagingBans[target.id]={reason:bodyText(data.reason,200)||"Messaging policy violation",by:u.id,at:now()};
        else delete db.messagingBans[target.id];
        save();return json(res,200,{ok:true,banned:Boolean(data.banned)}),true;
      }
      if(endpoint==="/api/admin/messaging-resolve"){
        const report=db.messagingReports.find(r=>r.id===data.reportId);
        if(!report)return fail(res,404,"Report not found."),true;
        report.status="resolved";save();return json(res,200,{ok:true}),true;
      }
    }
    return false;
  }
  return {info,handle,isMod};
};
