const CACHE='dinner-pick-v2';const FILES=['./','./index.html','./styles.css','./core.js','./app.js','./services.json','./taoyuan-dinner.json','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dinner-pick-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(fetch(e.request).then(r=>r).catch(()=>caches.match(e.request).then(r=>r||new Response('目前離線，請連線後再試。',{status:503}))));});
