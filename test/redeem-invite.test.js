"use strict";

// Unit tests de redeem-invite: SOLO los guards de entrada (sin red). El
// comportamiento que depende de Supabase (sesión válida, invitación
// válida/caducada/inexistente, alta, idempotencia) se prueba de verdad en
// test/integration/security.itest.mjs contra GoTrue/PostgREST reales.

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
  Object.assign(process.env, env);
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) {
      if (had[k]) process.env[k] = prev[k];
      else delete process.env[k];
    }
  });
}

const SVC = { SUPABASE_SERVICE_ROLE: "svc" };
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
