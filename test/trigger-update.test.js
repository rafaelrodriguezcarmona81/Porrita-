"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

// La función serverless es un módulo ESM (export default); la cargamos por import dinámico.
const HANDLER_URL = pathToFileURL(path.join(__dirname, "..", "api", "trigger-update.js")).href;
async function loadHandler() {
  const mod = await import(HANDLER_URL);
  return mod.default;
}

// Stub mínimo del objeto `res` de Vercel/Express.
function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

// Guarda/restaura el entorno y el fetch global alrededor de cada caso.
function withEnv(env, fn) {
  const savedEnv = { ...process.env };
  const savedFetch = global.fetch;
  Object.assign(process.env, env);
  return Promise.resolve(fn()).finally(() => {
    process.env = savedEnv;
    global.fetch = savedFetch;
  });
}

test("trigger-update: rechaza métodos que no son POST (405)", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 405);
  });
});

test("trigger-update: 500 si no hay ADMIN_TRIGGER_SECRET configurado", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "", GITHUB_TOKEN: "ght" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "loquesea" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /ADMIN_TRIGGER_SECRET/);
  });
});

test("trigger-update: 401 sin la cabecera del secreto", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: {} }, res);
    assert.equal(res.statusCode, 401);
  });
});

test("trigger-update: 401 con secreto incorrecto", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "malo" } }, res);
    assert.equal(res.statusCode, 401);
  });
});

test("trigger-update: 500 si falta GITHUB_TOKEN aunque el secreto sea válido", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "" }, async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /GITHUB_TOKEN/);
  });
});

test("trigger-update: propaga el error si la API de GitHub no devuelve 204", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    global.fetch = () => Promise.resolve({ status: 422, text: () => Promise.resolve("workflow not found") });
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 422);
    assert.match(res.body.error, /GitHub API error/);
  });
});

test("trigger-update: 500 si fetch lanza una excepción", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    global.fetch = () => Promise.reject(new Error("boom"));
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /Error interno/);
  });
});

test("trigger-update: con secreto válido dispara la Action y responde 200", async () => {
  const handler = await loadHandler();
  await withEnv({ ADMIN_TRIGGER_SECRET: "s3cr3t", GITHUB_TOKEN: "ght" }, async () => {
    let called = null;
    global.fetch = (url, options) => {
      called = { url, options };
      return Promise.resolve({ status: 204, text: () => Promise.resolve("") });
    };
    const res = mockRes();
    await handler({ method: "POST", headers: { "x-admin-secret": "s3cr3t" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    // Verifica que llamó al dispatch del workflow con el token
    assert.match(called.url, /actions\/workflows\/update-results\.yml\/dispatches/);
    assert.equal(called.options.headers.Authorization, "Bearer ght");
  });
});
