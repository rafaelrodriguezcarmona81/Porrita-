"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// Deja que se resuelvan las promesas en vuelo de los handlers fire-and-forget.
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

// ─── Handlers síncronos de estado ────────────────────────────────────────────
test("setTab: cambia de pestaña", () => {
  const app = loadApp();
  app.window.setTab("podium");
  assert.equal(app.S.tab, "podium");
});

test("setGroup: cambia de grupo y resetea pronósticos pendientes", () => {
  const app = loadApp();
  Object.assign(app.S, { pendingPreds: { algo: "1" } });
  app.window.setGroup("C");
  assert.equal(app.S.activeGroup, "C");
  assert.deepEqual(app.S.pendingPreds, {});
});

test("setPred: registra un pronóstico pendiente", () => {
  const app = loadApp();
  app.window.setPred("A_México_Sudáfrica", "X");
  assert.equal(app.S.pendingPreds["A_México_Sudáfrica"], "X");
});

test("setPodiumPos: fija una posición del pódium en pendingPodium", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", players: [{ nombre: "Ana", podium: null }] });
  app.window.setPodiumPos(0, "España");
  assert.equal(app.S.pendingPodium[0], "España");
});

test("setPodiumPos: parte del pódium ya guardado al editar una posición", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", podium: ["España", "Brasil", "Argentina"] }],
  });
  app.window.setPodiumPos(2, "Francia");
  assert.deepEqual(app.S.pendingPodium, ["España", "Brasil", "Francia"]);
});

// ─── Handlers de autenticación ───────────────────────────────────────────────
test("doGoogleLogin: invoca el login de Supabase sin lanzar", () => {
  const app = loadApp();
  assert.doesNotThrow(() => app.window.doGoogleLogin());
});

test("doLogout: cierra sesión y limpia el estado", async () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", userId: "U1" });
  await app.window.doLogout();
  assert.equal(app.S.user, null);
  assert.equal(app.S.userId, null);
});

test("doLinkAccount: vincula con el nombre elegido en el <select>", async () => {
  const app = loadApp({
    fetch: dataFetch(),
    elements: { linkSelect: { value: "Viejo" } },
  });
  Object.assign(app.S, { linkingSession: { userId: "U1", googleName: "Manu" } });
  app.window.doLinkAccount();
  await flush();
  assert.equal(app.S.user, "Viejo");
  assert.equal(app.S.linkingSession, null);
});

test("doLinkAccount: sin selección no hace nada", () => {
  const app = loadApp({ elements: { linkSelect: { value: "" } } });
  Object.assign(app.S, { linkingSession: { userId: "U1", googleName: "Manu" } });
  app.window.doLinkAccount();
  assert.ok(app.S.linkingSession, "no debe limpiar la sesión de vinculación");
});

test("doFreshAccount: crea cuenta nueva desde la sesión de vinculación", async () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { linkingSession: { userId: "U9", googleName: "Nuevo" } });
  app.window.doFreshAccount();
  await flush();
  assert.equal(app.S.user, "Nuevo");
});

// ─── Handlers de guardado / refresco ─────────────────────────────────────────
test("doSavePreds: guarda y limpia los pronósticos pendientes", async () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [{ nombre: "Ana", group_predictions: {} }],
    pendingPreds: { "A_México_Sudáfrica": "1" },
  });
  app.window.doSavePreds();
  await flush();
  assert.deepEqual(app.S.pendingPreds, {});
  assert.equal(app.S.savingGroup, false);
});

test("doSavePreds: no hace nada si ya está guardando", () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { savingGroup: true, pendingPreds: { x: "1" } });
  app.window.doSavePreds();
  // sigue marcado como guardando y no se limpiaron los pendientes
  assert.equal(app.S.savingGroup, true);
  assert.deepEqual(app.S.pendingPreds, { x: "1" });
});

test("doSavePodium: persiste solo cuando los 3 puestos están elegidos", async () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [],
    pendingPodium: ["España", "Brasil", "Argentina"],
  });
  app.window.doSavePodium();
  await flush();
  assert.equal(app.S.savingPodium, false);
  assert.equal(app.S.pendingPodium, null);
});

test("doSavePodium: pódium incompleto no guarda", () => {
  const app = loadApp({ fetch: dataFetch() });
  Object.assign(app.S, { userId: "U1", pendingPodium: ["España", "", ""] });
  app.window.doSavePodium();
  // no arranca el guardado
  assert.notEqual(app.S.pendingPodium, null);
});

test("doRefresh: recarga datos y baja los flags de carga", async () => {
  const app = loadApp({ fetch: dataFetch() });
  app.window.doRefresh();
  await flush();
  assert.equal(app.S.refreshing, false);
  assert.equal(app.S.loading, false);
});
