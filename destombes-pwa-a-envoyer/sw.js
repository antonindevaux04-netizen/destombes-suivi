/* DESTOMBES — service worker : met l'application en cache pour qu'elle fonctionne sans connexion.
   Penser à changer V à chaque modification des fichiers pour forcer la mise à jour de la tablette. */
const V = 'destombes-v1';
const FILES = ['./', 'index.html', 'manifest.json', 'css/app.css', 'js/app.js', 'js/engine.js', 'js/store.js', 'js/config.js', 'assets/icon192.png', 'assets/icon512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => { if (e.request.method === 'GET') e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
