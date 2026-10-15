/**
 * Service worker · Inspección Cintas (menú + las 6 actividades + Administración)
 * Guarda la app en el celular para que abra aunque no haya señal.
 * Al publicar cambios en index.html, sube el número de VERSION para forzar la actualización.
 */
const VERSION = 'inspeccion-cintas-v18';
const ARCHIVOS = [
  './',
  './index.html',
  './checklist.html',
  './mapeo.html',
  './espesores.html',
  './semanal.html',
  './pauta.html',
  './flash.html',
  './admin.html',
  './sesion.js',
  './puente.js',
  './preparar.js',
  './marco.js',
  './tema.css',
  './tramos.js',
  './funciones.js',
  './config.js',
  './icons/logo-msmin.jpg',
  './icons/logo-codelco.jpg',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Con señal: usa la versión más nueva (y la guarda). Sin señal o señal muy débil
   (más de 4 s sin respuesta): usa la copia guardada. La API y Drive no pasan por aquí. */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const desdeCache = () =>
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'));

  // no-cache: siempre pregunta a GitHub si hay versión nueva (sin quedarse con la copia vieja del navegador).
  const desdeRed = fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r && r.ok) {
      const copia = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copia));
    }
    return r;
  });

  const conLimite = new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('timeout')), 4000);
    desdeRed.then((r) => { clearTimeout(t); ok(r); }, (err) => { clearTimeout(t); mal(err); });
  });

  e.respondWith(conLimite.catch(desdeCache));
});
