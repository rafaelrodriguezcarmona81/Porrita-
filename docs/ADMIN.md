# Guía de administración — seguridad e invitaciones

Operativa para quien administra la porra (un único admin por tenant).

## Puesta en marcha (una sola vez)

1. **Base de datos (migraciones automáticas)** — las migraciones viven en
   [`supabase/migrations/`](../supabase/migrations) y se aplican **solas al mergear a `main`**
   (workflow *DB migrations*), pero **solo si el workflow *Tests* pasa**. No se ejecuta SQL a mano.
   Configura en *GitHub → Settings → Secrets and variables → Actions*:
   | Secret | Valor |
   |--------|-------|
   | `SUPABASE_ACCESS_TOKEN` | Supabase → *Account → Access Tokens* |
   | `SUPABASE_DB_PASSWORD` | la contraseña de la base de datos del proyecto |

2. **Variables de entorno (serverless)** — Vercel → *Project Settings → Environment Variables*:
   | Variable | Valor | Notas |
   |----------|-------|-------|
   | `SUPABASE_SERVICE_ROLE` | Supabase → *Project Settings → API → service_role key* | **Secreto.** Solo en servidor, nunca en el cliente ni en el repo. |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` | Opcional (hay valor por defecto). |
   | `ADMIN_TRIGGER_SECRET` | tu clave de admin | Ya la usabas para forzar resultados. |

3. **Redeploy** en Vercel para que tomen las variables.

> ⚠️ **Una vez activa la RLS**, el alta de jugadores ya no se puede hacer desde el cliente (es el objetivo): pasa por el canje de invitación server-side (`/api/redeem-invite`). Por eso la migración de RLS y el backend de invitaciones viajan en el **mismo PR** — al mergear, las migraciones se aplican solas (workflow *DB migrations*) y el backend se despliega en Vercel a la vez. Regla general: una migración que endurezca el acceso debe ir con el código que la sustituye.

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
