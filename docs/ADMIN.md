# Guía de administración — seguridad e invitaciones

Operativa para quien administra la porra (un único admin por tenant).

## Puesta en marcha (una sola vez)

1. **Base de datos** — Supabase → *SQL Editor*: ejecuta, en este orden:
   - [`db/rls.sql`](../db/rls.sql) — cierra las escrituras de `porra_jugadores` (solo el dueño edita su fila; nada de `INSERT`/`DELETE` desde el cliente).
   - [`db/invitaciones.sql`](../db/invitaciones.sql) — crea la tabla `invitaciones`, cerrada por RLS (solo `service_role`).

2. **Variables de entorno** — Vercel → *Project Settings → Environment Variables*:
   | Variable | Valor | Notas |
   |----------|-------|-------|
   | `SUPABASE_SERVICE_ROLE` | Supabase → *Project Settings → API → service_role key* | **Secreto.** Solo en servidor, nunca en el cliente ni en el repo. |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` | Opcional (hay valor por defecto). |
   | `ADMIN_TRIGGER_SECRET` | tu clave de admin | Ya la usabas para forzar resultados. |

3. **Redeploy** en Vercel para que tomen las variables.

> ⚠️ **Orden importa:** aplica `db/rls.sql` **solo cuando el backend de invitaciones esté desplegado**. Con RLS activa, el alta de jugadores deja de poder hacerse desde el cliente (es el objetivo); el alta legítima pasa a `/api/redeem-invite`. Si activas RLS antes, nadie nuevo podrá entrar.

## Generar una invitación

Cada link es un token que **caduca a los 30 minutos** y es **multi-uso**: cualquiera que lo tenga puede entrar dentro de esa ventana. Genera tantos como necesites; cada uno con su ventana.

- **Desde la app** (pestaña **🔧 Admin** → *Generar invitación*): copia el link que aparece.
- **Manual (API):**
  ```bash
  curl -X POST https://<tu-dominio>/api/create-invite \
    -H "X-Admin-Secret: <ADMIN_TRIGGER_SECRET>"
  # → { "ok": true, "token": "<uuid>", "expires_at": "..." }
  ```
  El link a repartir es: `https://<tu-dominio>/?invite=<token>`

## Cómo se impone la seguridad (resumen)

- La `anon key` del cliente es **pública por diseño**: la seguridad la imponen **RLS** (base de datos) y los **endpoints serverless** con `service_role`, nunca el cliente.
- **Escrituras**: solo el dueño de su propia fila (`auth.uid() = user_id`). Sin `DELETE`.
- **Altas**: solo server-side, al canjear una invitación válida y no caducada.
- **Invitaciones**: tabla cerrada por RLS; solo el admin (con `ADMIN_TRIGGER_SECRET`) puede crearlas.
