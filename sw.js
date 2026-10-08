// Offline support: keeps the app working without a connection.
// Bump VERSION whenever index.html changes so phones pick up the update.
const VERSION = 'partparti-1.0.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  // cache:'reload' skips the browser's HTTP cache, so a new version never stores stale files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'app-fonts').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page and the manifest: try the network first (to get updates), fall back to the saved copy offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('.webmanifest')) {
    const key = req.mode === 'navigate' ? './index.html' : './manifest.webmanifest';
    e.respondWith(
      fetch(req, {cache: 'no-cache'})
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); return res; })
        .catch(() => caches.match(key))
    );
    return;
  }
  // App files: saved copy first.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }
  // Fonts: save them the first time so they also work offline.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open('app-fonts').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; })))
    );
  }
});
