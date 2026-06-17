"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const HANDLER_URL = pathToFileURL(path.join(__dirname, "..", "api", "redeem-invite.js")).href;
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

// Enruta las llamadas que hace el handler (user → invitaciones → porra_jugadores).
// Devuelve también `calls` para comprobar qué se llamó.
function routerFetch(cfg) {
  const calls = [];
  const fn = (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const u = String(url);
    calls.push({ url: u, method });
    let r;
    if (u.includes("/auth/v1/user")) r = cfg.user;
    else if (u.includes("/rest/v1/invitaciones")) r = cfg.invite;
    else if (u.includes("/rest/v1/porra_jugadores") && method === "POST") r = cfg.create;
    else if (u.includes("/rest/v1/porra_jugadores")) r = cfg.existing;
    r = r || { status: 200, json: [] };
    return Promise.resolve({
      status: r.status,
      json: () => Promise.resolve(r.json),
      text: () => Promise.resolve(r.text || ""),
    });
  };
  fn.calls = calls;
  return fn;
}

const USER_OK = { status: 200, json: { id: "u1", user_metadata: { full_name: "Nuevo" }, email: "n@x.com" } };
const SVC = { SUPABASE_SERVICE_ROLE: "svc" };
const future = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 1000).toISOString();
const reqOf = (extra = {}) => ({ method: "POST", headers: { authorization: "Bearer utok" }, body: { token: "tok" }, ...extra });

test("redeem-invite: rechaza no-POST (405)", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 405);
  });
});

test("redeem-invite: 500 sin SUPABASE_SERVICE_ROLE", async () => {
  const handler = await loadHandler();
  await withEnv({ SUPABASE_SERVICE_ROLE: "" }, async () => {
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 500);
  });
});

test("redeem-invite: 401 sin sesión (sin Authorization)", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: {}, body: { token: "tok" } }, res);
    assert.equal(res.statusCode, 401);
  });
});

test("redeem-invite: 400 sin token de invitación", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { authorization: "Bearer utok" }, body: {} }, res);
    assert.equal(res.statusCode, 400);
  });
});

test("redeem-invite: 401 si la sesión es inválida", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    global.fetch = routerFetch({ user: { status: 401, json: {} } });
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 401);
  });
});

test("redeem-invite: 403 si la invitación no existe", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    global.fetch = routerFetch({ user: USER_OK, invite: { status: 200, json: [] } });
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /inválida/);
  });
});

test("redeem-invite: 403 si la invitación está caducada", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    global.fetch = routerFetch({ user: USER_OK, invite: { status: 200, json: [{ token: "tok", expires_at: past() }] } });
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /caducada/);
  });
});

test("redeem-invite: usuario ya miembro → 200 sin crear fila", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    const f = routerFetch({
      user: USER_OK,
      invite: { status: 200, json: [{ token: "tok", expires_at: future() }] },
      existing: { status: 200, json: [{ nombre: "Ana" }] },
    });
    global.fetch = f;
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.alreadyMember, true);
    assert.equal(res.body.nombre, "Ana");
    assert.ok(!f.calls.some((c) => c.method === "POST" && c.url.includes("porra_jugadores")), "no debe crear fila");
  });
});

test("redeem-invite: invitación válida + usuario nuevo → crea fila (200)", async () => {
  const handler = await loadHandler();
  await withEnv(SVC, async () => {
    const f = routerFetch({
      user: USER_OK,
      invite: { status: 200, json: [{ token: "tok", expires_at: future() }] },
      existing: { status: 200, json: [] },
      create: { status: 201, text: "" },
    });
    global.fetch = f;
    const res = mockRes();
    await handler(reqOf(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.nombre, "Nuevo");
    assert.ok(f.calls.some((c) => c.method === "POST" && c.url.includes("porra_jugadores")), "crea la fila");
  });
});
