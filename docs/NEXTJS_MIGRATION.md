# Plan de migración a Next.js (propuesta, opcional)

> Estado: **propuesta**. No es una necesidad funcional; la app actual funciona y
> es deliberadamente simple (estática, sin build, cero dependencias en runtime).
> Este documento existe para decidir con datos si/ cuándo migrar.

## Motivo

La migración **no resuelve un problema funcional**, sino de **mantenibilidad y
robustez**. Las razones que la justificarían:

1. **XSS por defecto.** Hoy hay que recordar `esc()` en *cada* interpolación de
   `innerHTML`; un olvido = stored XSS (clase de bug recurrente en este proyecto,
   ver "Security model" en `CLAUDE.md`). JSX/React **escapan por defecto** y
   eliminan esa categoría entera.
2. **Mantenibilidad.** `js/app.js` es un único fichero grande con estado global
   mutable `S` y **re-render por `innerHTML` completo** en cada cambio. Componentes
   + estado reactivo evitan el re-render total y parten la UI en piezas testeables.
3. **Caché PWA sin sustos.** El service worker es manual y ya provocó el bug del
   "shell viejo" (#29). Con Next + Workbox/`next-pwa` los assets llevan **hash en
   el nombre**, lo que elimina de raíz el problema de servir JS cacheado obsoleto.
4. **Servidor de primera clase.** Ya hay funciones serverless en `api/` (Vercel).
   Next unifica front + API routes + Server Components, permitiendo mover lógica
   sensible al servidor en lugar de exponerla en el cliente.
5. **Tooling.** TypeScript, lint, code-splitting y tree-shaking; hoy no hay build
   ni tipos.

## Coste / contraargumento

- La app **funciona y es simple a propósito**: estática, **cero deps en runtime**,
  servible en cualquier host (Vercel/Netlify/GitHub Pages).
- La seguridad real ya está donde toca (**RLS** + **serverless con `service_role`**),
  no en el cliente, así que el riesgo está contenido.
- Migrar añade build, dependencias, superficie de configuración y un modelo
  mental nuevo para una porra entre amigos.

**Conclusión:** baja urgencia. Hacerlo solo si se prevé crecer la app o si el
mantenimiento del `app.js` monolítico empieza a doler.

## Qué se conserva (no cambia)

- **Supabase** (Postgres + Auth + RLS) y las **migraciones** `supabase/migrations/*`.
- El modelo de seguridad: anon key pública + RLS + serverless `service_role`.
- La **convención de match-key** `"{GRUPO}_{LOCAL}_{VISITANTE}"` y los datos
  (`results.json`, `bracket_predictions`, etc.).
- El **GitHub Action** diario que regenera `results.json`.
- Despliegue en **Vercel**.

## Estrategia recomendada

**App Router de Next.js + TypeScript**, desplegado en Vercel (mismo proveedor).
Migración **incremental por vistas**, no big-bang: el `index.html`/`app.js` actual
puede convivir mientras se portan pantallas una a una.

### Fases

1. **Andamiaje** — `create-next-app` (App Router, TS, ESLint). Configurar Vercel
   para el proyecto Next. Portar `css/styles.css` tal cual (o a CSS Modules más
   adelante). Cliente Supabase con `@supabase/supabase-js` (anon key en variable
   pública `NEXT_PUBLIC_*`).
2. **Modelo de datos en TS** — tipar `results.json`, `bracket_predictions`,
   `porra_jugadores`, `KO_BRACKET`/`KO_SCHEDULE`. Portar la lógica pura
   (`gPts`, `podiumBonus`, `bracketPts`, `resolveBracketTeams`, `isLocked`,
   `clinchedPositions`, …) a módulos TS con **los tests actuales como red de
   seguridad** (se pueden reusar casi tal cual).
3. **Vistas como componentes** — portar pantalla a pantalla: Hoy/Tu jornada,
   Grupos + clasificación, Pódium, Ranking, Cuadro, Admin. JSX en vez de
   template literals → se elimina el `esc()` manual.
4. **Auth + invitaciones** — login Google vía Supabase en el cliente; mover
   `api/redeem-invite` y `api/create-invite` a **Route Handlers** (`app/api/*`),
   manteniendo `service_role` server-only. Replicar el gate invite-only y
   `renderAccessDenied`.
5. **PWA** — `next-pwa`/Workbox con manifest e iconos existentes. Assets con hash
   → fin del problema de caché del SW manual. Mantener `results.json`/`changelog.json`
   network-first.
6. **Datos/Action** — el cron de `update_results.py` sigue igual escribiendo
   `results.json`; Next lo lee como hoy (fetch o import estático con revalidación).
7. **Corte** — cuando todas las vistas estén portadas y verdes en tests, retirar
   `index.html`/`js/app.js` y apuntar el dominio al build de Next.

### Riesgos a vigilar

- **Flujo OAuth + `?invite=`**: preservar exactamente el manejo del redirect y del
  token (fue fuente de bugs, ver historial). Probarlo a fondo.
- **RLS**: las queries desde Server Components usan la anon key salvo que se pase
  el JWT del usuario; cuidar que las escrituras sigan llevando el JWT (owner-only).
- **No meter el `service_role` en bundles de cliente** (solo Route Handlers/Server).
- **Tests**: portar primero la lógica pura con sus tests; no perder cobertura.

## Esfuerzo estimado (orientativo)

- Andamiaje + lógica pura tipada + tests: **~1–2 días**.
- Vistas (6) a componentes: **~3–5 días**.
- Auth/invitaciones + PWA + corte: **~1–2 días**.

Total aproximado: **~1–1.5 semanas** de trabajo enfocado, hecho de forma
incremental y verificable en cada fase.
