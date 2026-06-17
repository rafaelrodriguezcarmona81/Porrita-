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

test("renderGrupos: en un fallo, el resultado oficial se resalta con pick--result", () => {
  // pred "2" pero el resultado real es "1" → el botón "1" lleva pick--result
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: { "A_México_Sudáfrica": "2" }, podium: null }],
    groupResults: { "A_México_Sudáfrica": "1" },
    groupScores: {},
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  const html = app.renderGrupos();
  assert.match(html, /pick pick--result[^"]*">1</);
  // el acierto (verde lleno) no debe aparecer en un fallo
  assert.doesNotMatch(html, /pick--correct/);
});

test("renderGrupos: en un acierto no se pinta pick--result", () => {
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: { "A_México_Sudáfrica": "1" }, podium: null }],
    groupResults: { "A_México_Sudáfrica": "1" },
    groupScores: {},
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  const html = app.renderGrupos();
  assert.doesNotMatch(html, /pick--result/);
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

// ─── renderStandings (clasificación del grupo) ────────────────────────────────
const STANDINGS_A = [
  { team: "México", mp: 1, w: 1, d: 0, l: 0, gf: 2, ga: 0, gd: 2, pts: 3 },
  { team: "Corea del Sur", mp: 1, w: 1, d: 0, l: 0, gf: 2, ga: 1, gd: 1, pts: 3 },
  { team: "Rep. Checa", mp: 1, w: 0, d: 0, l: 1, gf: 1, ga: 2, gd: -1, pts: 0 },
  { team: "Sudáfrica", mp: 1, w: 0, d: 0, l: 1, gf: 0, ga: 2, gd: -2, pts: 0 },
];

test("renderStandings: pinta la tabla con filas, puntos y diferencia de goles", () => {
  const app = withState({ activeGroup: "A", groupStandings: { A: STANDINGS_A } });
  const html = app.renderStandings("A");
  assert.match(html, /<table class="standings">/);
  assert.match(html, /México/);
  assert.match(html, /<th>GF<\/th><th>GC<\/th>/); // columnas goles a favor/contra
  assert.match(html, /\+2</);   // DG con signo para positivos
  assert.match(html, /-2</);    // DG negativo
});

// 12 grupos para probar clasificados directos + mejores terceros.
// Terceros: A-D con 5pts, E-H con 4pts, I-L con 3pts → top-8 = A3..H3.
const LETTERS_12 = "ABCDEFGHIJKL".split("");
const STANDINGS_12 = Object.fromEntries(LETTERS_12.map((L, i) => {
  const third = i < 4
    ? { w: 1, d: 2, l: 0, gf: 5, ga: 4, gd: 1, pts: 5 }
    : i < 8
    ? { w: 1, d: 1, l: 1, gf: 4, ga: 4, gd: 0, pts: 4 }
    : { w: 1, d: 0, l: 2, gf: 3, ga: 5, gd: -2, pts: 3 };
  return [L, [
    { team: `${L}1`, mp: 3, w: 3, d: 0, l: 0, gf: 9, ga: 1, gd: 8, pts: 9 },
    { team: `${L}2`, mp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 4, gd: 2, pts: 6 },
    { team: `${L}3`, mp: 3, ...third },
    { team: `${L}4`, mp: 3, w: 0, d: 0, l: 3, gf: 0, ga: 9, gd: -9, pts: 0 },
  ]];
}));

test("bestThirdTeams: clasifican exactamente los 8 mejores terceros", () => {
  const app = withState({ groupStandings: STANDINGS_12 });
  const set = app.bestThirdTeams();
  assert.equal(set.size, 8);
  assert.ok(set.has("A3") && set.has("H3")); // 5pts y 4pts entran
  assert.ok(!set.has("I3"));                 // 3pts queda fuera
});

test("renderStandings: top-2 en verde y 3º en ámbar solo si es mejor tercero", () => {
  const app = withState({ groupStandings: STANDINGS_12 });
  const a = app.renderStandings("A");
  assert.equal((a.match(/st-row--qual/g) || []).length, 2);  // 2 clasificados directos (verde)
  assert.equal((a.match(/st-row--third/g) || []).length, 1); // mejor tercero (ámbar)
  const i = app.renderStandings("I");
  assert.equal((i.match(/st-row--qual/g) || []).length, 2);
  assert.equal((i.match(/st-row--third/g) || []).length, 0); // su 3º no clasifica
});

test("renderStandings: sin partidos muestra la tabla a cero y sin marcar clasificados", () => {
  const empty = STANDINGS_A.map(t => ({ ...t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
  const app = withState({ activeGroup: "A", groupStandings: { A: empty } });
  const html = app.renderStandings("A");
  assert.match(html, /<table class="standings">/);          // sí hay tabla
  assert.doesNotMatch(html, /st-row--qual/);                // pero sin resaltar plazas
});

test("renderStandings: sin datos de clasificación muestra aviso", () => {
  const app = withState({ activeGroup: "A", groupStandings: {} });
  const html = app.renderStandings("A");
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /Clasificación no disponible/);
});

test("renderGrupos: incluye la clasificación del grupo activo", () => {
  const app = withState({
    user: "Ana",
    activeGroup: "A",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    groupStandings: { A: STANDINGS_A },
  }, { now: Date.parse("2026-01-01T00:00:00+02:00") });
  const html = app.renderGrupos();
  assert.match(html, /Clasificación/);
  assert.match(html, /<table class="standings">/);
});

// ─── esc / XSS ────────────────────────────────────────────────────────────────
test("esc: escapa caracteres peligrosos de HTML", () => {
  const { esc } = loadApp();
  assert.equal(esc(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(esc("a & b"), "a &amp; b");
  assert.equal(esc(null), "");
});

test("renderRanking: escapa el nombre del jugador (no inyecta HTML)", () => {
  const evil = '<script>alert(1)</script>';
  const app = withState({
    user: "Ana",
    players: [{ nombre: evil, group_predictions: {}, podium: null }],
    groupResults: {},
  });
  const html = app.renderRanking();
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("renderPodium: escapa nombre y pódium de otros jugadores", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: {}, podium: null },
      { nombre: "<b>x</b>", group_predictions: {}, podium: ['<i>A</i>', 'B', 'C'] },
    ],
    groupResults: {},
  });
  const html = app.renderPodium();
  assert.doesNotMatch(html, /<b>x<\/b>/);
  assert.doesNotMatch(html, /<i>A<\/i>/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});

// ─── renderChangelogBanner (novedades) ────────────────────────────────────────
const CL = [{ id: "2026-06-17", fecha: "2026-06-17", items: ["Novedad A", "Novedad B"] }];

test("renderChangelogBanner: muestra la última entrada si no se ha visto", () => {
  const app = withState({ changelog: CL });
  const html = app.renderChangelogBanner();
  assert.match(html, /changelog-banner/);
  assert.match(html, /Novedad A/);
  assert.match(html, /dismissChangelog\(\)/);
});

test("renderChangelogBanner: vacío si ya se vio esa entrada (localStorage)", () => {
  const app = loadApp({ localStorage: { porra_changelog_seen: "2026-06-17" } });
  Object.assign(app.S, { changelog: CL });
  assert.equal(app.renderChangelogBanner(), "");
});

test("renderChangelogBanner: vacío si no hay novedades", () => {
  const app = withState({ changelog: [] });
  assert.equal(app.renderChangelogBanner(), "");
});

test("dismissChangelog: marca como vista y oculta el banner", () => {
  const app = withState({
    user: "Ana",
    players: [{ nombre: "Ana", group_predictions: {}, podium: null }],
    changelog: CL,
  });
  assert.match(app.renderChangelogBanner(), /changelog-banner/); // visible antes
  app.window.dismissChangelog();
  assert.equal(app.renderChangelogBanner(), "");                 // oculto después
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

// ─── renderAdmin (dos pasos: gate → tareas) ─────────────────────────────────
test("renderAdmin: bloqueado muestra el formulario de acceso (clave + ENTRAR)", () => {
  const { renderAdmin } = loadApp(); // adminUnlocked = false por defecto
  const html = renderAdmin();
  assert.match(html, /Zona Admin/);
  assert.match(html, /id="adminKeyInput"/);
  assert.match(html, /doAdminLogin\(\)/);
  assert.match(html, /ENTRAR/);
  // todavía no se ve la tarea del trigger
  assert.doesNotMatch(html, /doTriggerUpdate\(\)/);
});

test("renderAdmin: clave incorrecta muestra el error en el gate", () => {
  const app = loadApp();
  Object.assign(app.S, { adminGateError: true });
  assert.match(app.renderAdmin(), /Clave incorrecta/);
});

test("renderAdmin: desbloqueado muestra las tareas administrativas (trigger)", () => {
  const app = loadApp();
  Object.assign(app.S, { adminUnlocked: true });
  const html = app.renderAdmin();
  assert.match(html, /doTriggerUpdate\(\)/);
  assert.match(html, /Forzar actualización de resultados/);
  // ya no se ve el formulario de acceso
  assert.doesNotMatch(html, /id="adminKeyInput"/);
});

test("renderAdmin: desbloqueado refleja mensaje de éxito o error del trigger", () => {
  const ok = loadApp();
  Object.assign(ok.S, { adminUnlocked: true, adminTriggerMsg: "✅ disparada", adminTriggerOk: true });
  assert.match(ok.renderAdmin(), /admin-msg--ok/);

  const err = loadApp();
  Object.assign(err.S, { adminUnlocked: true, adminTriggerMsg: "❌ falló", adminTriggerOk: false });
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
