"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// Deja resolver las promesas en vuelo de los handlers fire-and-forget.
const flush = () => new Promise((r) => setImmediate(r));

function routedFetch(routes) {
  return (url) => {
    for (const [needle, data] of routes) {
      if (url.includes(needle)) return Promise.resolve({ json: () => Promise.resolve(data) });
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  };
}

const dataFetch = () =>
  routedFetch([
    ["porra_jugadores", []],
    ["results.json", { results: {}, scores: {} }],
  ]);

// ─── validateName ─────────────────────────────────────────────────────────────
test("validateName: recorta espacios y acepta un nombre válido", () => {
  const { validateName } = loadApp();
  assert.deepEqual(validateName("  Ana  "), { ok: true, value: "Ana" });
});

test("validateName: rechaza vacío o solo espacios", () => {
  const { validateName } = loadApp();
  assert.equal(validateName("").ok, false);
  assert.equal(validateName("   ").ok, false);
});

test("validateName: rechaza por encima del máximo de caracteres", () => {
  const { validateName, MAX_NAME_LEN } = loadApp();
  assert.equal(validateName("x".repeat(MAX_NAME_LEN)).ok, true);
  assert.equal(validateName("x".repeat(MAX_NAME_LEN + 1)).ok, false);
});

// ─── renderProfileEditor ──────────────────────────────────────────────────────
test("renderProfileEditor: oculto cuando no se está editando", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", editingName: false });
  assert.equal(app.renderProfileEditor(), "");
});

test("renderProfileEditor: muestra el formulario con el nombre actual al editar", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", editingName: true, pendingName: "Ana" });
  const html = app.renderProfileEditor();
  assert.match(html, /class="profile-edit"/);
  assert.match(html, /value="Ana"/);
  assert.match(html, /doSaveName\(\)/);
  assert.match(html, /cancelEditName\(\)/);
});

test("renderProfileEditor: escapa el valor controlado por el usuario", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", editingName: true, pendingName: '"><img src=x onerror=alert(1)>' });
  const html = app.renderProfileEditor();
  assert.ok(!html.includes("<img src=x"), "no debe inyectar HTML sin escapar");
  assert.match(html, /&lt;img/);
});

test("renderProfileEditor: muestra el error de validación inline", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", editingName: true, nameError: "El nombre no puede estar vacío." });
  const html = app.renderProfileEditor();
  assert.match(html, /class="profile-error"/);
  assert.match(html, /no puede estar vacío/);
});

test("renderHeader: incluye el botón de editar nombre", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", players: [], groupResults: {} });
  const html = app.renderHeader();
  assert.match(html, /btn-profile/);
  assert.match(html, /startEditName\(\)/);
});

// ─── handlers ─────────────────────────────────────────────────────────────────
test("startEditName: abre el editor con el nombre actual precargado", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana" });
  app.window.startEditName();
  assert.equal(app.S.editingName, true);
  assert.equal(app.S.pendingName, "Ana");
  assert.equal(app.S.nameError, null);
});

test("setPendingName: actualiza el valor pendiente sin re-render", () => {
  const app = loadApp();
  app.window.setPendingName("Nuevo");
  assert.equal(app.S.pendingName, "Nuevo");
});

test("cancelEditName: cierra el editor y limpia el estado", () => {
  const app = loadApp();
  Object.assign(app.S, { editingName: true, pendingName: "x", nameError: "err" });
  app.window.cancelEditName();
  assert.equal(app.S.editingName, false);
  assert.equal(app.S.pendingName, "");
  assert.equal(app.S.nameError, null);
});

// ─── saveName ─────────────────────────────────────────────────────────────────
test("saveName: PATCH con el nuevo nombre, actualiza S.user y S.players, cierra editor", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [{ user_id: "U1", nombre: "Ana", group_predictions: {}, podium: null }],
    editingName: true,
    pendingName: "Anita",
  });
  await app.saveName("Anita");
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  const body = JSON.parse(patch.options.body);
  assert.equal(body.nombre, "Anita");
  assert.ok(body.updated_at, "debe sellar updated_at");
  assert.match(patch.url, /user_id=eq\.U1/);
  // El acoplamiento S.user / fila en S.players se mantiene tras renombrar.
  assert.equal(app.S.user, "Anita");
  assert.equal(app.S.players[0].nombre, "Anita");
  assert.equal(app.S.editingName, false);
  assert.equal(app.S.savingName, false);
  assert.equal(app.S.nameError, null);
});

test("saveName: recorta espacios antes de persistir", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, { user: "Ana", userId: "U1", players: [{ user_id: "U1", nombre: "Ana" }] });
  await app.saveName("  Beto  ");
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  assert.equal(JSON.parse(patch.options.body).nombre, "Beto");
  assert.equal(app.S.user, "Beto");
});

test("saveName: nombre vacío no hace PATCH y muestra error", async () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { user: "Ana", userId: "U1", players: [{ user_id: "U1", nombre: "Ana" }] });
  await app.saveName("   ");
  assert.ok(!app.fetchCalls.some((c) => c.options && c.options.method === "PATCH"), "no debe persistir");
  assert.equal(app.S.user, "Ana"); // sin cambios
  assert.match(app.S.nameError, /vacío/);
  assert.equal(app.S.savingName, false);
});

test("saveName: nombre demasiado largo no hace PATCH y muestra error", async () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { user: "Ana", userId: "U1", players: [{ user_id: "U1", nombre: "Ana" }] });
  await app.saveName("x".repeat(app.MAX_NAME_LEN + 1));
  assert.ok(!app.fetchCalls.some((c) => c.options && c.options.method === "PATCH"), "no debe persistir");
  assert.equal(app.S.user, "Ana");
  assert.match(app.S.nameError, /Máximo/);
});

test("doSaveName: guarda el nombre pendiente y se refleja en la cabecera tras render", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    loading: false,
    players: [{ user_id: "U1", nombre: "Ana", group_predictions: {}, podium: null }],
    editingName: true,
    pendingName: "Carla",
  });
  app.window.doSaveName();
  await flush();
  assert.equal(app.S.user, "Carla");
  // La cabecera (re-render) muestra el nuevo nombre escapado.
  assert.match(app.appEl.innerHTML, /Carla/);
});

test("doSaveName: no hace nada si ya está guardando", () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { savingName: true, userId: "U1", pendingName: "X" });
  app.window.doSaveName();
  assert.ok(!app.fetchCalls.some((c) => c.options && c.options.method === "PATCH"));
});

// ─── el nombre renombrado se refleja en ranking y pódium ──────────────────────
test("renderRanking: muestra el nuevo nombre y lo marca como (tú) tras renombrar", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [{ user_id: "U1", nombre: "Ana", group_predictions: {}, podium: null }],
  });
  await app.saveName("Diana");
  const html = app.renderRanking();
  assert.match(html, /Diana/);
  assert.match(html, /\(tú\)/); // sigue emparejando S.user con su propia fila
});
