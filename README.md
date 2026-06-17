# Porra Mundial 2026 ⚽

Una porra del Mundial 2026: pronostica los partidos de la fase de grupos (1 / X / 2) y el pódium
final, y compite con tus amigos en una clasificación en vivo.

Es una web sencilla (HTML, CSS y JavaScript, sin frameworks ni build) con login de Google y datos
compartidos en tiempo real a través de [Supabase](https://supabase.com). Los resultados oficiales
se actualizan solos cada día.

## Cómo funciona

- **Grupos:** acierta el resultado (1 = local, X = empate, 2 = visitante). 1 punto por acierto.
  Los pronósticos se bloquean 1 hora antes de cada partido. Cada grupo muestra además su
  **tabla de clasificación en vivo** (PJ, G, E, P, GF, GC, DG, Pts).
- **Pódium:** elige campeón, subcampeón y tercero. Bonus: 🥇 +5 · 🥈 +3 · 🥉 +2.
- **Ranking:** clasificación en vivo de todos los participantes.

## Ejecutar en local

### Opción 1: Servidor estático (solo la app, sin admin)

No hace falta instalar nada. Sirve los archivos por HTTP:

```bash
python -m http.server 8000
# o en Windows, si `python` no existe:
# py -3 -m http.server 8000
# abre http://localhost:8000
```

> El login de Google necesita el redirect de OAuth configurado en el dominio desplegado, así que
> en local te quedarás en la pantalla de login. El panel Admin no funcionará.

### Opción 2: Vercel dev (con soporte para Admin)

Primero instala el cliente de Vercel (una sola vez):

```bash
npm install -g vercel
```

Luego ejecuta:

```bash
vercel dev
# abre http://localhost:3000
```

#### Configurar Admin en local

1. Crea un archivo [`.env`](.env) en la raíz con:
   ```env
   ADMIN_TRIGGER_SECRET=tu_clave_admin
   GITHUB_TOKEN=tu_token_github_opcional
   ```

2. Ejecuta `vercel dev`:
   - Cuando pregunte "Would you like to pull environment variables now?" → responde **`no`**
   - Esto usa solo las variables locales del `.env`

3. En la app, accede a la pestaña **🔧 Admin** e introduce tu clave

#### Variables de entorno

- **`ADMIN_TRIGGER_SECRET`**: clave para desbloquear el panel Admin
- **`GITHUB_TOKEN`** (opcional): token para disparar la Action de actualización de resultados
  - Cada desarrollador debe generar el suyo en https://github.com/settings/tokens (scope `repo`)
  - NO se sube a Git (está protegido por `.gitignore`)

**Para otros desarrolladores:**
1. Copia [`.env.example`](.env.example) a `.env`
2. Rellena `ADMIN_TRIGGER_SECRET` con una clave local
3. Genera tu propio `GITHUB_TOKEN` en GitHub (Settings → Developer Settings → Personal access tokens)
4. El `.env` nunca se sube a Git

> Las variables en `.env` son **solo locales**. No afectan a la producción en Vercel.
> Vercel usa sus propias variables configuradas en el panel de Settings.

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
| `results.json` | Resultados y clasificación oficiales (se actualizan solos a diario) |
| `test/` | Tests unitarios |

Para más detalle técnico, ver [`CLAUDE.md`](CLAUDE.md).
