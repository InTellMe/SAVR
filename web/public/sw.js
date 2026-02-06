// Minimal service worker for PWA installability
const CACHE_NAME = 'savr-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first; no caching for now to avoid stale app shell
  event.respondWith(fetch(event.request));
});
