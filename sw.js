/* Service worker para Porra Mundial 2026 (PWA).
 *
 * Estrategias (ver CLAUDE.md "Security model" y la issue #19):
 *  - Shell estático (index.html, css, js, manifest, iconos): NETWORK-FIRST con
 *    fallback a cache. Online se sirve siempre la última versión desplegada (así
 *    los cambios de app.js/css se ven sin esperar a un cambio de sw.js); offline
 *    se sirve la copia precacheada, de modo que la app sigue abriendo sin red.
 *    (Antes era cache-first y dejaba servir app.js viejo indefinidamente.)
 *  - Navegaciones (request.mode === "navigate"): NETWORK-FIRST con fallback
 *    al shell precacheado. Nunca servimos una página cacheada que pueda
 *    "tragarse" el redirect de OAuth de Google ni el manejo de ?invite=...
 *    Como el shell es el mismo index.html para cualquier ruta y el routing /
 *    parsing de ?invite= y del fragmento de auth ocurre en el cliente (app.js),
 *    el fallback offline sigue funcionando sin romper el flujo online.
 *  - results.json y changelog.json: NETWORK-FIRST (cae a cache si no hay red),
 *    así los datos están frescos online y el shell aún abre offline. La app ya
 *    los pide con cache-busting (?t=...).
 *  - Supabase REST/Auth y cualquier petición cross-origin (CDN, OAuth): NUNCA
 *    se cachean ni se interceptan; van directas a la red.
 */

// Versión del caché en semver. Solo hay que subirla cuando cambie la LÓGICA del
// SW (estrategias/assets), no en cada deploy: el shell es network-first y se
// refresca solo. v1.0.0 era el cache-first inicial; 1.1.0 pasa el shell a
// network-first para no servir app.js viejo.
const VERSION = "porra-pwa-1.1.0";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;

// Shell de la app que se precachea en install (rutas relativas al scope "/").
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Datos que se mantienen frescos con red (network-first) pero sirven offline.
const DATA_ASSETS = ["/results.json", "/changelog.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return DATA_ASSETS.includes(url.pathname);
}

function isShellAsset(url) {
  return SHELL_ASSETS.includes(url.pathname);
}

// Network-first para datos: intenta la red, guarda copia fresca y cae a cache
// si falla. La app pide results.json/changelog.json con cache-busting (?t=...),
// así que normalizamos la clave de cache al pathname (sin query) para que el
// fallback offline encuentre la última copia guardada sea cual sea el ?t=.
async function networkFirstData(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cacheKey = new URL(request.url).pathname; // sin query (?t=...)
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

// Network-first para el shell: intenta la red y refresca la copia cacheada; si
// la red falla (offline), sirve la copia precacheada. Garantiza que online se
// use siempre el último app.js/css/index.html desplegado.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo gestionamos GET. POST/PATCH (escrituras a Supabase) van directas.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca interceptamos peticiones cross-origin (Supabase, CDN de supabase-js,
  // OAuth de Google, etc.): que vayan a la red tal cual.
  if (url.origin !== self.location.origin) return;

  // Navegaciones: network-first con fallback al shell. Así el redirect de OAuth
  // y el token ?invite= siempre se resuelven contra la red cuando la hay, y
  // offline servimos el shell (index.html) para que la app arranque.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (
          (await cache.match("/index.html")) ||
          (await cache.match("/")) ||
          Response.error()
        );
      })
    );
    return;
  }

  // Datos: frescos online, disponibles offline.
  if (isDataRequest(url)) {
    event.respondWith(networkFirstData(request, DATA_CACHE));
    return;
  }

  // Shell estático: network-first (fresco online, cae a cache offline).
  if (isShellAsset(url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // Resto del mismo origen: dejamos pasar a la red (sin cachear).
});
