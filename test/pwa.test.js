"use strict";

// Tests basados en archivos para la PWA (issue #19). La VM-harness de app.js no
// puede ejercitar service workers/manifest, así que validamos los archivos
// estáticos directamente: que el manifest sea válido e instalable, que index.html
// enganche manifest + theme-color + registro del SW, y que el SW precachee el shell.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ─── manifest.json ───────────────────────────────────────────────────────────
test("manifest.json existe y es JSON válido e instalable", () => {
  assert.ok(exists("manifest.json"), "falta manifest.json");
  const m = JSON.parse(read("manifest.json"));

  assert.ok(m.name, "manifest sin name");
  assert.ok(m.short_name, "manifest sin short_name");
  assert.ok(m.start_url, "manifest sin start_url");
  assert.equal(m.display, "standalone", "display debe ser standalone");
  assert.ok(m.theme_color, "manifest sin theme_color");
  assert.ok(m.background_color, "manifest sin background_color");

  assert.ok(Array.isArray(m.icons) && m.icons.length > 0, "manifest sin icons");
  const sizes = m.icons.map((i) => i.sizes);
  const has192 = sizes.some((s) => /(^|\s)192x192(\s|$)/.test(s));
  const has512 = sizes.some((s) => /(^|\s)512x512(\s|$)/.test(s));
  const hasAny = sizes.some((s) => /\bany\b/.test(s));
  assert.ok(
    (has192 && has512) || hasAny,
    "necesita iconos 192 y 512 (o sizes: any)"
  );
});

test("los iconos referenciados por el manifest existen", () => {
  const m = JSON.parse(read("manifest.json"));
  for (const icon of m.icons) {
    const rel = icon.src.replace(/^\//, "");
    assert.ok(exists(rel), `falta el icono ${icon.src}`);
  }
});

// ─── index.html ──────────────────────────────────────────────────────────────
test("index.html engancha la PWA (manifest, theme-color, apple-touch, SW)", () => {
  const html = read("index.html");
  assert.match(html, /<link[^>]+rel=["']manifest["'][^>]+href=["']\/manifest\.json["']/);
  assert.match(html, /<meta[^>]+name=["']theme-color["'][^>]+content=["']#0a2240["']/);
  assert.match(html, /rel=["']apple-touch-icon["']/);
  // El SW se registra desde index.html, no desde app.js.
  assert.match(html, /serviceWorker/);
  assert.match(html, /navigator\.serviceWorker\.register\(["']\/sw\.js["']\)/);
});

test("app.js NO registra el service worker (el harness no tiene navigator)", () => {
  const app = read("js/app.js");
  assert.doesNotMatch(app, /serviceWorker/);
});

// ─── sw.js ───────────────────────────────────────────────────────────────────
test("sw.js existe y precachea el shell estático", () => {
  assert.ok(exists("sw.js"), "falta sw.js");
  const sw = read("sw.js");

  for (const asset of ["/index.html", "/css/styles.css", "/js/app.js", "/manifest.json"]) {
    assert.ok(sw.includes(asset), `el SW no precachea ${asset}`);
  }
  // Iconos del shell.
  assert.match(sw, /\/icons\/icon-192\.png/);
  assert.match(sw, /\/icons\/icon-512\.png/);
});

test("sw.js mantiene frescos results.json y changelog.json (network-first)", () => {
  const sw = read("sw.js");
  assert.match(sw, /\/results\.json/);
  assert.match(sw, /\/changelog\.json/);
});

test("sw.js versiona la cache y limpia caches antiguas en activate", () => {
  const sw = read("sw.js");
  assert.match(sw, /const VERSION\s*=/);
  assert.match(sw, /addEventListener\(["']activate["']/);
  assert.match(sw, /caches\.delete/);
});

test("sw.js no intercepta peticiones cross-origin (Supabase/OAuth)", () => {
  const sw = read("sw.js");
  // Comprueba origen y deja pasar lo cross-origin sin cachear.
  assert.match(sw, /url\.origin\s*!==\s*self\.location\.origin/);
});

test("sw.js sirve el shell network-first (no cache-first, para no servir app.js viejo)", () => {
  const sw = read("sw.js");
  // El shell debe resolverse con network-first.
  assert.match(sw, /isShellAsset\(url\)[\s\S]*?networkFirst\(/);
  // No debe quedar la antigua estrategia cache-first.
  assert.doesNotMatch(sw, /cacheFirst/);
});

test("sw.js versiona la cache con semver (evita vN creciendo sin fin)", () => {
  const sw = read("sw.js");
  assert.match(sw, /const VERSION\s*=\s*["'][^"']*\d+\.\d+\.\d+["']/);
});

// ─── changelog ───────────────────────────────────────────────────────────────
test("changelog.json menciona la instalación/offline en la entrada de hoy", () => {
  const cl = JSON.parse(read("changelog.json"));
  const today = cl.find((e) => e.id === "2026-06-24");
  assert.ok(today, "falta la entrada 2026-06-24");
  const joined = today.items.join(" ").toLowerCase();
  const mencionaInstalar = joined.includes("instal");
  const mencionaOffline = joined.includes("offline") || joined.includes("conexi");
  assert.ok(
    mencionaInstalar && mencionaOffline,
    "la entrada de hoy debe mencionar instalar y abrir sin conexión/offline"
  );
});
