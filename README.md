# Porra Mundial 2026 ⚽

Una porra del Mundial 2026: pronostica los partidos de la fase de grupos (1 / X / 2) y el pódium
final, y compite con tus amigos en una clasificación en vivo.

Es una web sencilla (HTML, CSS y JavaScript, sin frameworks ni build) con login de Google y datos
compartidos en tiempo real a través de [Supabase](https://supabase.com). Los resultados oficiales
se actualizan solos cada día.

## Cómo funciona

- **Grupos:** acierta el resultado (1 = local, X = empate, 2 = visitante). 1 punto por acierto.
  Los pronósticos se bloquean 1 hora antes de cada partido.
- **Pódium:** elige campeón, subcampeón y tercero. Bonus: 🥇 +5 · 🥈 +3 · 🥉 +2.
- **Ranking:** clasificación en vivo de todos los participantes.

## Ejecutar en local

No hace falta instalar nada. Sirve los archivos por HTTP (no abras el `index.html` con `file://`,
o fallará la carga de `results.json`):

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

> El login de Google necesita el redirect de OAuth configurado en el dominio desplegado, así que
> en local te quedarás en la pantalla de login.

## Tests

```bash
npm test                  # ejecuta todos los tests
npm run test:coverage     # tests + informe de cobertura
```

## Despliegue

El despliegue se hace con [Vercel](https://vercel.com). Pero al ser todo estático
(HTML, CSS y JS), sirve cualquier hosting de archivos estáticos (Netlify, GitHub Pages, etc.).

## Estructura

| Archivo | Qué es |
|---------|--------|
| `index.html` | Página principal (login con Google) |
| `css/styles.css` | Todos los estilos |
| `js/app.js` | Toda la lógica de la app |
| `results.json` | Resultados oficiales (se actualizan solos a diario) |
| `test/` | Tests unitarios |

Para más detalle técnico, ver [`CLAUDE.md`](CLAUDE.md).
