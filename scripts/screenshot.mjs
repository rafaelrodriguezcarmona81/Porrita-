/**
 * Genera capturas de pantalla de componentes de la app usando el render REAL
 * (js/app.js cargado vía test/load-app.js) y la CSS real del proyecto.
 *
 * No hay HTML de maqueta: cada captura llama a la misma función `render*` que
 * usa la app en producción, así que nunca se desincroniza del cuadro real.
 * Tampoco requiere login: se mutan unos pocos campos de estado y se invoca el
 * render directamente.
 *
 * Uso:
 *   node scripts/screenshot.mjs              # genera todas las capturas
 *   node scripts/screenshot.mjs bracket-map  # solo una
 *
 * Salida: /tmp/<name>.png (listo para copiar a la rama pr-assets)
 *
 * Requisitos: @playwright/test instalado
 *   npm install --no-save @playwright/test && npx playwright install chromium
 */

import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const { loadApp } = require(resolve(ROOT, 'test/load-app.js'));
const CSS = readFileSync(resolve(ROOT, 'css/styles.css'), 'utf8');

function wrap(body, bg = '#f3f4f6') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
${CSS}
body { margin: 0; background: ${bg}; padding: 16px; }
/* Para capturas: deshabilitar scroll horizontal del bmap y mostrar el árbol completo */
.bmap-scroll { overflow-x: visible !important; }
.bmap-tree   { min-width: unset !important; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── Capturas ──────────────────────────────────────────────────────────────
// Cada entrada: { w, build(app) -> html }. `build` muta el estado `app.S` y
// devuelve el HTML del render real (sin maqueta).

const shots = {
  // Menú adaptativo en fase de grupos.
  'nav-grupos': {
    w: 480,
    build(app) {
      app.S.user = 'Tú';
      app.S.koFixtures = {};
      return app.renderHeader();
    },
  },

  // Menú adaptativo en fase eliminatoria (Cuadro sube, Grupos pasa a histórico).
  'nav-ko': {
    w: 480,
    build(app) {
      app.S.user = 'Tú';
      app.S.koFixtures = { _seed: true }; // basta con que no esté vacío → isKOPhase()
      return app.renderHeader();
    },
  },

  // Vista mapa del cuadro de eliminatorias (render real, sin equipos resueltos:
  // muestra las etiquetas de procedencia «Gan. M85», «1º Gr.B», «3º E/F/G/I/J»…).
  'bracket-map': {
    w: 1400,
    build(app) {
      app.S.bracketView = 'mapa';
      return app.renderBracketMap();
    },
  },
};

// ─── Runner ──────────────────────────────────────────────────────────────────

const filter = process.argv[2];
const toRun = filter
  ? Object.entries(shots).filter(([k]) => k === filter)
  : Object.entries(shots);

if (!toRun.length) {
  console.error(`Captura desconocida: "${filter}". Disponibles: ${Object.keys(shots).join(', ')}`);
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (const [name, { build, w }] of toRun) {
  const app = loadApp();
  const html = wrap(build(app));
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 800 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `/tmp/${name}.png`, fullPage: true });
  await page.close();
  console.log(`✓ ${name} → /tmp/${name}.png`);
}

await browser.close();
