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

// Construye un set sintético de cruces KO concretos (precedencia sobre la
// resolución) para los tests de render. Usa las claves ESTABLES de la plantilla
// (KO_BRACKET: "{RONDA}_M{n}"). "Hoy" en los tests por defecto es 2026-06-15, y
// estas claves no están en MATCH_TIMES → isLocked() devuelve false (editables).
function synthFixtures() {
  return {
    r32: [
      { key: "r32_M73", home: "España", away: "Francia" },
      { key: "r32_M74", home: "Brasil", away: "Argentina" },
    ],
    r16: [
      { key: "r16_M89", home: "España", away: "Brasil" },
    ],
  };
}

// Fila de clasificación sintética con un grupo "terminado" (4 equipos, mp=3).
function row(team, pts, gd = 0, gf = 0) {
  return { team, mp: 3, w: 0, d: 0, l: 0, gf, ga: 0, gd, pts };
}
// Grupo completo de 4 equipos, ya ordenado 1º..4º.
function fullGroup(t1, t2, t3, t4) {
  return [row(t1, 9, 9, 9), row(t2, 6, 3, 3), row(t3, 3, 0, 1), row(t4, 0, -9, 0)];
}
// 12 grupos A..L completos; el 3º de cada grupo es "3<Letra>" (determinista).
// El "pts" del 3º decrece por grupo para que el ranking de terceros sea estable.
function full12Standings() {
  const letters = "ABCDEFGHIJKL".split("");
  const st = {};
  letters.forEach((g, i) => {
    st[g] = [
      row("1" + g, 9, 9, 9),
      row("2" + g, 6, 3, 3),
      row("3" + g, 5 - i * 0.0, 3, 12 - i), // mismo pts, desempata por GF (12-i)
      row("4" + g, 0, -9, 0),
    ];
  });
  return st;
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
    players: [{ nombre: "Ana", bracket_predictions: { "r32_M73": "España" } }],
    koFixtures: synthFixtures(),
    koResults: {},
  });
  const html = app.renderBracket();
  assert.match(html, /Dieciseisavos/);
  assert.match(html, /Octavos/);
  // El pick guardado aparece marcado como seleccionado.
  assert.match(html, /bracket-pick--sel/);
  // Hay botones de elección de equipo.
  assert.match(html, /setBracketPick/);
});

test("renderBracket: marca acierto y fallo cuando hay resultados KO", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: { "r32_M73": "España", "r32_M74": "Argentina" } }],
    koFixtures: synthFixtures(),
    koResults: { "r32_M73": "España", "r32_M74": "Brasil" },
  });
  const html = app.renderBracket();
  assert.match(html, /bracket-pick--correct/); // España acertado
  assert.match(html, /bracket-pick--wrong/);   // Argentina fallado
  assert.match(html, /\+2✓/);                  // badge de acierto con base r32
});

test("renderBracket: escapa los nombres de equipo", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    koFixtures: { r32: [{ key: "r32_M73", home: "<b>X</b>", away: "Y" }] },
    koResults: {},
  });
  const html = app.renderBracket();
  assert.ok(!html.includes("<b>X</b>"), "no debe inyectar HTML sin escapar");
  assert.match(html, /&lt;b&gt;X&lt;\/b&gt;/);
});

test("renderBracket: muestra resueltos desde standings completos y pendiente sin terminar", () => {
  const app = loadApp();
  // Solo el grupo A está completo → su 2º (hueco de M73, 2A vs 2B) sigue pendiente
  // porque 2B no está; pero un partido cuyos dos huecos sean del grupo A no existe.
  // Completamos A y B para resolver M73 (2A vs 2B) y dejamos el resto pendiente.
  const standings = {
    A: fullGroup("Aa", "Ab", "Ac", "Ad"),
    B: fullGroup("Ba", "Bb", "Bc", "Bd"),
  };
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    groupStandings: standings,
    koFixtures: {},
    koResults: {},
  });
  const html = app.renderBracket();
  // M73 = 2A vs 2B resuelto → nombres concretos + botones.
  assert.match(html, /Ab/);
  assert.match(html, /Bb/);
  assert.match(html, /setBracketPick/);
  // Algún hueco pendiente (terceros / grupos sin terminar).
  assert.match(html, /bracket-pending|pendiente|Pendiente|3º|Grupo/);
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

// ─── KO_BRACKET (plantilla oficial) ──────────────────────────────────────────
test("KO_BRACKET: cuenta de partidos por ronda (16/8/4/2/1/1)", () => {
  const { KO_BRACKET } = loadApp();
  const byRound = {};
  for (const b of KO_BRACKET) byRound[b.round] = (byRound[b.round] || 0) + 1;
  assert.equal(byRound.r32, 16);
  assert.equal(byRound.r16, 8);
  assert.equal(byRound.qf, 4);
  assert.equal(byRound.sf, 2);
  assert.equal(byRound.third, 1);
  assert.equal(byRound.final, 1);
  assert.equal(KO_BRACKET.length, 32);
});

test("KO_BRACKET: claves y nº de partido únicos y prefijo de ronda correcto", () => {
  const { KO_BRACKET } = loadApp();
  const keys = new Set(), ms = new Set();
  for (const b of KO_BRACKET) {
    assert.ok(!keys.has(b.key), "clave duplicada " + b.key);
    keys.add(b.key);
    assert.ok(!ms.has(b.m), "nº de partido duplicado " + b.m);
    ms.add(b.m);
    assert.equal(b.key.split("_")[0], b.round, "el prefijo de la clave debe ser la ronda");
    assert.equal(b.key, b.round + "_M" + b.m);
  }
  // Numeración oficial M73..M104.
  assert.equal(Math.min(...ms), 73);
  assert.equal(Math.max(...ms), 104);
});

test("KO_BRACKET: matchWinner/matchLoser apuntan a partidos anteriores reales", () => {
  const { KO_BRACKET } = loadApp();
  const byM = {};
  for (const b of KO_BRACKET) byM[b.m] = b;
  for (const b of KO_BRACKET) {
    for (const s of [b.home, b.away]) {
      if (s.type === "matchWinner" || s.type === "matchLoser") {
        assert.ok(byM[s.match], "referencia a partido inexistente M" + s.match);
        assert.ok(s.match < b.m, "M" + b.m + " referencia a M" + s.match + " que no es anterior");
      }
    }
  }
});

test("KO_BRACKET: las bases de cada ronda coinciden con KO_ROUNDS", () => {
  const { KO_BRACKET, KO_ROUNDS } = loadApp();
  const base = {};
  for (const r of KO_ROUNDS) base[r.key] = r.base;
  // Las rondas usadas por la plantilla están todas en KO_ROUNDS.
  for (const b of KO_BRACKET) assert.ok(base[b.round] != null, "ronda desconocida " + b.round);
  assert.deepEqual(
    { r32: base.r32, r16: base.r16, qf: base.qf, sf: base.sf, third: base.third, final: base.final },
    { r32: 2, r16: 4, qf: 8, sf: 16, third: 24, final: 32 }
  );
});

// ─── resolveBracketTeams ──────────────────────────────────────────────────────
test("resolveBracketTeams: estado parcial — grupos terminados resuelven 1º/2º, otros pendientes", () => {
  const { resolveBracketTeams } = loadApp();
  const standings = {
    A: fullGroup("Aa", "Ab", "Ac", "Ad"),
    B: fullGroup("Ba", "Bb", "Bc", "Bd"),
    // C incompleto: un equipo con mp<3.
    C: [row("Ca", 6), row("Cb", 3), { team: "Cc", mp: 1, pts: 1, gd: 0, gf: 0 }, row("Cd", 0)],
  };
  const out = resolveBracketTeams(standings, {}, {});
  // M73 = 2A vs 2B → ambos resueltos.
  assert.equal(out.r32_M73.home, "Ab");
  assert.equal(out.r32_M73.away, "Bb");
  // M75 = 1F vs 2C → F ausente y C incompleto → ambos null.
  assert.equal(out.r32_M75.home, null);
  assert.equal(out.r32_M75.away, null);
  // M79 home = 1A (resuelto), away = tercero (pendiente: 12 grupos no completos).
  assert.equal(out.r32_M79.home, "Aa");
  assert.equal(out.r32_M79.away, null);
});

test("resolveBracketTeams: terceros pendientes hasta que TODOS los grupos terminen", () => {
  const { resolveBracketTeams, KO_BRACKET } = loadApp();
  // 11 grupos completos, falta L → ningún hueco de tercero debe resolverse.
  const st = full12Standings();
  st.L = [row("1L", 9), row("2L", 6), { team: "3L", mp: 2, pts: 3, gd: 0, gf: 0 }, row("4L", 0)];
  const out = resolveBracketTeams(st, {}, {});
  for (const b of KO_BRACKET) {
    for (const side of ["home", "away"]) {
      if (b[side].type === "third") assert.equal(out[b.key][side], null, b.key + " tercero no debe resolverse");
    }
  }
});

test("resolveBracketTeams: 12 grupos completos — 1º/2º resueltos y 8 terceros asignados a huecos válidos", () => {
  const { resolveBracketTeams, KO_BRACKET } = loadApp();
  const st = full12Standings();
  const out = resolveBracketTeams(st, {}, {});
  // 1º/2º resueltos en todos los huecos de grupo.
  for (const b of KO_BRACKET) {
    for (const side of ["home", "away"]) {
      const s = b[side];
      if (s.type === "winner") assert.equal(out[b.key][side], "1" + s.group);
      if (s.type === "runner") assert.equal(out[b.key][side], "2" + s.group);
    }
  }
  // Recogemos las asignaciones de tercero y validamos que cada una cae en un hueco
  // cuyo conjunto candidato incluye el grupo del tercero, y que los 8 están puestos.
  const assigned = [];
  for (const b of KO_BRACKET) {
    for (const side of ["home", "away"]) {
      if (b[side].type === "third") {
        const team = out[b.key][side];
        assert.ok(team != null, "hueco de tercero sin asignar " + b.key);
        const grp = team.slice(1); // "3X" → "X"
        assert.ok(b[side].groups.includes(grp), team + " no pertenece al conjunto candidato de " + b.key);
        assigned.push(team);
      }
    }
  }
  assert.equal(assigned.length, 8, "deben asignarse 8 huecos de tercero");
  assert.equal(new Set(assigned).size, 8, "cada tercero se asigna a un único hueco");
});

test("resolveBracketTeams: koResults propaga ganadores/perdedores a rondas siguientes", () => {
  const { resolveBracketTeams } = loadApp();
  const st = full12Standings();
  // Resolvemos M74 y M77 (ambos huecos de M89 = W74,W77).
  // M74 = 1E vs mejor-3º; M77 = 1I vs mejor-3º. Tomamos sus equipos resueltos.
  const base = resolveBracketTeams(st, {}, {});
  const koResults = {
    [base.r32_M74.key]: base.r32_M74.home, // gana 1E
    [base.r32_M77.key]: base.r32_M77.home, // gana 1I
  };
  const out = resolveBracketTeams(st, koResults, {});
  // M89 = W74 vs W77.
  assert.equal(out.r16_M89.home, base.r32_M74.home);
  assert.equal(out.r16_M89.away, base.r32_M77.home);
  // matchLoser: M103 = perdedor M101 vs perdedor M102.
  const out2 = resolveBracketTeams(st, {
    ...koResults,
    sf_M101: "GANA101",
  }, {
    // damos cruce concreto a M101 para poder calcular su perdedor
    sf: [{ key: "sf_M101", home: "GANA101", away: "PIERDE101" }],
  });
  assert.equal(out2.third_M103.home, "PIERDE101"); // perdedor de M101
});

test("resolveBracketTeams: koFixtures (cruces concretos) tienen precedencia sobre lo calculado", () => {
  const { resolveBracketTeams } = loadApp();
  const st = full12Standings();
  // Sin override, M73 = 2A vs 2B.
  const plain = resolveBracketTeams(st, {}, {});
  assert.equal(plain.r32_M73.home, "2A");
  // Con override explícito, gana el dato.
  const out = resolveBracketTeams(st, {}, {
    r32: [{ key: "r32_M73", home: "Override1", away: "Override2" }],
  });
  assert.equal(out.r32_M73.home, "Override1");
  assert.equal(out.r32_M73.away, "Override2");
});

// ─── KO_SCHEDULE (calendario oficial: fecha/hora/sede) ────────────────────────
test("KO_SCHEDULE: una entrada por cada partido 73..104 con utc y venue", () => {
  const { KO_SCHEDULE } = loadApp();
  for (let m = 73; m <= 104; m++) {
    const e = KO_SCHEDULE[m];
    assert.ok(e, "falta entrada para M" + m);
    assert.ok(typeof e.utc === "string" && /\dT.*Z$/.test(e.utc), "M" + m + " utc inválido");
    assert.ok(typeof e.venue === "string" && e.venue.length > 0, "M" + m + " venue inválido");
    assert.ok(!Number.isNaN(new Date(e.utc).getTime()), "M" + m + " utc no parseable");
  }
  // No debe haber entradas espurias fuera del rango.
  const nums = Object.keys(KO_SCHEDULE).map(Number);
  assert.equal(Math.min(...nums), 73);
  assert.equal(Math.max(...nums), 104);
  assert.equal(nums.length, 32);
});

// ─── fmtKO (conversión a CEST con estilo de fmtTime) ──────────────────────────
// Calculamos el render esperado de forma INDEPENDIENTE: tomamos el instante UTC
// del KO_SCHEDULE, le sumamos 2h (CEST = UTC+2) y formateamos en componentes UTC.
function expectedCEST(utcStr) {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const pad = (n) => String(n).padStart(2, "0");
  const c = new Date(new Date(utcStr).getTime() + 2 * 60 * 60 * 1000);
  return days[c.getUTCDay()] + " " + pad(c.getUTCDate()) + "/" + pad(c.getUTCMonth() + 1) +
    " " + pad(c.getUTCHours()) + ":" + pad(c.getUTCMinutes());
}

test("fmtKO: M73 (12:00 UTC-7) → Dom 28/06 21:00 CEST", () => {
  const { fmtKO } = loadApp();
  // 2026-06-28 12:00 UTC-7 = 2026-06-28T19:00:00Z; CEST = 21:00 del 28 jun (domingo).
  assert.equal(fmtKO(73), "Dom 28/06 21:00");
});

test("fmtKO: M75 (19:00 UTC-6) rueda al día siguiente en CEST → Mar 30/06 03:00", () => {
  const { fmtKO } = loadApp();
  // 2026-06-29 19:00 UTC-6 = 2026-06-30T01:00:00Z; CEST = 03:00 del 30 jun (martes).
  // La fecha LOCAL es 29 jun pero la CEST avanza a 30 jun → verifica el rollover.
  assert.equal(fmtKO(75), "Mar 30/06 03:00");
});

test("fmtKO: coincide con el cálculo CEST independiente para todos los partidos", () => {
  const { fmtKO, KO_SCHEDULE } = loadApp();
  for (let m = 73; m <= 104; m++) {
    assert.equal(fmtKO(m), expectedCEST(KO_SCHEDULE[m].utc), "M" + m);
  }
});

test("fmtKO: nº inexistente devuelve cadena vacía", () => {
  const { fmtKO } = loadApp();
  assert.equal(fmtKO(999), "");
});

// ─── isLocked para claves KO (desde KO_SCHEDULE, regla 1h antes) ──────────────
// El instante UTC de M73 (independiente del módulo cargado, para fijar opts.now).
const M73_UTC = new Date("2026-06-28T19:00:00Z").getTime();

test("isLocked (KO): no bloqueado bastante antes del saque", () => {
  const { isLocked, KO_SCHEDULE } = loadApp({
    now: M73_UTC - 3 * 60 * 60 * 1000, // 3h antes
  });
  assert.equal(new Date(KO_SCHEDULE[73].utc).getTime(), M73_UTC); // sanity
  assert.equal(isLocked("r32_M73"), false);
});

test("isLocked (KO): bloqueado dentro de la última hora antes del saque", () => {
  const { isLocked } = loadApp({
    now: M73_UTC - 30 * 60 * 1000, // 30 min antes
  });
  assert.equal(isLocked("r32_M73"), true);
});

test("isLocked (KO): no rompe el comportamiento de grupos (clave en MATCH_TIMES)", () => {
  // Antes del saque del primer partido de grupos (2026-06-11T21:00 CEST) → abierto;
  // dentro de la última hora → bloqueado. Replica el contrato de fmtTime/MATCH_TIMES.
  const groupKey = "A_México_Sudáfrica";
  const kickoff = new Date("2026-06-11T21:00:00+02:00").getTime();
  let app = loadApp({ now: kickoff - 2 * 60 * 60 * 1000 });
  assert.equal(app.isLocked(groupKey), false);
  app = loadApp({ now: kickoff - 30 * 60 * 1000 });
  assert.equal(app.isLocked(groupKey), true);
  // Una clave desconocida sigue devolviendo false.
  assert.equal(app.isLocked("clave_inexistente"), false);
});

// ─── renderBracket muestra sede + fecha/hora (resuelto y pendiente) ───────────
test("renderBracket: muestra sede y fecha/hora CEST con cruce resuelto + cabecera vs", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    koFixtures: synthFixtures(), // resuelve r32_M73 = España vs Francia
    koResults: {},
  });
  const html = app.renderBracket();
  assert.match(html, /SoFi Stadium, Inglewood/);        // sede de M73
  assert.match(html, /Dom 28\/06 21:00/);               // fecha/hora CEST de M73
  assert.match(html, /bracket-vs/);                     // cabecera "A vs B"
  assert.match(html, /España[\s\S]*?vs[\s\S]*?Francia/); // "Equipo A vs Equipo B"
});

test("renderBracket: muestra sede/fecha aunque un lado esté pendiente", () => {
  const app = loadApp();
  // Solo grupo A completo → huecos de M73 (2A vs 2B) sin 2B → partido pendiente,
  // pero fecha/hora/sede SÍ deben aparecer (vienen de KO_SCHEDULE por nº).
  const standings = { A: fullGroup("Aa", "Ab", "Ac", "Ad") };
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    groupStandings: standings,
    koFixtures: { r32: [{ key: "r32_M74", home: "España", away: "Francia" }] }, // fuerza anyResolved
    koResults: {},
  });
  const html = app.renderBracket();
  // M73 está pendiente (falta 2B) pero su sede/fecha se renderizan igualmente.
  assert.match(html, /bracket-match--pending/);
  assert.match(html, /SoFi Stadium, Inglewood/);  // sede de M73 (pendiente)
  assert.match(html, /Dom 28\/06 21:00/);         // fecha/hora de M73 (pendiente)
});

test("renderBracket: escapa la sede", () => {
  const app = loadApp();
  Object.assign(app.S, {
    user: "Ana",
    players: [{ nombre: "Ana", bracket_predictions: {} }],
    koFixtures: synthFixtures(),
    koResults: {},
  });
  // Inyectamos una sede maliciosa en una entrada del calendario.
  app.KO_SCHEDULE[73].venue = "<img src=x>Estadio";
  const html = app.renderBracket();
  assert.ok(!html.includes("<img src=x>"), "no debe inyectar HTML de sede sin escapar");
  assert.match(html, /&lt;img src=x&gt;Estadio/);
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
