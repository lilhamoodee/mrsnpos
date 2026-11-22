// Service Worker Marisini POS (naikkan versi cache setiap rilis)
const CACHE_NAME = "marisini-v7";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "fonts/manrope-latin.woff2",
  "fonts/playfair-display-latin.woff2"
];

// Simpan semua aset utama (termasuk font lokal) saat instalasi
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Hapus cache versi lama agar penyimpanan tetap bersih dan rilis baru aktif
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Strategi cache: cache-first untuk font/ikon, network-first untuk HTML; abaikan request lintas domain (API)
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = /\/(fonts\/|icon-|manifest\.webmanifest)/.test(url.pathname);
  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        }
        return r;
      }))
    );
    return;
  }

  // Untuk halaman utama: coba jaringan dulu agar pembaruan cepat masuk, jatuh ke cache jika offline
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.ok) {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match("index.html")))
  );
});
