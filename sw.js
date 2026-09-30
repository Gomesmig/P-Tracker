// Guarda a app no telemóvel para funcionar sem rede.
const VERSION = 'proteina-v5';
const CORE = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'lib/zxing.min.js'];
const OCR = ['lib/tesseract.min.js', 'lib/worker.min.js', 'lib/core/tesseract-core-simd-lstm.wasm.js', 'lib/core/tesseract-core-lstm.wasm.js', 'lib/lang/por.traineddata.gz'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(CORE);
    c.addAll(OCR).catch(() => {}); // o leitor de etiquetas é grande; se falhar, fica em cache na primeira utilização
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('openfoodfacts.org')) return; // sempre da rede
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); }
    return r;
  })));
});
