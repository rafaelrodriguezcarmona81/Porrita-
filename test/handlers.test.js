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

test("doCreateInvite: con clave admin genera el link de invitación", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, token: "tk" }) }) });
  Object.assign(app.S, { adminUnlocked: true, adminKey: "clave-admin" });
  app.window.doCreateInvite();
  await flush();
  assert.match(app.S.adminInviteUrl, /\/\?invite=tk$/);
});

test("doCreateInvite: sin clave no llama al endpoint", () => {
  const app = loadApp({ fetch: dataFetch() }); // adminKey = "" por defecto
  app.window.doCreateInvite();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/create-invite"));
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

// ─── Trigger de actualización (admin) ────────────────────────────────────────
test("triggerUpdate: hace POST a /api/trigger-update con la cabecera del secreto", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }) });
  await app.triggerUpdate("mi-secreto");
  const call = app.fetchCalls.find((c) => c.url === "/api/trigger-update");
  assert.ok(call, "debe llamar al endpoint del trigger");
  assert.equal(call.options.method, "POST");
  assert.equal(call.options.headers["X-Admin-Secret"], "mi-secreto");
  assert.equal(app.S.adminTriggerOk, true);
  assert.equal(app.S.adminTriggering, false);
  assert.match(app.S.adminTriggerMsg, /✅/);
});

test("triggerUpdate: muestra error cuando el endpoint responde no-ok", async () => {
  const app = loadApp({
    fetch: () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "No autorizado" }) }),
  });
  await app.triggerUpdate("malo");
  assert.equal(app.S.adminTriggerOk, false);
  assert.match(app.S.adminTriggerMsg, /No autorizado/);
});

test("triggerUpdate: error de red muestra mensaje y baja el flag", async () => {
  const app = loadApp({ fetch: () => Promise.reject(new Error("network down")) });
  await app.triggerUpdate("x");
  assert.equal(app.S.adminTriggerOk, false);
  assert.equal(app.S.adminTriggering, false);
  assert.match(app.S.adminTriggerMsg, /Error de red/);
});

test("doTriggerUpdate: sin clave desbloqueada no llama al endpoint", () => {
  const app = loadApp({ fetch: dataFetch() }); // S.adminKey = "" por defecto
  app.window.doTriggerUpdate();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/trigger-update"));
});

test("doTriggerUpdate: usa la clave guardada en el estado", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }) });
  Object.assign(app.S, { adminUnlocked: true, adminKey: "clave-admin" });
  app.window.doTriggerUpdate();
  await flush();
  const call = app.fetchCalls.find((c) => c.url === "/api/trigger-update");
  assert.equal(call.options.headers["X-Admin-Secret"], "clave-admin");
});

// ─── Gate de admin (verificación server-side) ────────────────────────────────
test("verifyAdminKey: clave válida desbloquea y guarda la clave", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, verified: true }) }) });
  await app.verifyAdminKey("buena");
  const call = app.fetchCalls.find((c) => c.url === "/api/trigger-update");
  assert.equal(call.options.headers["X-Admin-Secret"], "buena");
  assert.equal(call.options.headers["X-Verify-Only"], "1"); // modo verificación, no dispara
  assert.equal(app.S.adminUnlocked, true);
  assert.equal(app.S.adminKey, "buena");
  assert.equal(app.S.adminGateError, false);
});

test("verifyAdminKey: clave inválida no desbloquea y marca error", async () => {
  const app = loadApp({ fetch: () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "No autorizado" }) }) });
  await app.verifyAdminKey("mala");
  assert.equal(app.S.adminUnlocked, false);
  assert.equal(app.S.adminGateError, true);
});

test("verifyAdminKey: error de red marca error en el gate", async () => {
  const app = loadApp({ fetch: () => Promise.reject(new Error("down")) });
  await app.verifyAdminKey("x");
  assert.equal(app.S.adminUnlocked, false);
  assert.equal(app.S.adminGateError, true);
});

test("doAdminLogin: con clave en el input lanza la verificación", async () => {
  const app = loadApp({
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    elements: { adminKeyInput: { value: "clave" } },
  });
  app.window.doAdminLogin();
  await flush();
  assert.equal(app.S.adminUnlocked, true);
});

test("doAdminLogin: sin clave no llama al endpoint", () => {
  const app = loadApp({ fetch: dataFetch(), elements: { adminKeyInput: { value: "" } } });
  app.window.doAdminLogin();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/trigger-update"));
});
