"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");
const { loadApp } = require("./load-app.js");

// ─── Capa serverless: api/remove-player.js ───────────────────────────────────

const HANDLER_URL = pathToFileURL(path.join(__dirname, "..", "api", "remove-player.js")).href;
async function loadHandler() {
  return (await import(HANDLER_URL)).default;
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function withEnv(env, fn) {
  const keys = Object.keys(env);
  const had = {};
  const prev = {};
  for (const k of keys) {
    had[k] = Object.prototype.hasOwnProperty.call(process.env, k);
    prev[k] = process.env[k];
  }
  const savedFetch = global.fetch;
  Object.assign(process.env, env);
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) {
      if (had[k]) process.env[k] = prev[k];
      else delete process.env[k];
    }
    global.fetch = savedFetch;
  });
}

const OK_ENV = { ADMIN_TRIGGER_SECRET: "s3cr3t", SUPABASE_SERVICE_ROLE: "svc" };

test("remove-player: rechaza no-POST (405)", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 405);
  });
});

test("remove-player: 500 sin ADMIN_TRIGGER_SECRET", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "", SUPABASE_SERVICE_ROLE: "svc" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "x" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /ADMIN_TRIGGER_SECRET/);
  });
});

test("remove-player: 401 con secreto incorrecto", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "malo" }, body: { user_id: "U1" } }, res);
    assert.equal(res.statusCode, 401);
  });
});

test("remove-player: 500 sin SUPABASE_SERVICE_ROLE", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", SUPABASE_SERVICE_ROLE: "" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" }, body: { user_id: "U1" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /SUPABASE_SERVICE_ROLE/);
  });
});

test("remove-player: 400 sin user_id", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" }, body: {} }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /user_id/);
  });
});

test("remove-player: 404 si ninguna fila coincide", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    global.fetch = () => Promise.resolve({ status: 200, json: () => Promise.resolve([]), text: () => Promise.resolve("[]") });
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" }, body: { user_id: "U1" } }, res);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.error, /no encontrado/i);
  });
});

test("remove-player: borrado correcto devuelve {ok, nombre}", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    let captured = null;
    global.fetch = (url, opts) => {
      captured = { url, opts };
      return Promise.resolve({ status: 200, json: () => Promise.resolve([{ nombre: "Ana" }]) });
    };
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" }, body: { user_id: "U1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, nombre: "Ana" });
    assert.equal(captured.opts.method, "DELETE");
    assert.match(captured.url, /porra_jugadores\?user_id=eq\.U1/);
    assert.equal(captured.opts.headers["Prefer"], "return=representation");
  });
});

test("remove-player: acepta el body como string JSON", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    global.fetch = () => Promise.resolve({ status: 200, json: () => Promise.resolve([{ nombre: "Bob" }]) });
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" }, body: JSON.stringify({ user_id: "U9" }) }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.nombre, "Bob");
  });
});

// ─── Capa app: removePlayer / doRemovePlayer ─────────────────────────────────

function routedFetch(routes) {
  return (url) => {
    for (const [needle, data] of routes) {
      if (url.includes(needle)) return Promise.resolve({ json: () => Promise.resolve(data) });
    }
    return Promise.resolve({ json: () => Promise.resolve([]) });
  };
}
const flush = () => new Promise((r) => setImmediate(r));

test("removePlayer: POST a /api/remove-player con secreto y user_id, fija ok/mensaje", async () => {
  const app = loadApp({
    fetch: (url) => {
      if (url === "/api/remove-player") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, nombre: "Ana" }) });
      }
      return routedFetch([["porra_jugadores", []], ["results.json", { results: {}, scores: {} }]])(url);
    },
  });
  await app.removePlayer("clave-admin", "U1");
  const call = app.fetchCalls.find((c) => c.url === "/api/remove-player");
  assert.equal(call.options.method, "POST");
  assert.equal(call.options.headers["X-Admin-Secret"], "clave-admin");
  assert.deepEqual(JSON.parse(call.options.body), { user_id: "U1" });
  assert.equal(app.S.adminRemoveBusy, false);
  assert.equal(app.S.adminRemoveOk, true);
  assert.match(app.S.adminRemoveMsg, /Ana/);
});

test("removePlayer: error del endpoint baja el flag y marca error", async () => {
  const app = loadApp({
    fetch: () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: "Jugador no encontrado" }) }),
  });
  await app.removePlayer("clave-admin", "U1");
  assert.equal(app.S.adminRemoveBusy, false);
  assert.equal(app.S.adminRemoveOk, false);
  assert.match(app.S.adminRemoveMsg, /no encontrado/i);
});

test("removePlayer: error de red marca '❌ Error de red'", async () => {
  const app = loadApp({ fetch: () => Promise.reject(new Error("boom")) });
  await app.removePlayer("clave-admin", "U1");
  assert.equal(app.S.adminRemoveBusy, false);
  assert.equal(app.S.adminRemoveOk, false);
  assert.match(app.S.adminRemoveMsg, /Error de red/);
});

test("doRemovePlayer: sin desbloquear no llama al endpoint", () => {
  const app = loadApp({
    fetch: routedFetch([["porra_jugadores", []]]),
    elements: { adminRemoveSelect: { value: "U1" } },
  });
  app.window.confirm = () => true;
  app.window.doRemovePlayer();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/remove-player"));
});

test("doRemovePlayer: sin selección no llama al endpoint", () => {
  const app = loadApp({
    fetch: routedFetch([["porra_jugadores", []]]),
    elements: { adminRemoveSelect: { value: "" } },
  });
  Object.assign(app.S, { adminUnlocked: true, adminKey: "clave-admin" });
  app.window.confirm = () => true;
  app.window.doRemovePlayer();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/remove-player"));
});

test("doRemovePlayer: si el usuario cancela el confirm no llama al endpoint", () => {
  const app = loadApp({
    fetch: routedFetch([["porra_jugadores", []]]),
    elements: { adminRemoveSelect: { value: "U1" } },
  });
  Object.assign(app.S, { adminUnlocked: true, adminKey: "clave-admin", players: [{ user_id: "U1", nombre: "Ana" }] });
  app.window.confirm = () => false;
  app.window.doRemovePlayer();
  assert.ok(!app.fetchCalls.some((c) => c.url === "/api/remove-player"));
});

test("doRemovePlayer: desbloqueado + selección + confirm llama al endpoint", async () => {
  const app = loadApp({
    fetch: (url) => {
      if (url === "/api/remove-player") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, nombre: "Ana" }) });
      }
      return routedFetch([["porra_jugadores", []], ["results.json", { results: {}, scores: {} }]])(url);
    },
    elements: { adminRemoveSelect: { value: "U1" } },
  });
  Object.assign(app.S, { adminUnlocked: true, adminKey: "clave-admin", players: [{ user_id: "U1", nombre: "Ana" }] });
  app.window.confirm = () => true;
  app.window.doRemovePlayer();
  await flush();
  const call = app.fetchCalls.find((c) => c.url === "/api/remove-player");
  assert.ok(call, "debe llamar a /api/remove-player");
  assert.equal(call.options.headers["X-Admin-Secret"], "clave-admin");
});
