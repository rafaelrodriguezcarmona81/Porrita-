"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const HANDLER_URL = pathToFileURL(path.join(__dirname, "..", "api", "create-invite.js")).href;
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

test("create-invite: rechaza no-POST (405)", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 405);
  });
});

test("create-invite: 500 sin ADMIN_TRIGGER_SECRET", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "", SUPABASE_SERVICE_ROLE: "svc" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "x" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /ADMIN_TRIGGER_SECRET/);
  });
});

test("create-invite: 401 con secreto incorrecto", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "malo" } }, res);
    assert.equal(res.statusCode, 401);
  });
});

test("create-invite: 500 sin SUPABASE_SERVICE_ROLE", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", SUPABASE_SERVICE_ROLE: "" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /SUPABASE_SERVICE_ROLE/);
  });
});

test("create-invite: con secreto válido inserta invitación y devuelve token + caducidad ~30min", async () => {
  const handler = await loadHandler();
  await withEnv(OK_ENV, async () => {
    let call = null;
    global.fetch = (url, options) => {
      call = { url, options };
      return Promise.resolve({ status: 201, text: () => Promise.resolve("") });
    };
    const res = mockRes();
    const t0 = Date.now();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token, "devuelve un token");
    assert.match(call.url, /\/rest\/v1\/invitaciones$/);
    assert.equal(call.options.headers.apikey, "svc");
    const body = JSON.parse(call.options.body);
    assert.equal(body.token, res.body.token);
    const ttl = new Date(res.body.expires_at).getTime() - t0;
    assert.ok(ttl > 29 * 60 * 1000 && ttl < 31 * 60 * 1000, "caduca ~30 min");
  });
});
