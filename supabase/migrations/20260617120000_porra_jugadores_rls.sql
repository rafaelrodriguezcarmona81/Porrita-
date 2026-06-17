-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security para `porra_jugadores`  (F1/F3)
-- ─────────────────────────────────────────────────────────────────────────────
-- La `anon key` de la app es pública: sin RLS, cualquiera puede leer/alterar/
-- borrar la tabla con un simple curl. Estas políticas cierran las escrituras y
-- exigen sesión para leer. Las escrituras de la app ya viajan con el JWT del
-- usuario (Authorization: Bearer <access_token>), así que `auth.uid()` funciona.
--
-- Migración forward-only: se aplica sola al mergear a main (workflow "DB
-- migrations"). No la edites una vez aplicada; para cambios, añade otra migración.
--
-- ⚠️ SECUENCIA: debe llegar a main JUNTO con el backend de invitaciones (mismo
-- merge). Con RLS activa, el alta de jugadores deja de poder hacerse desde el
-- cliente (es el objetivo); el alta legítima pasa a server-side
-- (/api/redeem-invite con service_role). Sin ese backend desplegado, nadie nuevo
-- podría darse de alta.

alter table public.porra_jugadores enable row level security;

-- Limpieza idempotente (por si se re-ejecuta).
drop policy if exists jugadores_select on public.porra_jugadores;
drop policy if exists jugadores_update_own on public.porra_jugadores;

-- ── LECTURA ──────────────────────────────────────────────────────────────────
-- Por defecto: cualquier usuario autenticado ve la clasificación completa.
create policy jugadores_select
  on public.porra_jugadores for select
  to authenticated
  using (true);

-- Alternativa A (lectura pública, también sin login): cambia el `to authenticated`
--   de arriba por `to anon, authenticated`.
-- Alternativa B (solo invitados ven algo): cuando exista la autorización (tarea #3),
--   usar `using (autorizado = true)` o un EXISTS contra `usuarios_autorizados`.

-- ── ESCRITURA: solo el dueño edita su propia fila ───────────────────────────────
create policy jugadores_update_own
  on public.porra_jugadores for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT: sin policy para anon/authenticated → bloqueado desde el cliente.
--         El alta se hace server-side (service_role) al canjear invitación (#3).
-- DELETE: sin policy → bloqueado para todos los roles de cliente.
-- anon:   sin ninguna policy → sin lectura ni escritura.
-- service_role (serverless): ignora RLS por diseño → puede dar de alta y vincular.
