"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const APP_PATH = path.join(__dirname, "..", "js", "app.js");

// Nombres definidos en el ámbito superior de app.js que queremos exponer al test.
const EXPOSED = [
  // helpers / lógica pura
  "gPts", "podiumBonus", "fmtTime", "tvChannel", "isLocked", "fl", "pill", "card",
  // datos
  "GROUPS", "GM", "ALL_TEAMS", "TOTAL_MATCHES", "FLAGS", "MATCH_TIMES", "LA1_MATCHES",
  // estado + setState
  "S", "ss",
  // render (devuelven strings HTML)
  "render", "renderLogin", "renderLinking", "renderHeader",
  "renderGrupos", "renderPodium", "renderRanking",
  // capa de datos / red
  "getHDR", "sbGet", "sbPost", "sbPatch",
  "loadData", "ensurePlayer", "linkAccount", "createFreshAccount",
  "saveGroupPreds", "savePodium",
];

/**
 * Crea un sustituto de `Date` con `Date.now()` fijado a `fixedNowMs`,
 * pero que sigue parseando fechas reales con `new Date(string)`.
 */
function makeFakeDate(fixedNowMs) {
  return class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixedNowMs);
      else super(...args);
    }
    static now() {
      return fixedNowMs;
    }
  };
}

/**
 * Carga js/app.js en un ámbito aislado con los globales del navegador
 * mockeados, y devuelve las funciones/datos listados en EXPOSED.
 *
 * @param {object} [opts]
 * @param {number}   [opts.now]   - epoch ms que devolverá Date.now() (para isLocked).
 * @param {function} [opts.fetch] - implementación de fetch para la capa de datos.
 *
 * Devuelve, además de lo listado en EXPOSED:
 *   - `window`: el objeto window stub (con los handlers window.* asignados por app.js)
 *   - `appEl`:  el elemento simulado con id="app" (su .innerHTML refleja lo que pinta render())
 *   - `fetchCalls`: array con {url, options} de cada llamada a fetch
 */
function loadApp(opts = {}) {
  const now = opts.now ?? Date.parse("2026-06-15T12:00:00+02:00");
  const src = fs.readFileSync(APP_PATH, "utf8");

  // Capturamos el callback que app.js registra en onAuthStateChange para
  // poder simular eventos de login/logout desde los tests.
  let authCb = null;
  const stubSupabase = {
    createClient: () => ({
      auth: {
        onAuthStateChange: (cb) => { authCb = cb; },
        signInWithOAuth: () => {},
        signOut: () => Promise.resolve(),
      },
    }),
  };

  // Elemento simulado #app; render() escribe en su innerHTML.
  const appEl = { innerHTML: "" };
  const stubDocument = {
    getElementById: (id) => (id === "app" ? appEl : (opts.elements && opts.elements[id]) || null),
  };
  const stubWindow = { location: { origin: "http://localhost" } };

  // fetch instrumentado: registra cada llamada y delega en opts.fetch si se pasa.
  const fetchCalls = [];
  const defaultFetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
  const fetchImpl = (url, options) => {
    fetchCalls.push({ url, options });
    return (opts.fetch || defaultFetch)(url, options);
  };

  // Envolvemos el fuente en una función y le añadimos un `return` con lo que
  // queremos extraer. Así las const/funciones del ámbito superior quedan visibles.
  // Usamos vm.compileFunction con `filename` = ruta real de app.js para que V8
  // atribuya la cobertura al fichero en disco (new Function lo trataría como eval).
  const body = `${src}\n;return { ${EXPOSED.join(", ")} };`;
  const factory = vm.compileFunction(
    body,
    ["supabase", "window", "document", "console", "fetch", "setTimeout", "Date"],
    { filename: APP_PATH }
  );

  const exported = factory(
    stubSupabase,
    stubWindow,
    stubDocument,
    console,
    fetchImpl,
    () => 0, // setTimeout (no-op: evita re-render diferido en loadData)
    makeFakeDate(now)
  );

  // Dispara el callback de auth registrado por app.js (devuelve su promesa).
  const fireAuth = (event, session) => authCb(event, session);

  return { ...exported, window: stubWindow, appEl, fetchCalls, fireAuth };
}

module.exports = { loadApp };
