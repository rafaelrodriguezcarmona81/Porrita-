/**
 * Genera capturas de pantalla de componentes de la app usando la CSS real del proyecto.
 * No requiere login — renderiza HTML estático con page.setContent().
 *
 * Uso:
 *   node scripts/screenshot.mjs              # genera todas las capturas definidas
 *   node scripts/screenshot.mjs nav          # solo la captura "nav"
 *   node scripts/screenshot.mjs bracket-map  # solo la captura "bracket-map"
 *
 * Salida: /tmp/<name>.png (listo para copiar a pr-assets)
 *
 * Requisitos: @playwright/test instalado (npm install --no-save @playwright/test
 * && npx playwright install chromium) o kit playwright-kit añadido al sandbox.
 */

import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const css  = (f) => readFileSync(resolve(ROOT, f), 'utf8');

function wrap(styles, body, bgColor = '#f3f4f6') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
${styles}
body { margin: 0; background: ${bgColor}; }
/* Para capturas: deshabilitar scroll horizontal en bmap */
.bmap-scroll { overflow-x: visible !important; }
.bmap-tree   { min-width: unset !important; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── Definiciones de capturas ─────────────────────────────────────────────────

const shots = {

  // PR #33 — menú adaptativo según la fase del torneo
  'nav': {
    out: '/tmp/nav.png',
    w: 430,
    html: wrap(css('css/styles.css'), `
<div style="display:flex;flex-direction:column;gap:16px;padding:16px;max-width:430px">

  <p style="font:700 .7rem/1 system-ui;color:#6b7280;text-transform:uppercase;
             letter-spacing:.06em;margin:0">Fase de grupos</p>
  <div class="hdr" style="position:static;border-radius:.75rem;overflow:hidden">
    <div class="tabs">
      <button class="tab tab--active">📅 Hoy</button>
      <button class="tab">⚽ Grupos</button>
      <button class="tab">🏆 Cuadro</button>
      <button class="tab">🏆 Pódium</button>
      <button class="tab">📊 Ranking</button>
    </div>
  </div>

  <p style="font:700 .7rem/1 system-ui;color:#6b7280;text-transform:uppercase;
             letter-spacing:.06em;margin:0">
    Fase eliminatoria — Cuadro sube, Grupos pasa a histórico
  </p>
  <div class="hdr" style="position:static;border-radius:.75rem;overflow:hidden">
    <div class="tabs">
      <button class="tab">📅 Hoy</button>
      <button class="tab tab--active">🏆 Cuadro</button>
      <button class="tab tab--hist">📁 Grupos (hist.)</button>
      <button class="tab">🏆 Pódium</button>
      <button class="tab">📊 Ranking</button>
    </div>
  </div>

</div>`),
  },

  // PR #34 — vista mapa del cuadro de eliminatorias
  // Nota: usa el CSS de la rama feat/bracket-map-view hasta que sea mergeada.
  'bracket-map': {
    out: '/tmp/bracket-map.png',
    w: 1300,
    html: wrap(css('css/styles.css'), `
<div style="padding:12px">

  <div class="bracket-view-toggle" style="max-width:300px;margin-bottom:12px">
    <button class="bracket-view-btn">📋 Lista</button>
    <button class="bracket-view-btn bracket-view-btn--active">🗺️ Mapa</button>
  </div>

  <div class="bmap-scroll">
    <div class="bmap-tree">

      ${col('Dieciseisavos', [
        match('M73','28/06 21:00','🇿🇦 Sudáfrica','🇨🇦 Canadá'),
        match('M74','28/06 21:00','🇸🇪 Suecia','🇵🇾 Paraguay'),
        match('M75','29/06 18:00','🇲🇽 México','🇵🇱 Polonia'),
        match('M76','29/06 18:00','🇦🇷 Argentina','🇳🇬 Nigeria'),
        match('M77','30/06 21:00','🇪🇸 España','🇳🇱 Países Bajos'),
        match('M78','30/06 21:00','🇵🇹 Portugal','🇭🇷 Croacia'),
        match('M79','01/07 18:00','🇺🇸 Estados Unidos','🇷🇴 Rumanía'),
        match('M80','01/07 21:00','🇧🇷 Brasil','🇨🇴 Colombia'),
      ])}

      ${col('Octavos', [
        match('M89','','?','?'),
        match('M90','','?','?'),
        match('M91','','?','?'),
        match('M92','','?','?'),
      ])}

      ${col('Cuartos', [
        match('M97','','?','?'),
        match('M99','','?','?'),
      ])}

      ${col('Semis', [
        match('M101','','?','?'),
      ])}

      <!-- Final + 3er puesto -->
      <div class="bmap-col bmap-col--center">
        <div class="bmap-col-label">Final</div>
        <div class="bmap-col-matches">
          <div class="bmap-match" style="border-color:#f59e0b;background:#fffbeb;min-width:110px">
            <span class="bmap-match-id" style="background:#fef3c7;color:#92400e">M104</span>
            <div class="bmap-date">19/07 21:00</div>
            <div class="bmap-team bmap-unknown">?</div>
            <div class="bmap-team bmap-team--away bmap-unknown">?</div>
          </div>
          <div class="bmap-third-label">3er / 4º puesto</div>
          <div class="bmap-match" style="min-width:110px">
            <span class="bmap-match-id">M103</span>
            <div class="bmap-date">18/07 21:00</div>
            <div class="bmap-team bmap-unknown">?</div>
            <div class="bmap-team bmap-team--away bmap-unknown">?</div>
          </div>
        </div>
      </div>

      ${col('Semis', [
        match('M102','','?','?'),
      ])}

      ${col('Cuartos', [
        match('M98','','?','?'),
        match('M100','','?','?'),
      ])}

      ${col('Octavos', [
        match('M93','','?','?'),
        match('M94','','?','?'),
        match('M95','','?','?'),
        match('M96','','?','?'),
      ])}

      ${col('Dieciseisavos', [
        match('M81','02/07 18:00','🇩🇪 Alemania','🇯🇵 Japón'),
        match('M82','02/07 21:00','🇫🇷 Francia','🇲🇦 Marruecos'),
        match('M83','03/07 18:00','🇬🇧 Inglaterra','🇸🇳 Senegal'),
        match('M84','03/07 21:00','🇧🇪 Bélgica','🇺🇾 Uruguay'),
        match('M85','04/07 18:00','🇵🇹 Portugal','🇨🇭 Suiza'),
        match('M86','04/07 21:00','🇳🇱 Países Bajos','🇺🇸 Estados Unidos'),
        match('M87','05/07 18:00','🇨🇷 Costa Rica','🇰🇷 Corea del Sur'),
        match('M88','05/07 21:00','🇦🇺 Australia','🇩🇰 Dinamarca'),
      ])}

    </div>
  </div>
</div>`),
  },

};

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function match(id, date, home, away) {
  const unknown = t => t === '?' ? ' bmap-unknown' : '';
  return `
  <div class="bmap-match">
    <span class="bmap-match-id">${id}</span>
    ${date ? `<div class="bmap-date">${date}</div>` : ''}
    <div class="bmap-team${unknown(home)}">${home}</div>
    <div class="bmap-team bmap-team--away${unknown(away)}">${away}</div>
  </div>`;
}

function col(label, matches) {
  return `
  <div class="bmap-col">
    <div class="bmap-col-label">${label}</div>
    <div class="bmap-col-matches">${matches.join('')}</div>
  </div>`;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const filter = process.argv[2];
const toRun  = filter
  ? Object.entries(shots).filter(([k]) => k === filter)
  : Object.entries(shots);

if (!toRun.length) {
  console.error(`Captura desconocida: "${filter}". Disponibles: ${Object.keys(shots).join(', ')}`);
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (const [name, { html, out, w }] of toRun) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 800 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log(`✓ ${name} → ${out}`);
}

await browser.close();
