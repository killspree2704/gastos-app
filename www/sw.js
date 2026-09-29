const CACHE = 'gastos-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './capacitor.js',
  './capacitor-updater.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // no interceptar peticiones externas (ej. chequeo de actualizaciones)
  // Red primero: el bundle activo puede cambiar por una actualizacion OTA,
  // y servir la copia en cache antes que la red dejaria viendo la version
  // vieja justo despues de aplicar una actualizacion. La cache solo se usa
  // como respaldo cuando no hay conexion.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
