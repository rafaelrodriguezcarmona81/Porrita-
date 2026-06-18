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

// Fetch a medida para los flujos con canje de invitación (necesita `ok`).
function flowFetch({ member, redeem }) {
  return (url) => {
    if (url.includes("/api/redeem-invite")) return Promise.resolve(redeem);
    if (url.includes("user_id=eq.")) return Promise.resolve({ json: () => Promise.resolve(member) });
    if (url.includes("results.json")) return Promise.resolve({ json: () => Promise.resolve({ results: {}, scores: {} }) });
    return Promise.resolve({ json: () => Promise.resolve([]) }); // porra_jugadores (loadData), changelog…
  };
}

// ─── onAuthStateChange (flujo de acceso por invitación) ──────────────────────
test("auth: miembro existente (tiene fila) entra directamente", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=eq.U1", [{ nombre: "Ana" }]],                    // ya es miembro
      ["porra_jugadores", [{ nombre: "Ana", group_predictions: {}, podium: null }]],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  await app.fireAuth("SIGNED_IN", sessionFor("U1", "Ana"));
  assert.equal(app.S.user, "Ana");
  assert.equal(app.S.userId, "U1");
  assert.equal(app.S.accessDenied, false);
  assert.equal(app.S.loading, false);
});

test("auth: no-miembro sin invitación → acceso denegado", async () => {
  const app = loadApp({ fetch: flowFetch({ member: [], redeem: null }) });
  // S.inviteToken = null por defecto
  await app.fireAuth("SIGNED_IN", sessionFor("U2", "Manu"));
  assert.equal(app.S.user, null);
  assert.equal(app.S.accessDenied, true);
  assert.equal(app.S.loading, false);
});

test("auth: no-miembro con invitación válida → canjea y entra", async () => {
  const app = loadApp({
    fetch: flowFetch({ member: [], redeem: { ok: true, json: () => Promise.resolve({ ok: true, nombre: "Nuevo" }) } }),
  });
  app.S.inviteToken = "tok";
  await app.fireAuth("SIGNED_IN", sessionFor("U3", "Nuevo"));
  assert.equal(app.S.user, "Nuevo");
  assert.equal(app.S.accessDenied, false);
  assert.equal(app.S.inviteToken, null); // se limpia tras canjear
});

test("auth: no-miembro con invitación inválida → acceso denegado con mensaje", async () => {
  const app = loadApp({
    fetch: flowFetch({ member: [], redeem: { ok: false, status: 403, json: () => Promise.resolve({}) } }),
  });
  app.S.inviteToken = "caducada";
  await app.fireAuth("SIGNED_IN", sessionFor("U4", "Tarde"));
  assert.equal(app.S.user, null);
  assert.equal(app.S.accessDenied, true);
  assert.match(app.S.accessError, /caducad|válid/i);
});

test("auth: cierre de sesión limpia el usuario", async () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", userId: "U1" });
  await app.fireAuth("SIGNED_OUT", null);
  assert.equal(app.S.user, null);
  assert.equal(app.S.userId, null);
  assert.equal(app.S.loading, false);
});
