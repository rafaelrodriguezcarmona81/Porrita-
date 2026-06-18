"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./load-app.js");

const app = loadApp();
const { gPts, podiumBonus, fmtTime, tvChannel, fl, pill, card,
        GROUPS, GM, ALL_TEAMS, TOTAL_MATCHES, FLAGS, MATCH_TIMES, LA1_MATCHES } = app;

// ─── gPts (puntos de fase de grupos) ───────────────────────────────────────
test("gPts: 0 cuando no hay resultados", () => {
  assert.equal(gPts({ k1: "1", k2: "X" }, {}), 0);
});

test("gPts: suma 1 por cada acierto exacto", () => {
  const preds = { a: "1", b: "X", c: "2", d: "1" };
  const results = { a: "1", b: "2", c: "2", d: "1" }; // aciertos: a, c, d
  assert.equal(gPts(preds, results), 3);
});

test("gPts: ignora resultados sin pronóstico", () => {
  const preds = { a: "1" };
  const results = { a: "1", b: "X", c: "2" };
  assert.equal(gPts(preds, results), 1);
});

test("gPts: pronóstico que no coincide no puntúa", () => {
  assert.equal(gPts({ a: "1" }, { a: "2" }), 0);
});

test("gPts: pronóstico vacío/falsy no puntúa aunque coincida la clave", () => {
  // preds[k] es "" (falsy) -> no cuenta
  assert.equal(gPts({ a: "" }, { a: "" }), 0);
});

// ─── podiumBonus (bonus del pódium final) ───────────────────────────────────
test("podiumBonus: null si falta el pódium o el resultado final", () => {
  assert.equal(podiumBonus(null, ["A", "B", "C"]), 0);
  assert.equal(podiumBonus(["A", "B", "C"], null), 0);
  assert.equal(podiumBonus(null, null), 0);
});

test("podiumBonus: campeón acertado = 5 pts", () => {
  assert.equal(podiumBonus(["A", "x", "y"], ["A", "B", "C"]), 5);
});

test("podiumBonus: subcampeón acertado = 3 pts", () => {
  assert.equal(podiumBonus(["x", "B", "y"], ["A", "B", "C"]), 3);
});

test("podiumBonus: tercero acertado = 2 pts", () => {
  assert.equal(podiumBonus(["x", "y", "C"], ["A", "B", "C"]), 2);
});

test("podiumBonus: pódium perfecto = 10 pts", () => {
  assert.equal(podiumBonus(["A", "B", "C"], ["A", "B", "C"]), 10);
});

test("podiumBonus: posición importa (acertar equipo en puesto distinto no puntúa)", () => {
  assert.equal(podiumBonus(["B", "C", "A"], ["A", "B", "C"]), 0);
});

// ─── fl (bandera de equipo) ─────────────────────────────────────────────────
test("fl: devuelve la bandera de un equipo conocido", () => {
  assert.equal(fl("España"), "🇪🇸");
  assert.equal(fl("Brasil"), "🇧🇷");
});

test("fl: bandera blanca para equipo desconocido", () => {
  assert.equal(fl("Narnia"), "🏳️");
});

test("fl: hay una bandera para cada uno de los 48 equipos", () => {
  for (const team of ALL_TEAMS) {
    assert.notEqual(fl(team), "🏳️", `falta bandera para ${team}`);
  }
});

// ─── tvChannel (canal de TV en España) ──────────────────────────────────────
test("tvChannel: La 1 para partidos en abierto", () => {
  assert.equal(tvChannel("H_España_Cabo Verde"), "📺 La 1");
  assert.equal(tvChannel("A_México_Sudáfrica"), "📺 La 1");
});

test("tvChannel: DAZN para el resto", () => {
  assert.equal(tvChannel("A_Corea del Sur_Rep. Checa"), "🟣 DAZN");
  assert.equal(tvChannel("clave_inexistente"), "🟣 DAZN");
});

// ─── fmtTime (formato de fecha/hora del partido) ────────────────────────────
test("fmtTime: cadena vacía para clave desconocida", () => {
  assert.equal(fmtTime("no_existe"), "");
});

test("fmtTime: formatea 'Día dd/mm HH:MM'", () => {
  const out = fmtTime("A_México_Sudáfrica"); // 2026-06-11T21:00 CEST
  assert.match(out, /^(Dom|Lun|Mar|Mié|Jue|Vie|Sáb) 11\/06 21:00$/);
});

test("fmtTime: respeta minutos no enteros", () => {
  const out = fmtTime("K_Colombia_Portugal"); // 2026-06-28T01:30
  assert.match(out, /28\/06 01:30$/);
});

test("fmtTime: el día de la semana corresponde a la fecha mostrada (medianoche)", () => {
  // 2026-06-19T00:00 CEST = viernes. El bug calculaba el día en UTC
  // (2026-06-18T22:00Z = jueves), desfasado respecto a la fecha 19/06.
  const out = fmtTime("B_Canadá_Catar");
  assert.equal(out, "Vie 19/06 00:00");
});

// ─── pill / card (helpers de markup) ────────────────────────────────────────
test("pill: genera span con clase de color", () => {
  assert.equal(pill("3/5", "green"), '<span class="pill pill--green">3/5</span>');
  assert.equal(pill("X", "yellow"), '<span class="pill pill--yellow">X</span>');
});

test("pill: color por defecto azul si no se indica", () => {
  assert.equal(pill("hola"), '<span class="pill pill--blue">hola</span>');
});

test("card: envuelve el contenido en un div.card", () => {
  assert.equal(card("<p>x</p>"), '<div class="card"><p>x</p></div>');
});

// ─── isLocked (bloqueo 1h antes del saque) ──────────────────────────────────
test("isLocked: false para clave desconocida", () => {
  const { isLocked } = loadApp();
  assert.equal(isLocked("no_existe"), false);
});

test("isLocked: false cuando faltan más de 60 min", () => {
  const kickoff = Date.parse("2026-06-11T21:00:00+02:00");
  const { isLocked } = loadApp({ now: kickoff - 2 * 60 * 60 * 1000 }); // -2h
  assert.equal(isLocked("A_México_Sudáfrica"), false);
});

test("isLocked: true cuando faltan menos de 60 min", () => {
  const kickoff = Date.parse("2026-06-11T21:00:00+02:00");
  const { isLocked } = loadApp({ now: kickoff - 30 * 60 * 1000 }); // -30min
  assert.equal(isLocked("A_México_Sudáfrica"), true);
});

test("isLocked: true justo en el saque y después", () => {
  const kickoff = Date.parse("2026-06-11T21:00:00+02:00");
  assert.equal(loadApp({ now: kickoff }).isLocked("A_México_Sudáfrica"), true);
  assert.equal(loadApp({ now: kickoff + 9e6 }).isLocked("A_México_Sudáfrica"), true);
});

test("isLocked: true exactamente en el umbral de los 60 min", () => {
  const kickoff = Date.parse("2026-06-11T21:00:00+02:00");
  const { isLocked } = loadApp({ now: kickoff - 60 * 60 * 1000 }); // -60min exactos
  assert.equal(isLocked("A_México_Sudáfrica"), true);
});

// ─── Integridad de los datos del torneo ─────────────────────────────────────
test("datos: 12 grupos de 4 equipos = 48 equipos", () => {
  assert.equal(Object.keys(GROUPS).length, 12);
  for (const [g, teams] of Object.entries(GROUPS)) {
    assert.equal(teams.length, 4, `grupo ${g} no tiene 4 equipos`);
  }
  assert.equal(ALL_TEAMS.length, 48);
});

test("datos: no hay equipos repetidos", () => {
  assert.equal(new Set(ALL_TEAMS).size, ALL_TEAMS.length);
});

test("datos: 12 grupos x 6 partidos = 72 (TOTAL_MATCHES)", () => {
  const total = Object.values(GM).reduce((n, m) => n + m.length, 0);
  assert.equal(total, 72);
  assert.equal(TOTAL_MATCHES, 72);
  for (const [g, matches] of Object.entries(GM)) {
    assert.equal(matches.length, 6, `grupo ${g} no tiene 6 partidos`);
  }
});

test("datos: cada partido enfrenta a equipos del mismo grupo", () => {
  for (const [g, matches] of Object.entries(GM)) {
    for (const [home, away] of matches) {
      assert.ok(GROUPS[g].includes(home), `${home} no está en el grupo ${g}`);
      assert.ok(GROUPS[g].includes(away), `${away} no está en el grupo ${g}`);
      assert.notEqual(home, away, "un equipo no puede jugar contra sí mismo");
    }
  }
});

test("datos: cada partido tiene horario en MATCH_TIMES", () => {
  for (const [g, matches] of Object.entries(GM)) {
    for (const [home, away] of matches) {
      const key = `${g}_${home}_${away}`;
      assert.ok(MATCH_TIMES[key], `falta horario para ${key}`);
    }
  }
});

test("datos: las claves de LA1_MATCHES existen en el calendario", () => {
  for (const key of LA1_MATCHES) {
    assert.ok(MATCH_TIMES[key], `clave de La 1 sin horario: ${key}`);
  }
});

test("datos: cada equipo de FLAGS aparece en algún grupo", () => {
  for (const team of Object.keys(FLAGS)) {
    assert.ok(ALL_TEAMS.includes(team), `${team} tiene bandera pero no está en ningún grupo`);
  }
});
