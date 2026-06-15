"use strict";

const fs = require("fs");
const path = require("path");

const APP_PATH = path.join(__dirname, "..", "js", "app.js");

// Nombres definidos en el ámbito superior de app.js que queremos exponer al test.
const EXPOSED = [
  // helpers / lógica pura
  "gPts", "podiumBonus", "fmtTime", "tvChannel", "isLocked", "fl", "pill", "card",
  // datos
  "GROUPS", "GM", "ALL_TEAMS", "TOTAL_MATCHES", "FLAGS", "MATCH_TIMES", "LA1_MATCHES",
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
 * @param {number} [opts.now] - epoch ms que devolverá Date.now() (para isLocked).
 */
function loadApp(opts = {}) {
  const now = opts.now ?? Date.parse("2026-06-15T12:00:00+02:00");
  const src = fs.readFileSync(APP_PATH, "utf8");

  const stubSupabase = {
    createClient: () => ({
      auth: {
        onAuthStateChange: () => {},
        signInWithOAuth: () => {},
        signOut: () => Promise.resolve(),
      },
    }),
  };
  const stubDocument = { getElementById: () => null }; // render() sale temprano
  const stubWindow = {};

  // Envolvemos el fuente en una función y le añadimos un `return` con lo que
  // queremos extraer. Así las const/funciones del ámbito superior quedan visibles.
  const body = `${src}\n;return { ${EXPOSED.join(", ")} };`;
  const factory = new Function(
    "supabase", "window", "document", "console", "fetch", "setTimeout", "Date",
    body
  );

  return factory(
    stubSupabase,
    stubWindow,
    stubDocument,
    console,
    () => Promise.resolve({}), // fetch (no se usa al cargar)
    () => 0,                   // setTimeout (no se usa al cargar)
    makeFakeDate(now)
  );
}

module.exports = { loadApp };
