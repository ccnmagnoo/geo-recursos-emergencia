/* Service worker del Mapa de Recursos de Emergencia.
 *
 * Objetivo: que el último estado conocido siga disponible con mala señal.
 * - Navegación: red primero, caché después, página offline al final.
 * - Datos (/data/): stale-while-revalidate.
 * - Teselas: caché acotada (300) para no crecer sin control.
 */

const VERSION = 'recursos-v1';
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [
  BASE,
  `${BASE}lista/`,
  `${BASE}offline/`,
  `${BASE}data/recursos.json`,
  `${BASE}data/recursos.geojson`,
];
const LIMITE_TESELAS = 300;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function limitarCache(nombre, maximo) {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  if (claves.length <= maximo) return;
  for (const clave of claves.slice(0, claves.length - maximo)) {
    await cache.delete(clave);
  }
}

async function navegacion(request) {
  try {
    const respuesta = await fetch(request);
    const cache = await caches.open(VERSION);
    cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    const cache = await caches.open(VERSION);
    const guardada = await cache.match(request);
    if (guardada !== undefined) return guardada;
    const offline = await cache.match(`${BASE}offline/`);
    if (offline !== undefined) return offline;
    return new Response('Sin conexión. Abre la lista de recursos cuando recuperes señal.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function datos(request) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(request);
  const red = fetch(request)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(request, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);
  return (
    guardada ??
    (await red) ??
    new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  );
}

async function tesela(request) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(request);
  if (guardada !== undefined) {
    fetch(request)
      .then((respuesta) => {
        if (respuesta.ok || respuesta.type === 'opaque') cache.put(request, respuesta.clone());
        return limitarCache(VERSION, LIMITE_TESELAS);
      })
      .catch(() => undefined);
    return guardada;
  }
  const respuesta = await fetch(request);
  cache.put(request, respuesta.clone()).then(() => limitarCache(VERSION, LIMITE_TESELAS));
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  const request = evento.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const mismoOrigen = url.origin === self.location.origin;

  if (!mismoOrigen) {
    // Solo teselas: no cacheamos cualquier imagen de terceros.
    const esTesela = /\/\d+\/\d+\/\d+\.(png|jpe?g|webp)$/i.test(url.pathname);
    if (request.destination === 'image' && esTesela) {
      evento.respondWith(tesela(request));
    }
    return;
  }

  if (request.mode === 'navigate') {
    evento.respondWith(navegacion(request));
    return;
  }

  if (url.pathname.includes('/data/')) {
    evento.respondWith(datos(request));
  }
});
