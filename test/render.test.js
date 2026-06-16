"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// Helper: carga la app y fija el estado base de un usuario logado.
function withState(state, opts) {
  const app = loadApp(opts);
  Object.assign(app.S, state);
  return app;
}

// ─── renderLogin ────────────────────────────────────────────────────────────
test("renderLogin: pantalla de login con botón de Google", () => {
  const { renderLogin } = loadApp();
  const html = renderLogin();
  assert.match(html, /class="auth-wrap"/);
  assert.match(html, /class="login-btn"/);
  assert.match(html, /PORRA MUNDIAL/);
  assert.match(html, /doGoogleLogin\(\)/);
});

// ─── renderLinking ───────────────────────────────────────────────────────────
test("renderLinking: muestra nombre y opciones de vinculación", () => {
  const app = withState({
    linkingSession: { userId: "U1", googleName: "Manu" },
    linkPlayers: ["Pepe", "Lucía"],
  });
  const html = app.renderLinking();
  assert.match(html, /¡Hola, Manu!/);
  assert.match(html, /class="link-select"/);
  assert.match(html, /<option value="Pepe">Pepe<\/option>/);
  assert.match(html, /class="link-btn-primary"/);
});

test("renderLinking: sin jugadores antiguos no muestra el selector", () => {
  const app = withState({
    linkingSession: { userId: "U1", googleName: "Manu" },
    linkPlayers: [],
  });
  const html = app.renderLinking();
  assert.doesNotMatch(html, /class="link-select"/);
  assert.match(html, /class="link-btn-secondary"/); // sí el botón "empezar desde cero"
});

// ─── renderHeader ─────────────────────────────────────────────────────────────
test("renderHeader: muestra usuario, puntos y pestañas", () => {
  const app = withState({
    user: "Ana",
    players: [{ nombre: "Ana", group_predictions: { "A_x_y": "1" }, podium: null }],
    groupResults: { "A_x_y": "1" }, // 1 acierto
  });
  const html = app.renderHeader();
  assert.match(html, /class="hdr"/);
  assert.match(html, /Ana · 1 pts · 1\//); // 1 punto, 1 partido jugado
  assert.match(html, /class="tabs"/);
});

test("renderHeader: banner verde al subir de puesto", () => {
  const app = withState({ user: "Ana", players: [], groupResults: {}, rankChange: 2 });
  const html = app.renderHeader();
  assert.match(html, /rank-banner--up/);
  assert.match(html, /Has subido 2 puestos/);
});

test("renderHeader: banner rojo al bajar de puesto", () => {
  const app = withState({ user: "Ana", players: [], groupResults: {}, rankChange: -1 });
  const html = app.renderHeader();
  assert.match(html, /rank-banner--down/);
  assert.match(html, /Has bajado 1 puesto/);
});

test("renderHeader: pestaña activa marcada", () => {
  const app = withState({ user: "Ana", players: [], groupResults: {}, tab: "podium" });
  const html = app.renderHeader();
  // El botón de Pódium debe llevar la clase activa
  assert.match(html, /setTab\('podium'\)" class="tab tab--active"/);
});

// ─── renderGrupos (lógica visual del refactor) ───────────────────────────────
test("renderGrupos: acierto pinta clases verdes y badge +1", () => {
  // Grupo A, primer partido: México vs Sudáfrica → pred "1" y resultado "1"
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: { "A_México_Sudáfrica": "1" }, podium: null }],
    groupResults: { "A_México_Sudáfrica": "1" },
    groupScores: {},
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") }); // nada bloqueado aún
  const html = app.renderGrupos();
  assert.match(html, /match match--correct/);
  assert.match(html, /pick pick--correct/);
  assert.match(html, /\+1✓/);
});

test("renderGrupos: fallo pinta clases rojas y badge ✗", () => {
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: { "A_México_Sudáfrica": "2" }, podium: null }],
    groupResults: { "A_México_Sudáfrica": "1" },
    groupScores: {},
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  const html = app.renderGrupos();
  assert.match(html, /match match--wrong/);
  assert.match(html, /pick pick--wrong/);
});

test("renderGrupos: partido bloqueado (sin resultado) muestra candado y pick--locked", () => {
  // 30 min antes del saque del primer partido del grupo A
  const kickoff = Date.parse("2026-06-11T21:00:00+02:00");
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    groupResults: {},
    groupScores: {},
  }, { now: kickoff - 30 * 60 * 1000 });
  const html = app.renderGrupos();
  assert.match(html, /badge badge--locked/);
  assert.match(html, /pick--locked/);
  assert.match(html, /🔒/);
});

test("renderGrupos: pronóstico pendiente seleccionado usa pick--sel", () => {
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    groupResults: {},
    groupScores: {},
    pendingPreds: { "A_México_Sudáfrica": "X" },
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  const html = app.renderGrupos();
  assert.match(html, /pick pick--sel/);
  assert.match(html, /GUARDAR PRONÓSTICOS/); // hay cambios pendientes → botón guardar
});

// ─── renderPodium ─────────────────────────────────────────────────────────────
test("renderPodium: muestra preview del pódium guardado y otros jugadores", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: {}, podium: ["España", "Brasil", "Argentina"] },
      { nombre: "Beto", group_predictions: {}, podium: ["Francia", "Brasil", "Italia"] },
    ],
  });
  const html = app.renderPodium();
  // Preview del pódium guardado de Ana (con banderas)
  assert.match(html, /class="podium-preview"/);
  assert.match(html, /🇪🇸 España/);
  // Con los 3 puestos elegidos, el botón de guardar está presente
  assert.match(html, /GUARDAR PÓDIUM/);
  // Fila de Beto con su pódium resumido
  assert.match(html, /class="player-row"/);
  assert.match(html, /🥇Francia/);
});

test("renderPodium: sin pódium propio muestra el formulario sin preview", () => {
  const app = withState({
    user: "Ana",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
  });
  const html = app.renderPodium();
  assert.doesNotMatch(html, /class="podium-preview"/);
  assert.match(html, /Selecciona los 3 equipos/);
});

// ─── renderRanking ────────────────────────────────────────────────────────────
test("renderRanking: ordena por puntos y resalta al usuario", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Beto", group_predictions: {}, podium: null },           // 0 pts
      { nombre: "Ana", group_predictions: { "A_x_y": "1" }, podium: null }, // 1 pt
    ],
    groupResults: { "A_x_y": "1" },
  });
  const html = app.renderRanking();
  assert.match(html, /rank-row rank-row--me/); // fila de Ana resaltada
  assert.match(html, /\(tú\)/);
  // Ana (1pt) debe aparecer antes que Beto (0pts)
  assert.ok(html.indexOf("Ana") < html.indexOf("Beto"), "Ana debería ir por delante de Beto");
});

test("renderRanking: sin participantes muestra mensaje vacío", () => {
  const app = withState({ user: "Ana", players: [], groupResults: {} });
  const html = app.renderRanking();
  assert.match(html, /Aún no hay participantes/);
});

// ─── render (enrutado por estado) ─────────────────────────────────────────────
test("render: estado loading pinta 'Conectando'", () => {
  const app = withState({ loading: true });
  app.render();
  assert.match(app.appEl.innerHTML, /Conectando/);
  assert.match(app.appEl.innerHTML, /class="loading"/);
});

test("render: sin usuario pinta login", () => {
  const app = withState({ loading: false, user: null, linkingSession: null });
  app.render();
  assert.match(app.appEl.innerHTML, /class="login-btn"/);
});

test("render: con sesión de vinculación pinta pantalla de linking", () => {
  const app = withState({
    loading: false,
    linkingSession: { userId: "U1", googleName: "Manu" },
    linkPlayers: [],
  });
  app.render();
  assert.match(app.appEl.innerHTML, /¡Hola, Manu!/);
});

// ─── renderAdmin ──────────────────────────────────────────────────────────────
test("renderAdmin: muestra input de clave y botón de forzar actualización", () => {
  const { renderAdmin } = loadApp();
  const html = renderAdmin();
  assert.match(html, /Zona Admin/);
  assert.match(html, /id="adminSecret"/);
  assert.match(html, /doTriggerUpdate\(\)/);
  assert.match(html, /Forzar actualización de resultados/);
});

test("renderAdmin: refleja mensaje de éxito o error", () => {
  const ok = loadApp();
  Object.assign(ok.S, { adminTriggerMsg: "✅ disparada", adminTriggerOk: true });
  assert.match(ok.renderAdmin(), /admin-msg--ok/);

  const err = loadApp();
  Object.assign(err.S, { adminTriggerMsg: "❌ falló", adminTriggerOk: false });
  assert.match(err.renderAdmin(), /admin-msg--err/);
});

test("renderHeader: incluye la pestaña de Admin", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", players: [], groupResults: {} });
  assert.match(app.renderHeader(), /setTab\('admin'\)/);
});

test("render: pestaña admin pinta el panel de administración", () => {
  const app = loadApp();
  Object.assign(app.S, {
    loading: false, user: "Ana", tab: "admin",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    groupResults: {}, groupScores: {},
  });
  app.render();
  assert.match(app.appEl.innerHTML, /Zona Admin/);
});

test("render: usuario logado pinta header + contenido de la pestaña", () => {
  const app = withState({
    loading: false,
    user: "Ana",
    tab: "grupos",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    groupResults: {},
    groupScores: {},
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  app.render();
  assert.match(app.appEl.innerHTML, /class="hdr"/);
  assert.match(app.appEl.innerHTML, /class="app-main"/);
  assert.match(app.appEl.innerHTML, /Fase de Grupos/);
});
