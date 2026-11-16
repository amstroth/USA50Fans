/* USA50 background web push. No caching or interception of authenticated responses. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{data={title:'USA50 Live',body:event.data?.text()||''};}
 const title=String(data.title||'USA50 is Live now!').slice(0,110);
 const body=String(data.body||'Tap to watch ♡').slice(0,200);
 const streamId=String(data.streamId||'');
 const url=data.url&&String(data.url).startsWith('/?open=events')?data.url:'/?open=events&streamId='+encodeURIComponent(streamId);
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:'/assets/icon.webp',badge:'/assets/icon.webp',tag:'usa50-live-'+streamId,
  renotify:true,data:{url},vibrate:[100,50,100]
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=event.notification.data?.url||'/?open=events';
 event.waitUntil((async()=>{
  const list=await clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of list){
   if(client.url.startsWith(self.location.origin)){
    await client.focus();return client.navigate(url);
   }
  }
  return clients.openWindow(url);
 })());
});