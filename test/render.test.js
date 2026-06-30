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

// ─── renderAccessDenied / routing de acceso ──────────────────────────────────
test("renderAccessDenied: pantalla de invitación requerida con el mensaje de error", () => {
  const app = withState({ accessDenied: true, accessError: "Tu invitación no es válida o ha caducado." });
  const html = app.renderAccessDenied();
  assert.match(html, /Necesitas invitación/);
  assert.match(html, /caducado/);
  assert.match(html, /doLogout\(\)/);
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

test("renderPodium: un nombre vacío no rompe el render (inicial de respaldo)", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: {}, podium: null },
      { nombre: "", group_predictions: {}, podium: null },
    ],
    groupResults: {},
  });
  assert.doesNotThrow(() => app.renderPodium());
  assert.match(app.renderPodium(), /class="avatar">\?</); // inicial de respaldo
});

// ─── renderToday (pestaña "Hoy") ───────────────────────────────────────────────
// El 15/06/2026 (CEST) tienen partido: E_Costa de Marfil_Ecuador (01:00, DAZN),
// F_Suecia_Túnez (04:00, DAZN), H_España_Cabo Verde (18:00, La 1) y
// G_Bélgica_Egipto (21:00, DAZN).
test("renderToday: lista los partidos de hoy con canal de TV", () => {
  const app = withState({ user: "Ana", players: [] },
    { now: Date.parse("2026-06-15T12:00:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /Partidos de hoy/);
  // equipos del día (con su bandera)
  assert.match(html, /España/);
  assert.match(html, /Cabo Verde/);
  assert.match(html, /Bélgica/);
  assert.match(html, /Egipto/);
  // canal: España va por La 1; los demás por DAZN
  assert.match(html, /📺 La 1/);
  assert.match(html, /🟣 DAZN/);
  // cada partido indica de qué grupo es (España→H, Bélgica→G)
  assert.match(html, /today-group">Grupo H</);
  assert.match(html, /today-group">Grupo G</);
  // un partido de otro día NO debe aparecer
  assert.doesNotMatch(html, /Inglaterra/); // L_Inglaterra_Croacia es 17/06
});

test("renderToday: es solo informativa (sin botones de apuesta)", () => {
  const app = withState({ user: "Ana", players: [] },
    { now: Date.parse("2026-06-15T12:00:00+02:00") });
  const html = app.renderToday();
  assert.doesNotMatch(html, /class="pick/);   // sin botones 1/X/2
  assert.doesNotMatch(html, /setPred\(/);      // sin handler de apuesta
});

// Caso de borde: partido a primera hora (L_Ghana_Panamá a las 01:00 CEST del 18/06)
// debe asignarse al 18, no al día anterior por la zona horaria.
test("renderToday: asigna correctamente partidos de madrugada al día CEST", () => {
  const app = withState({ user: "Ana", players: [] },
    { now: Date.parse("2026-06-18T12:00:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /Ghana/);
  assert.match(html, /Panamá/);
});

test("renderToday: muestra el marcador si el partido ya tiene resultado", () => {
  const app = withState(
    { user: "Ana", players: [], groupScores: { "L_Ghana_Panamá": "2-0" } },
    { now: Date.parse("2026-06-18T12:00:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /today-score">2-0</);   // marcador en el centro
});

test("renderToday: sin resultado muestra 'vs' en vez de marcador", () => {
  const app = withState({ user: "Ana", players: [], groupScores: {} },
    { now: Date.parse("2026-06-18T12:00:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /today-vs">vs</);
  assert.doesNotMatch(html, /today-score/);
});

test("renderToday: estado vacío cuando no hay partidos hoy", () => {
  const app = withState({ user: "Ana", players: [] },
    { now: Date.parse("2026-07-08T12:00:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /No hay partidos hoy/);
  assert.doesNotMatch(html, /today-match/);
});

// ─── renderTuJornada ("Tu jornada", resumen diario) ──────────────────────────
// El 18/06/2026 (CEST) juegan: A_Rep. Checa_Sudáfrica, B_Suiza_Bosnia y Herc.,
// K_Uzbekistán_Colombia y L_Ghana_Panamá.
const J_DATE = "2026-06-18T12:00:00+02:00";
const J_KEYS = ["A_Rep. Checa_Sudáfrica", "B_Suiza_Bosnia y Herc.", "K_Uzbekistán_Colombia", "L_Ghana_Panamá"];

test("renderTuJornada: cuenta aciertos y puntos de hoy (solo partidos con resultado oficial)", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: {
        "A_Rep. Checa_Sudáfrica": "1",   // acierta
        "B_Suiza_Bosnia y Herc.": "2",   // falla
        "L_Ghana_Panamá": "1",           // acierta pero SIN resultado oficial → no cuenta
      } }],
      // Solo 2 de los 4 partidos de hoy tienen resultado oficial.
      groupResults: { "A_Rep. Checa_Sudáfrica": "1", "B_Suiza_Bosnia y Herc.": "X" },
      rankChange: null,
    },
    { now: Date.parse(J_DATE) });
  const html = app.renderTuJornada(J_KEYS);
  assert.match(html, /Tu jornada/);
  // 1 acierto de 2 jugados; 1 punto.
  assert.match(html, /1\/2/);                       // aciertos hoy
  assert.match(html, /tujornada-num">1<\/p><p class="tujornada-lbl">Puntos hoy/);
  // El pill resume cuántas apuestas del día llevas hechas (3 de 4).
  assert.match(html, /3\/4 apuestas/);
});

test("renderTuJornada: el jugador sin pronósticos de hoy obtiene 0 aciertos / 0 puntos", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: {} }],
      groupResults: { "A_Rep. Checa_Sudáfrica": "1" },
      rankChange: null,
    },
    { now: Date.parse(J_DATE) });
  const html = app.renderTuJornada(J_KEYS);
  assert.match(html, /0\/1/);                        // 0 aciertos de 1 jugado
  assert.match(html, /tujornada-num">0<\/p><p class="tujornada-lbl">Puntos hoy/);
});

test("renderTuJornada: con todas las apuestas de hoy hechas muestra el estado OK", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: {
        "A_Rep. Checa_Sudáfrica": "1",
        "B_Suiza_Bosnia y Herc.": "X",
        "K_Uzbekistán_Colombia": "2",
        "L_Ghana_Panamá": "1",
      } }],
      groupResults: {},
    },
    { now: Date.parse(J_DATE) });
  const html = app.renderTuJornada(J_KEYS);
  assert.match(html, /tujornada-status--ok/);
  assert.match(html, /todas tus apuestas de hoy hechas/);
  assert.match(html, /4\/4 apuestas/);
});

test("renderTuJornada: si faltan apuestas y los partidos siguen abiertos, avisa", () => {
  // A medianoche del día de la jornada ningún partido está bloqueado todavía.
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: { "A_Rep. Checa_Sudáfrica": "1" } }],
      groupResults: {},
    },
    { now: Date.parse("2026-06-18T00:01:00+02:00") });
  const html = app.renderTuJornada(J_KEYS);
  assert.match(html, /tujornada-status--warn/);
  assert.match(html, /Te faltan \d+ por pronosticar/);
});

test("renderTuJornada: si faltan apuestas pero los partidos ya cerraron, estado neutro", () => {
  // Tarde-noche del día de la jornada: los partidos ya arrancaron → bloqueados.
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: { "A_Rep. Checa_Sudáfrica": "1" } }],
      groupResults: {},
    },
    { now: Date.parse("2026-06-18T23:59:00+02:00") });
  const html = app.renderTuJornada(J_KEYS);
  assert.doesNotMatch(html, /tujornada-status--warn/);
  assert.match(html, /sin pronosticar/);
});

test("renderTuJornada: mensaje neutral si aún no hay resultados oficiales de hoy", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: { "A_Rep. Checa_Sudáfrica": "1" } }],
      groupResults: {},   // ningún partido de hoy tiene resultado
      rankChange: null,
    },
    { now: Date.parse(J_DATE) });
  const html = app.renderTuJornada(J_KEYS);
  assert.match(html, /Aún no hay resultados oficiales de hoy/);
  assert.doesNotMatch(html, /Aciertos hoy/);
});

test("renderToday: incluye el bloque 'Tu jornada' por encima de la lista de partidos", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", group_predictions: { "A_Rep. Checa_Sudáfrica": "1" } }],
      groupResults: { "A_Rep. Checa_Sudáfrica": "1" },
      groupScores: { "A_Rep. Checa_Sudáfrica": "2-0" },
      rankChange: null,
    },
    { now: Date.parse(J_DATE) });
  const html = app.renderToday();
  assert.match(html, /Tu jornada/);
  assert.match(html, /Partidos de hoy/);
  // El resumen va antes que la lista de partidos.
  assert.ok(html.indexOf("Tu jornada") < html.indexOf("Partidos de hoy"));
});


test("renderTuJornada: cuenta aciertos y puntos de eliminatorias de hoy", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", bracket_predictions: { "r32_M76": "Brasil", "r32_M74": "Alemania" } }],
      koResults: { "r32_M76": "Brasil", "r32_M74": "Marruecos" },
    },
    { now: Date.parse("2026-06-29T23:30:00+02:00") });
  const html = app.renderTuJornada(["r32_M76", "r32_M74"]);
  assert.match(html, /1\/2/);
  assert.match(html, /tujornada-num">2<\/p><p class="tujornada-lbl">Puntos hoy/);
  assert.doesNotMatch(html, /Aún no hay resultados oficiales de hoy/);
});

test("renderToday: incluye eliminatorias de hoy y marca acierto/fallo", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", bracket_predictions: { "r32_M76": "Brasil", "r32_M74": "Alemania" } }],
      koFixtures: { r32: [
        { key: "r32_M76", home: "Brasil", away: "Japón" },
        { key: "r32_M74", home: "Alemania", away: "Marruecos" },
      ] },
      koResults: { "r32_M76": "Brasil", "r32_M74": "Marruecos" },
    },
    { now: Date.parse("2026-06-29T23:30:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /Dieciseisavos · M76/);
  assert.match(html, /Dieciseisavos · M74/);
  assert.match(html, /Pasa 🇧🇷 Brasil/);
  assert.match(html, /badge--correct/);
  assert.match(html, /badge--wrong/);
  assert.match(html, /1\/2/);
});


test("renderToday: un resultado KO oficial cuenta aunque no haya pronóstico", () => {
  const app = withState(
    {
      user: "Ana",
      players: [{ nombre: "Ana", bracket_predictions: {} }],
      koFixtures: { r32: [{ key: "r32_M76", home: "Brasil", away: "Japón" }] },
      koResults: { "r32_M76": "Brasil" },
    },
    { now: Date.parse("2026-06-29T21:30:00+02:00") });
  const html = app.renderToday();
  assert.match(html, /0\/1/);
  assert.match(html, /Pasa 🇧🇷 Brasil/);
  assert.doesNotMatch(html, /0\/0 apuestas/);
  assert.doesNotMatch(html, /Tienes todas tus apuestas de hoy hechas/);
  assert.doesNotMatch(html, /Aún no hay resultados oficiales de hoy/);
});

test("renderHeader: incluye la pestaña Hoy como primera", () => {
  const app = withState({ user: "Ana", players: [], groupResults: {} });
  const html = app.renderHeader();
  assert.match(html, /setTab\('hoy'\)/);
  assert.match(html, /📅 Hoy/);
  // "hoy" debe ir antes que "grupos" en la barra de pestañas
  assert.ok(html.indexOf("setTab('hoy')") < html.indexOf("setTab('grupos')"));
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

test("renderRanking: empate en puntos comparte puesto (1, 2, 2, 4) y marca 'empate'", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: { "k1": "1", "k2": "1" }, podium: null }, // 2 pts
      { nombre: "Beto", group_predictions: { "k1": "1" }, podium: null },           // 1 pt (empata con Caro)
      { nombre: "Caro", group_predictions: { "k2": "1" }, podium: null },           // 1 pt (empata con Beto)
      { nombre: "Dani", group_predictions: {}, podium: null },                      // 0 pts
    ],
    groupResults: { "k1": "1", "k2": "1" },
  });
  const html = app.renderRanking();
  // Ana es 1ª con medalla de oro.
  assert.match(html, /🥇/);
  // Los dos empatados a 1 pt comparten el puesto 2 (medalla de plata, no hay un "3.").
  const platas = (html.match(/🥈/g) || []).length;
  assert.equal(platas, 2, "los dos empatados a 1pt deben compartir la plata");
  assert.ok(!html.includes("🥉"), "no debe haber bronce: el bronce se 'salta' por el empate");
  // El siguiente (0 pts) cae al puesto 4.
  assert.match(html, /4\./);
  // Las filas empatadas se marcan visualmente.
  assert.equal((html.match(/rank-tie/g) || []).length >= 2, true);
  assert.match(html, /rank-row--tie/);
});

test("renderRanking: todos a 0 puntos no muestran medallas ni empate (puesto numérico)", () => {
  const app = withState({
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: {}, podium: null },
      { nombre: "Beto", group_predictions: {}, podium: null },
    ],
    groupResults: {},
  });
  const html = app.renderRanking();
  assert.ok(!html.includes("🥇"), "sin puntos no se reparten medallas");
  assert.ok(!html.includes("rank-tie"), "sin puntos no se marca empate");
  assert.match(html, /1\./);
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
  const app = withState({ loading: false, user: null, accessDenied: false });
  app.render();
  assert.match(app.appEl.innerHTML, /class="login-btn"/);
});

test("render: sin usuario y con accessDenied pinta la pantalla de invitación", () => {
  const app = withState({ loading: false, user: null, accessDenied: true });
  app.render();
  assert.match(app.appEl.innerHTML, /Necesitas invitación/);
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

// ─── isKOPhase / navegación adaptativa ───────────────────────────────────────
const KO_FIXTURES_SAMPLE = {
  "r32_M73": { key: "r32_M73", home: "Sudáfrica", away: "Canadá" },
  "r32_M74": { key: "r32_M74", home: "Alemania", away: "Paraguay" },
};

test("isKOPhase: devuelve false cuando koFixtures está vacío (fase de grupos)", () => {
  const app = withState({ koFixtures: {} });
  assert.equal(app.isKOPhase(), false);
});

test("isKOPhase: devuelve true cuando hay cruces concretos (fase KO)", () => {
  const app = withState({ koFixtures: KO_FIXTURES_SAMPLE });
  assert.equal(app.isKOPhase(), true);
});

test("renderHeader (fase grupos): 'Grupos' aparece antes que 'Cuadro' y sin clase tab--hist", () => {
  const app = withState({
    user: "Ana", players: [], groupResults: {},
    koFixtures: {}, // fase de grupos
  });
  const html = app.renderHeader();
  // "Grupos" no lleva clase histórico
  assert.doesNotMatch(html, /tab--hist/);
  // "Grupos" aparece antes que "Cuadro" en el HTML
  assert.ok(html.indexOf("setTab('grupos')") < html.indexOf("setTab('bracket')"),
    "'Grupos' debe ir antes que 'Cuadro' en fase de grupos");
  // La etiqueta de "Grupos" no menciona histórico
  assert.match(html, /⚽ Grupos/);
  assert.doesNotMatch(html, /hist/i);
});

test("renderHeader (fase KO): 'Cuadro' aparece antes que 'Grupos' y 'Grupos' lleva tab--hist", () => {
  const app = withState({
    user: "Ana", players: [], groupResults: {},
    koFixtures: KO_FIXTURES_SAMPLE, // fase KO
  });
  const html = app.renderHeader();
  // "Cuadro" debe preceder a "Grupos"
  assert.ok(html.indexOf("setTab('bracket')") < html.indexOf("setTab('grupos')"),
    "'Cuadro' debe ir antes que 'Grupos' en fase KO");
  // La pestaña de "Grupos" lleva la clase histórico
  assert.match(html, /tab--hist/);
  // La etiqueta indica que es histórico
  assert.match(html, /Grupos \(hist\.\)/);
});

test("renderHeader (fase KO): 'Cuadro' activo no lleva tab--hist", () => {
  const app = withState({
    user: "Ana", players: [], groupResults: {},
    koFixtures: KO_FIXTURES_SAMPLE,
    tab: "bracket",
  });
  const html = app.renderHeader();
  // El botón activo es "bracket" con tab--active pero sin tab--hist
  assert.match(html, /setTab\('bracket'\)" class="tab tab--active"/);
  // "Grupos" lleva tab--hist pero no tab--active
  assert.match(html, /tab--hist/);
  assert.doesNotMatch(html, /tab--active tab--hist|tab--hist tab--active/);
});
