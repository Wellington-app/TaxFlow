self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Simples pass-through para garantir que o PWA seja detectado
  e.respondWith(fetch(e.request));
});
