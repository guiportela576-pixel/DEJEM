const CACHE_NAME = 'registro-dejem-v1';
const FILES = ['./', './index.html', './styles.css', './script.js', './manifest.json', './icon-180.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
