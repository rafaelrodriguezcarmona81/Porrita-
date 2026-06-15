"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// fetch enrutado por la primera "needle" que aparezca en la URL (en orden).
function routedFetch(routes) {
  return (url) => {
    for (const [needle, data] of routes) {
      if (url.includes(needle)) {
        return Promise.resolve({ json: () => Promise.resolve(data) });
      }
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  };
}

const sessionFor = (id, name) => ({
  access_token: "tok-" + id,
  user: { id, user_metadata: { full_name: name }, email: name.toLowerCase() + "@example.com" },
});

// ─── onAuthStateChange (flujo de autenticación) ──────────────────────────────
test("auth: sesión con jugador existente fija el usuario logado", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=eq.U1", [{ nombre: "Ana" }]],                  // ensurePlayer: match por id
      ["porra_jugadores", [{ nombre: "Ana", group_predictions: {}, podium: null }]],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  await app.fireAuth("SIGNED_IN", sessionFor("U1", "Ana"));
  assert.equal(app.S.user, "Ana");
  assert.equal(app.S.userId, "U1");
  assert.equal(app.S.loading, false);
  assert.equal(app.S.linkingSession, null);
});

test("auth: sesión sin jugador resoluble abre la pantalla de vinculación", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=is.null", [{ nombre: "Viejo1" }, { nombre: "Viejo2" }]], // candidatos a vincular
      ["user_id=eq.U2", []],   // ensurePlayer: sin match por id
      ["nombre=eq.", []],      // ensurePlayer: sin match por nombre
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  await app.fireAuth("SIGNED_IN", sessionFor("U2", "Manu"));
  assert.equal(app.S.user, null);
  assert.ok(app.S.linkingSession, "debe haber sesión de vinculación pendiente");
  assert.equal(app.S.linkingSession.userId, "U2");
  assert.equal(app.S.linkingSession.googleName, "Manu");
  assert.deepEqual(app.S.linkPlayers, ["Viejo1", "Viejo2"]);
});

test("auth: cierre de sesión limpia el usuario", async () => {
  const app = loadApp();
  // Partimos de un usuario logado…
  Object.assign(app.S, { user: "Ana", userId: "U1", linkingSession: null });
  await app.fireAuth("SIGNED_OUT", null);
  assert.equal(app.S.user, null);
  assert.equal(app.S.userId, null);
  assert.equal(app.S.loading, false);
});

test("auth: usa el nombre del email cuando no hay full_name", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=eq.U4", [{ nombre: "pepe" }]],
      ["porra_jugadores", [{ nombre: "pepe", group_predictions: {}, podium: null }]],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  const session = { access_token: "t", user: { id: "U4", user_metadata: {}, email: "pepe@example.com" } };
  await app.fireAuth("SIGNED_IN", session);
  // ensurePlayer recibió "pepe" (parte local del email) y resolvió ese jugador
  assert.equal(app.S.user, "pepe");
});
