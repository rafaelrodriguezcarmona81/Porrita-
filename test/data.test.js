"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// Construye un fetch mock que devuelve `data` según la primera "needle" que
// aparezca en la URL. Cada entrada es [substring, data].
function routedFetch(routes) {
  return (url) => {
    for (const [needle, data] of routes) {
      if (url.includes(needle)) {
        return Promise.resolve({ json: () => Promise.resolve(data) });
      }
    }
    return Promise.resolve({ json: () => Promise.resolve(null) });
  };
}

// ─── getHDR / sbGet / sbPost / sbPatch ───────────────────────────────────────
test("getHDR: cabeceras con apikey y Authorization", () => {
  const { getHDR } = loadApp();
  const h = getHDR();
  assert.equal(h["Content-Type"], "application/json");
  assert.ok(h["apikey"], "debe incluir apikey");
  assert.match(h["Authorization"], /^Bearer /);
});

test("sbGet: hace GET a /rest/v1 y devuelve el json", async () => {
  const app = loadApp({ fetch: routedFetch([["porra_jugadores", [{ nombre: "Ana" }]]]) });
  const res = await app.sbGet("porra_jugadores", "select=*");
  assert.deepEqual(res, [{ nombre: "Ana" }]);
  const call = app.fetchCalls.find((c) => c.url.includes("porra_jugadores"));
  assert.match(call.url, /\/rest\/v1\/porra_jugadores\?select=\*/);
});

test("sbPost: envía método POST con body serializado", async () => {
  const app = loadApp({ fetch: routedFetch([["porra_jugadores", [{ id: 1 }]]]) });
  await app.sbPost("porra_jugadores", { nombre: "Ana" });
  const call = app.fetchCalls.at(-1);
  assert.equal(call.options.method, "POST");
  assert.deepEqual(JSON.parse(call.options.body), { nombre: "Ana" });
});

test("sbPatch: envía método PATCH con filtro en la URL", async () => {
  const app = loadApp({ fetch: routedFetch([["porra_jugadores", []]]) });
  await app.sbPatch("porra_jugadores", "user_id=eq.U1", { podium: ["A", "B", "C"] });
  const call = app.fetchCalls.at(-1);
  assert.equal(call.options.method, "PATCH");
  assert.match(call.url, /user_id=eq\.U1/);
});

// ─── loadData ─────────────────────────────────────────────────────────────────
test("loadData: carga jugadores y resultados en el estado", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", [{ nombre: "Ana", group_predictions: {}, podium: null }]],
      ["results.json", { results: { "A_x_y": "1" }, scores: { "A_x_y": "1-0" } }],
    ]),
  });
  await app.loadData();
  assert.equal(app.S.loading, false);
  assert.equal(app.S.refreshing, false);
  assert.equal(app.S.players.length, 1);
  assert.deepEqual(app.S.groupResults, { "A_x_y": "1" });
  assert.deepEqual(app.S.groupScores, { "A_x_y": "1-0" });
});

test("loadData: tolera results.json ausente (cae a objetos vacíos)", async () => {
  const app = loadApp({
    fetch: (url) =>
      url.includes("results.json")
        ? Promise.reject(new Error("404"))
        : Promise.resolve({ json: () => Promise.resolve([]) }),
  });
  await app.loadData();
  assert.deepEqual(app.S.groupResults, {});
  assert.deepEqual(app.S.groupScores, {});
  assert.equal(app.S.loading, false);
});

test("loadData: calcula rankChange cuando el usuario sube de puesto", async () => {
  const players = [
    { nombre: "Ana", group_predictions: { "k": "1" }, podium: null }, // 1 pt
    { nombre: "Beto", group_predictions: {}, podium: null },          // 0 pts
  ];
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", players],
      ["results.json", { results: { "k": "1" }, scores: {} }],
    ]),
  });
  Object.assign(app.S, { user: "Ana", lastRank: 2 }); // venía 2ª
  await app.loadData();
  // Ana (1pt) pasa a ser 1ª → subió 1 puesto (2 - 1)
  assert.equal(app.S.rankChange, 1);
  assert.equal(app.S.lastRank, 1);
});

test("loadData: sin usuario no calcula rankChange", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", [{ nombre: "Ana", group_predictions: {}, podium: null }]],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  await app.loadData();
  assert.equal(app.S.rankChange, null);
});

// ─── getInviteToken / redeemInvite ───────────────────────────────────────────
test("getInviteToken: extrae el token de ?invite= de la URL", () => {
  const app = loadApp();
  app.window.location.search = "?invite=abc-123";
  assert.equal(app.getInviteToken(), "abc-123");
});

test("getInviteToken: null si no hay invite en la URL", () => {
  const app = loadApp();
  app.window.location.search = "?foo=bar";
  assert.equal(app.getInviteToken(), null);
});

test("redeemInvite: POST a /api/redeem-invite con el token y devuelve el json si ok", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, nombre: "Ana" }) }) });
  const res = await app.redeemInvite("tok");
  assert.deepEqual(res, { ok: true, nombre: "Ana" });
  const call = app.fetchCalls.find((c) => c.url === "/api/redeem-invite");
  assert.equal(call.options.method, "POST");
  assert.deepEqual(JSON.parse(call.options.body), { token: "tok" });
});

test("redeemInvite: null si el endpoint responde no-ok", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) }) });
  assert.equal(await app.redeemInvite("tok"), null);
});

// ─── saveGroupPreds / savePodium / createInvite ──────────────────────────────
test("saveGroupPreds: fusiona pendientes con los guardados y limpia el estado", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []], // respuestas de PATCH y del loadData posterior
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [{ nombre: "Ana", group_predictions: { "old": "1" } }],
    pendingPreds: { "new": "X" },
  });
  await app.saveGroupPreds();
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  const body = JSON.parse(patch.options.body);
  assert.deepEqual(body.group_predictions, { old: "1", new: "X" });
  assert.ok(body.updated_at, "debe sellar updated_at");
  assert.deepEqual(app.S.pendingPreds, {}); // pendientes limpiados
  assert.equal(app.S.savingGroup, false);
});

test("savePodium: persiste el pódium y baja el flag de guardado", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, { user: "Ana", userId: "U1", players: [] });
  await app.savePodium(["España", "Brasil", "Argentina"]);
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  const body = JSON.parse(patch.options.body);
  assert.deepEqual(body.podium, ["España", "Brasil", "Argentina"]);
  assert.equal(app.S.savingPodium, false);
  assert.equal(app.S.pendingPodium, null);
});

test("createInvite: POST a /api/create-invite con el secreto y guarda el link", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, token: "tk" }) }) });
  await app.createInvite("clave-admin");
  const call = app.fetchCalls.find((c) => c.url === "/api/create-invite");
  assert.equal(call.options.method, "POST");
  assert.equal(call.options.headers["X-Admin-Secret"], "clave-admin");
  assert.match(app.S.adminInviteUrl, /\/\?invite=tk$/);
  assert.equal(app.S.adminInviteBusy, false);
});

test("createInvite: error del endpoint no fija link y baja el flag", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) }) });
  await app.createInvite("malo");
  assert.equal(app.S.adminInviteUrl, null);
  assert.equal(app.S.adminInviteBusy, false);
  assert.equal(app.S.adminTriggerOk, false);
});
