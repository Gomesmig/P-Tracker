// Guarda a app no telemóvel para funcionar sem rede.
// HTML/JS: rede primeiro (apanha sempre a versão mais recente), cache se não houver rede.
// Bibliotecas e ícones: cache primeiro (são grandes e não mudam).
const VERSION = 'proteina-v11';
const CORE = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'lib/zxing.min.js', 'lib/qrcode.js'];
const OCR = ['lib/tesseract.min.js', 'lib/worker.min.js', 'lib/core/tesseract-core-simd-lstm.wasm.js', 'lib/core/tesseract-core-lstm.wasm.js', 'lib/lang/por.traineddata.gz'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    c.addAll(OCR).catch(() => {});
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const c = await caches.open(VERSION);
  try {
    const r = await fetch(req, { cache: 'no-cache' });
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return (await c.match(req, { ignoreSearch: true })) || (await c.match('index.html'));
  }
}
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); }
  return r;
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('openfoodfacts.org')) return;
  if (url.hostname.includes('fonts.g')) { e.respondWith(cacheFirst(e.request).catch(() => new Response('', { status: 504 }))); return; }
  if (url.origin !== location.origin) return;
  const isAsset = url.pathname.includes('/lib/') || url.pathname.includes('/icons/');
  e.respondWith(isAsset ? cacheFirst(e.request) : networkFirst(e.request));
});
