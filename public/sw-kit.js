self.addEventListener('install', (event) => { event.waitUntil(caches.open('kit-v1').then(c => c.addAll(['/','/offline.html']))); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request).then(res => { const copy = res.clone(); caches.open('kit-v1').then(c => c.put(event.request, copy)); return res; }).catch(() => caches.match(event.request).then(m => m || caches.match('/offline.html'))) ); });
