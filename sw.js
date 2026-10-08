/* Atlas de lápices: funciona sin conexión.
   - La app y los mapas se guardan en el móvil la primera vez que se usan.
   - GitHub y OpenStreetMap siempre van por red (la app guarda sus propios datos). */
const V = "atlas-v1";
const CORE = ["./", "index.html", "d3.min.js", "topojson-client.min.js", "countries.json", "places.json",
  "manifest.webmanifest", "icon-180.png", "icon-192.png", "campos.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.hostname === "api.github.com" || u.hostname.endsWith("openstreetmap.org")) return;
  // la página y la colección: primero la red (para recibir novedades), si no hay, la copia
  if (req.mode === "navigate" || u.pathname.endsWith("/campos.json")) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(u.pathname.endsWith("/campos.json") ? "campos.json" : "index.html", cp)); return r; })
      .catch(() => caches.match(u.pathname.endsWith("/campos.json") ? "campos.json" : "index.html")));
    return;
  }
  // resto (mapas, librerías, fuentes): copia guardada al instante y se actualiza por detrás
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
