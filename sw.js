// ============================================================
//  BOARD ROYAL — Service Worker (PWA)
// ============================================================
const CACHE = 'boardroyal-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/online.js',
  '/js/games/chess.js',
  '/js/games/morris.js',
  '/js/games/checkers.js',
  '/js/games/connect4.js',
  '/js/games/tictactoe.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.filter(a => !a.startsWith('https://')))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first for Firebase, cache-first for app assets
  const isFirebase = e.request.url.includes('firebasejs') || e.request.url.includes('firebase');
  if (isFirebase) return; // Let Firebase handle its own requests
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
