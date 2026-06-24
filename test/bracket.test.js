"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

// fetch mock por substring (igual que data.test.js).
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

// Construye un set sintético de cruces KO + resultados para los tests de render.
// "Hoy" en los tests por defecto es 2026-06-15, así que usamos fechas lejanas
// (sin MATCH_TIMES → isLocked() devuelve false: editables).
function synthFixtures() {
  return {
    r16: [
      { key: "r16_España_Francia", home: "España", away: "Francia" },
      { key: "r16_Brasil_Argentina", home: "Brasil", away: "Argentina" },
    ],
    qf: [
      { key: "qf_España_Brasil", home: "España", away: "Brasil" },
    ],
  };
}

// ─── bracketPts ───────────────────────────────────────────────────────────────
test("bracketPts: 0 sin resultados KO (inerte en fase de grupos)", () => {
  const { bracketPts } = loadApp();
  assert.equal(bracketPts({ "r16_España_Francia": "España" }, {}), 0);
  assert.equal(bracketPts({ "r16_España_Francia": "España" }, null), 0);
});

test("bracketPts: suma ponderada por base por acertante en cada ronda", () => {
  const { bracketPts } = loadApp();
  const preds = {
    "r16_España_Francia": "España",   // r16 base 4 — acierto
    "r16_Brasil_Argentina": "Brasil", // r16 base 4 — acierto
    "qf_España_Brasil": "España",     // qf base 8 — acierto
  };
  const koResults = {
    "r16_España_Francia": "España",
    "r16_Brasil_Argentina": "Brasil",
    "qf_España_Brasil": "España",
  };
  assert.equal(bracketPts(preds, koResults), 4 + 4 + 8);
});

test("bracketPts: ignora los picks erróneos", () => {
  const { bracketPts } = loadApp();
  const preds = {
    "r16_España_Francia": "Francia",  // fallo
    "qf_España_Brasil": "España",     // acierto base 8
  };
  const koResults = {
    "r16_España_Francia": "España",
    "qf_España_Brasil": "España",
  };
  assert.equal(bracketPts(preds, koResults), 8);
});

test("bracketPts: ignora claves con ronda desconocida", () => {
  const { bracketPts } = loadApp();
  const preds = { "zzz_A_B": "A", "r16_A_B": "A" };
  const koResults = { "zzz_A_B": "A", "r16_A_B": "A" };
  assert.equal(bracketPts(preds, koResults), 4); // solo cuenta r16
});

test("bracketPts: tolera entradas vacías/ausentes", () => {
  const { bracketPts } = loadApp();
  assert.equal(bracketPts({}, {}), 0);
  assert.equal(bracketPts(null, null), 0);
  assert.equal(bracketPts(undefined, { "r16_A_B": "A" }), 0);
});

test("bracketPts: cada ronda usa su propia base (final=32)", () => {
  const { bracketPts, KO_ROUNDS } = loadApp();
  const finalBase = KO_ROUNDS.find((r) => r.key === "final").base;
  assert.equal(finalBase, 32);
  assert.equal(
    bracketPts({ "final_España_Brasil": "España" }, { "final_España_Brasil": "España" }),
    32
  );
});

// ─── renderBracket ──────────────────────────────────────────────────────────
test("renderBracket: estado bloqueado/vacío sin cruces", () => {
  const app = loadApp();
  Object.assign(app.S, { user: "Ana", players: [{ nombre: "Ana", bracket_predictions: {} }], koFixtures: {}, koResults: {} });
  const html = app.renderBracket();
  assert.match(html, /El cuadro se desbloqueará/);
  // Muestra la lista de rondas con sus bases como info.
  assert.match(html, /Dieciseisavos/);
  assert.match(html, /Base 32pts/); // Gran Final
});

test("renderBracket: pinta rondas y picks guardados cuando hay cruces", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: { "r16_España_Francia": "España" } }],
    koFixtures: synthFixtures(),
    koResults: {},
  });
  const html = app.renderBracket();
  assert.match(html, /Octavos/);
  assert.match(html, /Cuartos/);
  // El pick guardado aparece marcado como seleccionado.
  assert.match(html, /bracket-pick--sel/);
  // Hay botones de elección de equipo.
  assert.match(html, /setBracketPick/);
});

test("renderBracket: marca acierto y fallo cuando hay resultados KO", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: { "r16_España_Francia": "España", "r16_Brasil_Argentina": "Argentina" } }],
    koFixtures: synthFixtures(),
    koResults: { "r16_España_Francia": "España", "r16_Brasil_Argentina": "Brasil" },
  });
  const html = app.renderBracket();
  assert.match(html, /bracket-pick--correct/); // España acertado
  assert.match(html, /bracket-pick--wrong/);   // Argentina fallado
  assert.match(html, /\+4✓/);                  // badge de acierto con base r16
});

test("renderBracket: escapa los nombres de equipo", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    koFixtures: { r16: [{ key: "r16_<b>X</b>_Y", home: "<b>X</b>", away: "Y" }] },
    koResults: {},
  });
  const html = app.renderBracket();
  assert.ok(!html.includes("<b>X</b>"), "no debe inyectar HTML sin escapar");
  assert.match(html, /&lt;b&gt;X&lt;\/b&gt;/);
});

// ─── saveBracket ────────────────────────────────────────────────────────────
test("saveBracket: PATCH de bracket_predictions con JWT y limpia el estado", async () => {
  const app = loadApp({
    fetch: routedFetch([
      ["porra_jugadores", []],
      ["results.json", { results: {}, scores: {} }],
    ]),
  });
  Object.assign(app.S, {
    user: "Ana",
    userId: "U1",
    players: [],
    pendingBracket: { "r16_España_Francia": "España" },
    savingBracket: true,
  });
  await app.saveBracket({ "r16_España_Francia": "España" });
  const patch = app.fetchCalls.find((c) => c.options && c.options.method === "PATCH");
  const body = JSON.parse(patch.options.body);
  assert.deepEqual(body.bracket_predictions, { "r16_España_Francia": "España" });
  assert.ok(body.updated_at, "debe sellar updated_at");
  assert.match(patch.options.headers["Authorization"], /^Bearer /);
  assert.match(patch.url, /user_id=eq\.U1/);
  assert.equal(app.S.savingBracket, false);
  assert.deepEqual(app.S.pendingBracket, {});
});

// ─── ranking integra los puntos del cuadro ───────────────────────────────────
test("renderRanking: un jugador con aciertos en el cuadro suma esos puntos al total", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [
      { nombre: "Ana", group_predictions: {}, podium: null, bracket_predictions: { "r16_España_Francia": "España" } },
      { nombre: "Beto", group_predictions: {}, podium: null, bracket_predictions: {} },
    ],
    groupResults: {},
    koResults: { "r16_España_Francia": "España" }, // Ana acierta r16 (base 4)
  });
  const html = app.renderRanking();
  // Ana debe mostrar "Bracket: 4pts" y total 4.
  assert.match(html, /Bracket: 4pts/);
  assert.match(html, /Bracket: 0pts/);
  // El total de Ana (4) aparece como número de puntos.
  assert.match(html, /rank-total-num">4</);
});
