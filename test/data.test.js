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

// ─── ensurePlayer (resolución/vinculación de jugador) ────────────────────────
test("ensurePlayer: devuelve el nombre si ya existe por user_id", async () => {
  const app = loadApp({ fetch: routedFetch([["user_id=eq.U1", [{ nombre: "Ana" }]]]) });
  const name = await app.ensurePlayer("U1", "Google Ana");
  assert.equal(name, "Ana");
});

test("ensurePlayer: vincula por nombre cuando no tiene user_id y lo devuelve", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=eq.U2", []], // no hay match por id
      ["nombre=eq.", [{ nombre: "Pepe", user_id: null }]], // match por nombre sin vincular
    ]),
  });
  const name = await app.ensurePlayer("U2", "Pepe");
  assert.equal(name, "Pepe");
  // debe haber hecho un PATCH para vincular
  const patched = app.fetchCalls.some((c) => c.options && c.options.method === "PATCH");
  assert.ok(patched, "debería vincular con un PATCH");
});

test("ensurePlayer: null cuando no hay forma de resolver (requiere vinculación manual)", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["user_id=eq.U3", []],
      ["nombre=eq.", []],
    ]),
  });
  const name = await app.ensurePlayer("U3", "Nuevo");
  assert.equal(name, null);
});

// ─── saveGroupPreds / savePodium / linkAccount / createFreshAccount ──────────
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

test("createFreshAccount: crea jugador nuevo con POST y fija el usuario", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, { linkingSession: { userId: "U9", googleName: "Nuevo" } });
  await app.createFreshAccount();
  const post = app.fetchCalls.find((c) => c.options && c.options.method === "POST");
  const body = JSON.parse(post.options.body);
  assert.equal(body.nombre, "Nuevo");
  assert.equal(body.user_id, "U9");
  assert.equal(app.S.user, "Nuevo");
  assert.equal(app.S.linkingSession, null);
});

test("linkAccount: vincula nombre antiguo y fija el usuario", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, { linkingSession: { userId: "U8", googleName: "NuevoNombre" } });
  await app.linkAccount("NombreAntiguo");
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  assert.match(patch.url, /nombre=eq\.NombreAntiguo/);
  assert.equal(app.S.user, "NombreAntiguo");
  assert.equal(app.S.linkingSession, null);
});
