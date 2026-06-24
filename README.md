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
- **Novedades:** al entrar se muestra un pequeño aviso con los cambios recientes, que puedes descartar (no vuelve a salir hasta que haya algo nuevo).
- **Acceso solo por invitación:** se entra con un enlace que genera el admin (caduca a los 30 min). La puesta en marcha y la generación de invitaciones se describen en [`docs/ADMIN.md`](docs/ADMIN.md).

## Instalar en el móvil (PWA)

La app es una **PWA instalable**: añádela a la pantalla de inicio para abrirla como una app y que cargue el cascarón aunque no tengas conexión (los datos se actualizan solos cuando hay internet).

- **Android (Chrome):** menú ⋮ → **Instalar app** / *Añadir a la pantalla de inicio* (o el aviso "Instalar" que aparece solo).
- **iPhone/iPad (Safari):** botón **Compartir** → **Añadir a pantalla de inicio**.
- **Escritorio (Chrome/Edge):** icono de **instalar** ⊕ en la barra de direcciones.

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
npm test                  # tests unitarios (sin infraestructura)
npm run test:integration  # integración contra Supabase local (testcontainers; necesita Docker)
npm run test:coverage     # unitarios + integración + cobertura (necesita Docker)
```

### Tests de integración (Supabase local real)

Prueban contra un **Supabase local real** (Postgres + PostgREST + GoTrue + gateway), levantado con
[**testcontainers**](https://node.testcontainers.org/) desde el propio test — solo necesitas **Docker**
(sin instalar el CLI de Supabase ni levantar nada a mano):

```bash
npm run test:integration
```

Cubren:
- **RLS por el camino real** (HTTP → PostgREST → `auth.uid()`): anon no lee ni escribe, el dueño solo
  edita su fila, `invitaciones` está cerrada.
- **Flujo de invitaciones**: `create-invite`/`redeem-invite` de verdad (alta de jugador, idempotencia,
  invitación caducada/ inválida), con un usuario creado en el GoTrue local.

Tienen un **guard anti-producción** (abortan si `SUPABASE_URL` no es local) y son un job **obligatorio**
del workflow de CI. Viven en `test/integration/*.itest.mjs`, fuera de `npm test` (que es solo unitario).

### Opción 3: Stack completo con Supabase local (auth, invitaciones, RLS)

Para probar lo que toca base de datos (RLS, alta de jugadores, invitaciones) necesitas el stack de
Supabase, que corre **en Docker**. Requisitos: Docker + [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start          # levanta Postgres + Auth + REST + Studio y aplica supabase/migrations/
supabase status         # imprime API URL, anon key, service_role key y la DB URL
# Studio (UI): http://127.0.0.1:54323
```

1. **Funciones serverless** → `vercel dev` (sirve `/api/*` en :3000). En tu `.env`, apunta al stack local:
   ```env
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE=<service_role que imprime `supabase status`>
   ADMIN_TRIGGER_SECRET=una_clave_local
   ```
2. **El cliente** (`js/app.js`) tiene `SB_URL`/`SB_KEY` de producción **hardcoded**; para abrir la web
   contra el stack local, edítalos temporalmente a los valores locales (anon key de `supabase status`)
   y **no lo commitees**.
3. **Probar invitaciones de punta a punta:**
   ```bash
   # generar un enlace (caduca a los 30 min)
   curl -X POST localhost:3000/api/create-invite -H "X-Admin-Secret: una_clave_local"
   # canjear (necesita el JWT de un usuario; créalo en Studio con email/contraseña y saca su access_token)
   curl -X POST localhost:3000/api/redeem-invite -H "Authorization: Bearer <token>" \
        -H "Content-Type: application/json" -d '{"token":"<token-de-invitacion>"}'
   ```
4. **Verificar RLS:** con la anon key local, un `PATCH`/`POST` directo a `porra_jugadores` debe **fallar**.
5. `supabase db reset` re-aplica las migraciones desde cero (útil para validar que siguen sanas);
   `supabase stop` apaga el stack.

> Google OAuth no completa en local; por eso el `config.toml` habilita alta por email/contraseña para
> poder crear un usuario de prueba y obtener su JWT.

## Contribuir

Cada cambio que aporte una novedad visible para los usuarios **debe añadir una entrada al
[`changelog.json`](changelog.json)**, que es lo que alimenta el banner de "Novedades".

- `changelog.json` es una lista de `{ "id", "fecha", "items": [...] }`, la más reciente primero.
- Añade tu cambio en `items` con texto **claro y en español, pensado para los participantes** (no
  el mensaje técnico del commit). Si ya hay una entrada con la fecha de hoy, suma tu línea ahí.
- El CI (`.github/workflows/changelog.yml`) **falla la PR** si no toca `changelog.json`.
- Si tu PR no tiene impacto para el usuario (refactor, docs, tooling…), etiquétala con
  **`skip-changelog`** y el check la dará por buena.

## Base de datos (migraciones)

El esquema y las políticas viven en [`supabase/migrations/`](supabase/migrations) y se aplican
**automáticamente al mergear a `main`** (workflow *DB migrations*), y **solo si pasan los tests**.

- Son **forward-only**: no edites ni borres una migración ya mergeada (no se vuelve a ejecutar y
  producción se desincronizaría). Para cambiar el esquema, **añade una migración nueva** con un
  timestamp posterior.
- Cada migración se aplica **una sola vez** (el CLI de Supabase lo controla).
- Detalle de configuración (secrets, secuencia) en [`docs/ADMIN.md`](docs/ADMIN.md).

## Despliegue

El despliegue se hace con [Vercel](https://vercel.com). Pero al ser todo estático
(HTML, CSS y JS), sirve cualquier hosting de archivos estáticos (Netlify, GitHub Pages, etc.).

## Estructura

| Archivo | Qué es |
|---------|--------|
| `index.html` | Página principal (login con Google) |
| `css/styles.css` | Todos los estilos |
| `js/app.js` | Toda la lógica de la app |
| `api/` | Funciones serverless (admin + invitaciones): `create-invite`, `redeem-invite`, `trigger-update` |
| `supabase/migrations/` | Esquema y políticas RLS (migraciones forward-only) |
| `results.json` · `changelog.json` | Datos: resultados/clasificación oficiales · novedades |
| `test/` | Tests unitarios (`*.test.js`) e integración (`integration/*.itest.mjs`) |
| `docs/ADMIN.md` | Guía de administración (invitaciones, secrets, puesta en marcha) |

Para más detalle técnico, ver [`CLAUDE.md`](CLAUDE.md).
